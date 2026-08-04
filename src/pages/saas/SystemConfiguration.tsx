import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const SystemConfiguration: React.FC = () => {
  const [platformName, setPlatformName] = useState('Vidya Setu');
  const [supportEmail, setSupportEmail] = useState('support@vidyasetu.com');
  const [taxRate, setTaxRate] = useState('18');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [sessionTimeout, setSessionTimeout] = useState('60'); // minutes
  const [toast, setToast] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToast('Global SaaS settings updated successfully.');
    setTimeout(() => setToast(''), 4000);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">System Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Update SaaS defaults, system parameter keys, white-label configurations, email/SMS template defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic settings form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Global Platform Configuration Parameters</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="SaaS Platform Name" value={platformName} onChange={e => setPlatformName(e.target.value)} />
              <Input label="Global Support Relay Email" type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Default GST Rate (%)" type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
              <Select label="Platform Base Currency" value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)}
                options={[
                  { value: 'INR', label: 'INR (₹)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' }
                ]} />
              <Input label="Admin Idle Timeout (min)" type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} />
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <Button type="submit" variant="primary">
                Save Platform Constants
              </Button>
            </div>
          </form>
        </div>

        {/* Quick config tips */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">White-Label DNS Records</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              When tenants requests a custom domain mappings, verify their DNS CNAME is mapped correctly before approving:
            </p>
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 font-mono text-[10px] text-blue-300 space-y-1">
              <div>Type: CNAME</div>
              <div>Host: custom-domain-here</div>
              <div>Value: tenant-ingress.vidyasetu.com</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-4 mt-6">
            ℹ Security policies require updates to global variables to audit logs index registry.
          </div>
        </div>
      </div>
    </div>
  );
};
