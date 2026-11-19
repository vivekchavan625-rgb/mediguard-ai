import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { medicalRecords, patients, users, appointments } from '../db/schema';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest, requireRole } from '../middleware/auth';
import { paginationSchema } from '@mediguard/shared/schemas';

const router = Router();

const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  type: z.enum([
    'consultation_note',
    'lab_result',
    'imaging',
    'prescription',
    'referral',
    'discharge_summary',
    'operative_note',
  ]),
  title: z.string().min(1),
  content: z.string().min(1),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    mimeType: z.string(),
    size: z.number(),
  })).optional(),
});

const updateMedicalRecordSchema = createMedicalRecordSchema.partial();

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { page, limit, sortBy, sortOrder, patientId, type, doctorId } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  let whereClause = sql`1=1`;

  if (patientId) {
    whereClause = and(whereClause, eq(medicalRecords.patientId, patientId))!;
  }
  if (type) {
    whereClause = and(whereClause, eq(medicalRecords.type, type))!;
  }
  if (doctorId) {
    whereClause = and(whereClause, eq(medicalRecords.doctorId, doctorId))!;
  }

  if (req.user?.role === 'doctor') {
    whereClause = and(whereClause, eq(medicalRecords.doctorId, req.user.id))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      whereClause = and(whereClause, eq(medicalRecords.patientId, patient.id))!;
    }
  }

  const orderBy = sortBy
    ? sortOrder === 'desc'
      ? desc(medicalRecords[sortBy as keyof typeof medicalRecords])
      : asc(medicalRecords[sortBy as keyof typeof medicalRecords])
    : desc(medicalRecords.createdAt);

  const [recordList, totalResult] = await Promise.all([
    db
      .select({
        id: medicalRecords.id,
        patientId: medicalRecords.patientId,
        doctorId: medicalRecords.doctorId,
        appointmentId: medicalRecords.appointmentId,
        type: medicalRecords.type,
        title: medicalRecords.title,
        content: medicalRecords.content,
        attachments: medicalRecords.attachments,
        createdAt: medicalRecords.createdAt,
        updatedAt: medicalRecords.updatedAt,
        patient: {
          firstName: patients.firstName,
          lastName: patients.lastName,
          medicalRecordNumber: patients.medicalRecordNumber,
        },
        doctor: {
          name: users.name,
        },
      })
      .from(medicalRecords)
      .leftJoin(patients, eq(medicalRecords.patientId, patients.id))
      .leftJoin(users, eq(medicalRecords.doctorId, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(medicalRecords)
      .where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  res.json({
    success: true,
    data: recordList,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const [record] = await db
    .select({
      id: medicalRecords.id,
      patientId: medicalRecords.patientId,
      doctorId: medicalRecords.doctorId,
      appointmentId: medicalRecords.appointmentId,
      type: medicalRecords.type,
      title: medicalRecords.title,
      content: medicalRecords.content,
      attachments: medicalRecords.attachments,
      createdAt: medicalRecords.createdAt,
      updatedAt: medicalRecords.updatedAt,
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        medicalRecordNumber: patients.medicalRecordNumber,
      },
      doctor: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      appointment: {
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        type: appointments.type,
      },
    })
    .from(medicalRecords)
    .leftJoin(patients, eq(medicalRecords.patientId, patients.id))
    .leftJoin(users, eq(medicalRecords.doctorId, users.id))
    .leftJoin(appointments, eq(medicalRecords.appointmentId, appointments.id))
    .where(eq(medicalRecords.id, id))
    .limit(1);

  if (!record) {
    throw new AppError(404, 'NOT_FOUND', 'Medical record not found');
  }

  res.json({ success: true, data: record });
}));

router.post('/', requireRole('admin', 'doctor'), asyncHandler(async (req: AuthRequest, res) => {
  const data = createMedicalRecordSchema.parse(req.body);

  const [record] = await db.insert(medicalRecords).values({
    ...data,
    doctorId: req.user!.id,
    attachments: data.attachments || [],
  }).returning();

  res.status(201).json({ success: true, data: record });
}));

router.patch('/:id', requireRole('admin', 'doctor'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateMedicalRecordSchema.parse(req.body);

  const [record] = await db
    .update(medicalRecords)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(medicalRecords.id, id))
    .returning();

  if (!record) {
    throw new AppError(404, 'NOT_FOUND', 'Medical record not found');
  }

  res.json({ success: true, data: record });
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.delete(medicalRecords).where(eq(medicalRecords.id, id));

  res.json({ success: true, message: 'Medical record deleted' });
}));

export { router as medicalRecordRoutes };