import React, { useState } from 'react';
import { Layers, Key, Terminal, Send, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SmsConfiguration: React.FC = () => {
  const { addToast } = useApp();
  const [provider, setProvider] = useState('AWS SNS');
  const [senderId, setSenderId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('SMS Configuration saved successfully!', 'info');
  };

  const handleSendTest = () => {
    if (!testPhone) {
      addToast('Please enter a test phone number.', 'error');
      return;
    }
    addToast(`Test SMS dispatched to ${testPhone}`, 'info');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-900">SMS Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure SMS gateway settings for sending notifications
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
                SMS Provider <span className="text-red-500">*</span>
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition cursor-pointer"
              >
                <option value="AWS SNS">AWS SNS</option>
                <option value="Twilio">Twilio</option>
                <option value="Msg91">Msg91 (India DLT)</option>
                <option value="MessageBird">MessageBird</option>
              </select>
              <span className="text-xs text-slate-400 mt-1 block">
                Choose your SMS service provider
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                Sender ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="tstsms"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                6 characters max (e.g., ISPL, MYBRAND)
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: API Credentials */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Key size={18} className="text-blue-600" />
            <span>API Credentials</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                API Key / Account SID <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Your provider's API key or Account SID
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                API Secret / Auth Token <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="••••"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                Your provider's API secret or Auth Token
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              API Endpoint URL
            </label>
            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="test url for sms"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              The API endpoint for sending SMS (optional for standard providers)
            </span>
          </div>
        </div>

        {/* Section 3: Test Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Terminal size={18} className="text-blue-600" />
            <span>Test Configuration</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Test Phone Number
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <button
                type="button"
                onClick={handleSendTest}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Send size={14} /> Send Test SMS
              </button>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Send a test SMS to verify your configuration
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
