import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as schema from './schema';

export const client = new PGlite('./pglite-data');

export const db = drizzle(client, { schema });

export async function initializeDb(): Promise<void> {
  await client.ready;

  // Create enum types (IF NOT EXISTS not supported for types, so try/catch)
  const enumTypes = [
    "CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'nurse', 'patient')",
    "CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say')",
    "CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')",
    "CREATE TYPE allergy_severity AS ENUM ('mild', 'moderate', 'severe', 'life_threatening')",
    "CREATE TYPE condition_status AS ENUM ('active', 'resolved', 'chronic', 'in_remission')",
    "CREATE TYPE medication_route AS ENUM ('oral', 'topical', 'injection', 'inhalation', 'intravenous', 'subcutaneous')",
    "CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')",
    "CREATE TYPE appointment_type AS ENUM ('consultation', 'follow_up', 'emergency', 'routine_checkup', 'procedure')",
    "CREATE TYPE medical_record_type AS ENUM ('consultation_note', 'lab_result', 'imaging', 'prescription', 'referral', 'discharge_summary', 'operative_note')",
    "CREATE TYPE ai_analysis_type AS ENUM ('diagnosis_assistance', 'risk_assessment', 'treatment_recommendation', 'drug_interaction_check', 'vital_signs_anomaly')",
    "CREATE TYPE ai_analysis_status AS ENUM ('pending', 'completed', 'reviewed', 'rejected')",
  ];

  for (const sql of enumTypes) {
    try {
      await client.exec(sql);
    } catch {
      // Type already exists — ignore
    }
  }

  // Create tables
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role user_role NOT NULL DEFAULT 'patient',
      avatar VARCHAR(500),
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS patients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender gender NOT NULL,
      phone VARCHAR(20),
      address TEXT,
      emergency_contact JSONB,
      medical_record_number VARCHAR(50) NOT NULL UNIQUE,
      blood_type blood_type,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS allergies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      allergen VARCHAR(255) NOT NULL,
      severity allergy_severity NOT NULL,
      reaction TEXT NOT NULL,
      diagnosed_at DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conditions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      icd10_code VARCHAR(20),
      status condition_status NOT NULL DEFAULT 'active',
      diagnosed_at DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      dosage VARCHAR(100) NOT NULL,
      frequency VARCHAR(100) NOT NULL,
      route medication_route NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      prescribed_by VARCHAR(255) NOT NULL,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vital_signs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
      heart_rate INTEGER,
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      temperature INTEGER,
      respiratory_rate INTEGER,
      oxygen_saturation INTEGER,
      weight INTEGER,
      height INTEGER,
      bmi INTEGER,
      recorded_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheduled_at TIMESTAMP NOT NULL,
      duration INTEGER NOT NULL DEFAULT 30,
      status appointment_status NOT NULL DEFAULT 'scheduled',
      type appointment_type NOT NULL DEFAULT 'consultation',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
      type medical_record_type NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      attachments JSONB DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      type ai_analysis_type NOT NULL,
      input JSONB NOT NULL,
      result JSONB,
      confidence INTEGER,
      status ai_analysis_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.exec(`
    CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
    CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
    CREATE INDEX IF NOT EXISTS patients_user_id_idx ON patients(user_id);
    CREATE INDEX IF NOT EXISTS patients_mrn_idx ON patients(medical_record_number);
    CREATE INDEX IF NOT EXISTS patients_name_idx ON patients(last_name, first_name);
    CREATE INDEX IF NOT EXISTS allergies_patient_id_idx ON allergies(patient_id);
    CREATE INDEX IF NOT EXISTS conditions_patient_id_idx ON conditions(patient_id);
    CREATE INDEX IF NOT EXISTS medications_patient_id_idx ON medications(patient_id);
    CREATE INDEX IF NOT EXISTS vital_signs_patient_id_idx ON vital_signs(patient_id);
    CREATE INDEX IF NOT EXISTS vital_signs_recorded_at_idx ON vital_signs(recorded_at);
    CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS appointments_scheduled_at_idx ON appointments(scheduled_at);
    CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
    CREATE INDEX IF NOT EXISTS medical_records_patient_id_idx ON medical_records(patient_id);
    CREATE INDEX IF NOT EXISTS medical_records_doctor_id_idx ON medical_records(doctor_id);
    CREATE INDEX IF NOT EXISTS medical_records_appointment_id_idx ON medical_records(appointment_id);
    CREATE INDEX IF NOT EXISTS medical_records_type_idx ON medical_records(type);
    CREATE INDEX IF NOT EXISTS ai_analyses_patient_id_idx ON ai_analyses(patient_id);
    CREATE INDEX IF NOT EXISTS ai_analyses_type_idx ON ai_analyses(type);
    CREATE INDEX IF NOT EXISTS ai_analyses_status_idx ON ai_analyses(status);
    CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);
  `);

  await seedDemoData();
}

async function seedDemoData(): Promise<void> {
  const demoUserId = uuidv4();
  const demoPatientId = uuidv4();

  // Skip if demo user already exists
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'demo@mediguard.ai'))
    .limit(1);

  if (existing) return;

  const passwordHash = await bcrypt.hash('Demo123!', 12);

  await db.insert(schema.users).values({
    id: demoUserId,
    email: 'demo@mediguard.ai',
    passwordHash,
    name: 'Demo Doctor',
    role: 'doctor',
    isActive: true,
  } as any);

  await db.insert(schema.patients).values({
    id: demoPatientId,
    userId: demoUserId,
    firstName: 'Demo',
    lastName: 'Patient',
    dateOfBirth: new Date('1980-01-15'),
    gender: 'male',
    phone: '+1-555-0100',
    address: '123 Demo Street, Demo City, DC 10001',
    emergencyContact: JSON.stringify({
      name: 'Emergency Contact',
      relationship: 'Spouse',
      phone: '+1-555-0199',
      email: 'emergency@demo.com',
    }),
    medicalRecordNumber: 'MRN-DEMO001',
    bloodType: 'A+',
    isActive: true,
  } as any);
}

export async function testConnection(): Promise<boolean> {
  try {
    await client.ready;
    await client.query('SELECT 1');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await client.close();
}
