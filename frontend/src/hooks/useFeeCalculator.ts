import { useState, useMemo } from 'react';

export interface FeeInput {
  enrollType: 'Standard' | 'Subject-wise';
  baseFee: number;
  discount: number;
  downpayment: number;
  months: number;
}

export const useFeeCalculator = (initial?: Partial<FeeInput>) => {
  const [enrollType, setEnrollType] = useState<'Standard' | 'Subject-wise'>(
    initial?.enrollType === 'Subject-wise' ? 'Subject-wise' : 'Standard'
  );
  const [baseFee, setBaseFee] = useState(initial?.baseFee || 0);
  const [discount, setDiscount] = useState(initial?.discount || 0);
  const [downpayment, setDownpayment] = useState(initial?.downpayment || 0);
  const [months, setMonths] = useState(initial?.months || 1);

  const netFee = useMemo(() => Math.max(0, baseFee - discount), [baseFee, discount]);
  const balance = useMemo(() => Math.max(0, netFee - downpayment), [netFee, downpayment]);
  const installmentAmount = useMemo(() => months > 0 ? Math.floor(balance / months) : 0, [balance, months]);

  return {
    enrollType,
    setEnrollType,
    baseFee,
    setBaseFee,
    discount,
    setDiscount,
    netFee,
    downpayment,
    setDownpayment,
    months,
    setMonths,
    balance,
    installmentAmount
  };
};
