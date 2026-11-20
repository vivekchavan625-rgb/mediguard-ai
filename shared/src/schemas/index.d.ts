import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    rememberMe?: boolean;
}, {
    email?: string;
    password?: string;
    rememberMe?: boolean;
}>;
export declare const registerSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    name: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<["doctor", "nurse", "patient"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    role?: "doctor" | "nurse" | "patient";
    password?: string;
    confirmPassword?: string;
}, {
    name?: string;
    email?: string;
    role?: "doctor" | "nurse" | "patient";
    password?: string;
    confirmPassword?: string;
}>, {
    name?: string;
    email?: string;
    role?: "doctor" | "nurse" | "patient";
    password?: string;
    confirmPassword?: string;
}, {
    name?: string;
    email?: string;
    role?: "doctor" | "nurse" | "patient";
    password?: string;
    confirmPassword?: string;
}>;
export declare const patientSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    dateOfBirth: z.ZodEffects<z.ZodString, string, string>;
    gender: z.ZodEnum<["male", "female", "other", "prefer_not_to_say"]>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    emergencyContact: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        relationship: z.ZodString;
        phone: z.ZodString;
        email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        email?: string;
        phone?: string;
        relationship?: string;
    }, {
        name?: string;
        email?: string;
        phone?: string;
        relationship?: string;
    }>>;
    bloodType: z.ZodOptional<z.ZodEnum<["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]>>;
}, "strip", z.ZodTypeAny, {
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phone?: string;
    address?: string;
    emergencyContact?: {
        name?: string;
        email?: string;
        phone?: string;
        relationship?: string;
    };
    bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
}, {
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phone?: string;
    address?: string;
    emergencyContact?: {
        name?: string;
        email?: string;
        phone?: string;
        relationship?: string;
    };
    bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
}>;
export declare const vitalSignsSchema: z.ZodObject<{
    heartRate: z.ZodOptional<z.ZodNumber>;
    bloodPressureSystolic: z.ZodOptional<z.ZodNumber>;
    bloodPressureDiastolic: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
    respiratoryRate: z.ZodOptional<z.ZodNumber>;
    oxygenSaturation: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
}, {
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
}>;
export declare const medicationSchema: z.ZodObject<{
    name: z.ZodString;
    dosage: z.ZodString;
    frequency: z.ZodString;
    route: z.ZodEnum<["oral", "topical", "injection", "inhalation", "intravenous", "subcutaneous"]>;
    startDate: z.ZodEffects<z.ZodString, string, string>;
    endDate: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    prescribedBy: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    route?: "oral" | "topical" | "injection" | "inhalation" | "intravenous" | "subcutaneous";
    name?: string;
    notes?: string;
    dosage?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string;
    prescribedBy?: string;
}, {
    route?: "oral" | "topical" | "injection" | "inhalation" | "intravenous" | "subcutaneous";
    name?: string;
    notes?: string;
    dosage?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string;
    prescribedBy?: string;
}>;
export declare const allergySchema: z.ZodObject<{
    allergen: z.ZodString;
    severity: z.ZodEnum<["mild", "moderate", "severe", "life_threatening"]>;
    reaction: z.ZodString;
    diagnosedAt: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    allergen?: string;
    severity?: "mild" | "moderate" | "severe" | "life_threatening";
    reaction?: string;
    diagnosedAt?: string;
}, {
    allergen?: string;
    severity?: "mild" | "moderate" | "severe" | "life_threatening";
    reaction?: string;
    diagnosedAt?: string;
}>;
export declare const conditionSchema: z.ZodObject<{
    name: z.ZodString;
    icd10Code: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["active", "resolved", "chronic", "in_remission"]>;
    diagnosedAt: z.ZodEffects<z.ZodString, string, string>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    diagnosedAt?: string;
    icd10Code?: string;
    status?: "active" | "resolved" | "chronic" | "in_remission";
    notes?: string;
}, {
    name?: string;
    diagnosedAt?: string;
    icd10Code?: string;
    status?: "active" | "resolved" | "chronic" | "in_remission";
    notes?: string;
}>;
export declare const appointmentSchema: z.ZodObject<{
    patientId: z.ZodString;
    doctorId: z.ZodString;
    scheduledAt: z.ZodEffects<z.ZodString, string, string>;
    duration: z.ZodNumber;
    type: z.ZodEnum<["consultation", "follow_up", "emergency", "routine_checkup", "procedure"]>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientId?: string;
    notes?: string;
    doctorId?: string;
    scheduledAt?: string;
    duration?: number;
    type?: "consultation" | "follow_up" | "emergency" | "routine_checkup" | "procedure";
}, {
    patientId?: string;
    notes?: string;
    doctorId?: string;
    scheduledAt?: string;
    duration?: number;
    type?: "consultation" | "follow_up" | "emergency" | "routine_checkup" | "procedure";
}>;
export declare const medicalRecordSchema: z.ZodObject<{
    patientId: z.ZodString;
    doctorId: z.ZodString;
    appointmentId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["consultation_note", "lab_result", "imaging", "prescription", "referral", "discharge_summary", "operative_note"]>;
    title: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    patientId?: string;
    doctorId?: string;
    type?: "consultation_note" | "lab_result" | "imaging" | "prescription" | "referral" | "discharge_summary" | "operative_note";
    appointmentId?: string;
    title?: string;
    content?: string;
}, {
    patientId?: string;
    doctorId?: string;
    type?: "consultation_note" | "lab_result" | "imaging" | "prescription" | "referral" | "discharge_summary" | "operative_note";
    appointmentId?: string;
    title?: string;
    content?: string;
}>;
export declare const aiAnalysisSchema: z.ZodObject<{
    patientId: z.ZodString;
    type: z.ZodEnum<["diagnosis_assistance", "risk_assessment", "treatment_recommendation", "drug_interaction_check", "vital_signs_anomaly"]>;
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    patientId?: string;
    type?: "diagnosis_assistance" | "risk_assessment" | "treatment_recommendation" | "drug_interaction_check" | "vital_signs_anomaly";
    input?: Record<string, unknown>;
}, {
    patientId?: string;
    type?: "diagnosis_assistance" | "risk_assessment" | "treatment_recommendation" | "drug_interaction_check" | "vital_signs_anomaly";
    input?: Record<string, unknown>;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    patientId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    doctorId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    type?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}, {
    patientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    type?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}>;
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
//# sourceMappingURL=index.d.ts.map