import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Kanban, List } from 'lucide-react';
import type { Lead } from '../data/mockData';

interface EnquiryProps {
  initialTab?: 'pipeline' | 'convert';
}

export const Enquiry: React.FC<EnquiryProps> = ({ initialTab = 'pipeline' }) => {
  const { leads, addLead, addFollowup, convertLeadToStudent } = useApp();
  const [subTab, setSubTab] = useState<'pipeline' | 'convert'>(initialTab);
  const [successMessage, setSuccessMessage] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {successMessage}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900 text-slate-800">
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
            <div className="bg-white border border-slate-200 rounded-lg p-0.5 flex">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Kanban size={16} />
              </button>
            </div>
            <Button variant="primary" style={{ gap: '6px' }} onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Log Enquiry
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <div className="flex-1">
          <Input 
            placeholder="Search leads by name or course preference..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {subTab === 'pipeline' ? (
        viewMode === 'list' ? (
          <Card>
            <CardHeader>
              <CardTitle>Active Lead Registrations</CardTitle>
            </CardHeader>
            <Table headers={['Student Name', 'Mobile', 'Course Interest', 'Discovery Source', 'Assigned Counsellor', 'Stage Status', 'Actions']}>
              {filteredLeads.map((l, idx) => (
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
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-100/60 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex justify-between">
                <span>New Enquiry</span>
                <span className="bg-slate-200/80 text-slate-600 px-2 rounded-full font-mono">{filteredLeads.filter(l => l.status === 'New Enquiry').length}</span>
              </h3>
              {filteredLeads.filter(l => l.status === 'New Enquiry').map((l, idx) => (
                <div key={idx} onClick={() => { setSelectedLead(l); setShowConvertModal(true); }} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-blue-500 hover:shadow transition cursor-pointer space-y-2">
                  <div className="font-semibold text-slate-800 text-sm">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.course}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-100/60 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex justify-between">
                <span>Follow-up</span>
                <span className="bg-slate-200/80 text-slate-600 px-2 rounded-full font-mono">{filteredLeads.filter(l => l.status === 'Follow-up').length}</span>
              </h3>
              {filteredLeads.filter(l => l.status === 'Follow-up').map((l, idx) => (
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
                <span className="bg-slate-200/80 text-slate-600 px-2 rounded-full font-mono">{filteredLeads.filter(l => l.status === 'Interested').length}</span>
              </h3>
              {filteredLeads.filter(l => l.status === 'Interested').map((l, idx) => (
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
            {filteredLeads.filter(l => l.status !== 'Interested').map((l, idx) => (
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
        </Card>
      )}

      {/* 1. Log Enquiry Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Log Prospect Enquiry (CRM)">
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
      </Modal>

      {/* 2. Followup Call Modal */}
      {showFollowupModal && selectedLead && (
        <Modal isOpen={showFollowupModal} onClose={() => { setShowFollowupModal(false); setSelectedLead(null); }} title={`Log Callback: ${selectedLead.name}`}>
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
        </Modal>
      )}

      {/* 3. Conversion Wizard Modal */}
      {showConvertModal && selectedLead && (
        <Modal isOpen={showConvertModal} onClose={() => { setShowConvertModal(false); setSelectedLead(null); }} title={`Convert to Student: ${selectedLead.name}`}>
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
        </Modal>
      )}
    </div>
  );
};
