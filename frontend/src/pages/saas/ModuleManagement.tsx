import React, { useState } from 'react';
import { Select } from '../../components/ui/Select';

interface ProductModule {
  id: string;
  name: string;
  code: string;
  description: string;
  state: 'Enabled' | 'Beta' | 'Deprecated' | 'Coming Soon' | 'Hidden';
  releaseVersion: string;
  lastUpdated: string;
}

export const ModuleManagement: React.FC = () => {
  const [modules, setModules] = useState<ProductModule[]>([
    { id: 'MOD-01', name: 'Core Student CRM & Registration', code: 'STUDENT_CRM', description: 'Core CRM pipeline for managing student registrations, admissions, and status updates.', state: 'Enabled', releaseVersion: 'v2.4.0', lastUpdated: '2026-06-12' },
    { id: 'MOD-02', name: 'Attendance Registers & Leaves Module', code: 'ATTENDANCE', description: 'Automated student registers, employee timesheets, leave policies, and attendance tracking.', state: 'Enabled', releaseVersion: 'v2.4.2', lastUpdated: '2026-07-01' },
    { id: 'MOD-03', name: 'Financial Bookkeeping & Gateways', code: 'FINANCE_LEDGER', description: 'Fee configurations, payment collection records, ledger updates, and billing history.', state: 'Enabled', releaseVersion: 'v2.5.0', lastUpdated: '2026-07-28' },
    { id: 'MOD-04', name: 'Doubt Chats & Collaborative Q&A', code: 'DOUBT_HUB', description: 'Instant student-teacher doubt rooms, collaborative discussions, and messaging.', state: 'Beta', releaseVersion: 'v2.6.0-beta1', lastUpdated: '2026-08-01' },
    { id: 'MOD-05', name: 'Alumni Directory & Events Manager', code: 'ALUMNI_DESK', description: 'Platform to register past alumni, coordinate graduation events, and maintain updates.', state: 'Coming Soon', releaseVersion: 'v3.0.0-alpha', lastUpdated: 'Pending' },
    { id: 'MOD-06', name: 'Virtual Classrooms Integration (Zoom/Meet)', code: 'LIVE_CLASSROOM', description: 'Integrates classroom schedules with external Zoom, Google Meet, or MS Teams services.', state: 'Beta', releaseVersion: 'v2.6.0-beta3', lastUpdated: '2026-08-03' },
    { id: 'MOD-07', name: 'Legacy SMS Carrier Interface', code: 'SMS_GATEWAY_V1', description: 'Legacy carrier connection for traditional text alerts. Highly deprecated in favor of digital relays.', state: 'Deprecated', releaseVersion: 'v1.8.0', lastUpdated: '2025-12-15' },
    { id: 'MOD-08', name: 'Internal HR & Recruitments Board', code: 'RECRUIT_DESK', description: 'Internal portal for coordinating human resources, interviews, and employee onboarding.', state: 'Hidden', releaseVersion: 'v2.0.0', lastUpdated: '2026-01-10' }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((m) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-150">
            <div>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${badgeColors[m.state]}`}>
                    {m.state}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-semibold ml-2">
                    {m.id}
                  </span>
                  <h4 className="text-base font-bold text-slate-800 mt-3">{m.name}</h4>
                  <code className="text-xs font-bold text-blue-600 font-mono mt-0.5 block">{m.code}</code>
                </div>
                <div className="flex-shrink-0">
                  <Select
                    value={m.state}
                    onChange={(e) => changeModuleState(m.id, m.name, e.target.value as ProductModule['state'])}
                    options={[
                      { value: 'Enabled', label: 'Enabled' },
                      { value: 'Beta', label: 'Beta' },
                      { value: 'Deprecated', label: 'Deprecated' },
                      { value: 'Coming Soon', label: 'Coming Soon' },
                      { value: 'Hidden', label: 'Hidden' }
                    ]}
                    style={{ padding: '4px 8px', fontSize: '11px', height: '30px', minWidth: '110px' }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">{m.description}</p>
            </div>
            
            <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center text-xs text-slate-400">
              <span>Release: <strong className="text-slate-650">{m.releaseVersion}</strong></span>
              <span>Last Updated: <strong className="text-slate-650">{m.lastUpdated}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

