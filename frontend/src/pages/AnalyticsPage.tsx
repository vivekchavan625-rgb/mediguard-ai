import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Users, Calendar, FileText, Brain, TrendingUp, AlertTriangle, Clock, DollarSign, Heart, Pill, CheckCircle } from 'lucide-react';
import { formatDate, formatNumber, classNames } from '@mediguard/shared/utils';

interface AnalyticsData {
  summary: {
    totalPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalRecords: number;
    aiAnalyses: number;
    completionRate: number;
    noShowRate: number;
    avgAppointmentsPerPatient: number;
  };
  charts: {
    appointmentsByStatus: { name: string; value: number }[];
    appointmentsByType: { name: string; value: number }[];
    appointmentsByMonth: { name: string; value: number }[];
    recordsByType: { name: string; value: number }[];
    patientsByGender: { name: string; value: number }[];
    patientsByAgeGroup: { name: string; value: number }[];
    patientsByMonth: { name: string; value: number }[];
    aiAnalysesByType: { name: string; value: number }[];
    revenueByMonth: { name: string; value: number }[];
    topConditions: { name: string; value: number }[];
    topMedications: { name: string; value: number }[];
    avgVitals: { name: string; value: number }[];
  };
  trends: {
    appointmentsGrowth: number;
    patientsGrowth: number;
    recordsGrowth: number;
    aiAnalysesGrowth: number;
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ data: AnalyticsData }>(`/analytics/overview?timeRange=${timeRange}`);
      if (response.data.success && response.data.data) {
        setAnalytics(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  if (isLoading && !analytics) {
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
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unable to load analytics</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={fetchAnalytics}>Retry</Button>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Patients', value: analytics?.summary.totalPatients || 0, icon: Users, color: 'bg-blue-500', trend: analytics?.trends.patientsGrowth || 0 },
    { name: 'Appointments', value: analytics?.summary.totalAppointments || 0, icon: Calendar, color: 'bg-green-500', trend: analytics?.trends.appointmentsGrowth || 0 },
    { name: 'Medical Records', value: analytics?.summary.totalRecords || 0, icon: FileText, color: 'bg-purple-500', trend: analytics?.trends.recordsGrowth || 0 },
    { name: 'AI Analyses', value: analytics?.summary.aiAnalyses || 0, icon: Brain, color: 'bg-orange-500', trend: analytics?.trends.aiAnalysesGrowth || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Insights into your practice performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{formatNumber(stat.value)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {getTrendIcon(stat.trend)}
                    <span className={classNames('text-sm font-medium', getTrendColor(stat.trend))}>
                      {stat.trend >= 0 ? '+' : ''}{stat.trend.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">vs last period</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics?.summary.completionRate?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No-Show Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics?.summary.noShowRate?.toFixed(1) || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Heart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Appointments/Patient</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics?.summary.avgAppointmentsPerPatient?.toFixed(1) || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Est. Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${formatNumber(analytics?.charts.revenueByMonth.reduce((sum, m) => sum + m.value, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Status</CardTitle>
            <CardDescription>Distribution of appointment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.charts.appointmentsByStatus.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.name.replace('_', ' ')}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all duration-500"
                      style={{ width: analytics?.summary.totalAppointments ? `${(item.value / analytics.summary.totalAppointments) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appointments by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Type</CardTitle>
            <CardDescription>Types of appointments scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.charts.appointmentsByType.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-36 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.name.replace('_', ' ')}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full transition-all duration-500"
                      style={{ width: analytics?.summary.totalAppointments ? `${(item.value / analytics.summary.totalAppointments) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Patients by Gender */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Demographics</CardTitle>
            <CardDescription>Gender distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.charts.patientsByGender.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.name}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-500"
                      style={{ width: analytics?.summary.totalPatients ? `${(item.value / analytics.summary.totalPatients) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Patients by Age Group */}
        <Card>
          <CardHeader>
            <CardTitle>Patients by Age Group</CardTitle>
            <CardDescription>Age distribution of patients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.charts.patientsByAgeGroup.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full transition-all duration-500"
                      style={{ width: analytics?.summary.totalPatients ? `${(item.value / analytics.summary.totalPatients) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appointments Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Appointments Over Time</CardTitle>
            <CardDescription>Monthly appointment trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {analytics?.charts.appointmentsByMonth.map((item, index) => {
                const maxValue = Math.max(...analytics.charts.appointmentsByMonth.map(m => m.value), 1);
                const height = (item.value / maxValue) * 200;
                return (
                  <div key={item.name} className="flex-1 flex flex-col items-center justify-end">
                    <div
                      className="w-full bg-primary-600 rounded-t transition-all duration-500 hover:bg-primary-700"
                      style={{ height: `${height}px`, minHeight: '4px' }}
                      title={`${item.name}: ${formatNumber(item.value)}`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Patients Growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Patient Growth</CardTitle>
            <CardDescription>New patients registered over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {analytics?.charts.patientsByMonth.map((item, index) => {
                const maxValue = Math.max(...analytics.charts.patientsByMonth.map(m => m.value), 1);
                const height = (item.value / maxValue) * 200;
                return (
                  <div key={item.name} className="flex-1 flex flex-col items-center justify-end">
                    <div
                      className="w-full bg-green-600 rounded-t transition-all duration-500 hover:bg-green-700"
                      style={{ height: `${height}px`, minHeight: '4px' }}
                      title={`${item.name}: ${formatNumber(item.value)}`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Records by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Records by Type</CardTitle>
            <CardDescription>Distribution of medical record types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.charts.recordsByType.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.name.replace('_', ' ')}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: analytics?.summary.totalRecords ? `${(item.value / analytics.summary.totalRecords) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Analyses by Type */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analyses by Type</CardTitle>
            <CardDescription>Types of AI analyses performed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.charts.aiAnalysesByType.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.name.replace('_', ' ')}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600 rounded-full transition-all duration-500"
                      style={{ width: analytics?.summary.aiAnalyses ? `${(item.value / analytics.summary.aiAnalyses) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(item.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Conditions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Conditions</CardTitle>
            <CardDescription>Most common patient conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.charts.topConditions.slice(0, 10).map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <span className="w-8 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all duration-500"
                        style={{ width: `${(item.value / (analytics?.charts.topConditions[0]?.value || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Medications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Prescribed Medications</CardTitle>
            <CardDescription>Most frequently prescribed medications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.charts.topMedications.slice(0, 10).map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <span className="w-8 text-center text-sm font-medium text-gray-500 dark:text-gray-400">{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${(item.value / (analytics?.charts.topMedications[0]?.value || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {analytics?.charts.revenueByMonth.map((item, index) => {
                const maxValue = Math.max(...analytics.charts.revenueByMonth.map(m => m.value), 1);
                const height = (item.value / maxValue) * 200;
                return (
                  <div key={item.name} className="flex-1 flex flex-col items-center justify-end">
                    <div
                      className="w-full bg-yellow-600 rounded-t transition-all duration-500 hover:bg-yellow-700"
                      style={{ height: `${height}px`, minHeight: '4px' }}
                      title={`${item.name}: $${formatNumber(item.value)}`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

