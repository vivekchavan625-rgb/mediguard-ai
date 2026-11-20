import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { ApiResponse } from '../utils/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, MoreVertical, Edit, Eye, Trash2, Loader2 } from 'lucide-react';
import { formatDate, calculateAge, classNames } from '@mediguard/shared/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { patientSchema } from '@mediguard/shared/schemas';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  medicalRecordNumber: string;
  bloodType?: string;
  createdAt: string;
}

interface PatientsResponse {
  data: Patient[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const filterSchema = z.object({
  search: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

type FilterForm = z.infer<typeof filterSchema>;

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterForm>({
    resolver: zodResolver(filterSchema),
    defaultValues: { page: 1, limit: 20 },
  });

  const fetchPatients = async (params?: Partial<FilterForm>) => {
    try {
      setIsLoading(true);
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

      const response = await api.get<ApiResponse<PatientsResponse>>(`/patients?${searchParams.toString()}`);

      if (response.data.success && response.data.data) {
        setPatients(response.data.data.data);
        setMeta(response.data.data.meta);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients({ ...meta, page: 1 });
  };

  const handlePageChange = (page: number) => {
    fetchPatients({ ...meta, page });
  };

  const handleCreatePatient = async (data: z.infer<typeof patientSchema>) => {
    try {
      setCreating(true);
      const response = await api.post<ApiResponse<Patient>>('/patients', data);
      if (response.data.success) {
        setShowCreateModal(false);
        reset();
        fetchPatients({ ...meta, page: 1 });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create patient');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this patient?')) return;
    try {
      await api.delete(`/patients/${id}`);
      fetchPatients(meta);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete patient');
    }
  };

  const getGenderBadge = (gender: string) => {
    const colors = {
      male: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      female: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      other: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      prefer_not_to_say: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[gender as keyof typeof colors] || colors.other;
  };

  if (isLoading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage patient records and information</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('search')}
                type="text"
                placeholder="Search by name, MRN, email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <Button type="submit" variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr className="text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4 hidden md:table-cell">DOB / Age</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Gender</th>
                  <th className="px-6 py-4">MRN</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Blood Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400">No patients found</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Get started by adding a new patient</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-primary-700 dark:text-primary-300 font-medium">
                              {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {patient.phone ? formatPhoneNumber(patient.phone) : 'No phone'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatDate(patient.dateOfBirth)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Age: {calculateAge(patient.dateOfBirth)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGenderBadge(patient.gender)}`}>
                          {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">
                        {patient.medicalRecordNumber}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {patient.bloodType || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/patients/${patient.id}/edit`)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} patients
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 text-sm text-gray-700 dark:text-gray-300">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page === meta.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Patient Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Patient</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <CreatePatientForm onSubmit={handleCreatePatient} onClose={() => setShowCreateModal(false)} isLoading={creating} />
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePatientForm({ onSubmit, onClose, isLoading }: { onSubmit: (data: z.infer<typeof patientSchema>) => Promise<void>; onClose: () => void; isLoading: boolean }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: 'male',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input {...register('firstName')} label="First Name" placeholder="John" error={errors.firstName?.message} disabled={isLoading} />
        <Input {...register('lastName')} label="Last Name" placeholder="Doe" error={errors.lastName?.message} disabled={isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input {...register('dateOfBirth')} type="date" label="Date of Birth" error={errors.dateOfBirth?.message} disabled={isLoading} />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
          <select {...register('gender')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" disabled={isLoading}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>

      <Input {...register('phone')} type="tel" label="Phone" placeholder="(555) 123-4567" error={errors.phone?.message} disabled={isLoading} />

      <Input {...register('address')} label="Address" placeholder="123 Main St, City, State" error={errors.address?.message} disabled={isLoading} />

      <Input {...register('bloodType')} label="Blood Type" placeholder="A+" error={errors.bloodType?.message} disabled={isLoading} />

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input {...register('emergencyContact.name')} label="Name" placeholder="Jane Doe" error={errors.emergencyContact?.name?.message} disabled={isLoading} />
          <Input {...register('emergencyContact.relationship')} label="Relationship" placeholder="Spouse" error={errors.emergencyContact?.relationship?.message} disabled={isLoading} />
          <Input {...register('emergencyContact.phone')} type="tel" label="Phone" placeholder="(555) 123-4567" error={errors.emergencyContact?.phone?.message} disabled={isLoading} />
          <Input {...register('emergencyContact.email')} type="email" label="Email" placeholder="jane@email.com" error={errors.emergencyContact?.email?.message} disabled={isLoading} />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {isLoading ? 'Creating...' : 'Create Patient'}
        </Button>
      </div>
    </form>
  );
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}