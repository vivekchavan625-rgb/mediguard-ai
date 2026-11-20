import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { db } from '../db';
import { aiAnalyses, patients, vitalSigns, medications, conditions, allergies } from '../db/schema';
import { eq, desc, asc, count, sql, and, or } from 'drizzle-orm';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest, requireRole } from '../middleware/auth';
import { config } from '../config';
import { paginationSchema } from '@mediguard/shared/schemas';

const router = Router();

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const aiAnalysisSchema = z.object({
  patientId: z.string().uuid(),
  type: z.enum([
    'diagnosis_assistance',
    'risk_assessment',
    'treatment_recommendation',
    'drug_interaction_check',
    'vital_signs_anomaly',
  ]),
  input: z.record(z.unknown()),
});

async function getPatientContext(patientId: string): Promise<{
  patient: { age: number; gender: string; bloodType: string | null };
  vitalSigns: any[];
  medications: any[];
  conditions: any[];
  allergies: any[];
} | null> {
  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (!patient) return null;

  const [vitals, meds, conds, allgs] = await Promise.all([
    db.select().from(vitalSigns).where(eq(vitalSigns.patientId, patientId)).orderBy(desc(vitalSigns.recordedAt)).limit(10),
    db.select().from(medications).where(eq(medications.patientId, patientId)).orderBy(desc(medications.createdAt)),
    db.select().from(conditions).where(eq(conditions.patientId, patientId)).orderBy(desc(conditions.createdAt)),
    db.select().from(allergies).where(eq(allergies.patientId, patientId)).orderBy(desc(allergies.createdAt)),
  ]);

  return {
    patient: {
      age: Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
      gender: patient.gender,
      bloodType: patient.bloodType,
    },
    vitalSigns: vitals,
    medications: meds,
    conditions: conds,
    allergies: allgs,
  };
}

async function runAIAnalysis(type: string, input: Record<string, unknown>, context: Awaited<ReturnType<typeof getPatientContext>>): Promise<{ result: Record<string, unknown>; confidence: number }> {
  const prompts: Record<string, string> = {
    diagnosis_assistance: `Based on the patient information and symptoms provided, suggest potential diagnoses with reasoning. Return JSON with: diagnoses (array of {name, icd10, probability, reasoning}), recommendedTests (array), redFlags (array).`,
    risk_assessment: `Assess the patient's health risks based on their medical history, vital signs, and current conditions. Return JSON with: riskScore (0-100), riskFactors (array), recommendations (array), followUpInterval (string).`,
    treatment_recommendation: `Based on the patient's conditions and current medications, recommend evidence-based treatment options. Return JSON with: recommendations (array of {condition, treatment, dosage, duration, monitoring, contraindications}), drugInteractions (array), lifestyleModifications (array).`,
    drug_interaction_check: `Check for potential drug interactions among the patient's current medications. Return JSON with: interactions (array of {drug1, drug2, severity, description, management}), recommendations (array).`,
    vital_signs_anomaly: `Analyze the patient's vital signs for anomalies and trends. Return JSON with: anomalies (array of {parameter, value, expectedRange, severity, clinicalSignificance}), trends (array), recommendations (array).`,
  };

  const systemPrompt = `You are a medical AI assistant. Analyze patient data and provide clinical decision support. Always include appropriate disclaimers. Be precise and evidence-based. ${prompts[type]}`;

  const userPrompt = `Patient Context: ${JSON.stringify(context, null, 2)}\n\nAnalysis Input: ${JSON.stringify(input, null, 2)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return { result, confidence: 85 };
  } catch (error) {
    console.error('AI Analysis error:', error);
    throw new AppError(500, 'AI_ERROR', 'Failed to run AI analysis');
  }
}

router.post('/analyze', requireRole('admin', 'doctor'), asyncHandler(async (req: AuthRequest, res) => {
  const { patientId, type, input } = aiAnalysisSchema.parse(req.body);

  const context = await getPatientContext(patientId);
  if (!context) {
    throw new AppError(404, 'NOT_FOUND', 'Patient not found');
  }

  const [analysis] = await db.insert(aiAnalyses).values({
    patientId,
    type,
    input,
    status: 'pending',
  }).returning();

  try {
    const { result, confidence } = await runAIAnalysis(type, input, context);

    await db.update(aiAnalyses)
      .set({ result, confidence, status: 'completed' })
      .where(eq(aiAnalyses.id, analysis.id));

    res.status(200).json({
      success: true,
      data: {
        id: analysis.id,
        type,
        result,
        confidence,
        status: 'completed',
        createdAt: analysis.createdAt,
      },
    });
    return;
  } catch (error) {
    await db.update(aiAnalyses)
      .set({ status: 'rejected' })
      .where(eq(aiAnalyses.id, analysis.id));
    throw error;
  }
}));

router.get('/analyses', asyncHandler(async (req: AuthRequest, res) => {
  const { page, limit, sortBy, sortOrder, patientId, type, status } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  let whereClause = sql`1=1`;

  if (patientId) {
    whereClause = and(whereClause, eq(aiAnalyses.patientId, patientId))!;
  }
  if (type) {
    whereClause = and(whereClause, eq(aiAnalyses.type, type as any))!;
  }
  if (status) {
    whereClause = and(whereClause, eq(aiAnalyses.status, status as any))!;
  }

  if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      whereClause = and(whereClause, eq(aiAnalyses.patientId, patient.id))!;
    }
  }

  const orderBy = sortBy
    ? sortOrder === 'desc'
      ? desc(aiAnalyses[sortBy as keyof typeof aiAnalyses] as any)
      : asc(aiAnalyses[sortBy as keyof typeof aiAnalyses] as any)
    : desc(aiAnalyses.createdAt);

  const [analysisList, totalResult] = await Promise.all([
    db
      .select()
      .from(aiAnalyses)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(aiAnalyses)
      .where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  res.status(200).json({
    success: true,
    data: analysisList,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
  return;
}));

router.get('/analyses/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const [analysis] = await db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.id, id))
    .limit(1);

  if (!analysis) {
    throw new AppError(404, 'NOT_FOUND', 'Analysis not found');
  }

  res.status(200).json({ success: true, data: analysis });
  return;
}));

router.post('/analyses/:id/review', requireRole('admin', 'doctor'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const [analysis] = await db
    .update(aiAnalyses)
    .set({ status: 'reviewed', reviewedAt: new Date(), reviewedBy: req.user!.id })
    .where(eq(aiAnalyses.id, id))
    .returning();

  if (!analysis) {
    throw new AppError(404, 'NOT_FOUND', 'Analysis not found');
  }

  res.status(200).json({ success: true, data: analysis });
  return;
}));

router.post('/quick-check', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { patientId, symptoms } = z.object({
    patientId: z.string().uuid(),
    symptoms: z.string().min(1),
  }).parse(req.body);

  const context = await getPatientContext(patientId);
  if (!context) {
    throw new AppError(404, 'NOT_FOUND', 'Patient not found');
  }

  const { result, confidence } = await runAIAnalysis('diagnosis_assistance', { symptoms }, context);

  res.status(200).json({
    success: true,
    data: {
      type: 'diagnosis_assistance',
      result,
      confidence,
    },
  });
  return;
}));

export { router as aiRoutes };