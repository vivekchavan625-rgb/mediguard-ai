import { pgTable, uuid, varchar, text, timestamp, date, integer, boolean, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['admin', 'doctor', 'nurse', 'patient']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);
export const bloodTypeEnum = pgEnum('blood_type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
export const allergySeverityEnum = pgEnum('allergy_severity', ['mild', 'moderate', 'severe', 'life_threatening']);
export const conditionStatusEnum = pgEnum('condition_status', ['active', 'resolved', 'chronic', 'in_remission']);
export const medicationRouteEnum = pgEnum('medication_route', ['oral', 'topical', 'injection', 'inhalation', 'intravenous', 'subcutaneous']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);
export const appointmentTypeEnum = pgEnum('appointment_type', ['consultation', 'follow_up', 'emergency', 'routine_checkup', 'procedure']);
export const medicalRecordTypeEnum = pgEnum('medical_record_type', ['consultation_note', 'lab_result', 'imaging', 'prescription', 'referral', 'discharge_summary', 'operative_note']);
export const aiAnalysisTypeEnum = pgEnum('ai_analysis_type', ['diagnosis_assistance', 'risk_assessment', 'treatment_recommendation', 'drug_interaction_check', 'vital_signs_anomaly']);
export const aiAnalysisStatusEnum = pgEnum('ai_analysis_status', ['pending', 'completed', 'reviewed', 'rejected']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('patient'),
  avatar: varchar('avatar', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
}));

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: genderEnum('gender').notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  emergencyContact: jsonb('emergency_contact'),
  medicalRecordNumber: varchar('medical_record_number', { length: 50 }).notNull().unique(),
  bloodType: bloodTypeEnum('blood_type'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex('patients_user_id_idx').on(table.userId),
  mrnIdx: uniqueIndex('patients_mrn_idx').on(table.medicalRecordNumber),
  nameIdx: index('patients_name_idx').on(table.lastName, table.firstName),
}));

export const allergies = pgTable('allergies', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  allergen: varchar('allergen', { length: 255 }).notNull(),
  severity: allergySeverityEnum('severity').notNull(),
  reaction: text('reaction').notNull(),
  diagnosedAt: date('diagnosed_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  patientIdIdx: index('allergies_patient_id_idx').on(table.patientId),
}));

export const conditions = pgTable('conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  icd10Code: varchar('icd10_code', { length: 20 }),
  status: conditionStatusEnum('status').notNull().default('active'),
  diagnosedAt: date('diagnosed_at').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  patientIdIdx: index('conditions_patient_id_idx').on(table.patientId),
}));

export const medications = pgTable('medications', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  dosage: varchar('dosage', { length: 100 }).notNull(),
  frequency: varchar('frequency', { length: 100 }).notNull(),
  route: medicationRouteEnum('route').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  prescribedBy: varchar('prescribed_by', { length: 255 }).notNull(),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  patientIdIdx: index('medications_patient_id_idx').on(table.patientId),
}));

export const vitalSigns = pgTable('vital_signs', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  heartRate: integer('heart_rate'),
  bloodPressureSystolic: integer('blood_pressure_systolic'),
  bloodPressureDiastolic: integer('blood_pressure_diastolic'),
  temperature: integer('temperature'), // stored as tenths of celsius (e.g., 370 = 37.0°C)
  respiratoryRate: integer('respiratory_rate'),
  oxygenSaturation: integer('oxygen_saturation'),
  weight: integer('weight'), // stored as tenths of kg
  height: integer('height'), // stored in cm
  bmi: integer('bmi'), // stored as tenths
  recordedBy: varchar('recorded_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  patientIdIdx: index('vital_signs_patient_id_idx').on(table.patientId),
  recordedAtIdx: index('vital_signs_recorded_at_idx').on(table.recordedAt),
}));

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull().default(30), // minutes
  status: appointmentStatusEnum('status').notNull().default('scheduled'),
  type: appointmentTypeEnum('type').notNull().default('consultation'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  patientIdIdx: index('appointments_patient_id_idx').on(table.patientId),
  doctorIdIdx: index('appointments_doctor_id_idx').on(table.doctorId),
  scheduledAtIdx: index('appointments_scheduled_at_idx').on(table.scheduledAt),
  statusIdx: index('appointments_status_idx').on(table.status),
}));

export const medicalRecords = pgTable('medical_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id, { onDelete: 'set null' }),
  type: medicalRecordTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  attachments: jsonb('attachments').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  patientIdIdx: index('medical_records_patient_id_idx').on(table.patientId),
  doctorIdIdx: index('medical_records_doctor_id_idx').on(table.doctorId),
  appointmentIdIdx: index('medical_records_appointment_id_idx').on(table.appointmentId),
  typeIdx: index('medical_records_type_idx').on(table.type),
}));

export const aiAnalyses = pgTable('ai_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  type: aiAnalysisTypeEnum('type').notNull(),
  input: jsonb('input').notNull(),
  result: jsonb('result'),
  confidence: integer('confidence'), // 0-100
  status: aiAnalysisStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
  patientIdIdx: index('ai_analyses_patient_id_idx').on(table.patientId),
  typeIdx: index('ai_analyses_type_idx').on(table.type),
  statusIdx: index('ai_analyses_status_idx').on(table.status),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  appointmentsAsDoctor: many(appointments, { relationName: 'doctor' }),
  medicalRecordsAsDoctor: many(medicalRecords, { relationName: 'doctor' }),
  aiAnalysesReviewed: many(aiAnalyses, { relationName: 'reviewer' }),
  refreshTokens: many(refreshTokens),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  allergies: many(allergies),
  conditions: many(conditions),
  medications: many(medications),
  vitalSigns: many(vitalSigns),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  aiAnalyses: many(aiAnalyses),
}));

export const allergiesRelations = relations(allergies, ({ one }) => ({
  patient: one(patients, { fields: [allergies.patientId], references: [patients.id] }),
}));

export const conditionsRelations = relations(conditions, ({ one }) => ({
  patient: one(patients, { fields: [conditions.patientId], references: [patients.id] }),
}));

export const medicationsRelations = relations(medications, ({ one }) => ({
  patient: one(patients, { fields: [medications.patientId], references: [patients.id] }),
}));

export const vitalSignsRelations = relations(vitalSigns, ({ one }) => ({
  patient: one(patients, { fields: [vitalSigns.patientId], references: [patients.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(users, { fields: [appointments.doctorId], references: [users.id], relationName: 'doctor' }),
  medicalRecords: many(medicalRecords),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, { fields: [medicalRecords.patientId], references: [patients.id] }),
  doctor: one(users, { fields: [medicalRecords.doctorId], references: [users.id], relationName: 'doctor' }),
  appointment: one(appointments, { fields: [medicalRecords.appointmentId], references: [appointments.id] }),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
  patient: one(patients, { fields: [aiAnalyses.patientId], references: [patients.id] }),
  reviewer: one(users, { fields: [aiAnalyses.reviewedBy], references: [users.id], relationName: 'reviewer' }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));