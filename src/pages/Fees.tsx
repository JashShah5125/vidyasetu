import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';

interface FeesProps {
  initialTab?: 'record' | 'defaulters';
}

export const Fees: React.FC<FeesProps> = ({ initialTab = 'record' }) => {
  const { students, recordPayment } = useApp();
  const [subTab, setSubTab] = useState<'record' | 'defaulters'>(initialTab);
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [amount, setAmount] = useState(10000);
  const [mode, setMode] = useState('UPI');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const uniqueCourses = Array.from(new Set(students.map(s => s.course)));

  const filteredAndSortedStudents = students
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCourse = filterCourse === 'All' || s.course === filterCourse;
      return matchSearch && matchCourse;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'pendingFees') return b.feePlan.pending - a.feePlan.pending;
      return 0;
    });

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedStudents.map(s => ({
      'Student ID': s.studentId,
      'Name': s.name,
      'Course': s.course,
      'Total Fees': s.feePlan.total,
      'Paid Fees': s.feePlan.paid,
      'Pending Fees': s.feePlan.pending
    }));
    
    if (dataToExport.length === 0) return;
    const csvRows = [];
    const headers = Object.keys(dataToExport[0]);
    csvRows.push(headers.join(','));
    
    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = row[header as keyof typeof row] || '';
        const escaped = ('' + val).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", subTab === 'record' ? "fees_registry.csv" : "defaulters_ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const [receipt, setReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  React.useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || amount <= 0) return;
    const slip = recordPayment(studentId, amount, mode);
    if (slip) {
      setReceipt(slip);
      setShowReceipt(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">
            {subTab === 'record' ? 'Fee registry' : 'Branch Defaulters Ledger'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {subTab === 'record' 
              ? 'Record payments, generate billing slips, and track installment schedules.'
              : 'Review outstanding dues profiles, warning status logs, and collection alerts.'}
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input 
          placeholder="Search students by name or ID..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <Select
          label="Course"
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          options={[
            { value: 'All', label: 'All Courses' },
            ...uniqueCourses.map(c => ({ value: c, label: c }))
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subTab === 'record' ? (
          <Card>
            <CardHeader>
              <CardTitle>Record Student Fee Payment</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <Select 
                label="Select Student Account" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)}
                options={students.map(s => ({
                  value: s.id,
                  label: `${s.name} (${s.studentId}) - Due: Rs. ${s.feePlan.pending}`
                }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Amount Received (Rs.)" 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))} 
                />
                <Select 
                  label="Payment Gateway/Mode" 
                  value={mode} 
                  onChange={(e) => setMode(e.target.value)} 
                  options={[
                    { value: 'UPI', label: 'UPI / GPay' },
                    { value: 'Cash', label: 'Cash Payment' },
                    { value: 'Cheque', label: 'Bank Cheque' },
                    { value: 'Bank Transfer', label: 'NEFT / IMPS' }
                  ]}
                />
              </div>
              <Button type="submit" variant="primary" fullWidth style={{ padding: '12px' }}>
                Confirm Payment &amp; Generate Slip
              </Button>
            </form>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Dues Defaulters Sheets</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {students.filter(s => s.feePlan.pending > 30000).map((s, idx) => (
                <div key={idx} className="p-4 bg-red-50/50 border border-red-100 rounded-xl flex justify-between items-center text-sm">
                  <div>
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.course}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-semibold uppercase">Pending</div>
                    <div className="font-bold text-red-600">Rs. {s.feePlan.pending}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Collections Quick Glance</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2"><span>Total Branch Billings</span> <strong className="text-slate-800">Rs. 2,70,000</strong></div>
            <div className="flex justify-between border-b border-slate-100 pb-2"><span>Settled Collections</span> <strong className="text-emerald-600">Rs. 1,30,000</strong></div>
            <div className="flex justify-between"><span>Dues Outstanding</span> <strong className="text-red-500">Rs. 1,40,000</strong></div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dues Audit Register</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase select-none">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm font-semibold"
            >
              <option value="name">Student Name</option>
              <option value="pendingFees">Highest Pending Fees</option>
            </select>
          </div>
        </CardHeader>
        <Table headers={['Student ID', 'Student Name', 'Total Bill', 'Paid Amount', 'Dues Remaining', 'Status']}>
          {paginatedStudents.map((s, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
              <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
              <td className="px-6 py-4 font-mono text-xs">Rs. {s.feePlan.total}</td>
              <td className="px-6 py-4 font-mono text-xs text-emerald-600">Rs. {s.feePlan.paid}</td>
              <td className="px-6 py-4 font-mono text-xs text-red-500">Rs. {s.feePlan.pending}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                  s.feePlan.pending === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {s.feePlan.pending === 0 ? 'Fully Paid' : 'Pending'}
                </span>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedStudents.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Printable Receipt Modal */}
      {showReceipt && receipt && (
        <Modal 
          isOpen={showReceipt} 
          onClose={() => { setShowReceipt(false); setReceipt(null); }} 
          title="Transaction Slip Generated"
        >
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-sm text-slate-600">
            <div className="text-center border-b border-slate-200 pb-3">
              <h4 className="font-display font-bold text-lg text-slate-900">Payment Slip</h4>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Vidya Setu Transaction System</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between"><span>Receipt ID:</span> <strong className="text-slate-800">{receipt.receiptNo}</strong></div>
              <div className="flex justify-between"><span>Date:</span> <strong className="text-slate-800">{receipt.date}</strong></div>
              <div className="flex justify-between"><span>Student:</span> <strong className="text-slate-800">{receipt.studentName}</strong></div>
              <div className="flex justify-between"><span>Amount Received:</span> <strong className="text-emerald-600 font-bold">Rs. {receipt.amount}</strong></div>
              <div className="flex justify-between"><span>Dues Balance:</span> <strong className="text-red-500 font-bold">Rs. {receipt.balance}</strong></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <Button variant="secondary" onClick={() => { setShowReceipt(false); setReceipt(null); }}>Done</Button>
            <Button variant="primary" onClick={() => window.print()}>Print Slip</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
