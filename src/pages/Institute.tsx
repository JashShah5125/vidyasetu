import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Institute: React.FC = () => {
  const { currentUser, logAction, addToast } = useApp();
  
  const [name, setName] = useState(currentUser?.tenantName || 'Apex IIT Academy');
  const [email, setEmail] = useState('contact@apexiit.com');
  const [phone, setPhone] = useState('9876543210');
  const [address, setAddress] = useState('401, Western Express Highway, Mumbai');
  const [academicYear, setAcademicYear] = useState('2026 - 2027');

  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    logAction('UPDATE_INSTITUTE_SETUP', `Updated institute profile for: ${name}`);
    
    // Show inline banner
    setShowSavedBanner(true);
    setTimeout(() => {
      setShowSavedBanner(false);
    }, 4000);
  };

  const handleUploadLogo = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      addToast('Custom logo initials updated in preview.');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Institute Profile Setup</h2>
        <p className="text-sm text-slate-500 mt-1">Configure branding settings, academic calendars, and contact templates.</p>
      </div>

      {showSavedBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ Institute profile configurations saved and logged in platform audit logs.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Institute Contact & Identity Profile</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <Input 
                label="Institute Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Contact Email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
                <Input 
                  label="Contact Phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                />
              </div>
              <Input 
                label="Physical Address" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
              <Input 
                label="Active Academic Calendar Year" 
                value={academicYear} 
                onChange={(e) => setAcademicYear(e.target.value)} 
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Save Institute Profile
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Institute Branding</CardTitle>
            </CardHeader>
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-xl space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-500/20">
                {name.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Logo Preview</span>
              <Button variant="secondary" size="sm" onClick={handleUploadLogo} disabled={isUploading}>
                {isUploading ? 'Uploading Logo...' : 'Upload Custom Logo'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
