import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import api, { ApiResponse } from '../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

const symptomSchema = z.object({
  description: z.string().min(10, 'Please describe your symptoms (at least 10 characters).'),
  location: z.string().optional(),
  duration: z.string().optional(),
  painLevel: z.preprocess((val) => typeof val === 'string' ? Number(val) : val, z.number().min(1).max(10).optional()),
});

interface AiAnalysisResponse {
  triage: 'urgent' | 'non-urgent' | 'self-care';
  suggestedAction: string;
  possibleDiagnoses: string[];
  confidence?: number;
}

export default function SymptomAnalyzerPage() {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AiAnalysisResponse | null>(null);
  const [quickCheck, setQuickCheck] = useState<AiAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof symptomSchema>>({
    resolver: zodResolver(symptomSchema),
  });

  const onSubmit = async (data: z.infer<typeof symptomSchema>) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setQuickCheck(null);
    try {
      const analyzeResp = await api.post<ApiResponse<AiAnalysisResponse>>('/ai/analyze', data);
      const quickResp = await api.post<ApiResponse<AiAnalysisResponse>>('/ai/quick-check', data);
      if (analyzeResp.data.success && quickResp.data.success) {
        setAnalysis(analyzeResp.data.data);
        setQuickCheck(quickResp.data.data);
        reset();
      } else {
        throw new Error('Analysis failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred while analyzing symptoms');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Symptom Analyzer</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Your Symptoms</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={4}
                className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                disabled={isLoading}
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                <Input {...register('location')} disabled={isLoading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (optional)</label>
                <Input {...register('duration')} disabled={isLoading} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pain level (1-10)</label>
                <Input {...register('painLevel')} type="number" min={1} max={10} disabled={isLoading} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => reset()} disabled={isLoading}>
                Clear
              </Button>
              <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {(analysis || quickCheck) && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis && (
              <div>
                <h3 className="font-semibold">Detailed Analysis</h3>
                <p><strong>Triage:</strong> {analysis.triage}</p>
                <p><strong>Suggested Action:</strong> {analysis.suggestedAction}</p>
                {analysis.possibleDiagnoses && analysis.possibleDiagnoses.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Possible Diagnoses:</p>
                    <ul className="list-disc list-inside mt-1">
                      {analysis.possibleDiagnoses.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {quickCheck && (
              <div className="mt-4">
                <h3 className="font-semibold">Quick Check (fast triage)</h3>
                <p><strong>Triage:</strong> {quickCheck.triage}</p>
                <p><strong>Suggested Action:</strong> {quickCheck.suggestedAction}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

