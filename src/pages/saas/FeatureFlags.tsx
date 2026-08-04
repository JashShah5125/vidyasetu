import React, { useState } from 'react';

interface FeatureFlag {
  id: string;
  name: string;
  code: string;
  description: string;
  enabledGlobally: boolean;
  category: 'Core ERP' | 'Academic' | 'Finance' | 'Communication' | 'Add-ons';
  affectedTenants: number;
}

export const FeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([
    { id: 'FF-1', name: 'Online Admissions', code: 'ADMISSIONS', description: 'Enable digital application forms, query pipeline and conversion workflows.', enabledGlobally: true, category: 'Core ERP', affectedTenants: 12 },
    { id: 'FF-2', name: 'CRM & Pipeline', code: 'CRM', description: 'Leads trackers, counsellors assignment, follow-up scheduler and call logs.', enabledGlobally: true, category: 'Core ERP', affectedTenants: 10 },
    { id: 'FF-3', name: 'Finance Ledger', code: 'FINANCE', description: 'Fee configurations, automated invoices, payment gateway checkouts, expense registers.', enabledGlobally: true, category: 'Finance', affectedTenants: 15 },
    { id: 'FF-4', name: 'Payroll Engine', code: 'PAYROLL', description: 'Staff salaries, dynamic payouts, salary slips, attendance integration.', enabledGlobally: false, category: 'Finance', affectedTenants: 0 },
    { id: 'FF-5', name: 'Digital Library Catalogue', code: 'LIBRARY', description: 'Barcode generation, book issuance logs, fine calculations.', enabledGlobally: false, category: 'Academic', affectedTenants: 3 },
    { id: 'FF-6', name: 'Transport Tracker', code: 'TRANSPORT', description: 'GPS coordinates tracking, route maps allocation, driver registers.', enabledGlobally: false, category: 'Add-ons', affectedTenants: 0 },
    { id: 'FF-7', name: 'Inventory Manager', code: 'INVENTORY', description: 'Stock tracking, purchase logs, vendor billing, assets assignment.', enabledGlobally: false, category: 'Add-ons', affectedTenants: 2 },
    { id: 'FF-8', name: 'Mobile Application Wrapper', code: 'MOBILE_APP', description: 'Allows tenants to serve their students/parents on Android & iOS.', enabledGlobally: true, category: 'Add-ons', affectedTenants: 5 },
    { id: 'FF-9', name: 'WhatsApp Business API Relay', code: 'WHATSAPP', description: 'System alerts, attendance triggers and receipt notes over WhatsApp.', enabledGlobally: true, category: 'Communication', affectedTenants: 8 },
    { id: 'FF-10', name: 'Developer APIs Platform', code: 'API', description: 'Exposes secure endpoints for tenant integration.', enabledGlobally: true, category: 'Add-ons', affectedTenants: 4 }
  ]);

  const [toast, setToast] = useState('');

  const toggleFlag = (id: string, name: string) => {
    setFlags(prev => prev.map(f => {
      if (f.id === id) {
        const nextState = !f.enabledGlobally;
        setToast(`Feature Flag "${name}" is now ${nextState ? 'ENABLED' : 'DISABLED'} globally.`);
        setTimeout(() => setToast(''), 4000);
        return { ...f, enabledGlobally: nextState };
      }
      return f;
    }));
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-800 animate-fade-in shadow-sm">
          ℹ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Feature Flags Manager</h2>
        <p className="text-sm text-slate-500 mt-1">
          Perform global runtime access control on feature sets. Toggle access to modular options across all environments immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {flags.map((f) => (
          <div key={f.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-150">
            <div>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-wide">
                    {f.category}
                  </span>
                  <h4 className="text-base font-bold text-slate-800 mt-2">{f.name}</h4>
                  <code className="text-xs font-bold text-blue-600 font-mono mt-0.5 block">{f.code}</code>
                </div>
                <button
                  onClick={() => toggleFlag(f.id, f.name)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    f.enabledGlobally ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      f.enabledGlobally ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{f.description}</p>
            </div>
            
            <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center text-xs text-slate-400">
              <span>Active on <strong>{f.affectedTenants}</strong> tenant subscriptions</span>
              <span className={`font-semibold ${f.enabledGlobally ? 'text-emerald-600' : 'text-slate-400'}`}>
                ● {f.enabledGlobally ? 'Running' : 'Paused'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
