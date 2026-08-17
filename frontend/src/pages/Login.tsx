import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Role } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState('admin@apexiit.com');
  const [passwordInput, setPasswordInput] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
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
    if (success) {
      navigate('/dashboard');
    } else {
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
        <div className="text-center space-y-3">
          <img src="/logo.png" alt="Vidya Setu Logo" className="h-28 mx-auto object-contain" />
          <p className="text-sm text-slate-500 font-semibold">
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
          <div className="relative flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center">
              Password
              <span className="text-red-500 font-bold ml-1">*</span>
            </label>
            <div className="relative w-full">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="e.g. password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer select-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer select-none">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
              <span>Remember me</span>
            </label>
            <button 
              type="button" 
              onClick={() => setErrorMessage('Demo Mode: Password reset is disabled. Please use "password".')}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer select-none"
            >
              Forgot Password?
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 text-center animate-fade-in">
              {errorMessage}
            </div>
          )}

          <Button 
            type="submit"
            variant="primary" 
            fullWidth 
            disabled={!emailInput.trim() || !passwordInput.trim()}
            style={{ padding: '12px' }}
          >
            Sign In
          </Button>

          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100/50">
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={() => setErrorMessage('Self-registration is disabled. Please contact your administrator.')}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer select-none"
            >
              Register your Institute
            </button>
          </div>
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
