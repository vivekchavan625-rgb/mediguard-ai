import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api, { ApiResponse } from '../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, Calendar, FileText, Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatDate } from '@mediguard/shared/utils';

interface DashboardStats {
  summary: {
    totalPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRecords: number;
    aiAnalyses: number;
    completionRate: number;
  };
  charts: {
    appointmentsByStatus: { name: string; value: number }[];
    appointmentsByType: { name: string; value: number }[];
    recordsByType: { name: string; value: number }[];
    patientsByGender: { name: string; value: number }[];
    patientsByAgeGroup: { name: string; value: number }[];
  };
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  patientName?: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        api.get<ApiResponse<DashboardStats>>('/analytics/dashboard'),
        api.get<ApiResponse<RecentActivity[]>>('/analytics/recent-activity'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data!);
      if (activityRes.data.success) setRecentActivity(activityRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Unable to load dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>Retry</Button>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Patients', value: stats?.summary.totalPatients || 0, icon: Users, color: 'bg-blue-500', href: '/patients' },
    { name: 'Appointments', value: stats?.summary.totalAppointments || 0, icon: Calendar, color: 'bg-green-500', href: '/appointments' },
    { name: 'Medical Records', value: stats?.summary.totalRecords || 0, icon: FileText, color: 'bg-purple-500', href: '/medical-records' },
    { name: 'AI Analyses', value: stats?.summary.aiAnalyses || 0, icon: Brain, color: 'bg-orange-500', href: '/ai' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Doctor'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your practice today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Export Report</Button>
          <Button>New Patient</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = stat.href}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments by Status</CardTitle>
            <CardDescription>Current period overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.charts.appointmentsByStatus.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.name}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all duration-500"
                      style={{ width: stats?.summary.totalAppointments ? `${(item.value / stats.summary.totalAppointments) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-gray-900 dark:text-white">{item.value}</div>
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
              {stats?.charts.patientsByGender.map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.name}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-500"
                      style={{ width: stats?.summary.totalPatients ? `${(item.value / stats.summary.totalPatients) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-medium text-gray-900 dark:text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across your practice</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activity.description}</p>
                    {activity.patientName && (
                      <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">Patient: {activity.patientName}</p>
                    )}
                  </div>
                  <time className="text-xs text-gray-400 flex-shrink-0 ml-4 mt-1">
                    {formatDate(activity.timestamp)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}