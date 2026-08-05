import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ChevronLeft, MapPin, Building, Phone, Clock, Landmark, GraduationCap, ShieldAlert } from 'lucide-react';
import type { Branch } from '../data/mockData';

export const BranchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { branches, setBranches, addToast } = useApp();
  
  const isNew = id === 'new';
  const existingBranch = branches.find(b => b.id === id || b.code === id);

  const [activeTab, setActiveTab] = useState<'general' | 'admin' | 'operations'>('general');

  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '', code: '', admin: '', adminEmail: '', adminMobile: '', capacity: 0, status: 'Active',
    address: '', email: '', phone: '', operatingHours: '', programs: [],
    bankDetails: { accountName: '', accountNumber: '', ifsc: '', bankName: '' }
  });

  useEffect(() => {
    if (existingBranch && !isNew) {
      setFormData({ ...existingBranch });
    }
  }, [existingBranch, isNew]);

  const handleSave = () => {
    if (isNew) {
      const newBranch = { ...formData, id: `B-${Date.now()}` } as Branch;
      setBranches([...branches, newBranch]);
      addToast('New branch created successfully.');
    } else {
      setBranches(branches.map(b => (b.id === existingBranch?.id ? (formData as Branch) : b)));
      addToast('Branch details updated successfully.');
    }
    navigate('/branches');
  };

  const handleProgramToggle = (prog: string) => {
    const progs = formData.programs || [];
    if (progs.includes(prog)) {
      setFormData({ ...formData, programs: progs.filter(p => p !== prog) });
    } else {
      setFormData({ ...formData, programs: [...progs, prog] });
    }
  };

  if (!isNew && !existingBranch) {
    return <div className="p-8 text-center">Branch not found.</div>;
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col gap-2 p-6 pb-0">
        <button onClick={() => navigate('/branches')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit transition-colors">
          <ChevronLeft size={16} /> Back to Branches
        </button>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-display font-bold text-slate-900">
            {isNew ? 'Create New Branch' : `Manage Branch: ${formData.name}`}
          </h2>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/branches')}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
              Save Branch Details
            </Button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none mt-6 px-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          General Setup
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Admin & Access
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
            activeTab === 'operations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Operations & Finance
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 pt-6">
        
        {activeTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Building size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Basic Details</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <Input label="Branch Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Mumbai West" />
                <Input label="Branch Code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g., MUM-WEST" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <Input label="Student Intake Capacity" type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} />
              </div>
            </Card>

            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Location & Contact</h3>
              </div>
              <div className="p-5 space-y-4">
                <Input label="Full Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street, City, State, Pincode" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Branch Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contact@branch.com" />
                  <Input label="Branch Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="022-XXXXXXX" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 rounded-t-xl">
                <ShieldAlert size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800">Branch Admin</h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500">The assigned administrator has full operational control over this branch.</p>
                <Input label="Admin Name" value={formData.admin} onChange={e => setFormData({...formData, admin: e.target.value})} placeholder="Full Name" />
                <Input label="Admin Email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} placeholder="Will receive login credentials" />
                <Input label="Admin Mobile" value={formData.adminMobile} onChange={e => setFormData({...formData, adminMobile: e.target.value})} placeholder="For SMS alerts" />
                
                <Button 
                  variant="secondary" 
                  className="w-full text-xs font-bold"
                  onClick={() => addToast('Login credentials and welcome email sent to branch admin.')}
                >
                  Send / Reset Login Credentials
                </Button>
              </div>
            </Card>

            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <GraduationCap size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Allowed Programs</h3>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-500">Select which educational verticals are taught at this specific center.</p>
                {['Foundation', 'JEE', 'NEET', 'Commerce', 'Vocational'].map(prog => (
                  <label key={prog} className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      checked={formData.programs?.includes(prog)}
                      onChange={() => handleProgramToggle(prog)}
                    />
                    <span className="text-sm font-medium text-slate-700">{prog}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-6">
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Operating Hours</h3>
              </div>
              <div className="p-5">
                 <Input label="Standard Timings" value={formData.operatingHours} onChange={e => setFormData({...formData, operatingHours: e.target.value})} placeholder="e.g. 08:00 AM - 08:00 PM" />
              </div>
            </Card>

            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Landmark size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Local Bank Details</h3>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-4">Leave blank to use Institute's global collection account. Fill this only if this branch collects fees in a separate local account.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Bank Name" value={formData.bankDetails?.bankName} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, bankName: e.target.value}})} />
                  <Input label="Account Name" value={formData.bankDetails?.accountName} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, accountName: e.target.value}})} />
                  <Input label="Account Number" value={formData.bankDetails?.accountNumber} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, accountNumber: e.target.value}})} />
                  <Input label="IFSC Code" value={formData.bankDetails?.ifsc} onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, ifsc: e.target.value}})} />
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>

      <div className="flex justify-end gap-3 p-6 pt-0 border-t border-slate-200 mt-6 pb-6">
        {activeTab === 'general' && (
          <Button variant="primary" onClick={() => setActiveTab('admin')} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
            Save & Next <ChevronLeft size={16} className="ml-2 rotate-180" />
          </Button>
        )}
        
        {activeTab === 'admin' && (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('general')}>Back</Button>
            <Button variant="primary" onClick={() => setActiveTab('operations')} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
              Save & Next <ChevronLeft size={16} className="ml-2 rotate-180" />
            </Button>
          </>
        )}
        
        {activeTab === 'operations' && (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('admin')}>Back</Button>
            <Button variant="primary" onClick={handleSave} style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
              Save Branch Details
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
