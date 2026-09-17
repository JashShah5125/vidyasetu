import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, Calculator } from 'lucide-react';
import { INITIAL_COURSES, INITIAL_FEE_PLANS, INITIAL_BUNDLES_MAP, INITIAL_SUBJECTS_MAP } from '../types';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { getAcademicOptions } from '../services/studentApi';

interface FeeConfiguratorProps {
  initialCourse?: string;
  initialProgram?: string;
  initialLevel?: string;
  initialState?: any;
  academicData?: any;
  onChange: (feeData: any, isComplete: boolean) => void;
  readOnly?: boolean;
}

export const FeeConfigurator: React.FC<FeeConfiguratorProps> = ({
  initialCourse = '',
  initialProgram = '',
  initialLevel = '',
  initialState,
  academicData: propAcademicData,
  onChange,
  readOnly = false
}) => {
  const [academicData, setAcademicData] = useState<any>(propAcademicData || null);

  useEffect(() => {
    if (propAcademicData) {
      setAcademicData(propAcademicData);
    } else {
      getAcademicOptions()
        .then(res => {
          const data = res?.data || res;
          if (data) setAcademicData(data);
        })
        .catch(err => {
          console.error('[FeeConfigurator] Failed to load academic options:', err);
        });
    }
  }, [propAcademicData]);

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

  // Derived course, program, level options from live academicData
  const availableCourses = useMemo(() => {
    if (academicData?.courses && academicData.courses.length > 0) {
      return academicData.courses;
    }
    return INITIAL_COURSES;
  }, [academicData]);

  const selectedCourseObj = useMemo(() => {
    return availableCourses.find((c: any) => c.name === fCourse);
  }, [availableCourses, fCourse]);

  const availablePrograms = useMemo(() => {
    if (!fCourse) return [];
    if (academicData?.programs && selectedCourseObj) {
      const matched = academicData.programs.filter((p: any) => Number(p.course_id) === Number(selectedCourseObj.id));
      if (matched.length > 0) {
        return matched.map((p: any) => p.name);
      }
    }
    return selectedCourseObj?.programs || [];
  }, [academicData, selectedCourseObj, fCourse]);

  const selectedProgramObj = useMemo(() => {
    if (!academicData?.programs || !fProgram) return null;
    return academicData.programs.find((p: any) => 
      p.name === fProgram && (!selectedCourseObj || Number(p.course_id) === Number(selectedCourseObj.id))
    );
  }, [academicData, fProgram, selectedCourseObj]);

  const availableLevels = useMemo(() => {
    if (!fProgram && !fCourse) return [];
    if (academicData?.levels) {
      if (selectedProgramObj) {
        const byProg = academicData.levels.filter((l: any) => Number(l.program_id) === Number(selectedProgramObj.id));
        if (byProg.length > 0) return byProg.map((l: any) => ({ value: l.name, label: l.name }));
      }
      if (selectedCourseObj) {
        const byCourse = academicData.levels.filter((l: any) => Number(l.course_id) === Number(selectedCourseObj.id));
        if (byCourse.length > 0) return byCourse.map((l: any) => ({ value: l.name, label: l.name }));
      }
      if (academicData.levels.length > 0) {
        return academicData.levels.map((l: any) => ({ value: l.name, label: l.name }));
      }
    }
    if (fProgram.includes('2 Year')) return [{ value: 'Year 1 / Class 11', label: 'Year 1 / Class 11' }, { value: 'Year 2 / Class 12', label: 'Year 2 / Class 12' }];
    if (fProgram.includes('1 Year')) return [{ value: 'Year 1 / Class 11', label: 'Year 1 / Class 11' }];
    if (fProgram.includes('8th')) return [{ value: 'Class 8', label: 'Class 8' }];
    if (fProgram.includes('9th')) return [{ value: 'Class 9', label: 'Class 9' }];
    if (fProgram.includes('10th')) return [{ value: 'Class 10', label: 'Class 10' }];
    return [{ value: 'Year 1 / Class 11', label: 'Year 1 / Class 11' }];
  }, [academicData, selectedProgramObj, selectedCourseObj, fProgram, fCourse]);

  const selectedLevelObj = useMemo(() => {
    if (!academicData?.levels || !fLevel) return null;
    return academicData.levels.find((l: any) => 
      l.name === fLevel || String(l.id) === String(fLevel)
    );
  }, [academicData, fLevel]);

  // Live Subject Bundles for selected Level
  const availableBundles = useMemo(() => {
    if (academicData?.bundles) {
      if (selectedLevelObj) {
        const matched = academicData.bundles.filter((b: any) => Number(b.level_id) === Number(selectedLevelObj.id));
        if (matched.length > 0) return matched;
      }
      return academicData.bundles;
    }
    const mapKey = selectedCourseObj ? `${selectedCourseObj.code}-${fProgram}-${fLevel}` : '';
    return INITIAL_BUNDLES_MAP[mapKey] || [];
  }, [academicData, selectedLevelObj, selectedCourseObj, fProgram, fLevel]);

  // Live Subjects for selected Level
  const availableSubjects = useMemo(() => {
    if (academicData?.levelSubjects && selectedLevelObj) {
      const matched = academicData.levelSubjects.filter((s: any) => Number(s.level_id) === Number(selectedLevelObj.id));
      if (matched.length > 0) return matched;
    }
    if (academicData?.subjects && academicData.subjects.length > 0) {
      return academicData.subjects.map((s: any) => ({
        ...s,
        fee_amount: s.fee_amount || 30000
      }));
    }
    const mapKey = selectedCourseObj ? `${selectedCourseObj.code}-${fProgram}-${fLevel}` : '';
    return INITIAL_SUBJECTS_MAP[mapKey] || [];
  }, [academicData, selectedLevelObj, selectedCourseObj, fProgram, fLevel]);

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
      } else if (selectedCourseObj?.fees) {
        calculatedBase = Number(selectedCourseObj.fees);
      }
    } else if (enrollType === 'Custom Combo') {
      const bundle = availableBundles.find((b: any) => String(b.id) === String(feeSelectedBundle));
      if (bundle) {
        calculatedBase = Number(bundle.fee_amount || bundle.fee || 0);
        if (!initialState || customDownpayment === 0) setCustomDownpayment(bundle.downPayment || Math.round(calculatedBase * 0.3));
        if (!initialState || customMonths === 1) setCustomMonths(bundle.months || 6);
      }
    } else if (enrollType === 'Subject-wise') {
      calculatedBase = availableSubjects
        .filter((s: any) => feeSelectedSubjects.includes(String(s.id)) || feeSelectedSubjects.includes(Number(s.id) as any))
        .reduce((acc: number, s: any) => acc + Number(s.fee_amount || s.fee || 0), 0);
    }
    if (calculatedBase > 0) {
      setCustomTotalFee(calculatedBase);
    }
  }, [enrollType, feeSelectedStandard, feeSelectedBundle, feeSelectedSubjects, availableBundles, availableSubjects, selectedCourseObj, initialState]);

  // Report changes back to parent
  useEffect(() => {
    const isComplete =
      (enrollType === 'Standard' && (feeSelectedStandard !== '' || Number(customTotalFee) > 0)) ||
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

  const idealPlan = useMemo(() => {
    if (enrollType === 'Standard' && feeSelectedStandard) {
      const plan = INITIAL_FEE_PLANS.find(p => p.id === feeSelectedStandard);
      if (plan) return { fee: plan.totalFees, downpayment: plan.downPayment, months: plan.months, installment: plan.installment };
    }
    if (enrollType === 'Custom Combo' && feeSelectedBundle) {
      const bundle = availableBundles.find((b: any) => String(b.id) === String(feeSelectedBundle));
      if (bundle) {
        const fee = Number(bundle.fee_amount || bundle.fee || 0);
        const downpayment = bundle.downPayment || Math.round(fee * 0.3);
        const months = bundle.months || 6;
        return { fee, downpayment, months, installment: months > 0 ? Math.floor((fee - downpayment) / months) : 0 };
      }
    }
    if (enrollType === 'Subject-wise' && feeSelectedSubjects.length > 0) {
      const total = availableSubjects
        .filter((s: any) => feeSelectedSubjects.includes(String(s.id)) || feeSelectedSubjects.includes(Number(s.id) as any))
        .reduce((acc: number, s: any) => acc + Number(s.fee_amount || s.fee || 0), 0);
      return { fee: total, downpayment: Math.round(total * 0.3), months: 4, installment: Math.floor((total * 0.7) / 4) };
    }
    return null;
  }, [enrollType, feeSelectedStandard, feeSelectedBundle, feeSelectedSubjects, availableBundles, availableSubjects]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <Select 
          label="Select Course" 
          value={fCourse} 
          onChange={e => { setFCourse(e.target.value); setFProgram(''); setFLevel(''); }} 
          options={[{ value: '', label: 'Select Course' }, ...availableCourses.map((c: any) => ({ value: c.name, label: c.name }))]} 
          disabled={readOnly} 
        />
        <Select 
          label="Select Program" 
          value={fProgram} 
          onChange={e => { setFProgram(e.target.value); setFLevel(''); }} 
          options={[{ value: '', label: 'Select Program' }, ...availablePrograms.map((p: any) => ({ value: p, label: p }))]} 
          disabled={readOnly || !fCourse} 
        />
        <Select 
          label="Select Level" 
          value={fLevel} 
          onChange={e => setFLevel(e.target.value)} 
          options={[{ value: '', label: 'Select Level' }, ...availableLevels]} 
          disabled={readOnly || (!fProgram && !fCourse)} 
        />
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
              return (
                <Select label="Select Standard Plan" value={feeSelectedStandard} onChange={e => setFeeSelectedStandard(e.target.value)} disabled={readOnly} options={[
                  { value: '', label: progPlans.length > 0 ? 'Choose a plan...' : `Standard Base Plan (${fCourse || 'Course'})` },
                  ...progPlans.map((p: any) => ({ value: p.id, label: `${p.program} Base Plan - ₹${p.totalFees.toLocaleString()}` }))
                ]} />
              );
            })()}
          </div>
        )}

        {enrollType === 'Custom Combo' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {availableBundles.length === 0 ? (
              <div className="text-sm text-amber-600 mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                No custom bundles configured for this level. You can configure bundles in Fee Structures or select Subject-wise.
              </div>
            ) : (
              <Select 
                label="Select Subject Bundle" 
                value={feeSelectedBundle} 
                onChange={e => setFeeSelectedBundle(e.target.value)} 
                disabled={readOnly} 
                options={[
                  { value: '', label: 'Choose a bundle...' },
                  ...availableBundles.map((b: any) => ({ 
                    value: String(b.id), 
                    label: `${b.name} - ₹${Number(b.fee_amount || b.fee || 0).toLocaleString()}` 
                  }))
                ]} 
              />
            )}
          </div>
        )}

        {enrollType === 'Subject-wise' && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {availableSubjects.length === 0 ? (
              <div className="text-sm text-red-500 mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                No subjects found for this course/level.
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Select Subjects</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSubjects.map((s: any) => {
                    const sid = String(s.id);
                    const isChecked = feeSelectedSubjects.includes(sid) || feeSelectedSubjects.includes(s.name);
                    return (
                      <label key={s.id || s.name} className={`flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${readOnly ? 'opacity-70 pointer-events-none' : 'cursor-pointer'}`}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          disabled={readOnly} 
                          onChange={e => {
                            if (e.target.checked) setFeeSelectedSubjects([...feeSelectedSubjects, sid]);
                            else setFeeSelectedSubjects(feeSelectedSubjects.filter(id => id !== sid && id !== s.name));
                          }} 
                          className="w-4 h-4 text-blue-600 rounded border-slate-300" 
                        />
                        <span className="text-sm text-slate-700 font-medium">
                          {s.name} <span className="font-semibold text-emerald-600">(₹{Number(s.fee_amount || s.fee || 0).toLocaleString()})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {idealPlan && (
          <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-md shadow-blue-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" /> Plan Fee Summary
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
              <div className="text-xl font-extrabold text-slate-800">₹{Number(customDownpayment || 0).toLocaleString()}</div>
            </div>
            <div className="text-center bg-white/70 p-3 rounded-lg border border-white/80 shadow-sm backdrop-blur-sm">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Installments</div>
              <div className="text-xl font-extrabold text-slate-800">{customMonths} <span className="text-sm font-semibold text-slate-500">Months</span></div>
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
