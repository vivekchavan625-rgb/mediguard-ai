import { Router } from 'express';
import { db } from '../db';
import { patients, appointments, medicalRecords, aiAnalyses, vitalSigns, users } from '../db/schema';
import { eq, and, desc, asc, count, sql, gte, lte } from 'drizzle-orm';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/dashboard', asyncHandler(async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  let patientWhere = sql`1=1`;
  let appointmentWhere = and(gte(appointments.scheduledAt, start), lte(appointments.scheduledAt, end))!;
  let recordWhere = and(gte(medicalRecords.createdAt, start), lte(medicalRecords.createdAt, end))!;

  if (req.user?.role === 'doctor') {
    appointmentWhere = and(appointmentWhere, eq(appointments.doctorId, req.user.id))!;
    recordWhere = and(recordWhere, eq(medicalRecords.doctorId, req.user.id))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      patientWhere = eq(patients.id, patient.id);
      appointmentWhere = and(appointmentWhere, eq(appointments.patientId, patient.id))!;
      recordWhere = and(recordWhere, eq(medicalRecords.patientId, patient.id))!;
    }
  }

  const [
    totalPatients,
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    totalRecords,
    recentAnalyses,
    appointmentsByStatus,
    appointmentsByType,
    recordsByType,
    patientsByGender,
    patientsByAgeGroup,
  ] = await Promise.all([
    db.select({ count: count() }).from(patients).where(patientWhere),
    db.select({ count: count() }).from(appointments).where(appointmentWhere),
    db.select({ count: count() }).from(appointments).where(and(appointmentWhere, eq(appointments.status, 'completed'))),
    db.select({ count: count() }).from(appointments).where(and(appointmentWhere, eq(appointments.status, 'cancelled'))),
    db.select({ count: count() }).from(medicalRecords).where(recordWhere),
    db.select({ count: count() }).from(aiAnalyses).where(and(gte(aiAnalyses.createdAt, start), lte(aiAnalyses.createdAt, end))),
    db
      .select({ status: appointments.status, count: count() })
      .from(appointments)
      .where(appointmentWhere)
      .groupBy(appointments.status),
    db
      .select({ type: appointments.type, count: count() })
      .from(appointments)
      .where(appointmentWhere)
      .groupBy(appointments.type),
    db
      .select({ type: medicalRecords.type, count: count() })
      .from(medicalRecords)
      .where(recordWhere)
      .groupBy(medicalRecords.type),
    db
      .select({ gender: patients.gender, count: count() })
      .from(patients)
      .where(patientWhere)
      .groupBy(patients.gender),
    db
      .select({
        ageGroup: sql<string>`CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 18 THEN '0-17'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 35 THEN '18-34'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 50 THEN '35-49'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 65 THEN '50-64'
          ELSE '65+'
        END`,
        count: count(),
      })
      .from(patients)
      .where(patientWhere)
      .groupBy(sql`CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 18 THEN '0-17'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 35 THEN '18-34'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 50 THEN '35-49'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${patients.dateOfBirth})) < 65 THEN '50-64'
          ELSE '65+'
        END`),
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        totalPatients: totalPatients[0]?.count || 0,
        totalAppointments: totalAppointments[0]?.count || 0,
        completedAppointments: completedAppointments[0]?.count || 0,
        cancelledAppointments: cancelledAppointments[0]?.count || 0,
        totalRecords: totalRecords[0]?.count || 0,
        aiAnalyses: recentAnalyses[0]?.count || 0,
        completionRate: totalAppointments[0]?.count
          ? Math.round(((completedAppointments[0]?.count || 0) / totalAppointments[0].count) * 100)
          : 0,
      },
      charts: {
        appointmentsByStatus: appointmentsByStatus.map((a) => ({ name: a.status, value: a.count })),
        appointmentsByType: appointmentsByType.map((a) => ({ name: a.type, value: a.count })),
        recordsByType: recordsByType.map((r) => ({ name: r.type, value: r.count })),
        patientsByGender: patientsByGender.map((p) => ({ name: p.gender, value: p.count })),
        patientsByAgeGroup: patientsByAgeGroup.map((p) => ({ name: p.ageGroup, value: p.count })),
      },
    },
  });
}));

router.get('/vital-signs-trends', asyncHandler(async (req: AuthRequest, res) => {
  const { patientId, parameter, startDate, endDate } = req.query;

  if (!patientId) {
    return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Patient ID required' } });
  }

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const whereClause = and(
    eq(vitalSigns.patientId, patientId as string),
    gte(vitalSigns.recordedAt, start),
    lte(vitalSigns.recordedAt, end)
  );

  const data = await db
    .select({
      recordedAt: vitalSigns.recordedAt,
      heartRate: vitalSigns.heartRate,
      bloodPressureSystolic: vitalSigns.bloodPressureSystolic,
      bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic,
      temperature: vitalSigns.temperature,
      respiratoryRate: vitalSigns.respiratoryRate,
      oxygenSaturation: vitalSigns.oxygenSaturation,
      weight: vitalSigns.weight,
      height: vitalSigns.height,
      bmi: vitalSigns.bmi,
    })
    .from(vitalSigns)
    .where(whereClause)
    .orderBy(asc(vitalSigns.recordedAt));

  const formattedData = data.map((d) => ({
    date: d.recordedAt,
    heartRate: d.heartRate,
    bloodPressure: d.bloodPressureSystolic && d.bloodPressureDiastolic
      ? `${d.bloodPressureSystolic}/${d.bloodPressureDiastolic}`
      : null,
    systolic: d.bloodPressureSystolic,
    diastolic: d.bloodPressureDiastolic,
    temperature: d.temperature ? d.temperature / 10 : null,
    respiratoryRate: d.respiratoryRate,
    oxygenSaturation: d.oxygenSaturation,
    weight: d.weight ? d.weight / 10 : null,
    height: d.height,
    bmi: d.bmi ? d.bmi / 10 : null,
  }));

  res.json({ success: true, data: formattedData });
}));

router.get('/ai-performance', asyncHandler(async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const [byType, byStatus, avgConfidence] = await Promise.all([
    db
      .select({ type: aiAnalyses.type, count: count() })
      .from(aiAnalyses)
      .where(and(gte(aiAnalyses.createdAt, start), lte(aiAnalyses.createdAt, end)))
      .groupBy(aiAnalyses.type),
    db
      .select({ status: aiAnalyses.status, count: count() })
      .from(aiAnalyses)
      .where(and(gte(aiAnalyses.createdAt, start), lte(aiAnalyses.createdAt, end)))
      .groupBy(aiAnalyses.status),
    db
      .select({ avgConfidence: sql<number>`AVG(${aiAnalyses.confidence})` })
      .from(aiAnalyses)
      .where(and(gte(aiAnalyses.createdAt, start), lte(aiAnalyses.createdAt, end), sql`${aiAnalyses.confidence} IS NOT NULL`)),
  ]);

  res.json({
    success: true,
    data: {
      byType: byType.map((t) => ({ name: t.type, value: t.count })),
      byStatus: byStatus.map((s) => ({ name: s.status, value: s.count })),
      averageConfidence: Math.round(avgConfidence[0]?.avgConfidence || 0),
    },
  });
}));

export { router as analyticsRoutes };