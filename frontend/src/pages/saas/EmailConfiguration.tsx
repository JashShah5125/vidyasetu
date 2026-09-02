import React, { useState } from 'react';
import { Layers, Key, Mail, Terminal, Send, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EmailConfiguration: React.FC = () => {
  const { addToast } = useApp();
  const [provider, setProvider] = useState('SMTP Server');
  const [encryption, setEncryption] = useState('TLS (Recommended)');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Email Configuration saved successfully!', 'info');
  };

  const handleSendTest = () => {
    if (!testEmail) {
      addToast('Please enter a test email address.', 'error');
      return;
    }
    addToast(`Test email sent to ${testEmail}`, 'info');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-900">Email Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure email server settings for sending notifications
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            isEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          {isEnabled ? '● Enabled' : '○ Disabled'}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Provider Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Layers size={18} className="text-blue-600" />
            <span>Provider Settings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Email Provider <span className="text-red-500">*</span>
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition cursor-pointer"
              >
                <option value="SMTP Server">SMTP Server</option>
                <option value="Amazon SES">Amazon SES</option>
                <option value="SendGrid">SendGrid</option>
                <option value="Mailgun">Mailgun</option>
              </select>
              <span className="text-xs text-slate-400 mt-1 block">
                Choose your email service provider
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Encryption <span className="text-red-500">*</span>
              </label>
              <select
                value={encryption}
                onChange={(e) => setEncryption(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition cursor-pointer"
              >
                <option value="TLS (Recommended)">TLS (Recommended)</option>
                <option value="SSL">SSL</option>
                <option value="None">None</option>
              </select>
              <span className="text-xs text-slate-400 mt-1 block">
                Security protocol for email transmission
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: SMTP Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Key size={18} className="text-blue-600" />
            <span>SMTP Configuration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                SMTP Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Your SMTP server hostname
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                SMTP Port <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Common ports: 587 (TLS), 465 (SSL), 25 (None)
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                SMTP Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="your-email@domain.com"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                SMTP authentication username
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                SMTP Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="Enter SMTP password"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                SMTP authentication password
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Email Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Mail size={18} className="text-blue-600" />
            <span>Email Settings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                From Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@ispl.com"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Email address that appears as sender
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                From Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="ISPL Notifications"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Name that appears as sender
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Reply-To Email
            </label>
            <input
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              placeholder="support@ispl.com"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Email address for replies (optional)
            </span>
          </div>
        </div>

        {/* Section 4: Test Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Terminal size={18} className="text-blue-600" />
            <span>Test Configuration</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Test Email Address
            </label>
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <button
                type="button"
                onClick={handleSendTest}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Send size={14} /> Send Test Email
              </button>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Send a test email to verify your configuration
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end items-center gap-4 pt-2">
          <button
            type="button"
            className="text-slate-500 hover:text-slate-700 font-medium px-4 py-2 text-sm transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Check size={16} /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
