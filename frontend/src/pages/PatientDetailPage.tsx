import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, Edit, Calendar, FileText, Pill, AlertTriangle, Heart, Brain, Plus, Loader2, MoreVertical, Trash2, Eye, ExternalLink } from 'lucide-react';
import { formatDate, formatDateTime, calculateAge, formatPhoneNumber, calculateBMI, getBMICategory, formatBloodPressure, getBloodPressureCategory, classNames } from '@mediguard/shared/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { patientSchema, vitalSignsSchema, medicationSchema, allergySchema, conditionSchema, appointmentSchema, medicalRecordSchema } from '@mediguard/shared/schemas';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  medicalRecordNumber: string;
  bloodType?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface VitalSign {
  id: string;
  patientId: string;
  recordedAt: string;
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
}

interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  status: string;
  notes?: string;
}

interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  severity: string;
  reaction: string;
  diagnosedAt: string;
  notes?: string;
}

interface Condition {
  id: string;
  patientId: string;
  name: string;
  icd10Code?: string;
  status: string;
  diagnosedAt: string;
  notes?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  notes?: string;
  doctor?: {
    name: string;
  };
}

interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  doctor?: {
    name: string;
  };
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'medications' | 'allergies' | 'conditions' | 'appointments' | 'records'>('overview');
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const fetchPatient = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await api.get<{ data: Patient }>(`/patients/${id}`);
      if (response.data.success && response.data.data) {
        setPatient(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load patient');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVitals = async () => {
    if (!id) return;
    try {
      const response = await api.get<{ data: VitalSign[] }>(`/patients/${id}/vitals`);
      if (response.data.success && response.data.data) {
        setVitals(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load vitals:', err);
    }
  };

  const fetchMedications = async () => {
    if (!id) return;
    try {
      const response = await api.get<{ data: Medication[] }>(`/patients/${id}/medications`);
      if (response.data.success && response.data.data) {
        setMedications(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load medications:', err);
    }
  };

  const fetchAllergies = async () => {
    if (!id) return;
    try {
      const response = await api.get<{ data: Allergy[] }>(`/patients/${id}/allergies`);
      if (response.data.success && response.data.data) {
        setAllergies(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load allergies:', err);
    }
  };

  const fetchConditions = async () => {
    if (!id) return;
    try {
      const response = await api.get<{ data: Condition[] }>(`/patients/${id}/conditions`);
      if (response.data.success && response.data.data) {
        setConditions(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load conditions:', err);
    }
  };

  const fetchAppointments = async () => {
    if (!id) return;
    try {
      const response = await api.get<{ data: Appointment[] }>(`/patients/${id}/appointments`);
      if (response.data.success && response.data.data) {
        setAppointments(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load appointments:', err);
    }
  };

  const fetchRecords = async () => {
    if (!id) return;
    try {
      const response = await api.get<{ data: MedicalRecord[] }>(`/patients/${id}/medical-records`);
      if (response.data.success && response.data.data) {
        setRecords(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load records:', err);
    }
  };

  useEffect(() => {
    fetchPatient();
    fetchVitals();
    fetchMedications();
    fetchAllergies();
    fetchConditions();
    fetchAppointments();
    fetchRecords();
  }, [id]);

  const handleAddVital = async (data: z.infer<typeof vitalSignsSchema>) => {
    try {
      const response = await api.post<{ data: VitalSign }>(`/patients/${id}/vitals`, data);
      if (response.data.success) {
        setShowVitalModal(false);
        fetchVitals();
      }
    } catch (err: any) {
      console.error('Failed to add vital:', err);
    }
  };

  const handleAddMedication = async (data: z.infer<typeof medicationSchema>) => {
    try {
      const response = await api.post<{ data: Medication }>(`/patients/${id}/medications`, data);
      if (response.data.success) {
        setShowMedicationModal(false);
        fetchMedications();
      }
    } catch (err: any) {
      console.error('Failed to add medication:', err);
    }
  };

  const handleAddAllergy = async (data: z.infer<typeof allergySchema>) => {
    try {
      const response = await api.post<{ data: Allergy }>(`/patients/${id}/allergies`, data);
      if (response.data.success) {
        setShowAllergyModal(false);
        fetchAllergies();
      }
    } catch (err: any) {
      console.error('Failed to add allergy:', err);
    }
  };

  const handleAddCondition = async (data: z.infer<typeof conditionSchema>) => {
    try {
      const response = await api.post<{ data: Condition }>(`/patients/${id}/conditions`, data);
      if (response.data.success) {
        setShowConditionModal(false);
        fetchConditions();
      }
    } catch (err: any) {
      console.error('Failed to add condition:', err);
    }
  };

  if (isLoading && !patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unable to load patient</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={() => navigate('/patients')}>Back to Patients</Button>
      </div>
    );
  }

  if (!patient) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Heart },
    { id: 'vitals', label: 'Vitals', icon: Heart, count: vitals.length },
    { id: 'medications', label: 'Medications', icon: Pill, count: medications.length },
    { id: 'allergies', label: 'Allergies', icon: AlertTriangle, count: allergies.length },
    { id: 'conditions', label: 'Conditions', icon: FileText, count: conditions.length },
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: appointments.length },
    { id: 'records', label: 'Records', icon: FileText, count: records.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/patients')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">MRN: {patient.medicalRecordNumber}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/patients/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Patient
          </Button>
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Age</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{calculateAge(patient.dateOfBirth)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDate(patient.dateOfBirth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{patient.gender.replace('_', ' ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Blood Type</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{patient.bloodType || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">{patient.phone ? formatPhoneNumber(patient.phone) : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto pb-px" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={classNames(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 rounded-t-lg transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="w-5 h-5 text-xs flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-gray-900 dark:text-white">{patient.email}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="text-gray-900 dark:text-white">{patient.address}</span>
                  </div>
                )}
                {patient.emergencyContact && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Emergency Contact</p>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>{patient.emergencyContact.name} ({patient.emergencyContact.relationship})</p>
                      <p>{formatPhoneNumber(patient.emergencyContact.phone)}</p>
                      {patient.emergencyContact.email && <p>{patient.emergencyContact.email}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest Vitals */}
            <Card>
              <CardHeader>
                <CardTitle>Latest Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                {vitals.length > 0 ? (
                  <div className="space-y-4">
                    {vitals.slice(0, 3).map((vital) => (
                      <div key={vital.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <Heart className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Recorded {formatDateTime(vital.recordedAt)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Vital Signs</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          {vital.heartRate && (
                            <span className="font-medium text-gray-900 dark:text-white">HR: {vital.heartRate} bpm</span>
                          )}
                          {vital.bloodPressureSystolic && vital.bloodPressureDiastolic && (
                            <span className="font-medium text-gray-900 dark:text-white">BP: {formatBloodPressure(vital.bloodPressureSystolic, vital.bloodPressureDiastolic)}</span>
                          )}
                          {vital.temperature && (
                            <span className="font-medium text-gray-900 dark:text-white">Temp: {vital.temperature}°F</span>
                          )}
                          {vital.oxygenSaturation && (
                            <span className="font-medium text-gray-900 dark:text-white">SpO₂: {vital.oxygenSaturation}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('vitals')}>
                      View All Vitals
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No vital signs recorded</p>
                    <Button size="sm" onClick={() => setShowVitalModal(true)} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vital Signs
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Medications */}
            <Card>
              <CardHeader>
                <CardTitle>Active Medications</CardTitle>
              </CardHeader>
              <CardContent>
                {medications.filter(m => m.status === 'active').length > 0 ? (
                  <div className="space-y-3">
                    {medications.filter(m => m.status === 'active').slice(0, 5).map((med) => (
                      <div key={med.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{med.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{med.dosage} • {med.frequency}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Prescribed by {med.prescribedBy}</p>
                          </div>
                          <Badge variant={med.status === 'active' ? 'success' : 'default'}>{med.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {medications.filter(m => m.status === 'active').length > 5 && (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('medications')}>
                        View All ({medications.filter(m => m.status === 'active').length})
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No active medications</p>
                    <Button size="sm" onClick={() => setShowMedicationModal(true)} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Medication
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card>
              <CardHeader>
                <CardTitle>Allergies</CardTitle>
              </CardHeader>
              <CardContent>
                {allergies.length > 0 ? (
                  <div className="space-y-3">
                    {allergies.slice(0, 5).map((allergy) => (
                      <div key={allergy.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{allergy.allergen}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Reaction: {allergy.reaction}</p>
                          </div>
                          <Badge variant={
                            allergy.severity === 'life_threatening' ? 'destructive' :
                            allergy.severity === 'severe' ? 'warning' :
                            allergy.severity === 'moderate' ? 'default' : 'secondary'
                          }>
                            {allergy.severity.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {allergies.length > 5 && (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setActiveTab('allergies')}>
                        View All ({allergies.length})
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No allergies recorded</p>
                    <Button size="sm" onClick={() => setShowAllergyModal(true)} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Allergy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'vitals' && (
          <VitalsTab vitals={vitals} onAdd={() => setShowVitalModal(true)} patientId={id!} onRefresh={fetchVitals} />
        )}

        {activeTab === 'medications' && (
          <MedicationsTab medications={medications} onAdd={() => setShowMedicationModal(true)} patientId={id!} onRefresh={fetchMedications} />
        )}

        {activeTab === 'allergies' && (
          <AllergiesTab allergies={allergies} onAdd={() => setShowAllergyModal(true)} patientId={id!} onRefresh={fetchAllergies} />
        )}

        {activeTab === 'conditions' && (
          <ConditionsTab conditions={conditions} onAdd={() => setShowConditionModal(true)} patientId={id!} onRefresh={fetchConditions} />
        )}

        {activeTab === 'appointments' && (
          <AppointmentsTab appointments={appointments} onAdd={() => setShowAppointmentModal(true)} patientId={id!} onRefresh={fetchAppointments} />
        )}

        {activeTab === 'records' && (
          <RecordsTab records={records} onAdd={() => setShowRecordModal(true)} patientId={id!} onRefresh={fetchRecords} />
        )}
      </div>

      {/* Modals */}
      {showVitalModal && (
        <VitalModal onClose={() => setShowVitalModal(false)} onSubmit={handleAddVital} isLoading={false} />
      )}
      {showMedicationModal && (
        <MedicationModal onClose={() => setShowMedicationModal(false)} onSubmit={handleAddMedication} isLoading={false} />
      )}
      {showAllergyModal && (
        <AllergyModal onClose={() => setShowAllergyModal(false)} onSubmit={handleAddAllergy} isLoading={false} />
      )}
      {showConditionModal && (
        <ConditionModal onClose={() => setShowConditionModal(false)} onSubmit={handleAddCondition} isLoading={false} />
      )}
    </div>
  );
}

// Tab Components
function VitalsTab({ vitals, onAdd, patientId, onRefresh }: { vitals: VitalSign[]; onAdd: () => void; patientId: string; onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vital Signs</CardTitle>
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add Vital Signs</Button>
      </CardHeader>
      <CardContent>
        {vitals.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No vital signs recorded</p>
            <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add First Vital Signs</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4">Date/Time</th>
                  <th className="px-6 py-4">HR (bpm)</th>
                  <th className="px-6 py-4">BP (mmHg)</th>
                  <th className="px-6 py-4">Temp (°F)</th>
                  <th className="px-6 py-4">RR (/min)</th>
                  <th className="px-6 py-4">SpO₂ (%)</th>
                  <th className="px-6 py-4">Weight (kg)</th>
                  <th className="px-6 py-4">Height (cm)</th>
                  <th className="px-6 py-4">BMI</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {vitals.map((vital) => (
                  <tr key={vital.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{formatDateTime(vital.recordedAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vital.heartRate || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {vital.bloodPressureSystolic && vital.bloodPressureDiastolic
                        ? formatBloodPressure(vital.bloodPressureSystolic, vital.bloodPressureDiastolic)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vital.temperature || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vital.respiratoryRate || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vital.oxygenSaturation || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vital.weight || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vital.height || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{vital.bmi || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{vital.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MedicationsTab({ medications, onAdd, patientId, onRefresh }: { medications: Medication[]; onAdd: () => void; patientId: string; onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medications</CardTitle>
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add Medication</Button>
      </CardHeader>
      <CardContent>
        {medications.length === 0 ? (
          <div className="text-center py-12">
            <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No medications recorded</p>
            <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add First Medication</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4">Medication</th>
                  <th className="px-6 py-4">Dosage</th>
                  <th className="px-6 py-4">Frequency</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">End Date</th>
                  <th className="px-6 py-4">Prescribed By</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {medications.map((med) => (
                  <tr key={med.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{med.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{med.dosage}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{med.frequency}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white capitalize">{med.route}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{formatDate(med.startDate)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{med.endDate ? formatDate(med.endDate) : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{med.prescribedBy}</td>
                    <td className="px-6 py-4">
                      <Badge variant={med.status === 'active' ? 'success' : med.status === 'discontinued' ? 'destructive' : 'default'}>
                        {med.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AllergiesTab({ allergies, onAdd, patientId, onRefresh }: { allergies: Allergy[]; onAdd: () => void; patientId: string; onRefresh: () => void }) {
  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'life_threatening': return 'destructive';
      case 'severe': return 'warning';
      case 'moderate': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Allergies</CardTitle>
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add Allergy</Button>
      </CardHeader>
      <CardContent>
        {allergies.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No allergies recorded</p>
            <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add First Allergy</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {allergies.map((allergy) => (
              <div key={allergy.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{allergy.allergen}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Reaction: {allergy.reaction}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Diagnosed: {formatDate(allergy.diagnosedAt)}</p>
                    {allergy.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{allergy.notes}</p>}
                  </div>
                  <Badge variant={getSeverityVariant(allergy.severity)}>
                    {allergy.severity.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConditionsTab({ conditions, onAdd, patientId, onRefresh }: { conditions: Condition[]; onAdd: () => void; patientId: string; onRefresh: () => void }) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'chronic': return 'warning';
      case 'resolved': return 'success';
      case 'in_remission': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Conditions</CardTitle>
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add Condition</Button>
      </CardHeader>
      <CardContent>
        {conditions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No conditions recorded</p>
            <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add First Condition</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {conditions.map((condition) => (
              <div key={condition.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{condition.name}</p>
                      {condition.icd10Code && (
                        <Badge variant="secondary">{condition.icd10Code}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Diagnosed: {formatDate(condition.diagnosedAt)}</p>
                    {condition.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{condition.notes}</p>}
                  </div>
                  <Badge variant={getStatusVariant(condition.status)}>
                    {condition.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentsTab({ appointments, onAdd, patientId, onRefresh }: { appointments: Appointment[]; onAdd: () => void; patientId: string; onRefresh: () => void }) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'confirmed': return 'success';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'no_show': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Appointments</CardTitle>
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Schedule</Button>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No appointments scheduled</p>
            <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Schedule Appointment</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{appt.type.replace('_', ' ')}</p>
                      <Badge variant={getStatusVariant(appt.status)}>{appt.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(appt.scheduledAt)} • {appt.duration} min</p>
                    {appt.doctor && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Dr. {appt.doctor.name}</p>}
                    {appt.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{appt.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordsTab({ records, onAdd, patientId, onRefresh }: { records: MedicalRecord[]; onAdd: () => void; patientId: string; onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medical Records</CardTitle>
        <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add Record</Button>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No medical records</p>
            <Button onClick={onAdd}><Plus className="w-4 h-4 mr-2" /> Add First Record</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{record.title}</p>
                      <Badge variant="secondary">{record.type.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(record.createdAt)}</p>
                    {record.doctor && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Dr. {record.doctor.name}</p>}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{record.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Modal Components
function VitalModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: z.infer<typeof vitalSignsSchema>) => Promise<void>; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof vitalSignsSchema>>({
    resolver: zodResolver(vitalSignsSchema),
    defaultValues: { recordedAt: new Date().toISOString().slice(0, 16) },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Vital Signs</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input {...register('heartRate')} type="number" label="Heart Rate (bpm)" placeholder="72" error={errors.heartRate?.message} disabled={isLoading} />
            <Input {...register('respiratoryRate')} type="number" label="Respiratory Rate (/min)" placeholder="16" error={errors.respiratoryRate?.message} disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register('bloodPressureSystolic')} type="number" label="Systolic BP (mmHg)" placeholder="120" error={errors.bloodPressureSystolic?.message} disabled={isLoading} />
            <Input {...register('bloodPressureDiastolic')} type="number" label="Diastolic BP (mmHg)" placeholder="80" error={errors.bloodPressureDiastolic?.message} disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register('temperature')} type="number" step="0.1" label="Temperature (°F)" placeholder="98.6" error={errors.temperature?.message} disabled={isLoading} />
            <Input {...register('oxygenSaturation')} type="number" label="SpO₂ (%)" placeholder="98" error={errors.oxygenSaturation?.message} disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register('weight')} type="number" step="0.1" label="Weight (kg)" placeholder="70" error={errors.weight?.message} disabled={isLoading} />
            <Input {...register('height')} type="number" step="0.1" label="Height (cm)" placeholder="175" error={errors.height?.message} disabled={isLoading} />
          </div>
          <Input {...register('notes')} label="Notes" placeholder="Additional notes..." error={errors.notes?.message} disabled={isLoading} />
          <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>{isLoading ? 'Saving...' : 'Save Vital Signs'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MedicationModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: z.infer<typeof medicationSchema>) => Promise<void>; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof medicationSchema>>({
    resolver: zodResolver(medicationSchema),
    defaultValues: { route: 'oral', startDate: new Date().toISOString().slice(0, 10) },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Medication</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input {...register('name')} label="Medication Name" placeholder="Lisinopril" error={errors.name?.message} disabled={isLoading} />
          <div className="grid grid-cols-2 gap-4">
            <Input {...register('dosage')} label="Dosage" placeholder="10mg" error={errors.dosage?.message} disabled={isLoading} />
            <Input {...register('frequency')} label="Frequency" placeholder="Once daily" error={errors.frequency?.message} disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Route</label>
              <select {...register('route')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" disabled={isLoading}>
                <option value="oral">Oral</option>
                <option value="topical">Topical</option>
                <option value="injection">Injection</option>
                <option value="inhalation">Inhalation</option>
                <option value="intravenous">Intravenous</option>
                <option value="subcutaneous">Subcutaneous</option>
              </select>
            </div>
            <Input {...register('startDate')} type="date" label="Start Date" error={errors.startDate?.message} disabled={isLoading} />
          </div>
          <Input {...register('endDate')} type="date" label="End Date (optional)" error={errors.endDate?.message} disabled={isLoading} />
          <Input {...register('prescribedBy')} label="Prescribed By" placeholder="Dr. Smith" error={errors.prescribedBy?.message} disabled={isLoading} />
          <Input {...register('notes')} label="Notes" placeholder="Additional notes..." error={errors.notes?.message} disabled={isLoading} />
          <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>{isLoading ? 'Saving...' : 'Save Medication'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AllergyModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: z.infer<typeof allergySchema>) => Promise<void>; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof allergySchema>>({
    resolver: zodResolver(allergySchema),
    defaultValues: { severity: 'mild', diagnosedAt: new Date().toISOString().slice(0, 10) },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Allergy</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input {...register('allergen')} label="Allergen" placeholder="Penicillin" error={errors.allergen?.message} disabled={isLoading} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
              <select {...register('severity')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" disabled={isLoading}>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="life_threatening">Life Threatening</option>
              </select>
            </div>
            <Input {...register('diagnosedAt')} type="date" label="Diagnosed Date" error={errors.diagnosedAt?.message} disabled={isLoading} />
          </div>
          <Input {...register('reaction')} label="Reaction" placeholder="Hives, swelling" error={errors.reaction?.message} disabled={isLoading} />
          <Input {...register('notes')} label="Notes" placeholder="Additional notes..." error={errors.notes?.message} disabled={isLoading} />
          <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>{isLoading ? 'Saving...' : 'Save Allergy'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConditionModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: z.infer<typeof conditionSchema>) => Promise<void>; isLoading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof conditionSchema>>({
    resolver: zodResolver(conditionSchema),
    defaultValues: { status: 'active', diagnosedAt: new Date().toISOString().slice(0, 10) },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Condition</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input {...register('name')} label="Condition Name" placeholder="Hypertension" error={errors.name?.message} disabled={isLoading} />
          <Input {...register('icd10Code')} label="ICD-10 Code (optional)" placeholder="I10" error={errors.icd10Code?.message} disabled={isLoading} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select {...register('status')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" disabled={isLoading}>
                <option value="active">Active</option>
                <option value="chronic">Chronic</option>
                <option value="resolved">Resolved</option>
                <option value="in_remission">In Remission</option>
              </select>
            </div>
            <Input {...register('diagnosedAt')} type="date" label="Diagnosed Date" error={errors.diagnosedAt?.message} disabled={isLoading} />
          </div>
          <Input {...register('notes')} label="Notes" placeholder="Additional notes..." error={errors.notes?.message} disabled={isLoading} />
          <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" isLoading={isLoading}>{isLoading ? 'Saving...' : 'Save Condition'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}