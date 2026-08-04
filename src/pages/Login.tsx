import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Role } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [emailInput, setEmailInput] = useState('admin@apexiit.com');
  const [passwordInput, setPasswordInput] = useState('password');
  const [errorMessage, setErrorMessage] = useState('');

  const emailPresets: Record<Role, string> = {
    'saas-admin': 'owner@vidyasetu.com',
    'inst-admin': 'admin@apexiit.com',
    'branch-admin': 'mumbai@apexiit.com',
    'counsellor': 'counsel@apexiit.com',
    'teacher': 'kelkar@apexiit.com',
    'finance': 'finance@apexiit.com'
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (passwordInput !== 'password') {
      setErrorMessage('Invalid password. Demo password is "password"');
      return;
    }

    const success = login(emailInput);
    if (!success) {
      setErrorMessage('Invalid email. Please use a valid demo email ID.');
    }
  };

  const handlePresetSelect = (role: Role) => {
    setEmailInput(emailPresets[role]);
    setPasswordInput('password');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-blue-500/20">
            VS
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            Vidya Setu
          </h2>
          <p className="text-sm text-slate-500">
            Multi-Tenant Coaching Management Platform
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <Input 
            label="Email Address" 
            placeholder="e.g. admin@apexiit.com" 
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
          />
          <Input 
            label="Password" 
            type="password" 
            placeholder="e.g. password" 
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            required
          />

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 text-center animate-fade-in">
              {errorMessage}
            </div>
          )}

          <Button 
            type="submit"
            variant="primary" 
            fullWidth 
            style={{ padding: '12px' }}
          >
            Sign In
          </Button>
        </form>

        {/* Quick Demo Switcher helper */}
        <div className="border-t border-slate-100 pt-6 space-y-3">
          <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Pre-Fill Demo Credentials Presets
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handlePresetSelect('saas-admin')} className="p-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-colors cursor-pointer select-none">SaaS Owner</button>
            <button type="button" onClick={() => handlePresetSelect('inst-admin')} className="p-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-colors cursor-pointer select-none">Inst Admin</button>
            <button type="button" onClick={() => handlePresetSelect('branch-admin')} className="p-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-colors cursor-pointer select-none">Branch Admin</button>
            <button type="button" onClick={() => handlePresetSelect('counsellor')} className="p-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-colors cursor-pointer select-none">Counsellor</button>
            <button type="button" onClick={() => handlePresetSelect('teacher')} className="p-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-colors cursor-pointer select-none">Teacher</button>
            <button type="button" onClick={() => handlePresetSelect('finance')} className="p-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-colors cursor-pointer select-none">Finance Staff</button>
          </div>
        </div>

      </div>
    </div>
  );
};
