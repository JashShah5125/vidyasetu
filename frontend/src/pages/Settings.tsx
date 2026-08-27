import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Settings: React.FC = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const { addToast } = useApp();

  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileBanner, setProfileBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordBanner, setPasswordBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; newPass?: string; confirm?: string }>({});

  if (!currentUser) return null;

  const handleProfileSave = async () => {
    setProfileBanner(null);
    if (!profileName.trim()) {
      setProfileBanner({ type: 'error', message: 'Name is required.' });
      return;
    }

    setProfileSaving(true);
    try {
      await authService.updateProfile(profileName.trim(), currentUser.email);
      updateCurrentUser({ name: profileName.trim() });
      setProfileBanner({ type: 'success', message: 'User profile details updated successfully.' });
      addToast('Profile updated successfully', 'success');
      setTimeout(() => setProfileBanner(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Unable to update profile. Please try again.';
      setProfileBanner({ type: 'error', message: msg });
      addToast(msg, 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const validatePasswordFields = (): boolean => {
    const errors: { current?: string; newPass?: string; confirm?: string } = {};
    if (!currentPassword) errors.current = 'Current password is required.';
    if (!newPassword) {
      errors.newPass = 'New password is required.';
    } else if (newPassword.length < 8) {
      errors.newPass = 'New password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      errors.confirm = 'Please confirm your new password.';
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirm = 'Passwords do not match.';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSave = async () => {
    setPasswordBanner(null);
    if (!validatePasswordFields()) return;

    setPasswordSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
      setPasswordBanner({ type: 'success', message: 'Security password credentials updated successfully.' });
      addToast('Password changed successfully', 'success');
      if (currentUser.mustChangePassword) {
        updateCurrentUser({ mustChangePassword: false });
      }
      setTimeout(() => setPasswordBanner(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Unable to change password. Please try again.';
      setPasswordBanner({ type: 'error', message: msg });
      addToast(msg, 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">User Account Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure profile details, manage logins, and review platform configs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {profileBanner && (
            <div className={`p-4 rounded-xl text-sm font-semibold shadow-sm animate-fade-in ${
              profileBanner.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {profileBanner.type === 'success' ? '✓ ' : '✕ '}{profileBanner.message}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Personal User Profile Details</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input
                label="Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={profileSaving}
              />
              <Input
                label="Email Address"
                value={currentUser.email}
                readOnly
              />
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleProfileSave} disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Profile Settings'}
                </Button>
              </div>
            </div>
          </Card>

          {passwordBanner && (
            <div className={`p-4 rounded-xl text-sm font-semibold shadow-sm animate-fade-in ${
              passwordBanner.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {passwordBanner.type === 'success' ? '✓ ' : '✕ '}{passwordBanner.message}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Change Security Password</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors(prev => ({ ...prev, current: undefined })); }}
                disabled={passwordSaving}
                error={passwordErrors.current}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors(prev => ({ ...prev, newPass: undefined })); }}
                  disabled={passwordSaving}
                  error={passwordErrors.newPass}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors(prev => ({ ...prev, confirm: undefined })); }}
                  disabled={passwordSaving}
                  error={passwordErrors.confirm}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={handlePasswordSave} disabled={passwordSaving}>
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Theme Customizer</CardTitle>
            </CardHeader>
            <div className="space-y-4 text-sm text-slate-600">
              <p>Configure what style elements the portal dashboard panel should load.</p>
              <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="font-semibold text-slate-800">Clean Light Mode</span>
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">
                  Active Theme
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
