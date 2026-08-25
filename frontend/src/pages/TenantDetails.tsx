import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { formatDate, getTenantStatus } from '../data/mockData';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { tenantService } from '../services/tenantService';

interface StudentHistoryRecord {
  id: string;
  studentId: string;
  name: string;
  email: string;
  mobile: string;
  parentMobile: string;
  course: string;
  batch: string;
  branch: string;
  status: string;
  admissionDate: string;
  feePlan: { total: number; paid: number; pending: number };
  receipts: { id: string; date: string; amount: number; mode: string; status: string }[];
  attendanceRate: string;
  loginLogs: { date: string; time: string; device: string }[];
  assignments: { name: string; score: string; date: string }[];
}

const mockStudentsData: Record<string, StudentHistoryRecord[]> = {
  'VS-001': [
    {
      id: 'S-201',
      studentId: 'STU-MUM-2601',
      name: 'Rohan Deshmukh',
      email: 'rohan.desh@gmail.com',
      mobile: '9877112233',
      parentMobile: '9877112200',
      course: 'JEE Prep Course',
      batch: 'JEE-Morning-A',
      branch: 'Mumbai West',
      status: 'Active Student',
      admissionDate: '15-06-2026',
      feePlan: { total: 120000, paid: 80000, pending: 40000 },
      receipts: [
        { id: 'RCT-9042', date: '18-06-2026', amount: 40000, mode: 'Cash', status: 'Success' },
        { id: 'RCT-9915', date: '22-07-2026', amount: 40000, mode: 'Razorpay Online', status: 'Success' }
      ],
      attendanceRate: '94.2%',
      loginLogs: [
        { date: '05-08-2026', time: '11:10 AM', device: 'Android Phone (Chrome Mobile)' },
        { date: '04-08-2026', time: '09:15 AM', device: 'Android Phone (Chrome Mobile)' },
        { date: '03-08-2026', time: '10:04 AM', device: 'Android Phone (Chrome Mobile)' }
      ],
      assignments: [
        { name: 'HC Verma Chapter 3 Dynamics', score: '9/10', date: '01-08-2026' },
        { name: 'Newtonian Mechanics Practice Set', score: '8/10', date: '28-07-2026' }
      ]
    },
    {
      id: 'S-204',
      studentId: 'STU-MUM-2604',
      name: 'Sneha Patil',
      email: 'sneha.patil@outlook.com',
      mobile: '9654123098',
      parentMobile: '9654123000',
      course: 'NEET Batch Premium',
      batch: 'NEET-Regular-B',
      branch: 'Mumbai West',
      status: 'Active Student',
      admissionDate: '01-07-2026',
      feePlan: { total: 150000, paid: 150000, pending: 0 },
      receipts: [
        { id: 'RCT-8890', date: '01-07-2026', amount: 150000, mode: 'Razorpay Online', status: 'Success' }
      ],
      attendanceRate: '98.5%',
      loginLogs: [
        { date: '05-08-2026', time: '11:02 AM', device: 'Windows Laptop (Edge Browser)' },
        { date: '04-08-2026', time: '08:45 AM', device: 'Windows Laptop (Edge Browser)' }
      ],
      assignments: [
        { name: 'Organic Chemistry Carbon Chains', score: '10/10', date: '03-08-2026' },
        { name: 'Plant Cell Structure Essay', score: '9/10', date: '29-07-2026' }
      ]
    },
    {
      id: 'S-205',
      studentId: 'STU-MUM-2605',
      name: 'Aditya Joshi',
      email: 'aditya.joshi@yahoo.com',
      mobile: '9845123654',
      parentMobile: '9845123600',
      course: 'Class 10 Foundation',
      batch: 'FOUND-Class-A',
      branch: 'Mumbai West',
      status: 'Active Student',
      admissionDate: '10-05-2026',
      feePlan: { total: 60000, paid: 30000, pending: 30000 },
      receipts: [
        { id: 'RCT-7541', date: '10-05-2026', amount: 30000, mode: 'Cash', status: 'Success' }
      ],
      attendanceRate: '88.0%',
      loginLogs: [
        { date: '02-08-2026', time: '04:12 PM', device: 'Apple iPad (Safari Webkit)' }
      ],
      assignments: [
        { name: 'Quadratic Equations Worksheet', score: '7/10', date: '25-07-2026' }
      ]
    }
  ],
  'VS-002': [
    {
      id: 'S-202',
      studentId: 'STU-PUN-2602',
      name: 'Ishita Roy',
      email: 'ishita.roy@gmail.com',
      mobile: '9554321098',
      parentMobile: '9554321000',
      course: 'NEET Batch Premium',
      batch: 'NEET-Regular-B',
      branch: 'Pune Camp',
      status: 'Verification Pending',
      admissionDate: '02-07-2026',
      feePlan: { total: 150000, paid: 50000, pending: 100000 },
      receipts: [
        { id: 'RCT-9988', date: '02-07-2026', amount: 50000, mode: 'Razorpay Online', status: 'Success' }
      ],
      attendanceRate: '0%',
      loginLogs: [],
      assignments: []
    },
    {
      id: 'S-206',
      studentId: 'STU-PUN-2606',
      name: 'Karan Malhotra',
      email: 'karan.m@gmail.com',
      mobile: '9123456789',
      parentMobile: '9123456700',
      course: 'JEE Prep Course',
      batch: 'JEE-Evening-B',
      branch: 'Pune Camp',
      status: 'Active Student',
      admissionDate: '20-10-2026',
      feePlan: { total: 120000, paid: 120000, pending: 0 },
      receipts: [
        { id: 'RCT-9912', date: '20-10-2026', amount: 120000, mode: 'Razorpay Online', status: 'Success' }
      ],
      attendanceRate: '100%',
      loginLogs: [
        { date: '21-10-2026', time: '09:00 AM', device: 'Android Phone (Chrome Mobile)' }
      ],
      assignments: []
    }
  ]
};

