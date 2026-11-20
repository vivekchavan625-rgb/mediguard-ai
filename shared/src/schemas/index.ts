import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['doctor', 'nurse', 'patient']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: z.string().min(1, 'Emergency contact phone is required'),
    email: z.string().email().optional().or(z.literal('')),
  }).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
});

export const vitalSignsSchema = z.object({
  heartRate: z.number().int().positive().optional(),
  bloodPressureSystolic: z.number().int().positive().optional(),
  bloodPressureDiastolic: z.number().int().positive().optional(),
  temperature: z.number().positive().optional(),
  respiratoryRate: z.number().int().positive().optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  route: z.enum(['oral', 'topical', 'injection', 'inhalation', 'intravenous', 'subcutaneous']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date').optional(),
  prescribedBy: z.string().min(1, 'Prescriber is required'),
  notes: z.string().optional(),
});

export const allergySchema = z.object({
  allergen: z.string().min(1, 'Allergen is required'),
  severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening']),
  reaction: z.string().min(1, 'Reaction is required'),
  diagnosedAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
});

export const conditionSchema = z.object({
  name: z.string().min(1, 'Condition name is required'),
  icd10Code: z.string().optional(),
  status: z.enum(['active', 'resolved', 'chronic', 'in_remission']),
  diagnosedAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  notes: z.string().optional(),
});

export const appointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().uuid('Invalid doctor ID'),
  scheduledAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  duration: z.number().int().positive(),
  type: z.enum(['consultation', 'follow_up', 'emergency', 'routine_checkup', 'procedure']),
  notes: z.string().optional(),
});

export const medicalRecordSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().uuid('Invalid doctor ID'),
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
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export const aiAnalysisSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  type: z.enum([
    'diagnosis_assistance',
    'risk_assessment',
    'treatment_recommendation',
    'drug_interaction_check',
    'vital_signs_anomaly',
  ]),
  input: z.record(z.unknown()),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  patientId: z.string().uuid().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  doctorId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type VitalSignsInput = z.infer<typeof vitalSignsSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
export type AllergyInput = z.infer<typeof allergySchema>;
export type ConditionInput = z.infer<typeof conditionSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
export type AIAnalysisInput = z.infer<typeof aiAnalysisSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;