import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Settings: React.FC = () => {
  const { currentUser } = useApp();
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [showPasswordBanner, setShowPasswordBanner] = useState(false);

  if (!currentUser) return null;

  const handleProfileSave = () => {
    setShowProfileBanner(true);
    setTimeout(() => setShowProfileBanner(false), 4000);
  };

  const handlePasswordSave = () => {
    setShowPasswordBanner(true);
    setTimeout(() => setShowPasswordBanner(false), 4000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">User Account Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure profile details, manage logins, and review platform configs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {showProfileBanner && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
              ✓ User profile details updated successfully.
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Personal User Profile Details</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input label="Name" defaultValue={currentUser.name} />
              <Input label="Email Address" defaultValue={currentUser.email} readOnly />
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleProfileSave}>
                  Save Profile Settings
                </Button>
              </div>
            </div>
          </Card>

          {showPasswordBanner && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
              ✓ Security password credentials updated successfully.
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Change Security Password</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <Input label="Current Password" type="password" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="New Password" type="password" />
                <Input label="Confirm New Password" type="password" />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={handlePasswordSave}>
                  Update Password
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