const getFallbackStudents = (tenantId: string): StudentHistoryRecord[] => [
  {
    id: `S-FALL-${tenantId}`,
    studentId: `STU-GEN-${tenantId}-01`,
    name: 'Aarav Mehta',
    email: 'aarav.mehta@gmail.com',
    mobile: '9988776655',
    parentMobile: '9988776600',
    course: 'JEE Prep Course',
    batch: 'JEE-Morning-A',
    branch: 'Main Branch',
    status: 'Active Student',
    admissionDate: '01-08-2026',
    feePlan: { total: 120000, paid: 40000, pending: 80000 },
    receipts: [
      { id: 'RCT-GEN-01', date: '01-08-2026', amount: 40000, mode: 'Razorpay Online', status: 'Success' }
    ],
    attendanceRate: '95.0%',
    loginLogs: [
      { date: '05-08-2026', time: '10:30 AM', device: 'iOS Phone (Mobile App)' }
    ],
    assignments: []
  }
];

export const TenantDetails: React.FC<{ tenantId: string; onBack: () => void }> = ({ tenantId, onBack }) => {
  const { toggleTenantStatus, updateTenant, addToast } = useApp();
  const [viewingTenant, setViewingTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [manageTab, setManageTab] = useState<'profile' | 'billing' | 'limits' | 'status' | 'payments' | 'students'>('profile');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentsPage, setStudentsPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');

  // Edit view state
  const [showEditView, setShowEditView] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    mobile: '',
    address: '',
    gstNo: '',
  });

  React.useEffect(() => {
    const fetchTenant = async () => {
      try {
        setIsLoading(true);
        const result = await tenantService.getTenantById(tenantId);
        setViewingTenant(result.data);
      } catch (error) {
        console.error('Error fetching tenant details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenant();
  }, [tenantId]);

  const openEditView = () => {
    if (!viewingTenant) return;
    setEditForm({
      name: viewingTenant.name || '',
      ownerName: viewingTenant.owner_name || viewingTenant.legal_name || viewingTenant.admin_name || '',
      email: viewingTenant.primary_email || viewingTenant.contact_email || viewingTenant.admin_email || '',
      mobile: viewingTenant.contact_phone || '',
      address: viewingTenant.address_line1 || viewingTenant.address || '',
      gstNo: viewingTenant.gst_number || '',
    });
    setShowEditView(true);
  };

  const handleEditSave = async () => {
    if (!viewingTenant) return;
    if (!editForm.name.trim() || !editForm.ownerName.trim() || !editForm.email.trim()) {
      addToast('Name, Owner Name, and Email are required.', 'error');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', editForm.name.trim());
      formData.append('legal_name', editForm.ownerName.trim());
      formData.append('adminEmail', editForm.email.trim());
      formData.append('address', editForm.address.trim());
      formData.append('gstNo', editForm.gstNo.trim());
      if (editForm.mobile.trim()) formData.append('mobile', editForm.mobile.trim());

      await tenantService.updateTenant(viewingTenant.id, formData);
      const result = await tenantService.getTenantById(viewingTenant.id);
      setViewingTenant(result.data);
      updateTenant(viewingTenant.id, {
        name: editForm.name.trim(),
        ownerName: editForm.ownerName.trim(),
        email: editForm.email.trim(),
        mobile: editForm.mobile.trim(),
        address: editForm.address.trim(),
        gstNo: editForm.gstNo.trim(),
      });
      addToast('Tenant details updated successfully!', 'success');
      setShowEditView(false);
    } catch (error) {
      console.error('Error updating tenant details:', error);
      addToast('Unable to update tenant details.', 'error');
    }
  };

  // Full-screen edit view
  if (showEditView && viewingTenant) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Edit Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => setShowEditView(false)} className="p-2 h-12 w-12 flex items-center justify-center rounded-xl">
              <ArrowLeft size={26} />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Edit Tenant Details</h2>
              <p className="text-sm text-slate-500 mt-1">Update profile information for <span className="font-semibold text-slate-700">{viewingTenant.name}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setShowEditView(false)} className="flex items-center gap-2">
              <X size={16} /> Discard
            </Button>
            <Button variant="primary" onClick={handleEditSave} className="flex items-center gap-2">
              <Check size={16} /> Save Changes
            </Button>
          </div>
        </div>

        {/* Edit Form Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Tenant identity banner */}
          <div className="flex items-center gap-4 bg-slate-50 border-b border-slate-200 px-6 py-5">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow flex-shrink-0">
              {viewingTenant.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{viewingTenant.name}</div>
              <div className="text-sm text-slate-500 mt-0.5">Tenant ID: {viewingTenant.id}</div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Section: Institute Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-5">Institute Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Institute Name <span className="text-red-500">*</span></label>
                  <Input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Apex IIT Academy"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Physical Address</label>
                  <Input
                    value={editForm.address}
                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. 401, Western Express Highway, Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">GSTIN</label>
                  <Input
                    value={editForm.gstNo}
                    onChange={e => setEditForm(f => ({ ...f, gstNo: e.target.value }))}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                  />
                </div>
              </div>
            </div>

            {/* Section: Admin Account */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-5">Admin Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Owner / Admin Name <span className="text-red-500">*</span></label>
                  <Input
                    value={editForm.ownerName}
                    onChange={e => setEditForm(f => ({ ...f, ownerName: e.target.value }))}
                    placeholder="e.g. Rajesh Sharma"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admin Email <span className="text-red-500">*</span></label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="admin@institute.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile Number</label>
                  <Input
                    type="tel"
                    value={editForm.mobile}
                    onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))}
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>
            </div>

            {/* Required field note */}
            <p className="text-xs text-slate-400"><span className="text-red-500">*</span> Required fields</p>

            {/* Bottom action bar */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setShowEditView(false)} className="flex items-center gap-2">
                <X size={15} /> Discard Changes
              </Button>
              <Button variant="primary" onClick={handleEditSave} className="flex items-center gap-2">
                <Check size={15} /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!viewingTenant) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={onBack} style={{ gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Tenants
        </Button>
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
          <h2 className="text-xl font-bold text-slate-700">Tenant not found</h2>
          <p className="text-sm text-slate-500 mt-2">The requested tenant ID does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Back button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={onBack} className="p-2 h-12 w-12 flex items-center justify-center rounded-xl">
            <ArrowLeft size={26} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Tenant Details</h2>
            <p className="text-sm text-slate-500 mt-1">Manage profile, limits, and billing for this workspace.</p>
          </div>
        </div>
        <Button variant="primary" onClick={openEditView} className="flex items-center gap-2">
          <Pencil size={16} />
          Edit Details
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        {/* Top Info Banner */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-150 p-5 rounded-xl shadow-inner">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow flex-shrink-0">
            {viewingTenant.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-lg font-bold text-slate-900 truncate">{viewingTenant.name}</h4>
            <div className="text-sm text-slate-500 mt-1">Tenant ID: {viewingTenant.id}</div>
          </div>
          <div className="flex items-center gap-3 select-none flex-shrink-0">
            {(() => {
              const status = getTenantStatus(viewingTenant);
              let badgeColors = 'bg-red-50 text-red-750 border border-red-200';
              if (status === 'Active') {
                badgeColors = 'bg-emerald-50 text-emerald-705 border border-emerald-200';
              } else if (status === 'Pending') {
                badgeColors = 'bg-amber-50 text-amber-705 border border-amber-200';
              }
              return (
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${badgeColors}`}>
                  {status}
                </span>
              );
            })()}
            <span className="text-[11px] text-slate-600 font-bold bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full uppercase tracking-wider">
              {viewingTenant.plan}
            </span>
          </div>
        </div>

        {/* Tabs Selector */}
        <div className="flex border-b border-slate-200 gap-2 flex-wrap">
          {[
            { id: 'profile', label: 'General & Admin' },
            { id: 'billing', label: 'Plan & Subscription' },
            { id: 'limits', label: 'Resource Limits' },
            { id: 'students', label: 'Students Roster' },
            { id: 'payments', label: 'Payment & Invoice History' },
            { id: 'status', label: 'SaaS Status Actions' }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setManageTab(t.id as any)}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
                manageTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[300px] pt-4">
          {manageTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-4">
                <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Institute Profile</h5>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">GSTIN Registration:</span>
                    <span className="font-semibold text-slate-800 text-base">{viewingTenant.gst_number || '27AAAAA0000A1Z5'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Physical Address:</span>
                    <span className="font-semibold text-slate-800 block">{viewingTenant.address_line1 || viewingTenant.address || '401, Western Express Highway, Mumbai'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Admin Account</h5>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Admin Username:</span>
                    <span className="font-semibold text-slate-800 text-base">{viewingTenant.owner_name || viewingTenant.legal_name || viewingTenant.admin_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Admin Email Login:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-semibold text-slate-800">{viewingTenant.primary_email || viewingTenant.contact_email || viewingTenant.admin_email || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 font-semibold block mb-1">Mobile Contact:</span>
                    <span className="font-semibold text-slate-800">{viewingTenant.contact_phone || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {manageTab === 'billing' && (
            <div className="space-y-6 text-sm">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Billing Lifecycle &amp; Subscription Terms</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Plan Template</span>
                  <span className="text-lg font-bold text-slate-800">{viewingTenant.plan}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Start Date</span>
                  <span className="text-lg font-bold text-slate-800">{formatDate(viewingTenant.startDate || '2026-04-15')}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Expiration Date</span>
                  <span className="text-lg font-bold text-slate-800">{formatDate(viewingTenant.renewalDate)}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
                <span className="text-xl">ℹ</span>
                <p>Terms and renewal actions can be configured on the <strong>Tenant Subscriptions</strong> tab under Subscription Management in the sidebar.</p>
              </div>
            </div>
          )}

          {manageTab === 'limits' && (
            <div className="space-y-6">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Scalability Boundaries &amp; Resource Allotments</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Max Branches</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxBranches || '5'}</span>
                </div>
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Max Students</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxStudents || '1000'}</span>
                </div>
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Cloud Storage</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxStorage || '20 GB'}</span>
                </div>
                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 text-center">
                  <span className="text-xs text-slate-500 font-bold block uppercase tracking-widest mb-2">Max File Size</span>
                  <span className="text-3xl font-black text-slate-800 block">{viewingTenant.maxFileSize || '20 MB'}</span>
                </div>
              </div>
            </div>
          )}

          {manageTab === 'payments' && (
            <div className="space-y-6">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Payment &amp; Invoice History</h5>
              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-xs tracking-wider">
                      <th className="px-5 py-4">Invoice ID</th>
                      <th className="px-5 py-4">Billing Cycle</th>
                      <th className="px-5 py-4">Paid Date</th>
                      <th className="px-5 py-4">Amount Paid</th>
                      <th className="px-5 py-4">Gateway Reference</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {[
                      { id: 'INV-2026-081', plan: viewingTenant.plan, date: formatDate(viewingTenant.startDate || '2026-04-15'), amt: '₹15,000 + GST', ref: 'pay_RZP98425102', status: 'Payment Complete' },
                      { id: 'INV-2026-015', plan: viewingTenant.plan, date: '15-01-2026', amt: '₹15,000 + GST', ref: 'pay_RZP88125412', status: 'Payment Complete' }
                    ].map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-800">{inv.id}</td>
                        <td className="px-5 py-4 font-semibold">{inv.plan}</td>
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">{inv.date}</td>
                        <td className="px-5 py-4 font-bold text-emerald-700">{inv.amt}</td>
                        <td className="px-5 py-4 text-slate-400">{inv.ref}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {manageTab === 'students' && (
            <div className="space-y-6">
              {!selectedStudentId ? (
                (() => {
                    const studentList = mockStudentsData[viewingTenant.id] || getFallbackStudents(viewingTenant.id);
                    const uniqueCourses = Array.from(new Set(studentList.map(s => s.course)));
                    
                    const filteredAndSortedList = studentList
                      .filter(s => {
                        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchCourse = filterCourse === 'All' || s.course === filterCourse;
                        return matchSearch && matchCourse;
                      })
                      .sort((a, b) => a.name.localeCompare(b.name));

                    const handleExportCSV = () => {
                      const dataToExport = filteredAndSortedList.map(s => ({
                        'Student ID': s.studentId,
                        'Name': s.name,
                        'Mobile': s.mobile || '',
                        'Parent Mobile': s.parentMobile || '',
                        'Course': s.course,
                        'Batch': s.batch,
                        'Branch': s.branch || '',
                        'Admission Date': s.admissionDate,
                        'Total Fee': s.feePlan.total,
                        'Paid Fee': s.feePlan.paid,
                        'Pending Fee': s.feePlan.pending,
                        'Status': s.status
                      }));
                      
                      if (dataToExport.length === 0) return;
                      const csvRows = [];
                      const headers = Object.keys(dataToExport[0]);
                      csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
                      
                      for (const row of dataToExport) {
                        const values = headers.map(header => {
                          const val = row[header as keyof typeof row];
                          const escaped = String(val ?? '').replace(/"/g, '""');
                          return `"${escaped}"`;
                        });
                        csvRows.push(values.join(','));
                      }
                      
                      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
                      const link = document.createElement("a");
                      link.setAttribute("href", csvContent);
                      link.setAttribute("download", `students_tenant_${viewingTenant.id}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    };

                    const itemsPerPage = 2;
                    const totalPages = Math.ceil(filteredAndSortedList.length / itemsPerPage);
                    const paginatedStudents = filteredAndSortedList.slice((studentsPage - 1) * itemsPerPage, studentsPage * itemsPerPage);

                    return (
                      <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
                          <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Registered Students Directory</h5>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500 font-medium mr-2">Total Registered: {filteredAndSortedList.length}</span>
                            <Button variant="secondary" size="sm" onClick={handleExportCSV}>Export CSV</Button>
                          </div>
                        </div>

                        {/* Search, Filter, Sort controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl shadow-inner mt-4 items-end">
                          <Input label="Search" placeholder="Search students by name or ID..." 
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

                        <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white mt-4">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-xs tracking-wider">
                                <th className="px-5 py-4">Student ID</th>
                                <th className="px-5 py-4">Name</th>
                                <th className="px-5 py-4">Course &amp; Batch</th>
                                <th className="px-5 py-4">Admission Date</th>
                                <th className="px-5 py-4">Fee Structure Status</th>
                                <th className="px-5 py-4">Portal Status</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {paginatedStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-5 py-4 font-bold text-slate-800">{student.studentId}</td>
                                  <td className="px-5 py-4 font-semibold text-slate-900">{student.name}</td>
                                  <td className="px-5 py-4">
                                    <div className="font-medium text-slate-800">{student.course}</div>
                                    <div className="text-xs text-slate-400">{student.batch}</div>
                                  </td>
                                  <td className="px-5 py-4 text-slate-500">{student.admissionDate}</td>
                                  <td className="px-5 py-4">
                                    <div className="text-xs space-y-0.5">
                                      <div><span className="text-slate-400">Total:</span> <span className="font-bold text-slate-800">₹{student.feePlan.total.toLocaleString()}</span></div>
                                      <div><span className="text-slate-400">Paid:</span> <span className="font-bold text-emerald-600">₹{student.feePlan.paid.toLocaleString()}</span></div>
                                      {student.feePlan.pending > 0 ? (
                                        <div><span className="text-slate-400">Pending:</span> <span className="font-bold text-rose-500">₹{student.feePlan.pending.toLocaleString()}</span></div>
                                      ) : (
                                        <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">Paid</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                                      student.status === 'Active Student' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                      {student.status}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <Button 
                                      variant="outline" 
                                      className="text-xs font-semibold py-1.5 px-3.5 border-blue-200 text-blue-600 bg-blue-50/20 hover:bg-blue-50 hover:border-blue-300 rounded-full shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
                                      onClick={() => setSelectedStudentId(student.id)}
                                    >
                                      View History
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs font-semibold text-slate-500 shadow-sm select-none mt-4">
                            <div>
                              Showing <span className="text-slate-800 font-bold">{Math.min((studentsPage - 1) * itemsPerPage + 1, filteredAndSortedList.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(studentsPage * itemsPerPage, filteredAndSortedList.length)}</span> of <span className="text-slate-855 font-bold">{filteredAndSortedList.length}</span> students
                            </div>
                            <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={studentsPage === 1}
                            onClick={() => setStudentsPage(studentsPage - 1)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Previous
                          </button>
                          {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setStudentsPage(i + 1)}
                              className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                                studentsPage === i + 1
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={studentsPage === totalPages}
                            onClick={() => setStudentsPage(studentsPage + 1)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
                ) : (
                (() => {
                  const student = ((mockStudentsData[viewingTenant.id] || getFallbackStudents(viewingTenant.id)).find(s => s.id === selectedStudentId));
                  if (!student) return null;
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSelectedStudentId(null)}
                            className="p-2 rounded-full border border-slate-200 text-slate-600 bg-white hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
                          >
                            <ArrowLeft size={16} />
                          </button>
                          <div>
                            <h5 className="text-base font-bold text-slate-800">Student Profile &amp; Logs</h5>
                            <p className="text-xs text-slate-500 mt-0.5">{student.name} ({student.studentId})</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          student.status === 'Active Student' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {student.status}
                        </span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Course &amp; Academic Group</span>
                          <span className="font-bold text-slate-800 text-sm block">{student.course}</span>
                          <span className="text-xs text-slate-500 block">Batch ID: {student.batch}</span>
                          <span className="text-xs text-slate-500 block">Branch: {student.branch}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Profile Details</span>
                          <div className="text-xs space-y-1 text-slate-700">
                            <div><span className="font-semibold text-slate-400">Student Mobile:</span> <span className="font-mono font-bold text-slate-800">{student.mobile}</span></div>
                            <div><span className="font-semibold text-slate-400">Parent Mobile:</span> <span className="font-mono font-bold text-slate-800">{student.parentMobile}</span></div>
                            <div><span className="font-semibold text-slate-400">Student Email:</span> <span className="font-mono font-bold text-slate-800">{student.email}</span></div>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
                          <span className="text-2xl font-black text-slate-800 block">{student.attendanceRate}</span>
                          <span className="text-[11px] text-slate-500 block">Class enrollment started: {student.admissionDate}</span>
                        </div>
                      </div>

                      {/* Payment history receipts list */}
                      <div className="space-y-3">
                        <h6 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fee Receipts Log ({student.receipts.length})</h6>
                        {student.receipts.length > 0 ? (
                          <div className="overflow-hidden border border-slate-150 rounded-xl bg-white shadow-sm">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-500 uppercase">
                                  <th className="px-4 py-2.5">Receipt ID</th>
                                  <th className="px-4 py-2.5">Paid Date</th>
                                  <th className="px-4 py-2.5">Amount Paid</th>
                                  <th className="px-4 py-2.5">Gateway / Mode</th>
                                  <th className="px-4 py-2.5">Receipt Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                {student.receipts.map((rcpt) => (
                                  <tr key={rcpt.id}>
                                    <td className="px-4 py-2.5 font-bold text-slate-600">{rcpt.id}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">{rcpt.date}</td>
                                    <td className="px-4 py-2.5 font-bold text-slate-800">₹{rcpt.amount.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{rcpt.mode}</td>
                                    <td className="px-4 py-2.5">
                                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                                        {rcpt.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-4 text-center border border-slate-150 rounded-xl bg-slate-50 text-xs text-slate-400">
                            No payment receipts registered.
                          </div>
                        )}
                      </div>

                      {/* Assignments list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h6 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assignments &amp; Scores ({student.assignments.length})</h6>
                          {student.assignments.length > 0 ? (
                            <div className="border border-slate-150 rounded-xl bg-white divide-y divide-slate-100 text-xs shadow-sm">
                              {student.assignments.map((asgn, i) => (
                                <div key={i} className="p-3 flex justify-between items-center">
                                  <div>
                                    <span className="font-semibold text-slate-800 block">{asgn.name}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">{asgn.date}</span>
                                  </div>
                                  <span className="font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                    {asgn.score}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center border border-slate-150 rounded-xl bg-slate-50 text-xs text-slate-400">
                              No assignment submissions logged.
                            </div>
                          )}
                        </div>

                        {/* Login activities */}
                        <div className="space-y-3">
                          <h6 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Portal Login Audits ({student.loginLogs.length})</h6>
                          {student.loginLogs.length > 0 ? (
                            <div className="border border-slate-150 rounded-xl bg-white divide-y divide-slate-100 text-xs shadow-sm">
                              {student.loginLogs.map((log, i) => (
                                <div key={i} className="p-3 flex justify-between items-center">
                                  <div>
                                    <span className="text-slate-500 block">{log.device}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">{log.date} at {log.time}</span>
                                  </div>
                                  <span className="inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                                    Authorized
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center border border-slate-150 rounded-xl bg-slate-50 text-xs text-slate-400">
                              No login activity registered.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {manageTab === 'status' && (
            <div className="space-y-6">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Active Status Suspensions / Activations</h5>
              <div className="flex items-center gap-6 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <div className="flex-1">
                  <h6 className="text-base font-bold text-slate-900">
                    Current Access Status:{' '}
                    {(() => {
                      const status = getTenantStatus(viewingTenant);
                      let colorClass = 'text-red-600';
                      if (status === 'Active') {
                        colorClass = 'text-emerald-600';
                      } else if (status === 'Pending') {
                        colorClass = 'text-amber-600';
                      }
                      return <span className={colorClass}>{status}</span>;
                    })()}
                  </h6>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Suspending a tenant prevents their staff, teachers, and students from accessing their portals immediately. They will receive a "Service Suspended" screen upon login.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleTenantStatus(viewingTenant.id)}
                  className={`inline-flex items-center gap-2 text-sm font-bold px-6 py-3 border rounded-xl cursor-pointer transition-all shadow-sm ${
                    viewingTenant.status === 'Active'
                      ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {viewingTenant.status === 'Active' ? 'Suspend Access' : 'Activate Access'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
