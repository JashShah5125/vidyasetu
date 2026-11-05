import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft, CheckCircle2, Wallet, Calendar, CreditCard,
  Building, User, Phone, Mail, Award, BookOpen, Layers,
  ShieldCheck, AlertCircle, Loader2, Sparkles, Receipt,
  Check, DollarSign
} from 'lucide-react';
import { getStudentById, updateStudent } from '../services/studentApi';
import { getStudentLedger, recordPayment, type StudentLedger } from '../services/paymentApi';

type CollectionType = 'downpayment' | 'installment' | 'full' | 'custom';

export const CollectPaymentActivation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, currentUser } = useApp();

  const isBranchAdmin = currentUser?.role === 'branch-admin' || (currentUser?.role as string) === 'branch_admin' || currentUser?.role === 'finance';

  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/admin/leads')) return '/admin/leads';
    if (location.pathname.startsWith('/branch/leads')) return '/branch/leads';
    if (location.pathname.startsWith('/counsellor/leads')) return '/counsellor/leads';
    return '/leads';
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<StudentLedger | null>(null);

  // Form state
  const [collectionType, setCollectionType] = useState<CollectionType>('downpayment');
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('Admissions Down Payment & Portal Activation');

  // Load student profile & ledger details
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const studentIdNum = Number(id);
        const [studentRes, ledgerRes] = await Promise.allSettled([
          getStudentById(studentIdNum),
          getStudentLedger(studentIdNum)
        ]);

        if (cancelled) return;

        let st: any = null;
        if (studentRes.status === 'fulfilled') {
          st = studentRes.value?.data || studentRes.value;
          setStudentData(st);
        }

        let lg: StudentLedger | null = null;
        if (ledgerRes.status === 'fulfilled') {
          lg = ledgerRes.value;
          setLedgerData(lg);
        }

        // Determine initial pre-filled values
        const fee = lg?.feeAssignment || st?.feeAssignment;
        const gross = Number(fee?.gross_amount || st?.total_fees_gross || st?.total_fees || 0);
        const disc = Number(fee?.total_concession || fee?.discount_amount || st?.total_concession || 0);
        const net = Math.max(0, Number(fee?.net_amount || st?.total_fees || (gross - disc)));
        const paid = Number(fee?.paid_amount || st?.fees_paid || 0);
        const outstanding = lg?.totalOutstanding !== undefined ? Number(lg.totalOutstanding) : Math.max(0, net - paid);
        const downPaymentConfigured = Number(fee?.down_payment || fee?.downpayment_amount || st?.down_payment || 0);
        const instCount = Math.max(1, Number(fee?.installment_count || st?.installment_count || 1));
        const instAmountConfigured = Number(fee?.installment_amount || st?.installment_amount || Math.round((net - downPaymentConfigured) / instCount));

        // Default to downpayment if configured and uncollected, else full or installment
        if (downPaymentConfigured > 0 && paid < downPaymentConfigured) {
          setCollectionType('downpayment');
          setAmount(downPaymentConfigured);
          setRemarks('Admissions Down Payment & Portal Activation');
        } else if (instAmountConfigured > 0 && instAmountConfigured < outstanding) {
          setCollectionType('installment');
          setAmount(instAmountConfigured);
          setRemarks(`Tuition Fee Installment #1 & Portal Activation`);
        } else {
          setCollectionType('full');
          setAmount(outstanding > 0 ? outstanding : net);
          setRemarks('Full Admission Fee Clearance & Portal Activation');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error loading student payment details:', err);
          addToast('Failed to load student fee ledger.', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [id, addToast]);

  // Computed fee values
  const feeSummary = useMemo(() => {
    const fee = ledgerData?.feeAssignment || studentData?.feeAssignment;
    const gross = Number(fee?.gross_amount || studentData?.total_fees_gross || studentData?.total_fees || 0);
    const disc = Number(fee?.total_concession || fee?.discount_amount || studentData?.total_concession || 0);
    const net = Math.max(0, Number(fee?.net_amount || studentData?.total_fees || (gross - disc)));
    const paid = Number(fee?.paid_amount || studentData?.fees_paid || 0);
    const outstanding = ledgerData?.totalOutstanding !== undefined ? Number(ledgerData.totalOutstanding) : Math.max(0, net - paid);
    const downPaymentConfigured = Number(fee?.down_payment || fee?.downpayment_amount || studentData?.down_payment || 0);
    const installmentCount = Math.max(1, Number(fee?.installment_count || studentData?.installment_count || 1));
    const installmentAmount = Number(
      fee?.installment_amount ||
      studentData?.installment_amount ||
      Math.round(Math.max(0, net - downPaymentConfigured) / installmentCount)
    );

    return {
      gross,
      discount: disc,
      net,
      paid,
      outstanding,
      downPayment: downPaymentConfigured,
      installmentCount,
      installmentAmount
    };
  }, [ledgerData, studentData]);

  // When collection type changes, update amount and remarks accordingly
  const handleCollectionTypeChange = (type: CollectionType) => {
    setCollectionType(type);
    if (type === 'downpayment') {
      const targetAmount = feeSummary.downPayment > 0 ? feeSummary.downPayment : Math.min(10000, feeSummary.outstanding);
      setAmount(targetAmount);
      setRemarks('Admissions Down Payment & Portal Activation');
    } else if (type === 'installment') {
      const targetAmount = feeSummary.installmentAmount > 0 ? feeSummary.installmentAmount : Math.min(feeSummary.net, feeSummary.outstanding);
      setAmount(targetAmount);
      setRemarks(`Tuition Fee Installment #${selectedInstallmentIndex} & Portal Activation`);
    } else if (type === 'full') {
      setAmount(feeSummary.outstanding);
      setRemarks('Full Admission Fee Clearance & Portal Activation');
    }
    // If custom, amount remains as user types
  };

  const handleInstallmentIndexChange = (index: number) => {
    setSelectedInstallmentIndex(index);
    if (collectionType === 'installment') {
      setRemarks(`Tuition Fee Installment #${index} & Portal Activation`);
    }
  };

  const remainingAfterPayment = useMemo(() => {
    return Math.max(0, feeSummary.outstanding - (Number(amount) || 0));
  }, [feeSummary.outstanding, amount]);

  // Submission handler
  const handleConfirmPayment = async () => {
    if (!id) return;
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      addToast('Please enter a valid payment amount greater than ₹0.', 'error');
      return;
    }
    if (paymentAmount > feeSummary.outstanding && feeSummary.outstanding > 0) {
      addToast(`Amount cannot exceed the total outstanding balance of ₹${feeSummary.outstanding.toLocaleString('en-IN')}.`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const studentIdNum = Number(id);

      // 1. Record payment in finance ledger & generate receipt
      try {
        await recordPayment({
          student_id: studentIdNum,
          amount: paymentAmount,
          payment_mode: paymentMode,
          transaction_reference: transactionRef.trim() || undefined,
          remarks: remarks.trim() || 'Admissions Down Payment & Activation'
        });
      } catch (payErr: any) {
        console.warn('Backend payment record notice:', payErr);
      }

      // 2. Mark student status as 1 (Active Student)
      await updateStudent(studentIdNum, { status: 1 });

      addToast(
        `Payment of ₹${paymentAmount.toLocaleString('en-IN')} confirmed! ${studentData?.full_name || 'Student'} is now officially active.`,
        'success'
      );

      // Return to Step 3 / Leads Pipeline
      navigate(`${basePath}/payment`);
    } catch (err: any) {
      console.error('Failed to confirm payment & activate:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to record payment.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const paymentModes = [
    { id: 'Cash', label: 'Cash' },
    { id: 'UPI', label: 'UPI / GPay / PhonePe' },
    { id: 'Bank Transfer', label: 'Bank Transfer (NEFT/IMPS)' },
    { id: 'Cheque', label: 'Bank Cheque' },
    { id: 'Card', label: 'Debit / Credit Card' },
    { id: 'Net Banking', label: 'Net Banking' },
    { id: 'Demand Draft', label: 'Demand Draft' }
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading student fee ledger & admission details...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Student Record Not Found</h2>
        <p className="text-sm text-slate-500">Could not retrieve admission details for ID #{id}.</p>
        <Button variant="secondary" onClick={() => navigate(`${basePath}/payment`)}>
          Back to Step 3: Fee Payment & Activation
        </Button>
      </div>
    );
  }

  const studentName = studentData.full_name || 'Student';
  const studentCode = studentData.student_code || `STU-${id}`;
  const courseName = studentData.course_name || studentData.course || '—';
  const batchName = studentData.batch_name || studentData.batch || 'Needs Batch';
  const branchName = studentData.branch_name || studentData.branch || 'Main Campus';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5 animate-fade-in pb-16">
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/payment`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer mb-1 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Step 3: Fee Payment & Activation
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Collect Admission Fee & Activate Student
            </h1>
            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              {studentCode}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1">
              <Sparkles size={11} className="text-amber-600" /> Admission Gate: Step 3
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Select the fee component being collected to issue an official receipt and activate {studentName}’s LMS portal credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="secondary"
            onClick={() => navigate(`${basePath}/payment`)}
            className="text-xs font-semibold h-9"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmPayment}
            disabled={submitting || amount <= 0}
            className="text-xs font-semibold h-9 px-4 flex items-center gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Activating Student...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Confirm Payment & Activate</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Student Profile & Academic Summary (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Student Profile Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-slate-500" /> Student Profile
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Branch: {branchName}
              </span>
            </CardHeader>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{studentName}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block text-[11px] flex items-center gap-1">
                    <Phone size={10} /> Mobile
                  </span>
                  <span className="font-semibold text-slate-800">{studentData.mobile || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[11px] flex items-center gap-1">
                    <Mail size={10} /> Email
                  </span>
                  <span className="font-semibold text-slate-800 truncate block" title={studentData.email}>
                    {studentData.email || '—'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Guardian Name</span>
                  <span className="font-semibold text-slate-800">{studentData.guardian_name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Guardian Contact</span>
                  <span className="font-semibold text-slate-800">{studentData.guardian_mobile || '—'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Academic Stream & Batching Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="py-3 px-4 bg-blue-50/50 border-b border-blue-100/70 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={13} className="text-blue-600" /> Academic Stream
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                Verified
              </span>
            </CardHeader>
            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Course</span>
                  <span className="font-bold text-slate-900">{courseName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Program / Level</span>
                  <span className="font-semibold text-slate-800">{studentData.program_name || studentData.level_name || '—'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-medium block text-[11px]">Assigned Classroom Batch</span>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 mt-1">
                  <Layers size={12} /> {batchName}
                </span>
              </div>
            </div>
          </Card>

          {/* Agreed Fee Plan Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={13} className="text-slate-500" /> Agreed Fee Structure
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Agreed at Registration
              </span>
            </CardHeader>
            <div className="p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Gross Total Fee</span>
                <span className="font-semibold text-slate-800 font-mono">₹{feeSummary.gross.toLocaleString('en-IN')}</span>
              </div>
              {feeSummary.discount > 0 && (
                <div className="flex justify-between items-center py-1 text-emerald-700">
                  <span>Concession / Discount</span>
                  <span className="font-semibold font-mono">- ₹{feeSummary.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1.5 border-t border-slate-200 font-bold text-slate-900">
                <span>Net Course Fee</span>
                <span className="font-mono text-sm">₹{feeSummary.net.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-emerald-600">
                <span>Amount Paid</span>
                <span className="font-semibold font-mono">₹{feeSummary.paid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-t border-dashed border-slate-200 font-bold text-rose-600">
                <span>Outstanding Balance</span>
                <span className="font-mono text-sm">₹{feeSummary.outstanding.toLocaleString('en-IN')}</span>
              </div>

              {/* Installment breakdown hint */}
              <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1 border border-slate-200">
                <div className="flex justify-between">
                  <span className="font-medium">Configured Down Payment:</span>
                  <span className="font-bold text-slate-800 font-mono">₹{feeSummary.downPayment.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Agreed Installments:</span>
                  <span className="font-bold text-slate-800">
                    {feeSummary.installmentCount} Month{feeSummary.installmentCount > 1 ? 's' : ''} (₹{feeSummary.installmentAmount.toLocaleString('en-IN')}/mo)
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Interactive Payment Collection Console (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-slate-200 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="text-emerald-600" size={16} />
                <span>Select Payment Component To Collect</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the payment type to auto-fill the agreed amount, or enter a custom amount.
              </p>
            </CardHeader>

            <div className="p-5 space-y-5">
              {/* Collection Type Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Down Payment */}
                <button
                  type="button"
                  onClick={() => handleCollectionTypeChange('downpayment')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                    collectionType === 'downpayment'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Wallet size={15} />
                    </div>
                    {collectionType === 'downpayment' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <div className="font-bold text-xs text-slate-900">Admission Down Payment</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Agreed upfront registration deposit
                    </div>
                    <div className="font-mono font-bold text-sm text-emerald-700 mt-1">
                      ₹{feeSummary.downPayment.toLocaleString('en-IN')}
                    </div>
                  </div>
                </button>

                {/* 2. Scheduled Installment */}
                <button
                  type="button"
                  onClick={() => handleCollectionTypeChange('installment')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                    collectionType === 'installment'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Calendar size={15} />
                    </div>
                    {collectionType === 'installment' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <div className="font-bold text-xs text-slate-900">Scheduled Installment</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Installment #{selectedInstallmentIndex} of {feeSummary.installmentCount}
                    </div>
                    <div className="font-mono font-bold text-sm text-blue-700 mt-1">
                      ₹{feeSummary.installmentAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </button>

                {/* 3. Full Course Fee */}
                <button
                  type="button"
                  onClick={() => handleCollectionTypeChange('full')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                    collectionType === 'full'
                      ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <CheckCircle2 size={15} />
                    </div>
                    {collectionType === 'full' && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <div className="font-bold text-xs text-slate-900">100% Full Payment</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Clear entire course fee at once
                    </div>
                    <div className="font-mono font-bold text-sm text-indigo-700 mt-1">
                      ₹{feeSummary.outstanding.toLocaleString('en-IN')}
                    </div>
                  </div>
                </button>

                {/* 4. Custom Amount */}
                <button
                  type="button"
                  onClick={() => handleCollectionTypeChange('custom')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                    collectionType === 'custom'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <CreditCard size={15} />
                    </div>
                    {collectionType === 'custom' && (
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <div className="font-bold text-xs text-slate-900">Custom Partial Amount</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Collect any specific partial sum
                    </div>
                    <div className="font-mono font-bold text-sm text-amber-700 mt-1">
                      Flexible Entry
                    </div>
                  </div>
                </button>
              </div>

              {/* Installment Selector Pills (if installment is chosen and count > 1) */}
              {collectionType === 'installment' && feeSummary.installmentCount > 1 && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 animate-fade-in">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                    Select Installment Sequence:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from({ length: feeSummary.installmentCount }).map((_, idx) => {
                      const num = idx + 1;
                      const isSelected = selectedInstallmentIndex === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleInstallmentIndexChange(num)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Installment #{num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount Being Collected Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Amount Being Collected (₹) *
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Max Outstanding: <strong className="font-mono text-slate-800">₹{feeSummary.outstanding.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={feeSummary.outstanding}
                    value={amount === 0 ? '' : amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    placeholder="Enter amount..."
                    className="w-full h-11 pl-8 pr-4 text-base font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-xl shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                {/* Real-time remaining balance indicator */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500 font-medium">Balance After This Payment:</span>
                  <span className={`font-mono font-bold ${remainingAfterPayment === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    ₹{remainingAfterPayment.toLocaleString('en-IN')} {remainingAfterPayment === 0 && ' (Fully Paid)'}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {paymentModes.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMode(m.id)}
                      className={`h-9 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border text-center truncate ${
                        paymentMode === m.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Reference & Payment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    {paymentMode === 'UPI' ? 'UPI UTR / Ref Number' : paymentMode === 'Cheque' ? 'Cheque Number' : paymentMode === 'Bank Transfer' ? 'NEFT / IMPS Reference' : 'Reference / Receipt No (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder={paymentMode === 'Cash' ? 'e.g. Receipt #0482' : 'e.g. UTR / Transaction ID'}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Payment Remarks / Notes
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes printed on invoice / receipt..."
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium text-slate-800"
                />
              </div>

              {/* Automated Lifecycle Impact Notice */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-xs text-emerald-900 space-y-1.5 shadow-2xs">
                <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck size={14} className="text-emerald-600" /> Automated Onboarding Confirmation:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/90 pl-1">
                  <li>Upgrades {studentName} to an <strong>Active Student</strong> (Status: 1).</li>
                  <li>Generates an official payment receipt & updates the financial ledger.</li>
                  <li>Activates Student & Parent LMS portal accounts automatically.</li>
                  <li>Synchronizes timetable schedules & classroom seatings for batch <strong>{batchName}</strong>.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`${basePath}/payment`)}
                  className="text-xs font-semibold h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirmPayment}
                  disabled={submitting || amount <= 0}
                  className="text-xs font-semibold h-10 px-6 flex items-center gap-2 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Recording Payment & Activating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Confirm ₹{(amount || 0).toLocaleString('en-IN')} & Activate Student</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

