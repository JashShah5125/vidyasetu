import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  // Step 1: 'email' -> Step 2: 'otp' -> Step 2.5: 'verified' -> Step 3: 'reset' -> Step 4: 'success'
  const [step, setStep] = useState<'email' | 'otp' | 'verified' | 'reset' | 'success'>('email');

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes (300 seconds)

  // 5-minute OTP expiration timer
  React.useEffect(() => {
    if (step !== 'otp' || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage('Your 6-digit verification code has expired. Please click Resend Code to get a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  // Cooldown timer for resending OTP (60s)
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Step 1: Send OTP to Email ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password/send-otp', { email: cleanEmail });
      if (res.data?.status === 'success') {
        setInfoMessage(res.data.message || `A 6-digit code has been sent to ${cleanEmail}`);
        setStep('otp');
        setOtpTimer(300); // Reset to 5 minutes
        setResendCooldown(60); // 60 seconds cooldown before resend
      } else {
        setErrorMessage(res.data?.message || 'Failed to send verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Unable to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const cleanOtp = otp.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp
      });

      if (res.data?.status === 'success' && res.data?.data?.resetToken) {
        setResetToken(res.data.data.resetToken);
        setStep('verified');
        // Smoothly proceed to password reset after tick animation
        setTimeout(() => {
          setStep('reset');
        }, 1400);
      } else {
        setErrorMessage(res.data?.message || 'Verification failed. Please check the code.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Set New Password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password/reset', {
        email: email.trim().toLowerCase(),
        resetToken,
        newPassword
      });

      if (res.data?.status === 'success') {
        setStep('success');
      } else {
        setErrorMessage(res.data?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMessage('');
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password/send-otp', { email: email.trim().toLowerCase() });
      if (res.data?.status === 'success') {
        setInfoMessage(`New verification code sent to ${email}`);
        setOtpTimer(300); // Reset timer to 5 minutes
        setResendCooldown(60);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6">

        {/* Top Header & Branding */}
        <div className="text-center space-y-2">
          <Link to="/login" className="inline-block group mb-1">
            <img src="/logo.png" alt="Vidya Setu Logo" className="w-full h-24 object-cover" />
          </Link>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {step === 'email' && 'Reset Your Password'}
            {step === 'otp' && 'Verify Your Email'}
            {step === 'verified' && 'Email Verified!'}
            {step === 'reset' && 'Create New Password'}
            {step === 'success' && 'Password Reset Complete!'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {step === 'email' && 'Enter your registered email address to receive a secure 6-digit verification code.'}
            {step === 'otp' && `We sent a 6-digit verification code to ${email}`}
            {step === 'verified' && 'Verification successful. Redirecting to set your new password...'}
            {step === 'reset' && 'Your email has been verified. Enter and confirm your new password.'}
            {step === 'success' && 'Your account password has been updated successfully.'}
          </p>
        </div>

        {/* Error / Info messages */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 text-center animate-fade-in">
            {errorMessage}
          </div>
        )}
        {infoMessage && !errorMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-medium text-emerald-800 text-center animate-fade-in">
            {infoMessage}
          </div>
        )}

        {/* ── STEP 1: Enter Email ── */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              label="Registered Email Address"
              placeholder="e.g. admin@academy.com"
              value={email}
              maxLength={255}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage('');
              }}
              required
              type="email"
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={!email.trim() || isLoading}
              style={{ padding: '12px' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin" size={16} /> Sending Code...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Mail size={16} /> Send Verification Code
                </span>
              )}
            </Button>
          </form>
        )}

        {/* ── STEP 2: Verify OTP ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Enter 6-Digit Code
                </label>
                {/* 10-Minute Expiration Timer Display */}
                <div className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                  otpTimer <= 60 
                    ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  <span className="text-[10px]">⏱</span>
                  <span>{formatTime(otpTimer)}</span>
                </div>
              </div>

              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otp}
                disabled={otpTimer === 0}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/[^0-9]/g, ''));
                  setErrorMessage('');
                }}
                className={`w-full border rounded-lg py-3 text-center text-2xl font-mono tracking-widest outline-none transition focus:ring-4 font-bold ${
                  otpTimer === 0 
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-slate-800'
                }`}
                autoFocus
              />

              <div className="flex justify-between items-center pt-1 text-[11px]">
                <span className="text-slate-400">
                  {otpTimer > 0 ? 'Code expires in ' + formatTime(otpTimer) : 'Code has expired'}
                </span>
                <span 
                  className="text-blue-600 font-semibold cursor-pointer select-none hover:underline" 
                  onClick={() => setStep('email')}
                >
                  Change Email
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={otp.trim().length !== 6 || otpTimer === 0 || isLoading}
              style={{ padding: '12px' }}
            >
              {isLoading ? 'Verifying...' : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck size={16} /> Verify & Continue
                </span>
              )}
            </Button>

            <div className="text-center pt-2">
              {resendCooldown > 0 ? (
                <p className="text-xs text-slate-400">
                  Resend code in <span className="font-bold text-slate-600">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer select-none hover:underline"
                >
                  Didn't receive the code? Resend
                </button>
              )}
            </div>
          </form>
        )}

        {/* ── STEP 2.5: Animated Tick - OTP Verified Screen ── */}
        {step === 'verified' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
            {/* Animated Checkmark Circle */}
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="w-20 h-20 rounded-full bg-emerald-100/70 animate-ping absolute" />
              
              {/* Main circle */}
              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 relative z-10 transition-transform transform scale-100 animate-bounce">
                <svg
                  className="w-10 h-10 stroke-current text-white stroke-[3] fill-none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    style={{
                      strokeDasharray: 24,
                      strokeDashoffset: 0,
                      animation: 'dash 0.6s ease-in-out'
                    }}
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                OTP Verified Successfully
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Your email identity has been confirmed. Preparing your password reset...
              </p>
            </div>

            {/* Small loading indicator */}
            <div className="flex items-center gap-1.5 pt-2 text-[11px] font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Loading new password form...
            </div>
          </div>
        )}

        {/* ── STEP 3: Enter New Password ── */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center">
                New Password (min. 8 characters)
                <span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  maxLength={128}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg pl-3 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
                  autoFocus
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

            <div className="relative flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center">
                Confirm New Password
                <span className="text-red-500 font-bold ml-1">*</span>
              </label>
              <div className="relative w-full">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  maxLength={128}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  required
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-100 rounded-lg pl-3 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:ring-4"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer select-none"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={newPassword.length < 8 || !confirmPassword || isLoading}
              style={{ padding: '12px' }}
            >
              {isLoading ? 'Updating Password...' : (
                <span className="flex items-center justify-center gap-2">
                  <KeyRound size={16} /> Update Password
                </span>
              )}
            </Button>
          </form>
        )}

        {/* ── STEP 4: Success Message ── */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Password Changed Successfully!</h3>
              <p className="text-xs text-slate-500">
                You can now sign in to your VidyaSetu portal using your new password.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={() => navigate('/login')}
              style={{ padding: '12px' }}
            >
              Back to Login
            </Button>
          </div>
        )}

        {/* Footer Back to Login link */}
        {step !== 'success' && (
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Back to Sign In
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};
