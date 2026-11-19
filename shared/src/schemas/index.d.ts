import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}>;
export declare const registerSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    name: z.ZodString;
    role: z.ZodOptional<z.ZodEnum<["doctor", "nurse", "patient"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
    role?: "doctor" | "nurse" | "patient" | undefined;
}, {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
    role?: "doctor" | "nurse" | "patient" | undefined;
}>, {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
    role?: "doctor" | "nurse" | "patient" | undefined;
}, {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
    role?: "doctor" | "nurse" | "patient" | undefined;
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
        name: string;
        phone: string;
        relationship: string;
        email?: string | undefined;
    }, {
        name: string;
        phone: string;
        relationship: string;
        email?: string | undefined;
    }>>;
    bloodType: z.ZodOptional<z.ZodEnum<["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]>>;
}, "strip", z.ZodTypeAny, {
    gender: "male" | "female" | "other" | "prefer_not_to_say";
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone?: string | undefined;
    address?: string | undefined;
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
        email?: string | undefined;
    } | undefined;
    bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | undefined;
}, {
    gender: "male" | "female" | "other" | "prefer_not_to_say";
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone?: string | undefined;
    address?: string | undefined;
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
        email?: string | undefined;
    } | undefined;
    bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | undefined;
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
    temperature?: number | undefined;
    weight?: number | undefined;
    height?: number | undefined;
    heartRate?: number | undefined;
    bloodPressureSystolic?: number | undefined;
    bloodPressureDiastolic?: number | undefined;
    respiratoryRate?: number | undefined;
    oxygenSaturation?: number | undefined;
}, {
    temperature?: number | undefined;
    weight?: number | undefined;
    height?: number | undefined;
    heartRate?: number | undefined;
    bloodPressureSystolic?: number | undefined;
    bloodPressureDiastolic?: number | undefined;
    respiratoryRate?: number | undefined;
    oxygenSaturation?: number | undefined;
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
    name: string;
    dosage: string;
    frequency: string;
    route: "oral" | "topical" | "injection" | "inhalation" | "intravenous" | "subcutaneous";
    startDate: string;
    prescribedBy: string;
    notes?: string | undefined;
    endDate?: string | undefined;
}, {
    name: string;
    dosage: string;
    frequency: string;
    route: "oral" | "topical" | "injection" | "inhalation" | "intravenous" | "subcutaneous";
    startDate: string;
    prescribedBy: string;
    notes?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const allergySchema: z.ZodObject<{
    allergen: z.ZodString;
    severity: z.ZodEnum<["mild", "moderate", "severe", "life_threatening"]>;
    reaction: z.ZodString;
    diagnosedAt: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    allergen: string;
    severity: "mild" | "moderate" | "severe" | "life_threatening";
    reaction: string;
    diagnosedAt: string;
}, {
    allergen: string;
    severity: "mild" | "moderate" | "severe" | "life_threatening";
    reaction: string;
    diagnosedAt: string;
}>;
export declare const conditionSchema: z.ZodObject<{
    name: z.ZodString;
    icd10Code: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["active", "resolved", "chronic", "in_remission"]>;
    diagnosedAt: z.ZodEffects<z.ZodString, string, string>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: "active" | "resolved" | "chronic" | "in_remission";
    diagnosedAt: string;
    notes?: string | undefined;
    icd10Code?: string | undefined;
}, {
    name: string;
    status: "active" | "resolved" | "chronic" | "in_remission";
    diagnosedAt: string;
    notes?: string | undefined;
    icd10Code?: string | undefined;
}>;
export declare const appointmentSchema: z.ZodObject<{
    patientId: z.ZodString;
    doctorId: z.ZodString;
    scheduledAt: z.ZodEffects<z.ZodString, string, string>;
    duration: z.ZodNumber;
    type: z.ZodEnum<["consultation", "follow_up", "emergency", "routine_checkup", "procedure"]>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    type: "consultation" | "follow_up" | "emergency" | "routine_checkup" | "procedure";
    patientId: string;
    doctorId: string;
    scheduledAt: string;
    notes?: string | undefined;
}, {
    duration: number;
    type: "consultation" | "follow_up" | "emergency" | "routine_checkup" | "procedure";
    patientId: string;
    doctorId: string;
    scheduledAt: string;
    notes?: string | undefined;
}>;
export declare const medicalRecordSchema: z.ZodObject<{
    patientId: z.ZodString;
    doctorId: z.ZodString;
    appointmentId: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["consultation_note", "lab_result", "imaging", "prescription", "referral", "discharge_summary", "operative_note"]>;
    title: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "consultation_note" | "lab_result" | "imaging" | "prescription" | "referral" | "discharge_summary" | "operative_note";
    title: string;
    content: string;
    patientId: string;
    doctorId: string;
    appointmentId?: string | undefined;
}, {
    type: "consultation_note" | "lab_result" | "imaging" | "prescription" | "referral" | "discharge_summary" | "operative_note";
    title: string;
    content: string;
    patientId: string;
    doctorId: string;
    appointmentId?: string | undefined;
}>;
export declare const aiAnalysisSchema: z.ZodObject<{
    patientId: z.ZodString;
    type: z.ZodEnum<["diagnosis_assistance", "risk_assessment", "treatment_recommendation", "drug_interaction_check", "vital_signs_anomaly"]>;
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "diagnosis_assistance" | "risk_assessment" | "treatment_recommendation" | "drug_interaction_check" | "vital_signs_anomaly";
    input: Record<string, unknown>;
    patientId: string;
}, {
    type: "diagnosis_assistance" | "risk_assessment" | "treatment_recommendation" | "drug_interaction_check" | "vital_signs_anomaly";
    input: Record<string, unknown>;
    patientId: string;
}>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
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