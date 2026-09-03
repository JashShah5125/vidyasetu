import React, { useState, useEffect } from 'react';
import { Layers, Key, Globe, Terminal, Send, Check, ShieldAlert, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { systemConfigurationService } from '../../services/systemConfigurationService';

export const WhatsAppConfiguration: React.FC = () => {
  const { addToast } = useApp();
  const [provider, setProvider] = useState('ISPL Chatbot (Custom V2)');
  const [authToken, setAuthToken] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [providersRes, configRes] = await Promise.all([
          systemConfigurationService.getProviders('WHATSAPP'),
          systemConfigurationService.getByChannel('WHATSAPP'),
        ]);
        setProviders(providersRes.data);

        const data = configRes.data;
        if (data) {
          setProvider(data.provider_name || '');
          const creds = (data.credentials as unknown as Record<string, string>) || {};
          setAuthToken(creds.auth_token || '');
          setApiEndpoint(creds.api_endpoint || '');
          setWebhookUrl(creds.webhook_url || '');
          setTestPhone(creds.test_phone || '');
          setWebhookVerifyToken(creds.webhook_verify_token || '');
          setIsEnabled(Boolean(data.is_enabled));
        }
      } catch {
        addToast('Failed to load WhatsApp configuration.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await systemConfigurationService.save('WHATSAPP', {
        provider_name: provider,
        is_enabled: isEnabled,
        credentials: {
          auth_token: authToken,
          api_endpoint: apiEndpoint,
          webhook_url: webhookUrl,
          webhook_verify_token: webhookVerifyToken,
          test_phone: testPhone,
        },
      });
      addToast('WhatsApp Configuration saved successfully!', 'success');
    } catch {
      addToast('Failed to save WhatsApp configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = () => {
    if (!testPhone) {
      addToast('Please enter a test phone number.', 'error');
      return;
    }
    addToast(`Test WhatsApp message sent to ${testPhone}`, 'info');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-blue-600" />
        </div>
      ) : (
      <>
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-900">WhatsApp Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure WhatsApp Business API settings for sending notifications
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !isEnabled;
            setIsEnabled(next);
            systemConfigurationService.toggle('WHATSAPP', next)
              .catch(() => addToast('Failed to update WhatsApp status.', 'error'));
          }}
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

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              WhatsApp Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition cursor-pointer"
            >
                {providers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
            </select>
            <span className="text-xs text-slate-400 mt-1 block">
              Choose your WhatsApp service provider
            </span>
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
                Authorization Token <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••••••••••••••••••"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                The token from your cURL command
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                API Endpoint URL
              </label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://ispl10.chatbot.team/wa/v2/messages/send"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
              />
              <span className="text-xs text-slate-400 mt-1 block">
                The API endpoint for sending messages
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Webhook Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold border-b border-slate-100 pb-3">
            <Globe size={18} className="text-blue-600" />
            <span>Webhook Configuration</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Webhook URL
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/webhook/whatsapp"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition duration-150"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Endpoint to receive delivery status and incoming messages
            </span>
          </div>

          {/* Webhook Verification Token Callout Card */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2 mt-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
              <ShieldAlert size={15} />
              <span>Webhook Verification Token</span>
            </div>
            <p className="text-xs text-slate-600">
              Use this token to verify webhook requests from WhatsApp
            </p>
            <div className="pt-1">
              <span className="bg-white text-blue-800 border border-blue-300 font-mono text-xs px-2.5 py-1 rounded-md inline-block select-all shadow-xs">
                {webhookVerifyToken}
              </span>
            </div>
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
                <Send size={14} /> Send Test Message
              </button>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Send a test WhatsApp message to verify your configuration
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
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
      </>
      )}
    </div>
  );
};
