import React from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const InstituteUpgradePlan: React.FC = () => {
  const { currentUser, tenants, tenantSubscriptions, plans } = useApp();
  const navigate = useNavigate();

  const mySub = tenantSubscriptions.find(s => s.tenantId === currentUser?.tenantId && s.status === 'Active');

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => navigate('/institute')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 transition-colors">
            <ChevronLeft size={16} /> Back to Institute Setup
          </button>
          <h2 className="text-2xl font-display font-bold text-slate-900">Subscription Plans</h2>
          <p className="text-sm text-slate-500 mt-1">Explore available plans and request an upgrade to unlock more features and higher limits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans
          .filter(p => p.status === 'Active')
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((p) => {
            const isCurrentPlan = mySub?.planId === p.id;
            const isFree = p.price === 0;
            const currencySymbol = p.currency === 'INR' ? '₹' : p.currency === 'USD' ? '$' : '€';
            const billingLabel = p.billingType === 'Monthly' ? '/mo' : p.billingType === 'Quarterly' ? '/qtr' : p.billingType === 'Yearly' ? '/yr' : ' lifetime';

            // Collect enabled feature labels for the bullet list
            const featureLabels: Record<string, string> = {
              admissions: 'Admissions', studentManagement: 'Student Management',
              parentPortal: 'Parent Portal', teacherPortal: 'Teacher Portal',
              attendance: 'Attendance', timetable: 'Timetable',
              assignments: 'Assignments', exams: 'Exams', results: 'Results', doubts: 'Doubt Resolution',
              fees: 'Fee Management', payroll: 'Payroll', income: 'Income Tracker', expenses: 'Expense Tracker',
              notifications: 'Push Notifications', sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email',
              reports: 'Reports & Analytics', auditLogs: 'Audit Logs', importExport: 'Import / Export', apiAccess: 'API Access'
            };
            const enabledFeatures = (Object.keys(p.features) as (keyof typeof p.features)[])
              .filter(k => p.features[k])
              .map(k => featureLabels[k])
              .filter(Boolean);

            return (
              <div
                key={p.id}
                className={`relative flex flex-col bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 hover:shadow-lg ${
                  isCurrentPlan
                    ? 'border-emerald-500 shadow-emerald-100 ring-1 ring-emerald-500'
                    : 'border-slate-200'
                }`}
              >
                {/* Status badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm uppercase tracking-widest">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Card body */}
                <div className="flex flex-col flex-1 p-6 gap-4 mt-2">
                  {/* Plan name + code */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 pr-16">{p.name}</h3>
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{p.code}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-0.5">
                    {isFree ? (
                      <span className="text-4xl font-extrabold text-slate-900">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-slate-900">
                          {currencySymbol}{p.price.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-sm font-medium mb-1">{billingLabel}</span>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed">{p.description}</p>

                  {/* Feature bullets */}
                  <ul className="flex-1 space-y-1.5 mt-1">
                    {enabledFeatures.slice(0, 6).map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {enabledFeatures.length > 6 && (
                      <li className="text-xs text-blue-500 font-semibold pl-3.5">
                        +{enabledFeatures.length - 6} more features…
                      </li>
                    )}
                    {enabledFeatures.length === 0 && (
                      <li className="text-xs text-slate-400 italic">No features available</li>
                    )}
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="px-6 pb-6 pt-0 mt-auto">
                  <div className="h-px bg-slate-100 mb-4" />
                  <Button
                    onClick={() => {
                      if (isCurrentPlan) return;
                      navigate(`/institute/checkout/${p.id}`);
                    }}
                    variant={isCurrentPlan ? 'secondary' : 'primary'}
                    className={`w-full py-3 rounded-xl text-sm font-bold ${
                      isCurrentPlan 
                        ? 'bg-slate-50 text-emerald-600 border-emerald-100 cursor-default hover:bg-slate-50 opacity-100'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                    }`}
                  >
                    {isCurrentPlan ? '✓ Your Active Plan' : 'Proceed to Upgrade Checkout'}
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
