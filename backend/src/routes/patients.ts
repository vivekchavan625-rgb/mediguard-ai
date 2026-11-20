import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { patients, allergies, conditions, medications, vitalSigns, users } from '../db/schema';
import { eq, and, desc, asc, ilike, or, count, sql, inArray, gte, lte } from 'drizzle-orm';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest, requireRole } from '../middleware/auth';
import { paginationSchema } from '@mediguard/shared/schemas';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  }).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
});

const updatePatientSchema = createPatientSchema.partial();

const allergySchema = z.object({
  allergen: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening']),
  reaction: z.string().min(1),
  diagnosedAt: z.string(),
});

const conditionSchema = z.object({
  name: z.string().min(1),
  icd10Code: z.string().optional(),
  status: z.enum(['active', 'resolved', 'chronic', 'in_remission']),
  diagnosedAt: z.string(),
  notes: z.string().optional(),
});

const medicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  route: z.enum(['oral', 'topical', 'injection', 'inhalation', 'intravenous', 'subcutaneous']),
  startDate: z.string(),
  endDate: z.string().optional(),
  prescribedBy: z.string().min(1),
  notes: z.string().optional(),
});

const vitalSignsSchema = z.object({
  heartRate: z.number().int().positive().optional(),
  bloodPressureSystolic: z.number().int().positive().optional(),
  bloodPressureDiastolic: z.number().int().positive().optional(),
  temperature: z.number().positive().optional(),
  respiratoryRate: z.number().int().positive().optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { page, limit, sortBy, sortOrder, search } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  let whereClause: any = sql`1=1`;

  // Always filter for active patients
  whereClause = and(whereClause, eq(patients.isActive, true))!;

  if (search) {
    whereClause = and(
      whereClause,
      or(
        ilike(patients.firstName, `%${search}%`),
        ilike(patients.lastName, `%${search}%`),
        ilike(patients.medicalRecordNumber, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    )!;
  }

  const orderBy = sortBy
    ? sortOrder === 'desc'
      ? desc((patients as any)[sortBy])
      : asc((patients as any)[sortBy])
    : desc(patients.createdAt);

  const [patientList, totalResult] = await Promise.all([
    db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
        phone: patients.phone,
        medicalRecordNumber: patients.medicalRecordNumber,
        bloodType: patients.bloodType,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .leftJoin(users, eq(patients.userId, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(patients)
      .leftJoin(users, eq(patients.userId, users.id))
      .where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  res.status(200).json({
    success: true,
    data: patientList,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
  return;
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const [patient] = await db
    .select({
      id: patients.id,
      userId: patients.userId,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      phone: patients.phone,
      address: patients.address,
      emergencyContact: patients.emergencyContact,
      medicalRecordNumber: patients.medicalRecordNumber,
      bloodType: patients.bloodType,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
    })
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);

  if (!patient) {
    throw new AppError(404, 'NOT_FOUND', 'Patient not found');
  }

  const [allergyList, conditionList, medicationList, vitalSignsList] = await Promise.all([
    db.select().from(allergies).where(eq(allergies.patientId, id)).orderBy(desc(allergies.createdAt)),
    db.select().from(conditions).where(eq(conditions.patientId, id)).orderBy(desc(conditions.createdAt)),
    db.select().from(medications).where(eq(medications.patientId, id)).orderBy(desc(medications.createdAt)),
    db.select().from(vitalSigns).where(eq(vitalSigns.patientId, id)).orderBy(desc(vitalSigns.recordedAt)).limit(50),
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...patient,
      allergies: allergyList,
      conditions: conditionList,
      medications: medicationList,
      vitalSigns: vitalSignsList,
    },
  });
  return;
}));

router.post('/', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const data = createPatientSchema.parse(req.body);

  const medicalRecordNumber = `MRN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const [patient] = await db.insert(patients).values({
    ...data,
    medicalRecordNumber,
    dateOfBirth: new Date(data.dateOfBirth),
    emergencyContact: data.emergencyContact ? JSON.stringify(data.emergencyContact) : null,
    userId: req.user!.id,
  } as any).returning();

  res.status(201).json({ success: true, data: patient });
  return;
}));

router.patch('/:id', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updatePatientSchema.parse(req.body);

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
  if (data.emergencyContact) updateData.emergencyContact = JSON.stringify(data.emergencyContact);

  const [patient] = await db
    .update(patients)
    .set(updateData as any)
    .where(eq(patients.id, id))
    .returning();

  if (!patient) {
    throw new AppError(404, 'NOT_FOUND', 'Patient not found');
  }

  res.status(200).json({ success: true, data: patient });
  return;
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const [patient] = await db
    .update(patients)
    .set({ isActive: false, updatedAt: new Date() } as any)
    .where(eq(patients.id, id))
    .returning();

  if (!patient) {
    throw new AppError(404, 'NOT_FOUND', 'Patient not found');
  }

  res.status(200).json({ success: true, message: 'Patient deactivated' });
  return;
}));

// Allergies
router.get('/:id/allergies', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const allergyList = await db.select().from(allergies).where(eq(allergies.patientId, id)).orderBy(desc(allergies.createdAt));
  res.status(200).json({ success: true, data: allergyList });
  return;
}));

router.post('/:id/allergies', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = allergySchema.parse(req.body);

  const [allergy] = await db.insert(allergies).values({
    ...data,
    patientId: id,
    diagnosedAt: new Date(data.diagnosedAt),
  } as any).returning();

  res.status(201).json({ success: true, data: allergy });
  return;
}));

router.delete('/:id/allergies/:allergyId', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { allergyId } = req.params;
  await db.delete(allergies).where(eq(allergies.id, allergyId));
  res.status(200).json({ success: true, message: 'Allergy removed' });
  return;
}));

// Conditions
router.get('/:id/conditions', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const conditionList = await db.select().from(conditions).where(eq(conditions.patientId, id)).orderBy(desc(conditions.createdAt));
  res.status(200).json({ success: true, data: conditionList });
  return;
}));

router.post('/:id/conditions', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = conditionSchema.parse(req.body);

  const [condition] = await db.insert(conditions).values({
    ...data,
    patientId: id,
    diagnosedAt: new Date(data.diagnosedAt),
  } as any).returning();

  res.status(201).json({ success: true, data: condition });
  return;
}));

router.patch('/:id/conditions/:conditionId', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { conditionId } = req.params;
  const data = conditionSchema.partial().parse(req.body);

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.diagnosedAt) updateData.diagnosedAt = new Date(data.diagnosedAt);

  const [condition] = await db
    .update(conditions)
    .set(updateData as any)
    .where(eq(conditions.id, conditionId))
    .returning();

  if (!condition) {
    throw new AppError(404, 'NOT_FOUND', 'Condition not found');
  }

  res.status(200).json({ success: true, data: condition });
  return;
}));

router.delete('/:id/conditions/:conditionId', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { conditionId } = req.params;
  await db.delete(conditions).where(eq(conditions.id, conditionId));
  res.status(200).json({ success: true, message: 'Condition removed' });
  return;
}));

// Medications
router.get('/:id/medications', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const medicationList = await db.select().from(medications).where(eq(medications.patientId, id)).orderBy(desc(medications.createdAt));
  res.status(200).json({ success: true, data: medicationList });
  return;
}));

router.post('/:id/medications', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = medicationSchema.parse(req.body);

  const [medication] = await db.insert(medications).values({
    ...data,
    patientId: id,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : null,
  } as any).returning();

  res.status(201).json({ success: true, data: medication });
  return;
}));

router.patch('/:id/medications/:medicationId', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { medicationId } = req.params;
  const data = medicationSchema.partial().parse(req.body);

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  const [medication] = await db
    .update(medications)
    .set(updateData as any)
    .where(eq(medications.id, medicationId))
    .returning();

  if (!medication) {
    throw new AppError(404, 'NOT_FOUND', 'Medication not found');
  }

  res.status(200).json({ success: true, data: medication });
  return;
}));

router.delete('/:id/medications/:medicationId', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { medicationId } = req.params;
  await db.delete(medications).where(eq(medications.id, medicationId));
  res.status(200).json({ success: true, message: 'Medication removed' });
  return;
}));

// Vital Signs
router.get('/:id/vital-signs', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { limit = 50 } = req.query;
  const vitalSignsList = await db
    .select()
    .from(vitalSigns)
    .where(eq(vitalSigns.patientId, id))
    .orderBy(desc(vitalSigns.recordedAt))
    .limit(parseInt(limit as string, 10));
  res.json({ success: true, data: vitalSignsList });
  return;
}));

router.post('/:id/vital-signs', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = vitalSignsSchema.parse(req.body);

  const bmi = data.weight && data.height
    ? Math.round((data.weight / Math.pow(data.height / 100, 2)) * 10)
    : null;

  const [vital] = await db.insert(vitalSigns).values({
    ...data,
    patientId: id,
    temperature: data.temperature ? Math.round(data.temperature * 10) : null,
    weight: data.weight ? Math.round(data.weight * 10) : null,
    bmi,
    recordedBy: req.user!.name,
  } as any).returning();

  res.status(201).json({ success: true, data: vital });
  return;
}));

export { router as patientRoutes };