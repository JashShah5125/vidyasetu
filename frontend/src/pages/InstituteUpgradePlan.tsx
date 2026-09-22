import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Sparkles, Check } from 'lucide-react';
import { planService } from '../services/planService';
import { getInstituteProfile } from '../services/instituteApi';
import { getPrimaryPlanPrice, type SubscriptionPlan } from '../types/saas';

export const InstituteUpgradePlan: React.FC = () => {
  const { currentUser, tenantSubscriptions, plans: contextPlans } = useApp();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<SubscriptionPlan[]>(((contextPlans as unknown as SubscriptionPlan[]) || []));
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [plansRes, profileRes] = await Promise.all([
          planService.getPlans(['Active', 'active']),
          getInstituteProfile().catch(() => null)
        ]);

        if (isMounted) {
          if (plansRes?.data && Array.isArray(plansRes.data)) {
            setPlans(plansRes.data);
          }
          if (profileRes?.subscription?.planId) {
            setCurrentPlanId(String(profileRes.subscription.planId));
          } else if (profileRes?.plan?.id) {
            setCurrentPlanId(String(profileRes.plan.id));
          } else if ((profileRes?.tenant as any)?.plan_id) {
            setCurrentPlanId(String((profileRes.tenant as any).plan_id));
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load subscription plans:', err);
          setError(err?.response?.data?.message || 'Failed to load subscription plans. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const mySub = tenantSubscriptions?.find(s => s.tenantId === currentUser?.tenantId && s.status === 'Active');
  const activePlanId = currentPlanId || (mySub?.planId ? String(mySub.planId) : null);

  const currentPlan = plans.find(p => activePlanId && (String(p.id) === String(activePlanId) || p.code === activePlanId));
  const currentBilling = currentPlan ? getPrimaryPlanPrice(currentPlan) : null;
  const isCurrentPlanPaid = currentBilling ? currentBilling.price > 0 : false;
  const currentOrder = currentPlan?.displayOrder ?? 0;

  // Filter plans for upgrade:
  // 1. Always include current plan
  // 2. If on a paid plan, hide trial plans and lower-tier plans
  // 3. Only show valid higher-tier upgrade options
  const visiblePlans = plans
    .filter(p => {
      if (p.status && p.status.toLowerCase() !== 'active') return false;

      const isCurrent = activePlanId && (String(p.id) === String(activePlanId) || p.code === activePlanId);
      if (isCurrent) return true;

      const pBilling = getPrimaryPlanPrice(p);
      const isTrial = (p.trialDays > 0 && pBilling.price === 0) || p.code?.toUpperCase().includes('STARTER') || p.code?.toUpperCase().includes('TRIAL');

      if (currentPlan) {
        // If current plan is paid or high tier, never show trial plans
        if (isCurrentPlanPaid || currentOrder > 1) {
          if (isTrial) return false;
          // Hide lower tier / lower order plans
          if (p.displayOrder < currentOrder || pBilling.price < (currentBilling?.price || 0)) {
            return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const isHighestTier = currentPlan && visiblePlans.every(p => String(p.id) === String(currentPlan.id) || p.code === currentPlan.code);

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

      {isHighestTier && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-900">You are on our highest tier plan ({currentPlan?.name})</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              All platform features, maximum student capacity, and enterprise modules are fully unlocked for your institute. You can renew your subscription below at any time.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Loading available subscription plans...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
          <p className="font-semibold">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
            Retry
          </Button>
        </div>
      ) : visiblePlans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Sparkles size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Upgrade Plans Available</h3>
          <p className="text-slate-500 text-sm">You are already on the highest tier plan available for your institute.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visiblePlans.map((p) => {
            const isCurrentPlan = activePlanId ? (String(p.id) === String(activePlanId) || p.code === activePlanId) : mySub?.planId === p.id;
            const defaultBilling = getPrimaryPlanPrice(p);
            const isFree = defaultBilling.price === 0 || (p.trialDays && p.trialDays > 0 && defaultBilling.price === 0);
            const currencySymbol = defaultBilling.currency === 'INR' ? '₹' : defaultBilling.currency === 'USD' ? '$' : '€';
            const billingCycleLabel = defaultBilling.billingCycle === 'Yearly' ? '/yr' : defaultBilling.billingCycle === 'Monthly' ? '/mo' : defaultBilling.billingCycle === 'Quarterly' ? '/qtr' : defaultBilling.billingCycle === 'Half-Yearly' ? '/half-yr' : ' lifetime';

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
            const enabledFeatures = p.features
              ? (Object.keys(p.features) as (keyof typeof p.features)[])
                  .filter(k => p.features[k])
                  .map(k => featureLabels[k] || String(k))
                  .filter(Boolean)
              : [];

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
                    <h3 className="text-xl font-bold text-slate-900 pr-16">{p.name}</h3>
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{p.code}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-0.5">
                    {isFree ? (
                      <span className="text-4xl font-extrabold text-slate-900">
                        {p.trialDays > 0 ? `${p.trialDays}-Day Free Trial` : 'Free'}
                      </span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-slate-900">
                          {currencySymbol}{defaultBilling.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-slate-400 text-sm font-medium mb-1">{billingCycleLabel}</span>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed min-h-[36px]">{p.description}</p>

                  {/* Quota summary chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Branches</span>
                      <span className="font-bold text-slate-800">{p.maxBranches === -1 ? 'Unlimited' : p.maxBranches}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Students</span>
                      <span className="font-bold text-slate-800">{p.maxStudents === -1 ? 'Unlimited' : p.maxStudents.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Feature bullets */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Included Modules</span>
                    <ul className="space-y-1.5">
                      {enabledFeatures.slice(0, 6).map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                          <Check size={14} className="text-emerald-500 shrink-0 stroke-[3]" />
                          {f}
                        </li>
                      ))}
                      {enabledFeatures.length > 6 && (
                        <li className="text-xs text-blue-600 font-semibold pl-5">
                          +{enabledFeatures.length - 6} more features…
                        </li>
                      )}
                      {enabledFeatures.length === 0 && (
                        <li className="text-xs text-slate-400 italic">Core academic & institute features</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-6 pb-6 pt-0 mt-auto">
                  <div className="h-px bg-slate-100 mb-4" />
                  {isCurrentPlan ? (
                    <Button
                      onClick={() => navigate(`/institute/checkout/${p.id}`)}
                      variant="secondary"
                      className="w-full py-3 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-sm transition"
                    >
                      ✓ Active Plan (Renew / Extend)
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate(`/institute/checkout/${p.id}`)}
                      variant="primary"
                      className="w-full py-3 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 transition"
                    >
                      Proceed to Upgrade Checkout
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


