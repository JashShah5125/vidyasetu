import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, error, isLoading } = useAuth();
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const success = await login(emailInput, passwordInput);
    if (!success) return;

    const savedUser = localStorage.getItem('vs_current_user');
    let mustChangePassword = false;
    if (savedUser) {
      try {
        mustChangePassword = Boolean(JSON.parse(savedUser).mustChangePassword);
      } catch {
        // ignore malformed stored profile
      }
    }
    navigate(mustChangePassword ? '/change-password' : '/dashboard', { replace: true });
  };

  const displayError = errorMessage || error || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <img src="/logo.png" alt="Vidya Setu Logo" className="w-full h-28 object-cover" />
          <p className="text-sm text-slate-500 font-semibold">
            Multi-Tenant Coaching Management Platform
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSignIn} className="space-y-4" autoComplete="off">
          <Input
            label="Email Address"
            placeholder="Enter your email address"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            autoComplete="username"
            name="email"
            type="email"
          />
          <div className="relative flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center">
              Password
              <span className="text-red-500 font-bold ml-1">*</span>
            </label>
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                autoComplete="current-password"
                name="password"
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
              onClick={() => setErrorMessage('Password reset is disabled. Please contact your administrator.')}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer select-none"
            >
              Forgot Password?
            </button>
          </div>

          {displayError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 text-center animate-fade-in">
              {displayError}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={!emailInput.trim() || !passwordInput.trim() || isLoading}
            style={{ padding: '12px' }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
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

      </div>
    </div>
  );
};