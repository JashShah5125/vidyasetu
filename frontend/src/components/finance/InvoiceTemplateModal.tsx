import React, { useState, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  FileCheck2,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { formatDate as fmtDate } from '../../utils/dateFormatter';
import type { StudentLedgerInvoice, StudentLedger } from '../../services/paymentApi';
import { useAuth } from '../../context/AuthContext';

export interface InvoiceTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: StudentLedgerInvoice | null;
  ledger: StudentLedger | null;
  initialType?: 'tax' | 'proforma';
}

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

// Convert number to Indian currency words
const numberToWords = (num: number): string => {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (val: number): string => {
    let str = '';
    if (val >= 10000000) {
      str += inWords(Math.floor(val / 10000000)) + ' Crore ';
      val %= 10000000;
    }
    if (val >= 100000) {
      str += inWords(Math.floor(val / 100000)) + ' Lakh ';
      val %= 100000;
    }
    if (val >= 1000) {
      str += inWords(Math.floor(val / 1000)) + ' Thousand ';
      val %= 1000;
    }
    if (val >= 100) {
      str += inWords(Math.floor(val / 100)) + ' Hundred ';
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) {
        str += a[val] + ' ';
      } else {
        str += b[Math.floor(val / 10)] + (val % 10 > 0 ? ' ' + a[val % 10] : '') + ' ';
      }
    }
    return str.trim();
  };

  return `${inWords(n)} Rupees Only`;
};

