import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Plus, ArrowLeft } from 'lucide-react';
import type { Lead } from '../data/mockData';

interface EnquiryProps {
  initialTab?: 'pipeline' | 'convert';
}

export const Enquiry: React.FC<EnquiryProps> = ({ initialTab = 'pipeline' }) => {
  const { leads, addLead, addFollowup, convertLeadToStudent } = useApp();
  const [subTab, setSubTab] = useState<'pipeline' | 'convert'>(initialTab);
  const [successMessage, setSuccessMessage] = useState('');
  const viewMode = 'list';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Forms
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [course, setCourse] = useState('JEE Prep');
  const [source, setSource] = useState('Google Ads');
  const [remarks, setRemarks] = useState('');

  const [followupType, setFollowupType] = useState('Call #1');
  const [outcome, setOutcome] = useState('');
  const [nextDate, setNextDate] = useState('');

  const [convertBatch, setConvertBatch] = useState('JEE-Morning-A');
  const [totalFee, setTotalFee] = useState(120000);
  const [discount, setDiscount] = useState(0);
  const [paidFee, setPaidFee] = useState(40000);

  React.useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLead(name, mobile, course, source, remarks);
    setName('');
    setMobile('');
    setRemarks('');
    setShowAddModal(false);
  };

  const handleFollowupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLead) {
      addFollowup(selectedLead.id, followupType, outcome, nextDate);
      setOutcome('');
      setNextDate('');
      setShowFollowupModal(false);
      setSelectedLead(null);
    }
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLead) {
      convertLeadToStudent(selectedLead.id, selectedLead.course, convertBatch, totalFee, discount, paidFee);
      setShowConvertModal(false);
      setSelectedLead(null);
      setSuccessMessage('Student registration and initial receipt ledgers created successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const [pipelinePage, setPipelinePage] = useState(1);
  const [convertPage, setConvertPage] = useState(1);
  const itemsPerPage = 3;

  const filteredAndSortedLeads = leads
    .filter(l => {
      const matchSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.course.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || l.status === filterStatus;
      const matchSource = filterSource === 'All' || l.source === filterSource;
      return matchSearch && matchStatus && matchSource;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'course') return a.course.localeCompare(b.course);
      return 0;
    });

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedLeads.map(l => ({
      'Lead Name': l.name,
      'Mobile': l.mobile,
      'Course': l.course,
      'Source': l.source,
      'Status': l.status,
      'Remarks': l.remarks
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
    link.setAttribute("download", "crm_enquiries.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedPipelineLeads = filteredAndSortedLeads.slice((pipelinePage - 1) * itemsPerPage, pipelinePage * itemsPerPage);
  const totalPipelinePages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);

  const conversionLeads = filteredAndSortedLeads.filter(l => l.status !== 'Interested');
  const paginatedConversionLeads = conversionLeads.slice((convertPage - 1) * itemsPerPage, convertPage * itemsPerPage);
  const totalConversionPages = Math.ceil(conversionLeads.length / itemsPerPage);

  if (showAddModal) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(false)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Log Prospect Enquiry (CRM)</h2>
            <p className="text-sm text-slate-500">Record new enquiries in the CRM funnel.</p>
          </div>
        </div>
        <div className="w-full">
          <form onSubmit={handleAddLeadSubmit} className="space-y-4">
            <Input label="Student Name" required placeholder="Aarav Sharma" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Mobile Contact" required placeholder="9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Interested Course" value={course} onChange={(e) => setCourse(e.target.value)} options={[
                { value: 'JEE Prep', label: 'JEE Prep Course' },
                { value: 'NEET Batch', label: 'NEET Batch Premium' },
                { value: 'Class 10 Foundation', label: 'Class 10 Foundation' }
              ]} />
              <Select label="Discovery Source" value={source} onChange={(e) => setSource(e.target.value)} options={[
                { value: 'Google Ads', label: 'Google Ads' },
                { value: 'Referral', label: 'Student Referral' },
                { value: 'Walk-in', label: 'Direct Walk-in' },
                { value: 'Flyer Campaign', label: 'Flyer Campaign' }
              ]} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Remarks</label>
              <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Needs weekend slot..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Enquiry</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showFollowupModal && selectedLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowFollowupModal(false); setSelectedLead(null); }}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Log Callback: {selectedLead.name}</h2>
            <p className="text-sm text-slate-500">Record counseling discussions or callbacks.</p>
          </div>
        </div>
        <div className="w-full">
          <form onSubmit={handleFollowupSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Call Attempt" value={followupType} onChange={(e) => setFollowupType(e.target.value)} options={[
                { value: 'Call #1', label: 'Call #1 (First intro)' },
                { value: 'Call #2', label: 'Call #2 (Demo check)' },
                { value: 'Call #3', label: 'Call #3 (Negotiation)' },
                { value: 'Walk-in', label: 'In-office Counseling' }
              ]} />
              <Input label="Next Date" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Discussion Outcome</label>
              <textarea required rows={3} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => { setShowFollowupModal(false); setSelectedLead(null); }}>Cancel</Button>
              <Button type="submit" variant="primary">Log Outcome</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showConvertModal && selectedLead) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowConvertModal(false); setSelectedLead(null); }}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">Convert to Student: {selectedLead.name}</h2>
            <p className="text-sm text-slate-500">Allocate batch, adjust fees, and register student account.</p>
          </div>
        </div>
        <div className="w-full">
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Confirmed Course" value={selectedLead.course} readOnly />
              <Select label="Allocate Batch" value={convertBatch} onChange={(e) => setConvertBatch(e.target.value)} options={[
                { value: 'JEE-Morning-A', label: 'JEE-Morning-A' },
                { value: 'JEE-Evening-B', label: 'JEE-Evening-B' },
                { value: 'NEET-Regular-B', label: 'NEET-Regular-B' }
              ]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Base Course Fee" type="number" value={totalFee} onChange={(e) => setTotalFee(Number(e.target.value))} />
              <Input label="Discount (Rs.)" type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <Input label="Initial Deposit Payment (Rs.)" type="number" value={paidFee} onChange={(e) => setPaidFee(Number(e.target.value))} />
            
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
              <div>
                <div className="text-xs text-slate-500 font-medium">Net Outstanding Balance:</div>
                <div className="text-lg font-bold text-red-600">Rs. {totalFee - discount - paidFee}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Discounted Fee:</div>
                <div className="text-lg font-bold text-slate-800">Rs. {totalFee - discount}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => { setShowConvertModal(false); setSelectedLead(null); }}>Cancel</Button>
              <Button type="submit" variant="primary">Confirm Admission</Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMessage}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">
            {subTab === 'pipeline' ? 'Enquiry CRM Pipeline' : 'Admission Conversion Wizard'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {subTab === 'pipeline' 
              ? 'Manage pipeline leads, log student callbacks, and convert profiles to admissions.'
              : 'Directly convert pre-counselled enquiries into registered student profiles.'}
          </p>
        </div>
        {subTab === 'pipeline' && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
            <Button variant="primary" style={{ gap: '6px' }} onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Log Enquiry
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input 
          placeholder="Search leads by name or course preference..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          wrapperClassName="sm:col-span-2"
        />
        <Select
          label="Stage Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: 'All', label: 'All Stages' },
            { value: 'New Enquiry', label: 'New Enquiry' },
            { value: 'Follow-up', label: 'Follow-up' },
            { value: 'Interested', label: 'Interested' }
          ]}
        />
        <Select
          label="Discovery Source"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          options={[
            { value: 'All', label: 'All Sources' },
            { value: 'Google Ads', label: 'Google Ads' },
            { value: 'Walk-in', label: 'Walk-in' },
            { value: 'Website', label: 'Website' },
            { value: 'Referral', label: 'Referral' }
          ]}
        />
      </div>

      {subTab === 'pipeline' ? (
        viewMode === 'list' ? (
          <Card>
            <CardHeader>
              <CardTitle>Active Lead Registrations</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase select-none">Sort By</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm font-semibold"
                >
                  <option value="name">Lead Name</option>
                  <option value="status">Stage Status</option>
                  <option value="course">Course Preference</option>
                </select>
              </div>
            </CardHeader>
            <Table headers={['Student Name', 'Mobile', 'Course Interest', 'Discovery Source', 'Assigned Counsellor', 'Stage Status', 'Actions']}>
              {paginatedPipelineLeads.map((l, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                  <td className="px-6 py-4">{l.course}</td>
                  <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{l.source}</span></td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">{l.counsellor}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1.5 border rounded-md text-[10px] uppercase font-bold tracking-wide ${l.status === 'Interested' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedLead(l); setShowFollowupModal(true); }}>
                        Log Call
                      </Button>
                      {l.status !== 'Interested' && (
                        <Button variant="primary" size="sm" onClick={() => { setSelectedLead(l); setShowConvertModal(true); }}>
                          Convert
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination
              currentPage={pipelinePage}
              totalPages={totalPipelinePages}
              totalItems={filteredAndSortedLeads.length}
              pageSize={itemsPerPage}
              onPageChange={setPipelinePage}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-100/60 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex justify-between">
                <span>New Enquiry</span>
                <span className="bg-slate-200/80 text-slate-600 px-2 rounded-full font-mono">{filteredAndSortedLeads.filter(l => l.status === 'New Enquiry').length}</span>
              </h3>
              {filteredAndSortedLeads.filter(l => l.status === 'New Enquiry').map((l, idx) => (
                <div key={idx} onClick={() => { setSelectedLead(l); setShowConvertModal(true); }} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-blue-500 hover:shadow transition cursor-pointer space-y-2">
                  <div className="font-semibold text-slate-800 text-sm">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.course}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-100/60 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex justify-between">
                <span>Follow-up</span>
                <span className="bg-slate-200/80 text-slate-600 px-2 rounded-full font-mono">{filteredAndSortedLeads.filter(l => l.status === 'Follow-up').length}</span>
              </h3>
              {filteredAndSortedLeads.filter(l => l.status === 'Follow-up').map((l, idx) => (
                <div key={idx} onClick={() => { setSelectedLead(l); setShowFollowupModal(true); }} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-blue-500 hover:shadow transition cursor-pointer space-y-2">
                  <div className="font-semibold text-slate-800 text-sm">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.course}</div>
                  <div className="text-[10px] text-slate-400">Next call: {l.nextFollowUp}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-100/60 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex justify-between">
                <span>Interested</span>
                <span className="bg-slate-200/80 text-slate-600 px-2 rounded-full font-mono">{filteredAndSortedLeads.filter(l => l.status === 'Interested').length}</span>
              </h3>
              {filteredAndSortedLeads.filter(l => l.status === 'Interested').map((l, idx) => (
                <div key={idx} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-2">
                  <div className="font-semibold text-slate-800 text-sm">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.course}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">Ready to Admit</div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Admissions Quick Conversion Ledger</CardTitle>
          </CardHeader>
          <Table headers={['Student Name', 'Mobile', 'Course Interest', 'Stage Status', 'Action']}>
            {paginatedConversionLeads.map((l, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-semibold text-slate-800">{l.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.mobile}</td>
                <td className="px-6 py-4">{l.course}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {l.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Button variant="primary" size="sm" onClick={() => { setSelectedLead(l); setShowConvertModal(true); }}>
                    Convert Student Profile
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination
            currentPage={convertPage}
            totalPages={totalConversionPages}
            totalItems={conversionLeads.length}
            pageSize={itemsPerPage}
            onPageChange={setConvertPage}
          />
        </Card>
      )}    </div>
  );
};
