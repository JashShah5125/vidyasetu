import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { Plus, ArrowLeft, Upload, Loader2 } from 'lucide-react';
import type { Staff } from '../data/mockData';
import { BulkImportModal } from '../components/ui/BulkImportModal';
import { staffApi } from '../services/staffApi';

export const Users: React.FC = () => {
  const { staff, addStaff, setStaff, currentUser, addToast } = useApp();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffProfileTab, setStaffProfileTab] = useState<'overview' | 'employment' | 'salary' | 'access'>('overview');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterBranch, setFilterBranch] = useState(currentUser?.role === 'branch-admin' ? currentUser.branch || 'All' : 'All');

  const [loading, setLoading] = useState(false);
  const [apiStaff, setApiStaff] = useState<any[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const filters = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        branchId: filterBranch !== 'All' ? filterBranch : undefined, // Actually needs branch IDs, this might be tricky since mock uses names
      };
      const res = await staffApi.list(filters);
      setApiStaff(res.data);
      setTotalStaff(res.pagination.total);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStaff();
  }, [currentPage, searchTerm, filterBranch, filterRole]);

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role)));
  const uniqueBranches = Array.from(new Set(staff.map(s => s.branch)));

  const filteredAndSortedStaff = apiStaff;

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedStaff.map(s => ({
      'Name': s.name,
      'Email': s.email,
      'Role': s.role,
      'Branch': s.branch,
      'Status': s.status
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
    link.setAttribute("download", "staff_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const totalPages = Math.ceil(totalStaff / itemsPerPage);
  const paginatedStaff = apiStaff;

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Teacher');
  const [branch, setBranch] = useState('Mumbai West');

  const handleOpenAddModal = () => {
    setEditingEmail(null);
    setName('');
    setEmail('');
    setRole('Teacher');
    setBranch(currentUser?.role === 'branch-admin' ? currentUser.branch || 'Mumbai West' : 'Mumbai West');
    setShowAddModal(true);
  };

  const handleEditStaff = (item: any) => {
    setEditingEmail(item.email);
    setName(item.name);
    setEmail(item.email);
    setRole(item.role);
    setBranch(item.branch);
    setShowAddModal(true);
  };

  const handleDeactivateStaff = (emailVal: string) => {
    setStaff(prev => prev.map(s => s.email === emailVal
      ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' }
      : s
    ));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    if (editingEmail) {
      setStaff(prev => prev.map(s => s.email === editingEmail
        ? { ...s, name, email, role, branch }
        : s
      ));
    } else {
      const names = name.trim().split(/\s+/);
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';
      addStaff({
        firstName,
        lastName,
        name,
        email,
        mobile: '9876543210',
        role,
        branch,
        status: 'Active'
      });
    }

    setName('');
    setEmail('');
    setShowAddModal(false);
    setEditingEmail(null);
    addToast(editingEmail ? 'Staff details updated successfully!' : 'New staff profile created successfully!', 'success');
  };

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
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {editingEmail ? `Edit Staff Profile: ${name}` : 'Create Staff Profile'}
            </h2>
            <p className="text-sm text-slate-500">Configure staff account parameters, login access, branch office, and security roles.</p>
          </div>
        </div>

        <div className="w-full">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <Input label="Full Name" required placeholder="e.g. Mrs. Seema Deshpande" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email Address Login" type="email" required placeholder="seema@apexiit.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Primary Security Role" 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                options={[
                  { value: 'SuperAdmin', label: 'Super Admin' },
                  { value: 'Admin', label: 'Admin Executive' },
                  { value: 'Counsellor', label: 'Counsellor' },
                  { value: 'Teacher', label: 'Teacher / Faculty' },
                  { value: 'Finance', label: 'Finance Staff' }
                ]}
              />
              <Select 
                label="Allotted Branch Office" 
                value={branch} 
                onChange={(e) => setBranch(e.target.value)} 
                options={[
                  { value: 'Mumbai West', label: 'Mumbai West' },
                  { value: 'Pune Camp', label: 'Pune Camp' }
                ]}
                disabled={currentUser?.role === 'branch-admin'}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">
                {editingEmail ? 'Update Details' : 'Register Staff Member'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (selectedStaff) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        {/* Header section with back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedStaff(null)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Staff Profile: {selectedStaff.name}
            </h2>
            <p className="text-sm text-slate-500">Review staff info, employment attributes, and credentials.</p>
          </div>
        </div>

        <div className="space-y-6 flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          {/* Tabs selectors inside profile */}
          <div className="flex border-b border-slate-200 bg-slate-50 p-2 rounded-xl">
            {['overview', 'employment', 'salary', 'access'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStaffProfileTab(tab as any)}
                className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer rounded-lg ${
                  staffProfileTab === tab 
                    ? 'bg-white text-blue-600 shadow-sm border-blue-600 font-extrabold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                {tab === 'overview' ? 'Personal & Contact' : 
                 tab === 'employment' ? 'Employment & Assignment' : 
                 tab === 'salary' ? 'Salary & Banking' : 
                 'System & Access'}
              </button>
            ))}
          </div>

          {/* Profile Tab Contents */}
          <div className="py-2">
            {staffProfileTab === 'overview' && (
              <div className="space-y-6">
                {/* Header summary card */}
                <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                    {selectedStaff.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-display font-extrabold text-slate-900 text-lg">{selectedStaff.name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-medium text-slate-500">
                      <span>Staff ID: <strong className="font-mono text-slate-700">{selectedStaff.employeeId || `EMP-${selectedStaff.id || '2938'}`}</strong></span>
                      <span>&bull;</span>
                      <span>Role: <strong className="text-slate-700">{selectedStaff.role}</strong></span>
                      <span>&bull;</span>
                      <span>Primary Branch: <strong className="text-slate-700">{selectedStaff.branch}</strong></span>
                      <span>&bull;</span>
                      <span>Designation: <strong className="text-slate-700">{selectedStaff.designation || 'Specialist Staff'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic details */}
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      1. Identity &amp; Personal Info
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Gender</span>
                        <strong className="text-slate-700">{selectedStaff.gender || 'Male'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Date of Birth</span>
                        <strong className="text-slate-700">{selectedStaff.dob || '10-05-1988'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Blood Group</span>
                        <strong className="text-slate-700">{selectedStaff.bloodGroup || 'B+'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Marital Status</span>
                        <strong className="text-slate-700">{selectedStaff.maritalStatus || 'Married'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Aadhaar Card No</span>
                        <strong className="text-slate-700 font-mono">{selectedStaff.aadhaar || 'XXXX-XXXX-8839'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">PAN Card No</span>
                        <strong className="text-slate-700 font-mono uppercase">{selectedStaff.pan || 'DDFPX8823K'}</strong>
                      </div>
                    </div>
                  </Card>

                  {/* Contact details */}
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      2. Contact &amp; Emergency Details
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Official Email</span>
                        <strong className="text-slate-750 font-mono text-xs block truncate">{selectedStaff.email}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Personal Email</span>
                        <strong className="text-slate-700 font-mono text-xs block truncate">{selectedStaff.personalEmail || 'personal.mail@example.com'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Primary Mobile</span>
                        <strong className="text-slate-700 font-mono">{selectedStaff.mobile || '9876543210'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Alternate Mobile</span>
                        <strong className="text-slate-700 font-mono">{selectedStaff.alternateMobile || '9822345511'}</strong>
                      </div>
                      <div className="col-span-2 border-t border-slate-50 pt-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Emergency Contact Person</span>
                        <strong className="text-slate-700">Mrs. Priya Sen (Spouse) &bull; 9866113322</strong>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Current Address</span>
                    <strong className="text-slate-700 font-medium block mb-2">{selectedStaff.currentAddress || 'Flat A-202, Regency Park, Pune Road'}</strong>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-[10px] font-semibold uppercase block">City</span>
                        <strong className="text-slate-600">{selectedStaff.city || 'Pune'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-semibold uppercase block">State</span>
                        <strong className="text-slate-600">{selectedStaff.state || 'Maharashtra'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-semibold uppercase block">Pin Code</span>
                        <strong className="text-slate-600 font-mono">{selectedStaff.pinCode || '411001'}</strong>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Permanent Address</span>
                    <strong className="text-slate-700 font-medium block mb-2">{selectedStaff.permanentAddress || 'Same as current address'}</strong>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-[10px] font-semibold uppercase block">City</span>
                        <strong className="text-slate-600">{selectedStaff.city || 'Pune'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-semibold uppercase block">State</span>
                        <strong className="text-slate-600">{selectedStaff.state || 'Maharashtra'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-semibold uppercase block">Pin Code</span>
                        <strong className="text-slate-600 font-mono">{selectedStaff.pinCode || '411001'}</strong>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {staffProfileTab === 'employment' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Employment setup */}
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Employment Setup Details
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Employee Type</span>
                        <strong className="text-slate-750">{selectedStaff.employeeType || 'Teaching'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Department</span>
                        <strong className="text-slate-750">{selectedStaff.department || 'Science & Academics'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Joining Date</span>
                        <strong className="text-slate-700">{selectedStaff.joiningDate || '11-06-2022'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Employment Model</span>
                        <strong className="text-slate-700">{selectedStaff.employmentType || 'Full-Time'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Reporting Manager</span>
                        <strong className="text-slate-700">{selectedStaff.reportingManager || 'Academic Director'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Work Experience</span>
                        <strong className="text-slate-700">{selectedStaff.experience || '6 Years'}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Qualifications</span>
                        <strong className="text-slate-700 block">{selectedStaff.qualification || 'M.Sc. in Organic Chemistry'}</strong>
                      </div>
                    </div>
                  </Card>

                  {/* Branch Office details */}
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Branch &amp; Security Roles Assigned
                    </h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Primary Branch Office</span>
                        <strong className="text-slate-700 font-bold">{selectedStaff.branch}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Additional Hub Permissions</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedStaff.additionalBranches && selectedStaff.additionalBranches.length > 0 ? (
                            selectedStaff.additionalBranches.map((b: string) => (
                              <span key={b} className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded border border-slate-200">{b}</span>
                            ))
                          ) : (
                            <span className="text-slate-455 italic text-xs">No additional branches configured</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Assigned Security Roles</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedStaff.roles && selectedStaff.roles.length > 0 ? (
                            selectedStaff.roles.map((r: string) => (
                              <span key={r} className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded border border-blue-100">{r}</span>
                            ))
                          ) : (
                            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded border border-blue-100">{selectedStaff.role}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Teacher configurations */}
                {(selectedStaff.role?.toLowerCase().includes('teacher') || selectedStaff.employeeType === 'Teaching') && (
                  <Card className="p-5 border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                      Teacher Specific Academic Assignments
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Subjects Assigned</span>
                        <strong className="text-slate-700 block">{selectedStaff.subjects?.join(', ') || 'Chemistry, Biochemistry'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Assigned Courses</span>
                        <strong className="text-slate-700 block">{selectedStaff.coursesAssigned?.join(', ') || 'JEE Prep, Advanced Medical Prep'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Lecture Limits</span>
                        <strong className="text-slate-700 block">{selectedStaff.maxLecturesPerDay || 4} lectures/day &bull; {selectedStaff.maxLecturesPerWeek || 20} lectures/week</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Teaching Modes</span>
                        <strong className="text-slate-700 block">{selectedStaff.teachingMode?.join(', ') || 'Offline, Hybrid'}</strong>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {staffProfileTab === 'salary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compensation Model</span>
                    <div className="text-3xl font-display font-extrabold text-slate-800 mt-1">{selectedStaff.salaryType || 'Monthly Salary'}</div>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">Structured Payroll Cycle</span>
                  </div>
                  <div className="bg-blue-50/50 p-5 border border-blue-200 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payout Rate</span>
                    <div className="text-3xl font-display font-extrabold text-blue-700 mt-1">
                      ₹{selectedStaff.monthlySalary ? selectedStaff.monthlySalary.toLocaleString() : selectedStaff.hourlyRate ? `${selectedStaff.hourlyRate.toLocaleString()}/hr` : '85,000'}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">Gross Salary / Base Hourly Charge</span>
                  </div>
                  <div className="bg-emerald-50/50 p-5 border border-emerald-200 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">PF &amp; Taxes Deductions</span>
                    <div className="text-3xl font-display font-extrabold text-emerald-700 mt-1">Structure Configured</div>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">Professional Tax &amp; TDS Enforced</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Bank Payout Account Details
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Beneficiary Bank</span>
                        <strong className="text-slate-700">{selectedStaff.bankName || 'HDFC Bank Ltd'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Account Holder Name</span>
                        <strong className="text-slate-700">{selectedStaff.accountHolder || selectedStaff.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Account Number</span>
                        <strong className="text-slate-750 font-mono block truncate">{selectedStaff.accountNumber || '50100492837311'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">IFSC Routing Code</span>
                        <strong className="text-slate-700 font-mono uppercase">{selectedStaff.ifsc || 'HDFC0000120'}</strong>
                      </div>
                      <div className="col-span-2 border-t border-slate-50 pt-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Primary UPI Address</span>
                        <strong className="text-slate-700 font-mono">{selectedStaff.upiId || `${selectedStaff.mobile || '9876543210'}@hdfcbank`}</strong>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Government Statutory Registrations
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Provident Fund (PF) No</span>
                        <strong className="text-slate-700 font-mono">{selectedStaff.pfNumber || 'MH/PUN/0092837/000'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">ESIC Account No</span>
                        <strong className="text-slate-700 font-mono">{selectedStaff.esicNumber || '31-88-293847-001-0293'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Professional Tax (PT)</span>
                        <strong className="text-emerald-700">PT Deductible</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">TDS Deductions</span>
                        <strong className="text-emerald-700">TDS Applicable (10% standard)</strong>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {staffProfileTab === 'access' && (
              <div className="space-y-6">
                <Card className="p-5 border border-slate-200/80 shadow-sm max-w-2xl">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Portal Security &amp; Credentials
                  </h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Login Account Username</span>
                      <strong className="text-slate-750 font-mono block">{selectedStaff.username || selectedStaff.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Permission Profile</span>
                      <strong className="text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">{selectedStaff.permissionProfile || `${selectedStaff.role} Access Profile`}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Mobile Login Permission</span>
                      <strong className="text-emerald-700">Enabled</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Next Force Pass Reset</span>
                      <strong className="text-slate-450 italic">Not Required (Pass Reset Checked)</strong>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="secondary" onClick={() => setSelectedStaff(null)}>
              Close Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">User &amp; Staff Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage personnel profile records, assign security role boundaries, and allocate active branch hubs.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 font-bold">
            <Upload size={14} /> Bulk Import
          </Button>
          <Button variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="primary" style={{ gap: '6.5px' }} onClick={() => navigate('/staff/new')}>
            <Plus size={16} /> Add Staff
          </Button>
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input
          label="Search"
          placeholder="Search staff by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          wrapperClassName="sm:col-span-2"
        />
        <Select
          label="Role"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          options={[
            { value: 'All', label: 'All Roles' },
            ...uniqueRoles.map(r => ({ value: r || '', label: r || '' }))
          ]}
        />
        <Select
          label="Branch"
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          options={[
            { value: 'All', label: 'All Branches' },
            ...uniqueBranches.map(b => ({ value: b || '', label: b || '' }))
          ]}
          disabled={currentUser?.role === 'branch-admin'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Members {loading && <Loader2 size={16} className="inline animate-spin ml-2" />}</CardTitle>
        </CardHeader>
        <Table headers={['Staff Name', 'Official Email', 'Primary Branch', 'Assigned Role', 'Status', 'Actions']}>
          {paginatedStaff.map((s, idx) => {
            const nameStr = s.first_name + ' ' + (s.last_name || '');
            const emailStr = s.email;
            const branchStr = s.primary_branch_name || s.branch_id || 'Unknown';
            const roleStr = s.employee_type || 'Staff';
            
            return (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-bold font-display border border-slate-200">
                    {nameStr.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 block">{nameStr}</span>
                    <span className="text-[10px] font-mono text-slate-400">EMP-{(s as any).employee_id || s.id || '2938'}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-xs">{emailStr}</td>
              <td className="px-6 py-4 text-xs font-medium text-slate-700">{branchStr}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${roleBadgeColors(roleStr)}`}>
                  {roleStr}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${s.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {s.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="py-1" onClick={() => navigate(`/staff/${s.id}`, { state: { staffData: s } })}>
                    Manage
                  </Button>
                </div>
              </td>
            </tr>
          )})}
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedStaff.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Bulk Import Staff Directory"
        description="Select a CSV spreadsheet to import multiple staff profiles at once. Columns must match the template below exactly."
        sampleHeaders={['Name', 'Email', 'Role', 'Mobile', 'Branch']}
        sampleRows={[
          ['Rajesh Kadam', 'rajesh@apexiit.com', 'teacher', '9811223344', 'Mumbai West'],
          ['Meera Sen', 'meera@apexiit.com', 'counsellor', '9677889900', 'Pune Camp']
        ]}
        onImport={(importedRows) => {
          const newStaff = importedRows.map((row, rIdx) => {
            const fullName = row['Name'] || 'Imported Personnel';
            const parts = fullName.trim().split(/\s+/);
            const firstName = parts[0] || 'Imported';
            const lastName = parts.slice(1).join(' ') || 'Personnel';
            return {
              id: `STF-${Math.floor(10000 + Math.random() * 90000)}-${rIdx}`,
              firstName,
              lastName,
              name: fullName,
              email: row['Email'] || `staff-${Math.floor(1000 + Math.random() * 9000)}@vidyasetu.com`,
              role: row['Role'] || 'teacher',
              mobile: row['Mobile'] || '9999999999',
              branch: row['Branch'] || 'Mumbai West',
              designation: row['Role'] === 'teacher' ? 'Senior Lecturer' : 'Admissions Manager',
              status: 'Active' as const,
              joiningDate: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
            } as any;
          });
          setStaff(prev => [...newStaff, ...prev] as any[]);
        }}
      />
    </div>
  );
};

const roleBadgeColors = (role: string) => {
  switch (role.toLowerCase()) {
    case 'superadmin': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'admin': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'counsellor': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'teacher': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'finance': return 'bg-pink-50 text-pink-700 border-pink-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};
