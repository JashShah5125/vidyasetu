import React, { useState } from 'react';
import { Select } from '../../components/ui/Select';

interface ProductModule {
  id: string;
  name: string;
  code: string;
  state: 'Enabled' | 'Beta' | 'Deprecated' | 'Coming Soon' | 'Hidden';
  releaseVersion: string;
  lastUpdated: string;
}

export const ModuleManagement: React.FC = () => {
  const [modules, setModules] = useState<ProductModule[]>([
    { id: 'MOD-01', name: 'Core Student CRM & Registration', code: 'STUDENT_CRM', state: 'Enabled', releaseVersion: 'v2.4.0', lastUpdated: '2026-06-12' },
    { id: 'MOD-02', name: 'Attendance Registers & Leaves Module', code: 'ATTENDANCE', state: 'Enabled', releaseVersion: 'v2.4.2', lastUpdated: '2026-07-01' },
    { id: 'MOD-03', name: 'Financial Bookkeeping & Gateways', code: 'FINANCE_LEDGER', state: 'Enabled', releaseVersion: 'v2.5.0', lastUpdated: '2026-07-28' },
    { id: 'MOD-04', name: 'Doubt Chats & Collaborative Q&A', code: 'DOUBT_HUB', state: 'Beta', releaseVersion: 'v2.6.0-beta1', lastUpdated: '2026-08-01' },
    { id: 'MOD-05', name: 'Alumni Directory & Events Manager', code: 'ALUMNI_DESK', state: 'Coming Soon', releaseVersion: 'v3.0.0-alpha', lastUpdated: 'Pending' },
    { id: 'MOD-06', name: 'Virtual Classrooms Integration (Zoom/Meet)', code: 'LIVE_CLASSROOM', state: 'Beta', releaseVersion: 'v2.6.0-beta3', lastUpdated: '2026-08-03' },
    { id: 'MOD-07', name: 'Legacy SMS Carrier Interface', code: 'SMS_GATEWAY_V1', state: 'Deprecated', releaseVersion: 'v1.8.0', lastUpdated: '2025-12-15' },
    { id: 'MOD-08', name: 'Internal HR & Recruitments Board', code: 'RECRUIT_DESK', state: 'Hidden', releaseVersion: 'v2.0.0', lastUpdated: '2026-01-10' }
  ]);

  const [toast, setToast] = useState('');

  const changeModuleState = (id: string, name: string, nextState: ProductModule['state']) => {
    setModules(prev => prev.map(m => {
      if (m.id === id) {
        setToast(`Module "${name}" lifecycle state changed to: ${nextState}`);
        setTimeout(() => setToast(''), 4000);
        return { ...m, state: nextState };
      }
      return m;
    }));
  };

  const badgeColors: Record<ProductModule['state'], string> = {
    Enabled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Beta: 'bg-blue-50 text-blue-700 border-blue-200',
    Deprecated: 'bg-red-50 text-red-700 border-red-200',
    'Coming Soon': 'bg-amber-50 text-amber-700 border-amber-200',
    Hidden: 'bg-slate-100 text-slate-600 border-slate-300'
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Product Module Registry</h2>
        <p className="text-sm text-slate-500 mt-1">
          Monitor product modules rollout lifecycles. Restrict beta trials or decommission legacy systems gracefully.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Module Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code Identifier</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Release Version</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Last Registry Edit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Lifecycle State</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {modules.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-900 block">{m.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{m.id}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{m.code}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{m.releaseVersion}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{m.lastUpdated}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColors[m.state]}`}>
                      {m.state}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Select
                      value={m.state}
                      onChange={(e) => changeModuleState(m.id, m.name, e.target.value as ProductModule['state'])}
                      options={[
                        { value: 'Enabled', label: 'Enabled (General Access)' },
                        { value: 'Beta', label: 'Beta (Early Adopters)' },
                        { value: 'Deprecated', label: 'Deprecated (Sunset)' },
                        { value: 'Coming Soon', label: 'Coming Soon' },
                        { value: 'Hidden', label: 'Hidden (SaaS Admins Only)' }
                      ]}
                      style={{ padding: '4px 8px', fontSize: '12px', minWidth: '150px' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