export const InvoiceTemplateModal: React.FC<InvoiceTemplateModalProps> = ({
  isOpen,
  onClose,
  invoice,
  ledger,
  initialType = 'tax'
}) => {
  const { currentUser } = useAuth();
  const [templateType, setTemplateType] = useState<'tax' | 'proforma'>(initialType);
  const [taxRate, setTaxRate] = useState<number>(18); // Default 18% GST (9% CGST + 9% SGST)
  const [isGstInclusive, setIsGstInclusive] = useState<boolean>(true);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const totalAmount = Number(invoice.amount) || 0;
  const paidAmount = Number(invoice.paid_amount) || 0;
  const balanceDue = Number(invoice.balance_due) || 0;

  // Tax calculations
  let taxableValue = totalAmount;
  let cgst = 0;
  let sgst = 0;

  if (taxRate > 0) {
    if (isGstInclusive) {
      taxableValue = Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100;
      const totalTax = totalAmount - taxableValue;
      cgst = Math.round((totalTax / 2) * 100) / 100;
      sgst = Math.round((totalTax - cgst) * 100) / 100;
    } else {
      taxableValue = totalAmount;
      const totalTax = Math.round((taxableValue * (taxRate / 100)) * 100) / 100;
      cgst = Math.round((totalTax / 2) * 100) / 100;
      sgst = Math.round((totalTax - cgst) * 100) / 100;
    }
  }

  const grandTotal = isGstInclusive ? totalAmount : taxableValue + cgst + sgst;

  const instituteName = currentUser?.tenantName || 'VIDYA SETU ACADEMY';
  const branchName = ledger?.branch_name || currentUser?.branch || 'Main Campus';
  const studentName = ledger?.full_name || (ledger as any)?.student?.name || 'Student';
  const studentCode = ledger?.student_code || (ledger as any)?.student?.studentCode || 'STU-REF';
  const batchName = ledger?.batch_name || 'General Batch';
  const courseName = ledger?.feeAssignment?.course_name || 'Academic Coaching Program';

  const isProforma = templateType === 'proforma';

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-area');
    if (!printContent) {
      window.print();
      return;
    }

    let iframe = document.getElementById('invoice-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'invoice-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isProforma ? 'Proforma_Invoice' : 'Tax_Invoice'}_${invoice.invoice_number}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" />
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a;
              margin: 0 !important;
              padding: 0 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            table {
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 210mm; margin: 0 auto; padding: 4mm;">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Wait for styles to settle before opening print dialog
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        window.print();
      }
    }, 350);
  };

  return (
    <div className="invoice-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Inline styles for perfect A4 Print output */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .invoice-modal-overlay {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .invoice-modal-dialog {
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .invoice-scroll-container {
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }
          #invoice-print-area {
            display: block !important;
            width: 100% !important;
            max-width: 210mm !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="invoice-modal-dialog relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Template Type:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setTemplateType('tax')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isProforma
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <FileCheck2 size={13} />
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('proforma')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  isProforma
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <FileText size={13} />
                Proforma Invoice
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5 font-bold h-8 px-3 text-xs shadow-xs"
            >
              <Printer size={13} />
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="invoice-scroll-container overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white flex justify-center">
          <div
            id="invoice-print-area"
            ref={printContainerRef}
            className="w-full max-w-[210mm] bg-white border border-slate-200 shadow-sm p-6 sm:p-10 text-slate-800 font-sans text-xs flex flex-col justify-between print:border-none print:shadow-none print:p-0"
            style={{ minHeight: '275mm' }}
          >
            {/* Header & Institute Info */}
            <div>
              {/* Proforma Notice Banner */}
              {isProforma && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-lg text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock size={15} className="text-amber-600 shrink-0" />
                    <span>PROFORMA INVOICE — PROVISIONAL BILLING ESTIMATE (NOT A TAX DEMAND)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded">
                    Payment Schedule
                  </span>
                </div>
              )}

              {/* Main Institute Header */}
              <div className="flex justify-between items-start pb-5 border-b-2 border-slate-900 gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-900 text-white font-black text-xl flex items-center justify-center tracking-tighter shrink-0 shadow-xs">
                    VS
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      {instituteName}
                    </h1>
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mt-0.5">
                      Coaching & Educational Excellence &bull; Branch: {branchName}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                      Main Campus Road, Knowledge Park &bull; Contact: +91 98765 43210 &bull; support@vidyasetu.com
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600 font-mono mt-1">
                      <span><strong>GSTIN:</strong> 27AABCA1234F1Z8</span>
                      <span>&bull;</span>
                      <span><strong>State Code:</strong> 27 (Maharashtra)</span>
                      <span>&bull;</span>
                      <span><strong>SAC Code:</strong> 999293</span>
                    </div>
                  </div>
                </div>

                {/* Document Type Badge & Stamp */}
                <div className="text-right shrink-0">
                  <div
                    className={`inline-block px-3.5 py-1.5 rounded font-black font-mono text-xs uppercase tracking-wider text-white ${
                      isProforma ? 'bg-amber-600' : 'bg-slate-900'
                    }`}
                  >
                    {isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
                  </div>
                  <div className="mt-2 text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {isProforma ? 'Proforma Ref #' : 'Invoice #'}
                    </div>
                    <div className="font-mono font-black text-sm text-blue-800">
                      {isProforma ? `PI-${invoice.invoice_number}` : invoice.invoice_number}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        invoice.status === 'paid' && !isProforma
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {invoice.status === 'paid' && !isProforma ? (
                        <>
                          <CheckCircle2 size={10} />
                          ORIGINAL TAX RECEIPT &bull; PAID
                        </>
                      ) : (
                        <>
                          <Clock size={10} />
                          DUE / PENDING PAYMENT
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To & Invoice Meta Two-Column Grid */}
              <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
                {/* Billed To / Student Details */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billed To (Student)</div>
                  <div className="text-sm font-extrabold text-slate-900">{studentName}</div>
                  <div className="text-slate-600">
                    <strong>Student Code:</strong> <span className="font-mono">{studentCode}</span>
                  </div>
                  <div className="text-slate-600">
                    <strong>Program / Course:</strong> {courseName}
                  </div>
                  <div className="text-slate-600">
                    <strong>Batch:</strong> {batchName} &bull; <strong>Year:</strong> {ledger?.academic_year_name || '2026-2027'}
                  </div>
                  {ledger?.mobile && (
                    <div className="text-slate-600">
                      <strong>Contact:</strong> {ledger.mobile} {ledger.email ? `&bull; ${ledger.email}` : ''}
                    </div>
                  )}
                </div>

                {/* Invoice Metadata */}
                <div className="space-y-1 sm:text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Invoice Details</div>
                  <div className="text-slate-600">
                    <strong>Date of Issue:</strong> {fmtDate(invoice.issue_date)}
                  </div>
                  <div className="text-slate-600">
                    <strong>Payment Due Date:</strong> {fmtDate(invoice.due_date)}
                  </div>
                  {invoice.payment_date && (
                    <div className="text-slate-600">
                      <strong>Date of Payment:</strong> {fmtDate(invoice.payment_date)}
                    </div>
                  )}
                  <div className="text-slate-600">
                    <strong>Payment Mode:</strong> <span className="font-semibold text-blue-900">{invoice.payment_mode || '—'}</span>
                  </div>
                  {invoice.transaction_reference && (
                    <div className="text-slate-600">
                      <strong>Ref / UTR:</strong> <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{invoice.transaction_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="mt-4">
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      <th className="p-2.5 border-r border-slate-300 text-center w-12">#</th>
                      <th className="p-2.5 border-r border-slate-300">Description of Service</th>
                      <th className="p-2.5 border-r border-slate-300 text-center w-20">SAC / HSN</th>
                      <th className="p-2.5 border-r border-slate-300 text-right w-28">Taxable Value</th>
                      {!isProforma && (
                        <>
                          <th className="p-2.5 border-r border-slate-300 text-right w-24">CGST (9%)</th>
                          <th className="p-2.5 border-r border-slate-300 text-right w-24">SGST (9%)</th>
                        </>
                      )}
                      <th className="p-2.5 text-right w-32">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono font-medium">1</td>
                      <td className="p-2.5 border-r border-slate-300">
                        <div className="font-bold text-slate-900">
                          {invoice.description ||
                            (invoice.installment_number === 0
                              ? 'Admission Downpayment'
                              : `Course Fee — Installment #${invoice.installment_number}`)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Student Coaching Fee &bull; {courseName} ({batchName})
                        </div>
                        {invoice.remarks && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5">
                            Note: {invoice.remarks}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono">999293</td>
                      <td className="p-2.5 border-r border-slate-300 text-right font-mono">{fmt(taxableValue)}</td>
                      {!isProforma && (
                        <>
                          <td className="p-2.5 border-r border-slate-300 text-right font-mono">{fmt(cgst)}</td>
                          <td className="p-2.5 border-r border-slate-300 text-right font-mono">{fmt(sgst)}</td>
                        </>
                      )}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{fmt(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals & Amount in Words */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                {/* Left: Amount in words & Notes */}
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount in Words:</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5 italic">
                      {numberToWords(grandTotal)}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-700">Bank & Payment Remittance Details:</div>
                    <div><strong>Bank:</strong> HDFC Bank Ltd &bull; <strong>A/C Name:</strong> {instituteName}</div>
                    <div><strong>A/C No:</strong> 50200012345678 &bull; <strong>IFSC:</strong> HDFC0001234</div>
                    <div><strong>UPI VPA:</strong> {currentUser?.tenantId ? `${currentUser.tenantId}@hdfcbank` : 'vidyasetu@hdfcbank'}</div>
                  </div>
                </div>

                {/* Right: Subtotals summary table */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Taxable Value:</span>
                    <span className="font-mono font-semibold">{fmt(taxableValue)}</span>
                  </div>
                  {!isProforma && (
                    <>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">CGST (9.0%):</span>
                        <span className="font-mono font-semibold">{fmt(cgst)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">SGST (9.0%):</span>
                        <span className="font-mono font-semibold">{fmt(sgst)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-1.5 border-b-2 border-slate-900 text-sm font-extrabold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base text-blue-900">{fmt(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700 font-semibold">
                    <span>Amount Paid:</span>
                    <span className="font-mono">{fmt(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-700 font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">{fmt(balanceDue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Terms, Disclaimer & Signature */}
            <div className="mt-8 pt-4 border-t-2 border-slate-900">
              <div className="grid grid-cols-2 gap-6 items-end">
                {/* Terms and conditions */}
                <div className="text-[10px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700 uppercase tracking-wider">Terms & Conditions:</div>
                  <p>1. Fees once paid are non-refundable and non-transferable under any circumstances.</p>
                  <p>2. Dishonored cheques/mandates will attract a bank bounce charge of ₹500.</p>
                  <p>
                    {isProforma
                      ? '3. This is a computer-generated Proforma Invoice and serves as a fee demand schedule only.'
                      : '3. This is an official computer-generated Tax Invoice and requires no signature under GST rules.'}
                  </p>
                  <p>4. Subject to Mumbai Jurisdiction.</p>
                </div>

                {/* Authorized Signatory Block */}
                <div className="text-right">
                  <div className="inline-block text-center min-w-[180px]">
                    <div className="h-12 flex items-end justify-center mb-1">
                      <div className="px-3 py-1 border border-blue-200 bg-blue-50/50 rounded text-[10px] font-mono text-blue-800 font-bold uppercase tracking-wider">
                        {isProforma ? 'ACCOUNTS VERIFIED' : 'DIGITALLY SIGNED'}
                      </div>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <div className="font-bold text-xs text-slate-900">Authorized Signatory</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{instituteName}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Line */}
              <div className="mt-4 pt-2 border-t border-slate-100 text-center text-[9px] text-slate-400 font-mono">
                Generated via Vidya Setu Education Management Platform &bull; {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
