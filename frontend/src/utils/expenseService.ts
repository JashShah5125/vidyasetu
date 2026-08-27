export interface Voucher {
  id: string;
  date: string;
  type: 'Payment' | 'Receipt' | 'Expense' | 'Purchase' | 'Salary' | 'Fee';
  category: 'Salaries' | 'Electricity' | 'Maintenance' | 'Stationery' | 'Transport' | 'Hostel' | 'Donations' | 'Fees' | 'Other';
  description: string;
  amount: number;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Cheque' | 'UPI';
  paidTo: string;
  referenceNo: string;
  attachmentName?: string;
  status: 'Paid' | 'Pending';
  direction: 'Debit' | 'Credit';
  branch?: string;
}

const INITIAL_VOUCHERS: Voucher[] = [
  {
    id: 'EXP-001',
    date: '2026-08-01',
    type: 'Expense',
    category: 'Electricity',
    description: 'July Electricity Bill',
    amount: 12500,
    paymentMethod: 'Bank Transfer',
    paidTo: 'Maharashtra Electricity Board',
    referenceNo: 'ELEC-0726',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'EXP-002',
    date: '2026-08-03',
    type: 'Purchase',
    category: 'Stationery',
    description: 'Office Notebooks & Pens',
    amount: 8200,
    paymentMethod: 'Cash',
    paidTo: 'Venus Stationery Mart',
    referenceNo: 'STAT-8902',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'EXP-003',
    date: '2026-08-05',
    type: 'Payment',
    category: 'Maintenance',
    description: 'Computer Server Repair',
    amount: 4500,
    paymentMethod: 'UPI',
    paidTo: 'Apex IT Tech Solutions',
    referenceNo: 'UPI-98402',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'EXP-004',
    date: '2026-08-08',
    type: 'Expense',
    category: 'Transport',
    description: 'Bus Fuel & Maintenance',
    amount: 15000,
    paymentMethod: 'Bank Transfer',
    paidTo: 'Indian Oil Corp',
    referenceNo: 'IOC-7762',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'EXP-005',
    date: '2026-08-10',
    type: 'Salary',
    category: 'Salaries',
    description: 'Monthly payroll teachers',
    amount: 120000,
    paymentMethod: 'Bank Transfer',
    paidTo: 'Teaching Faculty Staff',
    referenceNo: 'PAY-AUG26',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'EXP-006',
    date: '2026-08-11',
    type: 'Expense',
    category: 'Electricity',
    description: 'Additional server backup room electricity',
    amount: 12500,
    paymentMethod: 'UPI',
    paidTo: 'Maharashtra Electricity Board',
    referenceNo: 'ELEC-0811',
    status: 'Pending',
    direction: 'Debit'
  },
  {
    id: 'EXP-007',
    date: '2026-08-09',
    type: 'Payment',
    category: 'Maintenance',
    description: 'Air Conditioning maintenance',
    amount: 13500,
    paymentMethod: 'UPI',
    paidTo: 'CoolAir Services',
    referenceNo: 'UPI-83021',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'EXP-008',
    date: '2026-08-04',
    type: 'Purchase',
    category: 'Stationery',
    description: 'Classroom Whiteboards',
    amount: 3800,
    paymentMethod: 'Cash',
    paidTo: 'Modern Furnishers',
    referenceNo: 'CASH-991',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'EXP-009',
    date: '2026-08-02',
    type: 'Expense',
    category: 'Other',
    description: 'Office tea & refreshments',
    amount: 10000,
    paymentMethod: 'Cash',
    paidTo: 'Local Pantry Vendor',
    referenceNo: 'CASH-102',
    status: 'Paid',
    direction: 'Debit'
  },
  {
    id: 'INC-001',
    date: '2026-08-06',
    type: 'Receipt',
    category: 'Donations',
    description: 'Sponsor Scholarship Donation',
    amount: 50000,
    paymentMethod: 'Bank Transfer',
    paidTo: 'Alumni Trust Fund',
    referenceNo: 'DON-9872',
    status: 'Paid',
    direction: 'Credit'
  },
  {
    id: 'INC-002',
    date: '2026-08-07',
    type: 'Receipt',
    category: 'Other',
    description: 'Scrap book materials sales',
    amount: 12000,
    paymentMethod: 'Cash',
    paidTo: 'Scrap Dealer Corp',
    referenceNo: 'CASH-382',
    status: 'Paid',
    direction: 'Credit'
  }
];

export const getVouchers = (): Voucher[] => {
  try {
    const data = localStorage.getItem('vs_accounting_vouchers');
    if (!data) {
      localStorage.setItem('vs_accounting_vouchers', JSON.stringify(INITIAL_VOUCHERS));
      return INITIAL_VOUCHERS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    localStorage.setItem('vs_accounting_vouchers', JSON.stringify(INITIAL_VOUCHERS));
    return INITIAL_VOUCHERS;
  } catch (e) {
    console.error("Error reading vouchers", e);
    return INITIAL_VOUCHERS;
  }
};

export const saveVoucher = (voucher: Omit<Voucher, 'id'>): Voucher => {
  try {
    let list = getVouchers();
    if (!Array.isArray(list)) {
      list = [];
    }
    const nextIdNum = list.length + 1;
    const prefix = voucher.direction === 'Credit' ? 'INC-' : 'EXP-';
    const newVoucher: Voucher = {
      ...voucher,
      id: `${prefix}${String(nextIdNum).padStart(3, '0')}`
    };
    list.push(newVoucher);
    localStorage.setItem('vs_accounting_vouchers', JSON.stringify(list));
    return newVoucher;
  } catch (e) {
    console.error("Error saving voucher", e);
    // Return a dummy object if storage is disabled
    return {
      ...voucher,
      id: `ERR-${Math.floor(100 + Math.random() * 900)}`
    };
  }
};
