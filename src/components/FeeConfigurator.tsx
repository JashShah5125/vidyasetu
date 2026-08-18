import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Calculator } from 'lucide-react';
import { INITIAL_COURSES, INITIAL_FEE_PLANS, INITIAL_BUNDLES_MAP, INITIAL_SUBJECTS_MAP } from '../data/mockData';
import { Select } from './ui/Select';
import { Input } from './ui/Input';


interface FeeConfiguratorProps {
  initialCourse?: string;
  initialProgram?: string;
  initialLevel?: string;
  initialState?: any;
  onChange: (feeData: any, isComplete: boolean) => void;
  readOnly?: boolean;
}

export const FeeConfigurator: React.FC<FeeConfiguratorProps> = ({
  initialCourse = '',
  initialProgram = '',
  initialLevel = '',
  initialState,
  onChange,
  readOnly = false
}) => {
  const [fCourse, setFCourse] = useState(initialState?.course || initialCourse);
  const [fProgram, setFProgram] = useState(initialState?.program || initialProgram);
  const [fLevel, setFLevel] = useState(initialState?.level || initialLevel);

  const [feeSelectedStandard, setFeeSelectedStandard] = useState(initialState?.feeSelectedStandard || '');
  const [feeSelectedBundle, setFeeSelectedBundle] = useState(initialState?.feeSelectedBundle || '');
  const [feeSelectedSubjects, setFeeSelectedSubjects] = useState<string[]>(initialState?.feeSelectedSubjects || []);

  const [customTotalFee, setCustomTotalFee] = useState<number | ''>(initialState?.totalFee ?? 0);
  const [customDownpayment, setCustomDownpayment] = useState<number | ''>(initialState?.downpayment ?? 0);
  const [customMonths, setCustomMonths] = useState<number | ''>(initialState?.installments ?? 1);
  const [customDiscount, setCustomDiscount] = useState<number | ''>(initialState?.discount ?? 0);
  const [paymentMode, setPaymentMode] = useState<string>(initialState?.paymentMode || '');

  const [enrollType, setEnrollType] = useState<'Standard' | 'Custom Combo' | 'Subject-wise'>(initialState?.enrollType || 'Standard');

  useEffect(() => {
    if (initialState) {
      if (initialState.course) setFCourse(initialState.course);
      if (initialState.program) setFProgram(initialState.program);
      if (initialState.level) setFLevel(initialState.level);
      if (initialState.enrollType) setEnrollType(initialState.enrollType);
      if (initialState.feeSelectedStandard) setFeeSelectedStandard(initialState.feeSelectedStandard);
      if (initialState.feeSelectedBundle) setFeeSelectedBundle(initialState.feeSelectedBundle);
      if (initialState.feeSelectedSubjects) setFeeSelectedSubjects(initialState.feeSelectedSubjects);
      if (initialState.totalFee !== undefined) setCustomTotalFee(initialState.totalFee);
      if (initialState.downpayment !== undefined) setCustomDownpayment(initialState.downpayment);
      if (initialState.installments !== undefined) setCustomMonths(initialState.installments);
      if (initialState.discount !== undefined) setCustomDiscount(initialState.discount);
      if (initialState.paymentMode !== undefined) setPaymentMode(initialState.paymentMode);
    } else {
      if (initialCourse) setFCourse(initialCourse);
      if (initialProgram) setFProgram(initialProgram);
      if (initialLevel) setFLevel(initialLevel);
    }
  }, [initialState, initialCourse, initialProgram, initialLevel]);

  const netFee = useMemo(() => Math.max(0, Number(customTotalFee) - Number(customDiscount)), [customTotalFee, customDiscount]);
  const balance = useMemo(() => Math.max(0, netFee - Number(customDownpayment)), [netFee, customDownpayment]);
  const installmentAmount = useMemo(() => Number(customMonths) > 0 ? Math.floor(balance / Number(customMonths)) : 0, [balance, customMonths]);

  // Calculate base fee based on selection
  useEffect(() => {
    let calculatedBase = 0;
    if (enrollType === 'Standard') {
      const plan = INITIAL_FEE_PLANS.find(p => p.id === feeSelectedStandard);
      if (plan) {
        calculatedBase = plan.totalFees;
        if (!initialState || customDownpayment === 0) setCustomDownpayment(plan.downPayment);
        if (!initialState || customMonths === 1) setCustomMonths(plan.months);
      }
    } else if (enrollType === 'Custom Combo') {
      const courseObj = INITIAL_COURSES.find(c => c.name === fCourse);
      if (courseObj) {
        const mapKey = `${courseObj.code}-${fProgram}-${fLevel}`;
        const bundles = INITIAL_BUNDLES_MAP[mapKey] || [];
        const bundle = bundles.find(b => b.id === feeSelectedBundle);
        if (bundle) {
          calculatedBase = bundle.fee;
          if (!initialState || customDownpayment === 0) setCustomDownpayment(bundle.downPayment);
          if (!initialState || customMonths === 1) setCustomMonths(bundle.months);
        }
      }
    } else if (enrollType === 'Subject-wise') {
      const courseObj = INITIAL_COURSES.find(c => c.name === fCourse);
      if (courseObj) {
        const mapKey = `${courseObj.code}-${fProgram}-${fLevel}`;
        const subjects = INITIAL_SUBJECTS_MAP[mapKey] || [];
        calculatedBase = subjects
          .filter((s: any) => feeSelectedSubjects.includes(s.id))
          .reduce((acc: number, s: any) => acc + (s.fee || 0), 0);
      }
    }
    if (calculatedBase > 0) {
      setCustomTotalFee(calculatedBase);
    }
  }, [enrollType, feeSelectedStandard, feeSelectedBundle, feeSelectedSubjects, fCourse, fProgram, fLevel]);

  // Report changes back to parent
  useEffect(() => {
    const isComplete =
      (enrollType === 'Standard' && feeSelectedStandard !== '') ||
      (enrollType === 'Custom Combo' && feeSelectedBundle !== '') ||
      (enrollType === 'Subject-wise' && feeSelectedSubjects.length > 0);

    onChange({
      enrollType,
      course: fCourse,
      program: fProgram,
      level: fLevel,
      feeSelectedStandard,
      feeSelectedBundle,
      feeSelectedSubjects,
      totalFee: customTotalFee,
      discount: customDiscount,
      netFee,
      downpayment: customDownpayment,
      installments: customMonths,
      paymentMode,
      installmentAmount
    }, !!isComplete);
  }, [enrollType, fCourse, fProgram, fLevel, customTotalFee, customDiscount, netFee, customDownpayment, customMonths, paymentMode, installmentAmount, feeSelectedStandard, feeSelectedBundle, feeSelectedSubjects]);

  const courseObj = INITIAL_COURSES.find(c => c.name === fCourse);
  const availablePrograms = courseObj?.programs || [];
  const mapKey = courseObj ? `${courseObj.code}-${fProgram}-${fLevel}` : '';

  const availableLevels = useMemo(() => {
    if (!fProgram) return [];
    if (fProgram.includes('2 Year')) return [{ value: 'year1', label: 'Year 1' }, { value: 'year2', label: 'Year 2' }];
    if (fProgram.includes('1 Year')) return [{ value: 'year1', label: 'Year 1' }];
    if (fProgram.includes('8th')) return [{ value: 'class8', label: 'Class 8' }];
    if (fProgram.includes('9th')) return [{ value: 'class9', label: 'Class 9' }];
    if (fProgram.includes('10th')) return [{ value: 'class10', label: 'Class 10' }];
    return [{ value: 'year1', label: 'Year 1' }];
  }, [fProgram]);

  useEffect(() => {
    if (availableLevels.length > 0 && !availableLevels.find((l: any) => l.value === fLevel)) {
      setFLevel(availableLevels[0].value);
    }
  }, [availableLevels, fLevel]);

  const idealPlan = useMemo(() => {
    if (enrollType === 'Standard' && feeSelectedStandard) {
      const plan = INITIAL_FEE_PLANS.find(p => p.id === feeSelectedStandard);
      if (plan) return { fee: plan.totalFees, downpayment: plan.downPayment, months: plan.months, installment: plan.installment };
    }
    if (enrollType === 'Custom Combo' && feeSelectedBundle) {
      const bundle = INITIAL_BUNDLES_MAP[mapKey]?.find(b => b.id === feeSelectedBundle);
      if (bundle) return { fee: bundle.fee, downpayment: bundle.downPayment, months: bundle.months, installment: bundle.months > 0 ? Math.floor((bundle.fee - bundle.downPayment) / bundle.months) : 0 };
    }
    if (enrollType === 'Subject-wise' && feeSelectedSubjects.length > 0) {
      const subjects = INITIAL_SUBJECTS_MAP[mapKey] || [];
      const total = subjects.filter((s: any) => feeSelectedSubjects.includes(s.id)).reduce((acc: number, s: any) => acc + (s.fee || 0), 0);
      return { fee: total, downpayment: 0, months: 1, installment: 0 };
    }
    return null;
  }, [enrollType, feeSelectedStandard, feeSelectedBundle, feeSelectedSubjects, mapKey]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <Select label="Select Course" value={fCourse} onChange={e => { setFCourse(e.target.value); setFProgram(''); setFLevel(''); }} options={[{ value: '', label: 'Select Course' }, ...INITIAL_COURSES.map(c => ({ value: c.name, label: c.name }))]} disabled={readOnly} />
        <Select label="Select Program" value={fProgram} onChange={e => { setFProgram(e.target.value); }} options={[{ value: '', label: 'Select Program' }, ...availablePrograms.map((p: any) => ({ value: p, label: p }))]} disabled={readOnly || !fCourse} />
        <Select label="Select Level" value={fLevel} onChange={e => setFLevel(e.target.value)} options={[{ value: '', label: 'Select Level' }, ...availableLevels]} disabled={readOnly || !fProgram} />
      </div>

      <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-4 shadow-sm">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Enrollment Type</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['Standard', 'Custom Combo', 'Subject-wise'].map(et => (
            <label key={et} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${enrollType === et ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'} ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
              <input type="radio" name="enrollType" value={et} checked={enrollType === et} onChange={() => setEnrollType(et as any)} className="text-blue-600" disabled={readOnly} />
              <span className="text-sm font-semibold text-slate-700">{et}</span>
            </label>
          ))}
        </div>

        {enrollType === 'Standard' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {(() => {
              const progPlans = INITIAL_FEE_PLANS.filter(p => p.course === fCourse && p.program === fProgram);
              if (progPlans.length === 0) return <div className="text-sm text-amber-600 mt-2">No standard plans configured for this course/program in Fees Master.</div>;
              return (
                <Select label="Select Standard Plan" value={feeSelectedStandard} onChange={e => setFeeSelectedStandard(e.target.value)} disabled={readOnly} options={[
                  { value: '', label: 'Choose a plan...' },
                  ...progPlans.map((p: any) => ({ value: p.id, label: `${p.program} Base Plan - ₹${p.totalFees.toLocaleString()}` }))
                ]} />
              );
            })()}
          </div>
        )}

        {enrollType === 'Custom Combo' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {(() => {
              const bundles = INITIAL_BUNDLES_MAP[mapKey] || [];
              if (bundles.length === 0) return <div className="text-sm text-amber-600 mt-2">No bundles configured for this course/program/level.</div>;
              return (
                <Select label="Select Bundle" value={feeSelectedBundle} onChange={e => setFeeSelectedBundle(e.target.value)} disabled={readOnly} options={[
                  { value: '', label: 'Choose a bundle...' },
                  ...bundles.map((b: any) => ({ value: b.id, label: `${b.name} - ₹${(b.fee || 0).toLocaleString()}` }))
                ]} />
              );
            })()}
          </div>
        )}

        {enrollType === 'Subject-wise' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {(() => {
              const subjects = INITIAL_SUBJECTS_MAP[mapKey] || [];
              if (subjects.length === 0) return <div className="text-sm text-red-500 mt-2">No subjects configured for this course/program/level.</div>;
              return (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Select Subjects</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects.map((s: any) => (
                      <label key={s.id} className={`flex items-center gap-2 ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
                        <input type="checkbox" checked={feeSelectedSubjects.includes(s.id)} disabled={readOnly} onChange={e => {
                          if (e.target.checked) setFeeSelectedSubjects([...feeSelectedSubjects, s.id]);
                          else setFeeSelectedSubjects(feeSelectedSubjects.filter(id => id !== s.id));
                        }} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                        <span className="text-sm text-slate-700">{s.name} <span className="font-semibold text-emerald-600">(₹{(s.fee || 0).toLocaleString()})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {idealPlan && (
          <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-md shadow-blue-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" /> Ideal Plan Configuration
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 relative z-10">
              <div className="text-center bg-white/60 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Amount</div>
                <div className="text-xl font-extrabold text-slate-800">₹{idealPlan.fee.toLocaleString()}</div>
              </div>
              <div className="text-center bg-white/60 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Downpayment</div>
                <div className="text-xl font-extrabold text-slate-800">₹{idealPlan.downpayment.toLocaleString()}</div>
              </div>
              <div className="text-center bg-white/60 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Installments</div>
                <div className="text-xl font-extrabold text-slate-800">{idealPlan.months} <span className="text-sm font-semibold text-slate-500">Months</span></div>
              </div>
              <div className="text-center bg-white/60 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Installment Amount</div>
                <div className="text-xl font-extrabold text-blue-700">₹{idealPlan.installment.toLocaleString()}<span className="text-sm font-semibold text-blue-500/70">/mo</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4" /> Final Fee Configuration
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          <Input label="Total Final Fee (₹)" type="number" value={customTotalFee} onChange={e => setCustomTotalFee(e.target.value === '' ? '' : Number(e.target.value))} readOnly={readOnly} />
          <Input label="Discount (₹)" type="number" value={customDiscount} onChange={e => setCustomDiscount(e.target.value === '' ? '' : Number(e.target.value))} readOnly={readOnly} />
          <Input label="Downpayment (₹)" type="number" value={customDownpayment} onChange={e => setCustomDownpayment(e.target.value === '' ? '' : Number(e.target.value))} readOnly={readOnly} />
          <Input label="No. of Months" type="number" value={customMonths} onChange={e => setCustomMonths(e.target.value === '' ? '' : Number(e.target.value))} readOnly={readOnly} />
          <Select label="Payment Mode" value={paymentMode} onChange={e => setPaymentMode(e.target.value)} disabled={readOnly} options={[
            {value: '', label: 'Select (Optional)'},
            {value: 'UPI', label: 'UPI'},
            {value: 'Bank Transfer', label: 'Bank Transfer'},
            {value: 'Cash', label: 'Cash'},
            {value: 'Card', label: 'Card'},
            {value: 'Cheque', label: 'Cheque'}
          ]} />
        </div>
        <div className="mt-4 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-md shadow-emerald-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Final Fee Configuration
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 relative z-10">
            <div className="text-center bg-white/70 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Discounted Net Payable</div>
              <div className="text-xl font-extrabold text-slate-800">₹{netFee.toLocaleString()}</div>
            </div>
            <div className="text-center bg-white/70 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Initial Deposit</div>
              <div className="text-xl font-extrabold text-slate-800">₹{customDownpayment.toLocaleString()}</div>
            </div>
            <div className="text-center bg-white/70 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Installments</div>
              <div className="text-xl font-extrabold text-slate-800">{customMonths} <span className="text-sm font-semibold text-slate-500">Monnths</span></div>
            </div>
            <div className="text-center bg-white/70 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm ring-1 ring-emerald-500/20">
              <div className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Installment Amount</div>
              <div className="text-xl font-extrabold text-emerald-600">
                {installmentAmount > 0 ? `₹${installmentAmount.toLocaleString()}` : '₹0'}<span className="text-sm font-semibold text-emerald-500/70">/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
