import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import api, { ApiResponse } from '../utils/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { User, Shield, Bell, Palette, Database, Key, Mail, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { classNames } from '@mediguard/shared/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  appointmentReminders: z.boolean(),
  labResults: z.boolean(),
  aiAnalysisComplete: z.boolean(),
  weeklyDigest: z.boolean(),
});

const appearanceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  compactMode: z.boolean(),
  sidebarCollapsed: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type NotificationForm = z.infer<typeof notificationSchema>;
type AppearanceForm = z.infer<typeof appearanceSchema>;

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance' | 'integrations'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      timezone: 'America/New_York',
      language: 'en',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const notificationForm = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      appointmentReminders: true,
      labResults: true,
      aiAnalysisComplete: true,
      weeklyDigest: false,
    },
  });

  const appearanceForm = useForm<AppearanceForm>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      theme: 'system',
      compactMode: false,
      sidebarCollapsed: false,
    },
  });

  const handleProfileSubmit = async (data: ProfileForm) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const response = await api.put<ApiResponse<any>>('/users/profile', data);
      if (response.data.success && response.data.data) {
        updateProfile(response.data.data);
        setSaveSuccess('Profile updated successfully');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      await api.put<ApiResponse<void>>('/auth/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSaveSuccess('Password changed successfully');
      passwordForm.reset();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationSubmit = async (data: NotificationForm) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      await api.put<ApiResponse<void>>('/users/notifications', data);
      setSaveSuccess('Notification preferences saved');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAppearanceSubmit = async (data: AppearanceForm) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      await api.put<ApiResponse<void>>('/users/appearance', data);
      setSaveSuccess('Appearance settings saved');
      // Apply theme immediately
      if (data.theme === 'dark' || (data.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}
      {saveSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 flex items-center justify-between">
          <span>{saveSuccess}</span>
          <button onClick={() => setSaveSuccess(null)} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Role: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input {...profileForm.register('name')} label="Full Name" placeholder="John Doe" error={profileForm.formState.errors.name?.message} disabled={isSaving} />
                  <Input {...profileForm.register('email')} type="email" label="Email" placeholder="john@example.com" error={profileForm.formState.errors.email?.message} disabled={isSaving} />
                </div>

                <Input {...profileForm.register('phone')} type="tel" label="Phone Number" placeholder="(555) 123-4567" error={profileForm.formState.errors.phone?.message} disabled={isSaving} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      {...profileForm.register('timezone')}
                      id="timezone"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                      disabled={isSaving}
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <select
                      {...profileForm.register('language')}
                      id="language"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                      disabled={isSaving}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button type="submit" isLoading={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                <div className="relative">
                  <Input
                    {...passwordForm.register('currentPassword')}
                    type={showCurrentPassword ? 'text' : 'password'}
                    label="Current Password"
                    placeholder="••••••••"
                    error={passwordForm.formState.errors.currentPassword?.message}
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    {...passwordForm.register('newPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    label="New Password"
                    placeholder="••••••••"
                    error={passwordForm.formState.errors.newPassword?.message}
                    disabled={isSaving}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    {...passwordForm.register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm New Password"
                    placeholder="••••••••"
                    error={passwordForm.formState.errors.confirmPassword?.message}
                    disabled={isSaving}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button type="submit" isLoading={isSaving}>
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Authenticator App</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Use an authenticator app for 2FA</p>
                </div>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active login sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Current Session</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Chrome on Windows • Active now</p>
                    </div>
                  </div>
                  <Badge variant="success">Current</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Mobile App</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">iOS • Last active 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">Revoke</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={notificationForm.handleSubmit(handleNotificationSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive all notifications via email</p>
                    </div>
                    <Switch
                      {...notificationForm.register('emailNotifications')}
                      checked={notificationForm.watch('emailNotifications')}
                    />
                  </div>
                  <div className="flex items-center justify-between ml-8">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Weekly Digest</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive a weekly summary of your practice</p>
                    </div>
                    <Switch
                      {...notificationForm.register('weeklyDigest')}
                      checked={notificationForm.watch('weeklyDigest')}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Clinical Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Appointment Reminders</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Get reminded about upcoming appointments</p>
                    </div>
                    <Switch
                      {...notificationForm.register('appointmentReminders')}
                      checked={notificationForm.watch('appointmentReminders')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Lab Results</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Notify when lab results are available</p>
                    </div>
                    <Switch
                      {...notificationForm.register('labResults')}
                      checked={notificationForm.watch('labResults')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">AI Analysis Complete</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Notify when AI analysis is complete</p>
                    </div>
                    <Switch
                      {...notificationForm.register('aiAnalysisComplete')}
                      checked={notificationForm.watch('aiAnalysisComplete')}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">SMS Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">SMS Notifications</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive critical notifications via SMS</p>
                    </div>
                    <Switch
                      {...notificationForm.register('smsNotifications')}
                      checked={notificationForm.watch('smsNotifications')}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button type="submit" isLoading={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how MediGuard AI looks</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={appearanceForm.handleSubmit(handleAppearanceSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Theme</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {['light', 'dark', 'system'].map((theme) => (
                      <label
                        key={theme}
                        className={classNames(
                          'relative cursor-pointer',
                          appearanceForm.watch('theme') === theme
                            ? 'ring-2 ring-primary-500' : ''
                        )}
                      >
                        <input
                          type="radio"
                          {...appearanceForm.register('theme')}
                          value={theme}
                          className="sr-only"
                        />
                        <div className={classNames(
                          'p-6 rounded-xl border-2 transition-colors text-center',
                          appearanceForm.watch('theme') === theme
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}>
                          <div className="text-3xl mb-2">
                            {theme === 'light' && <Sun className="w-8 h-8 mx-auto text-yellow-500" />}
                            {theme === 'dark' && <Moon className="w-8 h-8 mx-auto text-blue-500" />}
                            {theme === 'system' && <Monitor className="w-8 h-8 mx-auto text-gray-500" />}
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">{theme}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {theme === 'light' && 'Always light mode'}
                            {theme === 'dark' && 'Always dark mode'}
                            {theme === 'system' && 'Match system setting'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-white">Layout</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Compact Mode</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Reduce spacing for more content on screen</p>
                    </div>
                    <Switch
                      {...appearanceForm.register('compactMode')}
                      checked={appearanceForm.watch('compactMode')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Collapsed Sidebar</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Keep sidebar collapsed by default</p>
                    </div>
                    <Switch
                      {...appearanceForm.register('sidebarCollapsed')}
                      checked={appearanceForm.watch('sidebarCollapsed')}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button type="submit" isLoading={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email Service</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure SMTP for outgoing emails</p>
                  </div>
                </div>
                <Button variant="outline">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Database Backup</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure automated backups to cloud storage</p>
                  </div>
                </div>
                <Button variant="outline">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">AI Services</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure OpenAI API and other AI providers</p>
                  </div>
                </div>
                <Button variant="outline">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Calendar Sync</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sync with Google Calendar, Outlook, etc.</p>
                  </div>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Need to import missing icons
import { Sun, Moon, Monitor, Smartphone, Brain, Calendar } from 'lucide-react';