export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PATIENT = 'patient',
}

export interface Patient {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  medicalRecordNumber: string;
  bloodType?: BloodType;
  allergies: Allergy[];
  conditions: Condition[];
  medications: Medication[];
  vitalSigns: VitalSigns[];
  createdAt: Date;
  updatedAt: Date;
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: AllergySeverity;
  reaction: string;
  diagnosedAt: Date;
}

export enum AllergySeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  LIFE_THREATENING = 'life_threatening',
}

export interface Condition {
  id: string;
  name: string;
  icd10Code?: string;
  status: ConditionStatus;
  diagnosedAt: Date;
  notes?: string;
}

export enum ConditionStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CHRONIC = 'chronic',
  IN_REMISSION = 'in_remission',
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
  notes?: string;
}

export enum MedicationRoute {
  ORAL = 'oral',
  TOPICAL = 'topical',
  INJECTION = 'injection',
  INHALATION = 'inhalation',
  INTRAVENOUS = 'intravenous',
  SUBCUTANEOUS = 'subcutaneous',
}

export interface VitalSigns {
  id: string;
  recordedAt: Date;
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedBy: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum AppointmentType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  ROUTINE_CHECKUP = 'routine_checkup',
  PROCEDURE = 'procedure',
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  type: MedicalRecordType;
  title: string;
  content: string;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export enum MedicalRecordType {
  CONSULTATION_NOTE = 'consultation_note',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
  PRESCRIPTION = 'prescription',
  REFERRAL = 'referral',
  DISCHARGE_SUMMARY = 'discharge_summary',
  OPERATIVE_NOTE = 'operative_note',
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface AIAnalysis {
  id: string;
  patientId: string;
  type: AIAnalysisType;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  confidence: number;
  status: AIAnalysisStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export enum AIAnalysisType {
  DIAGNOSIS_ASSISTANCE = 'diagnosis_assistance',
  RISK_ASSESSMENT = 'risk_assessment',
  TREATMENT_RECOMMENDATION = 'treatment_recommendation',
  DRUG_INTERACTION_CHECK = 'drug_interaction_check',
  VITAL_SIGNS_ANOMALY = 'vital_signs_anomaly',
}

export enum AIAnalysisStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
  REJECTED = 'rejected',
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}