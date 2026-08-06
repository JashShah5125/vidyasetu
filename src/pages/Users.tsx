import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { Plus, ArrowLeft } from 'lucide-react';

export const Users: React.FC = () => {
  const { staff, addStaff, setStaff } = useApp();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role)));
  const uniqueBranches = Array.from(new Set(staff.map(s => s.branch)));

  const filteredAndSortedStaff = staff
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === 'All' || s.role === filterRole;
      const matchBranch = filterBranch === 'All' || s.branch === filterBranch;
      return matchSearch && matchRole && matchBranch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'email') return a.email.localeCompare(b.email);
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      if (sortBy === 'branch') return a.branch.localeCompare(b.branch);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(filteredAndSortedStaff.length / itemsPerPage);
  const paginatedStaff = filteredAndSortedStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    setBranch('Mumbai West');
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
      addStaff({
        name,
        email,
        role,
        branch,
        status: 'Active'
      });
    }

    setName('');
    setEmail('');
    setShowAddModal(false);
    setEditingEmail(null);
    alert(editingEmail ? 'Staff details updated successfully!' : 'New staff profile created successfully!');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">User &amp; Staff Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage personnel profile records, assign security role boundaries, and allocate active branch hubs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="primary" style={{ gap: '6px' }} onClick={() => navigate('/staff/new')}>
            <Plus size={16} /> Add Staff
          </Button>
        </div>
      </div>

      {/* Search, Filter, Sort Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input
          label="Search"
          placeholder="Search by name, email..."
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
            ...uniqueRoles.map(r => ({ value: r, label: r }))
          ]}
        />
        <Select
          label="Branch"
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          options={[
            { value: 'All', label: 'All Branches' },
            ...uniqueBranches.map(b => ({ value: b, label: b }))
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institute Faculty & Counsel Staff</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase select-none">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm font-semibold"
            >
              <option value="name">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="email">Email (A → Z)</option>
              <option value="role">Role</option>
              <option value="branch">Branch</option>
              <option value="status">Status</option>
            </select>
          </div>
        </CardHeader>
        <Table headers={['Staff Name', 'Email Address', 'Security Role', 'Primary Branch', 'Status', 'Actions']}>
          {paginatedStaff.map((s, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase border border-slate-200">
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="font-semibold text-slate-800">{s.name}</span>
              </td>
              <td className="px-6 py-4 font-mono text-xs">{s.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 border rounded text-[10px] uppercase font-bold tracking-wide ${roleBadgeColors(s.role)}`}>
                  {s.role}
                </span>
              </td>
              <td className="px-6 py-4">{s.branch}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {s.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="py-1" onClick={() => handleEditStaff(s)}>
                    Edit
                  </Button>
                  <Button
                    variant={s.status === 'Active' ? 'danger' : 'primary'}
                    size="sm"
                    className="py-1"
                    onClick={() => handleDeactivateStaff(s.email)}
                  >
                    {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedStaff.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>
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
