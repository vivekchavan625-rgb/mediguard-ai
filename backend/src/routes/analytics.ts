import { Router } from 'express';
import { db } from '../db';
import { patients, appointments, medicalRecords, aiAnalyses, vitalSigns, medications, alerts, users } from '../db/schema';
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

  res.status(200).json({
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
  return;
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

  res.status(200).json({ success: true, data: formattedData });
  return;
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

  res.status(200).json({
    success: true,
    data: {
      byType: byType.map((t) => ({ name: t.type, value: t.count })),
      byStatus: byStatus.map((s) => ({ name: s.status, value: s.count })),
      averageConfidence: Math.round(avgConfidence[0]?.avgConfidence || 0),
    },
  });
  return;
}));

router.get('/recent-activity', asyncHandler(async (req: AuthRequest, res) => {
  const { startDate, endDate, limit = '10' } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();
  const limitNum = parseInt(limit as string, 10);

  let patientWhere = sql`1=1`;
  let appointmentWhere = and(gte(appointments.scheduledAt, start), lte(appointments.scheduledAt, end))!;
  let recordWhere = and(gte(medicalRecords.createdAt, start), lte(medicalRecords.createdAt, end))!;
  let vitalsWhere = and(gte(vitalSigns.recordedAt, start), lte(vitalSigns.recordedAt, end))!;
  let analysesWhere = and(gte(aiAnalyses.createdAt, start), lte(aiAnalyses.createdAt, end))!;

  if (req.user?.role === 'doctor') {
    appointmentWhere = and(appointmentWhere, eq(appointments.doctorId, req.user.id))!;
    recordWhere = and(recordWhere, eq(medicalRecords.doctorId, req.user.id))!;
    vitalsWhere = and(vitalsWhere, eq(vitalSigns.recordedBy, req.user.name))!;
    analysesWhere = and(analysesWhere, eq(aiAnalyses.reviewedBy, req.user.id))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      patientWhere = eq(patients.id, patient.id);
      appointmentWhere = and(appointmentWhere, eq(appointments.patientId, patient.id))!;
      recordWhere = and(recordWhere, eq(medicalRecords.patientId, patient.id))!;
      vitalsWhere = and(vitalsWhere, eq(vitalSigns.patientId, patient.id))!;
      analysesWhere = and(analysesWhere, eq(aiAnalyses.patientId, patient.id))!;
    }
  }

  const [recentAppointments, recentRecords, recentVitals, recentAnalyses] = await Promise.all([
    db
      .select({
        id: appointments.id,
        type: sql<string>`'appointment'`,
        title: appointments.type,
        description: appointments.notes,
        timestamp: appointments.scheduledAt,
        patientId: appointments.patientId,
      })
      .from(appointments)
      .where(appointmentWhere)
      .orderBy(desc(appointments.scheduledAt))
      .limit(limitNum),
    db
      .select({
        id: medicalRecords.id,
        type: sql<string>`'medical_record'`,
        title: medicalRecords.title,
        description: medicalRecords.type,
        timestamp: medicalRecords.createdAt,
        patientId: medicalRecords.patientId,
      })
      .from(medicalRecords)
      .where(recordWhere)
      .orderBy(desc(medicalRecords.createdAt))
      .limit(limitNum),
    db
      .select({
        id: vitalSigns.id,
        type: sql<string>`'vital_signs'`,
        title: sql<string>`'Vital Signs Recorded'`,
        description: sql<string>`CONCAT('HR: ', ${vitalSigns.heartRate}, ' BP: ', ${vitalSigns.bloodPressureSystolic}, '/', ${vitalSigns.bloodPressureDiastolic})`,
        timestamp: vitalSigns.recordedAt,
        patientId: vitalSigns.patientId,
      })
      .from(vitalSigns)
      .where(vitalsWhere)
      .orderBy(desc(vitalSigns.recordedAt))
      .limit(limitNum),
    db
      .select({
        id: aiAnalyses.id,
        type: sql<string>`'ai_analysis'`,
        title: aiAnalyses.type,
        description: sql<string>`CONCAT('Status: ', ${aiAnalyses.status}, ', Confidence: ', ${aiAnalyses.confidence}, '%')`,
        timestamp: aiAnalyses.createdAt,
        patientId: aiAnalyses.patientId,
      })
      .from(aiAnalyses)
      .where(analysesWhere)
      .orderBy(desc(aiAnalyses.createdAt))
      .limit(limitNum),
  ]);

  const allActivity = [
    ...recentAppointments,
    ...recentRecords,
    ...recentVitals,
    ...recentAnalyses,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limitNum);

  // Fetch patient names for the activities
  const patientIds = [...new Set(allActivity.map(a => a.patientId).filter(Boolean))];
  const patientMap = new Map();
  if (patientIds.length > 0) {
    const patientList = await db
      .select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName })
      .from(patients)
      .where(sql`${patients.id} IN (${sql.join(patientIds.map(id => sql`${id}`), sql`, `)})`);
    patientList.forEach(p => patientMap.set(p.id, `${p.firstName} ${p.lastName}`));
  }

  const formattedActivity = allActivity.map(activity => ({
    id: activity.id,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    timestamp: activity.timestamp,
    patientName: activity.patientId ? patientMap.get(activity.patientId) : undefined,
  }));

  res.status(200).json({ success: true, data: formattedActivity });
  return;
}));

