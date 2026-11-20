import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { appointments, patients, users } from '../db/schema';
import { eq, and, desc, asc, gte, lte, count, sql } from 'drizzle-orm';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest, requireRole } from '../middleware/auth';
import { paginationSchema } from '@mediguard/shared/schemas';

const router = Router();

const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  scheduledAt: z.string(),
  duration: z.number().int().positive().default(30),
  type: z.enum(['consultation', 'follow_up', 'emergency', 'routine_checkup', 'procedure']).default('consultation'),
  notes: z.string().optional(),
});

const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
});

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { page, limit, sortBy, sortOrder, startDate, endDate, status, doctorId, patientId } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  let whereClause: any = sql`1=1`;

  if (startDate) {
    whereClause = and(whereClause, gte(appointments.scheduledAt, new Date(startDate)))!;
  }
  if (endDate) {
    whereClause = and(whereClause, lte(appointments.scheduledAt, new Date(endDate)))!;
  }
  if (status) {
    whereClause = and(whereClause, eq(appointments.status, status as any))!;
  }
  if (doctorId) {
    whereClause = and(whereClause, eq(appointments.doctorId, doctorId))!;
  }
  if (patientId) {
    whereClause = and(whereClause, eq(appointments.patientId, patientId))!;
  }

  // Role-based filtering
  if (req.user?.role === 'doctor') {
    whereClause = and(whereClause, eq(appointments.doctorId, req.user.id))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      whereClause = and(whereClause, eq(appointments.patientId, patient.id))!;
    }
  }

  const orderBy = sortBy
    ? sortOrder === 'desc'
      ? desc((appointments as any)[sortBy])
      : asc((appointments as any)[sortBy])
    : asc(appointments.scheduledAt);

  const [appointmentList, totalResult] = await Promise.all([
    db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        scheduledAt: appointments.scheduledAt,
        duration: appointments.duration,
        status: appointments.status,
        type: appointments.type,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        patient: {
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          medicalRecordNumber: patients.medicalRecordNumber,
        },
        doctor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(appointments)
      .where(whereClause),
  ]);

  const total = totalResult[0]?.count || 0;

  res.status(200).json({
    success: true,
    data: appointmentList,
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

  const [appointment] = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      scheduledAt: appointments.scheduledAt,
      duration: appointments.duration,
      status: appointments.status,
      type: appointments.type,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
        phone: patients.phone,
        medicalRecordNumber: patients.medicalRecordNumber,
      },
      doctor: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(eq(appointments.id, id))
    .limit(1);

  if (!appointment) {
    throw new AppError(404, 'NOT_FOUND', 'Appointment not found');
  }

  res.status(200).json({ success: true, data: appointment });
  return;
}));

router.post('/', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const data = createAppointmentSchema.parse(req.body);

  const [appointment] = await db.insert(appointments).values({
    ...data,
    scheduledAt: new Date(data.scheduledAt),
    doctorId: req.user?.role === 'doctor' ? req.user.id : data.doctorId,
  } as any).returning();

  res.status(201).json({ success: true, data: appointment });
  return;
}));

router.patch('/:id', requireRole('admin', 'doctor', 'nurse'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateAppointmentSchema.parse(req.body);

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);

  const [appointment] = await db
    .update(appointments)
    .set(updateData)
    .where(eq(appointments.id, id))
    .returning();

  if (!appointment) {
    throw new AppError(404, 'NOT_FOUND', 'Appointment not found');
  }

  res.status(200).json({ success: true, data: appointment });
  return;
}));

router.delete('/:id', requireRole('admin', 'doctor'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  await db.delete(appointments).where(eq(appointments.id, id));

  res.status(200).json({ success: true, message: 'Appointment deleted' });
  return;
}));

// Get appointments for calendar view
router.get('/calendar/view', asyncHandler(async (req: AuthRequest, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    throw new AppError(400, 'BAD_REQUEST', 'Start and end dates required');
  }

  let whereClause = and(
    gte(appointments.scheduledAt, new Date(start as string)),
    lte(appointments.scheduledAt, new Date(end as string))
  )!;

  if (req.user?.role === 'doctor') {
    whereClause = and(whereClause, eq(appointments.doctorId, req.user.id))!;
  } else if (req.user?.role === 'patient') {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, req.user.id)).limit(1);
    if (patient) {
      whereClause = and(whereClause, eq(appointments.patientId, patient.id))!;
    }
  }

  const appointmentList = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      scheduledAt: appointments.scheduledAt,
      duration: appointments.duration,
      status: appointments.status,
      type: appointments.type,
      patient: {
        firstName: patients.firstName,
        lastName: patients.lastName,
      },
      doctor: {
        name: users.name,
      },
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(whereClause)
    .orderBy(asc(appointments.scheduledAt));

  res.status(200).json({ success: true, data: appointmentList });
  return;
}));

export { router as appointmentRoutes };