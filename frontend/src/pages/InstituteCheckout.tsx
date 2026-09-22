import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ChevronLeft, Receipt, ShieldCheck, Loader2 } from 'lucide-react';
import { planService } from '../services/planService';
import { getInstituteProfile, type InstituteTenant } from '../services/instituteApi';
import { getPrimaryPlanPrice, type SubscriptionPlan } from '../types/saas';
import type { Tenant } from '../types';

export const InstituteCheckout: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { currentUser, tenants, tenantSubscriptions, plans, addToast } = useApp();

  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan | null>(() => {
    return ((plans.find(p => p.id === planId) as unknown as SubscriptionPlan)) || null;
  });
  const [tenantData, setTenantData] = useState<Tenant | InstituteTenant | null>(() => {
    return tenants.find(t => t.id === currentUser?.tenantId) || null;
  });
  const [isLoadingData, setIsLoadingData] = useState<boolean>(!targetPlan || !tenantData);

  // Form State — pre-filled from tenant data
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchCheckoutData = async () => {
      try {
        const [plansRes, profileRes] = await Promise.all([
          planId ? planService.getPlans(['Active', 'active']).catch(() => null) : null,
          getInstituteProfile().catch(() => null),
        ]);

        if (!isMounted) return;

        if (plansRes?.data && Array.isArray(plansRes.data)) {
          const found = plansRes.data.find((p: SubscriptionPlan) => String(p.id) === String(planId));
          if (found) setTargetPlan(found);
        }

        if (profileRes?.tenant) {
          const resolvedTenant = profileRes.tenant;
          setTenantData(resolvedTenant);
          const tAny = resolvedTenant as any;
          setBillingName(tAny.ownerName || tAny.name || '');
          setBillingEmail(tAny.email || tAny.defaultEmail || '');
          setBillingPhone(tAny.mobile || '');
          setGstin(tAny.gstNo || '');
          setBillingAddress(tAny.address || '');
        }
      } catch (err) {
        console.error('Failed to load checkout dependencies:', err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    fetchCheckoutData();

    return () => {
      isMounted = false;
    };
  }, [planId]);

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Preparing checkout details...</p>
      </div>
    );
  }

  if (!targetPlan) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto mt-12 shadow-sm">
        <h3 className="text-xl font-bold mb-2 text-slate-800">Plan Not Found</h3>
        <p className="text-sm">The selected subscription plan could not be located. Please choose from available plans.</p>
        <Button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/institute/upgrade')}>View Subscription Plans</Button>
      </div>
    );
  }

  const defaultBilling = getPrimaryPlanPrice(targetPlan);
  const currentSub = tenantSubscriptions.find(s => s.tenantId === currentUser?.tenantId && s.status === 'Active');
  const isRenewal = currentSub?.planId === targetPlan.id;
  const isFree = defaultBilling.price === 0;

  // Financial Calculations
  const basePrice = defaultBilling.price;
  const setupFee = targetPlan.setupFee || 0;
  const applicableSetupFee = isRenewal ? 0 : setupFee;
  const subtotal = basePrice + applicableSetupFee;
  const gstRate = 0.18;
  const taxes = subtotal * gstRate;
  const totalAmount = subtotal + taxes;

  const currencySymbol = (defaultBilling.currency || targetPlan.currency) === 'INR' ? '₹' : (defaultBilling.currency || targetPlan.currency) === 'USD' ? '$' : '€';

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      addToast(isRenewal ? 'Subscription renewed successfully!' : `Successfully upgraded to ${targetPlan.name} plan!`);
      navigate('/institute');
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-3xl font-display font-bold text-slate-900">
          {isRenewal ? 'Renew Subscription' : 'Complete Plan Upgrade'}
        </h2>
        <p className="text-sm text-slate-500">Review your billing details and complete the payment to activate your plan.</p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Form Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-800 text-lg">Billing Details</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                Pre-filled from Institute Profile
              </span>
            </div>
            <div className="p-6 space-y-5 bg-slate-50/50">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Billing Contact Name"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                />
                <Input
                  label="Billing Email"
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="Invoices will be sent here"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Billing Phone Number"
                  value={billingPhone}
                  onChange={(e) => setBillingPhone(e.target.value)}
                  placeholder="For payment communications"
                />
                <Input
                  label="GSTIN / Tax ID (Optional)"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="For B2B GST invoice"
                />
              </div>

              <Input
                label="Billing Address"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Full address for invoice"
              />

              <div className="pt-2 flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                <ShieldCheck size={14} className="text-blue-400 mt-0.5 shrink-0" />
                <span>These details are pre-filled from your Institute Profile and are fully editable. Changes here apply only to this invoice and will not update your primary profile.</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Invoice Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              Order Summary
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{targetPlan.name}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{defaultBilling.billingCycle} Plan</div>
                </div>
                <div className="font-mono font-bold">
                  {currencySymbol}{basePrice.toLocaleString()}
                </div>
              </div>

              {applicableSetupFee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">One-time Setup Fee</span>
                  <span className="font-mono">{currencySymbol}{applicableSetupFee.toLocaleString()}</span>
                </div>
              )}

              <div className="h-px bg-white/10 my-4" />

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Subtotal</span>
                <span className="font-mono">{currencySymbol}{subtotal.toLocaleString()}</span>
              </div>

              {!isFree && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">GST (18%)</span>
                  <span className="font-mono">{currencySymbol}{taxes.toLocaleString()}</span>
                </div>
              )}

              <div className="h-px bg-white/20 my-4" />

              <div className="flex justify-between items-end">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="text-2xl font-display font-extrabold text-emerald-400">
                  {isFree ? 'Free' : `${currencySymbol}${totalAmount.toLocaleString()}`}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleCheckout}
              disabled={isProcessing}
              className={`w-full mt-8 py-3.5 text-base shadow-lg transition-all ${isProcessing ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.02]'
                }`}
              style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}
            >
              <div className="flex justify-center items-center gap-2 w-full">
                {isProcessing ? 'Processing...' : (
                  <>
                    <ShieldCheck size={20} />
                    {isFree ? 'Activate Plan for Free' : `Pay ${currencySymbol}${totalAmount.toLocaleString()}`}
                  </>
                )}
              </div>
            </Button>

            <p className="text-[10px] text-center text-slate-400 mt-4 px-2">
              By proceeding, you agree to our Terms of Service and Privacy Policy. Secured by Razorpay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
