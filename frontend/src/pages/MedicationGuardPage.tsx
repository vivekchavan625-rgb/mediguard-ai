import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, AlertTriangle, CheckCircle, Pill, Search, Loader2 } from 'lucide-react';

interface Medication {
  id: string;
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

interface InteractionResult {
  interactions: Array<{
    drug1: string;
    drug2: string;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    description: string;
    management: string;
  }>;
  recommendations: string[];
}

const patientSearchSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
});

export default function MedicationGuardPage() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [analysis, setAnalysis] = useState<InteractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMeds, setIsLoadingMeds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof patientSearchSchema>>({
    resolver: zodResolver(patientSearchSchema),
  });

  const handleCheckInteractions = async (data: z.infer<typeof patientSearchSchema>) => {
    if (!data.patientId) return;

    setIsLoading(true);
    setIsLoadingMeds(true);
    setError(null);
    setAnalysis(null);

    try {
      const medsResponse = await api.get<{ data: Medication[] }>(`/patients/${data.patientId}/medications`);
      if (medsResponse.data.data) {
        setMedications(medsResponse.data.data);
      }

      const response = await api.post<{ data: InteractionResult }>('/ai/analyze', {
        patientId: data.patientId,
        type: 'drug_interaction_check',
        input: {
          medications: (medsResponse.data.data || []).filter(m => m.status === 'active').map(m => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            route: m.route,
          })),
        },
      });

      if (response.data.data) {
        setAnalysis(response.data.data);
      } else {
        throw new Error('Drug interaction check failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred while checking drug interactions');
    } finally {
      setIsLoading(false);
      setIsLoadingMeds(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      minor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      major: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[severity] || colors.minor;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'major': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'moderate': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Medication Guard</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drug Interaction Checker</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit(handleCheckInteractions)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  {...register('patientId')}
                  type="text"
                  placeholder="Enter patient UUID"
                  className="pl-10"
                  disabled={isLoading || isLoadingMeds}
                />
              </div>
              {errors.patientId && <p className="text-xs text-red-500 mt-1">{errors.patientId.message}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => reset()} disabled={isLoading || isLoadingMeds}>
                Clear
              </Button>
              <Button type="submit" isLoading={isLoading || isLoadingMeds} disabled={isLoading || isLoadingMeds}>
                {(isLoading || isLoadingMeds) ? 'Checking...' : 'Check Interactions'}
              </Button>
            </div>
          </form>

          {isLoadingMeds && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          )}

          {medications.length > 0 && !isLoadingMeds && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Pill className="w-5 h-5" /> Active Medications ({medications.filter(m => m.status === 'active').length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {medications.filter(m => m.status === 'active').map((med) => (
                  <div key={med.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{med.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{med.dosage} • {med.frequency} • {med.route}</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {medications.length === 0 && !isLoadingMeds && (
            <div className="mt-6 text-center py-8">
              <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No medications found for this patient</p>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Drug Interaction Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.interactions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Interactions Found</h3>
                <p className="text-gray-500 dark:text-gray-400">No significant drug interactions detected among the patient's active medications.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Found {analysis.interactions.length} potential interaction{analysis.interactions.length > 1 ? 's' : ''}
                  </h3>
                </div>
                <div className="space-y-4">
                  {analysis.interactions.map((interaction, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">{interaction.drug1}</span>
                            <span className="text-gray-400">+</span>
                            <span className="font-medium text-gray-900 dark:text-white">{interaction.drug2}</span>
                            <Badge className={getSeverityColor(interaction.severity)} ml-2>
                              {interaction.severity.charAt(0).toUpperCase() + interaction.severity.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">{interaction.description}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Management:</strong> {interaction.management}</p>
                        </div>
                        {getSeverityIcon(interaction.severity)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recommendations</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-sm text-gray-500 dark:text-gray-400">
              <p><strong>Disclaimer:</strong> This analysis is generated by AI for clinical decision support only.
              It should not replace professional medical judgment. Always consult with a healthcare provider
              before making medication changes.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}