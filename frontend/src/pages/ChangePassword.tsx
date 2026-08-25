import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../services/api';

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setIsSaving(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });
      const savedUser = JSON.parse(localStorage.getItem('vs_current_user') || '{}');
      localStorage.setItem('vs_current_user', JSON.stringify({ ...savedUser, mustChangePassword: false }));
      navigate('/dashboard', { replace: true });
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Change your password</h1>
          <p className="text-sm text-slate-500">Set a new password before continuing to VidyaSetu.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Current Password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          <Input label="New Password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={isSaving}>
            {isSaving ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};
