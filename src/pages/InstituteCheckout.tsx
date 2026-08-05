import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ChevronLeft, Receipt, ShieldCheck } from 'lucide-react';

export const InstituteCheckout: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { currentUser, tenants, tenantSubscriptions, plans, addToast } = useApp();

  const myTenant = tenants.find(t => t.id === currentUser?.tenantId);
  const currentSub = tenantSubscriptions.find(s => s.tenantId === currentUser?.tenantId && s.status === 'Active');
  
  // The plan they are checking out for (either renewal or upgrade)
  const targetPlan = plans.find(p => p.id === planId);
  
  // Form State — pre-filled from tenant data
  const [billingName, setBillingName] = useState(myTenant?.ownerName || myTenant?.name || '');
  const [billingEmail, setBillingEmail] = useState(myTenant?.email || myTenant?.defaultEmail || '');
  const [billingPhone, setBillingPhone] = useState(myTenant?.mobile || '');
  const [billingAddress, setBillingAddress] = useState(myTenant?.address || '');
  const [gstin, setGstin] = useState(myTenant?.gstNo || '');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!targetPlan || !myTenant) {
    return (
      <div className="p-8 text-center text-slate-500">
        <h3 className="text-xl font-bold mb-2">Checkout Error</h3>
        <p>Invalid plan or tenant data. Please go back.</p>
        <Button className="mt-4" onClick={() => navigate('/institute')}>Back to Institute</Button>
      </div>
    );
  }

  const isRenewal = currentSub?.planId === targetPlan.id;
  const isFree = targetPlan.price === 0;
  
  // Financial Calculations
  const basePrice = targetPlan.price;
  const setupFee = targetPlan.setupFee || 0;
  const applicableSetupFee = isRenewal ? 0 : setupFee; 
  const subtotal = basePrice + applicableSetupFee;
  const gstRate = 0.18;
  const taxes = subtotal * gstRate;
  const totalAmount = subtotal + taxes;

  const currencySymbol = targetPlan.currency === 'INR' ? '₹' : targetPlan.currency === 'USD' ? '$' : '€';

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
                  <div className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{targetPlan.billingType} Plan</div>
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
              className={`w-full mt-8 py-3.5 text-base shadow-lg transition-all ${
                isProcessing ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.02]'
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