router.get('/recent-vitals', asyncHandler(async (req: AuthRequest, res) => {
  const { patientId, limit = '10' } = req.query;
  const limitNum = parseInt(limit as string, 10);

  let vitalsWhere = sql`1=1`;

  if (req.user?.role === 'doctor') {
    vitalsWhere = and(vitalsWhere, eq(vitalSigns.recordedBy, req.user.name))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      vitalsWhere = and(vitalsWhere, eq(vitalSigns.patientId, patient.id))!;
    }
  } else if (patientId) {
    vitalsWhere = and(vitalsWhere, eq(vitalSigns.patientId, patientId as string))!;
  }

  const data = await db
    .select({
      id: vitalSigns.id,
      patientId: vitalSigns.patientId,
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
      recordedBy: vitalSigns.recordedBy,
    })
    .from(vitalSigns)
    .where(vitalsWhere)
    .orderBy(desc(vitalSigns.recordedAt))
    .limit(limitNum);

  const formattedData = data.map((d) => ({
    id: d.id,
    patientId: d.patientId,
    recordedAt: d.recordedAt,
    heartRate: d.heartRate,
    bloodPressureSystolic: d.bloodPressureSystolic,
    bloodPressureDiastolic: d.bloodPressureDiastolic,
    temperature: d.temperature ? d.temperature / 10 : null,
    respiratoryRate: d.respiratoryRate,
    oxygenSaturation: d.oxygenSaturation,
    weight: d.weight ? d.weight / 10 : null,
    height: d.height,
    bmi: d.bmi ? d.bmi / 10 : null,
    recordedBy: d.recordedBy,
  }));

  res.status(200).json({ success: true, data: formattedData });
  return;
}));

router.get('/recent-medications', asyncHandler(async (req: AuthRequest, res) => {
  const { patientId, limit = '10' } = req.query;
  const limitNum = parseInt(limit as string, 10);

  let medsWhere = and(eq(medications.isActive, true))!;

  if (req.user?.role === 'doctor') {
    // Doctors see medications they prescribed
    medsWhere = and(medsWhere, eq(medications.prescribedBy, req.user.name))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      medsWhere = and(medsWhere, eq(medications.patientId, patient.id))!;
    }
  } else if (patientId) {
    medsWhere = and(medsWhere, eq(medications.patientId, patientId as string))!;
  }

  const data = await db
    .select({
      id: medications.id,
      patientId: medications.patientId,
      name: medications.name,
      dosage: medications.dosage,
      frequency: medications.frequency,
      route: medications.route,
      startDate: medications.startDate,
      endDate: medications.endDate,
      prescribedBy: medications.prescribedBy,
      notes: medications.notes,
      isActive: medications.isActive,
    })
    .from(medications)
    .where(medsWhere)
    .orderBy(desc(medications.createdAt))
    .limit(limitNum);

  res.status(200).json({ success: true, data });
  return;
}));

router.get('/recent-alerts', asyncHandler(async (req: AuthRequest, res) => {
  const { patientId, limit = '10' } = req.query;
  const limitNum = parseInt(limit as string, 10);

  let alertsWhere = sql`1=1`;

  if (req.user?.role === 'doctor') {
    // Doctors see alerts for their patients - need to join through patients
    // For simplicity, get all unresolved alerts
    alertsWhere = and(alertsWhere, eq(alerts.isResolved, false))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      alertsWhere = and(alertsWhere, eq(alerts.patientId, patient.id))!;
    }
  } else if (patientId) {
    alertsWhere = and(alertsWhere, eq(alerts.patientId, patientId as string))!;
  }

  const data = await db
    .select({
      id: alerts.id,
      patientId: alerts.patientId,
      type: alerts.type,
      severity: alerts.severity,
      message: alerts.message,
      details: alerts.details,
      isResolved: alerts.isResolved,
      resolvedAt: alerts.resolvedAt,
      resolvedBy: alerts.resolvedBy,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(alertsWhere)
    .orderBy(desc(alerts.createdAt))
    .limit(limitNum);

  res.status(200).json({ success: true, data });
  return;
}));

export { router as analyticsRoutes };