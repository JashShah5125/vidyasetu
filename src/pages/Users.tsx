import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus } from 'lucide-react';

export const Users: React.FC = () => {
  const { staff, addStaff, setStaff } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">User & Staff Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage personnel profile records, assign security role boundaries, and allocate active branch hubs.</p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} onClick={handleOpenAddModal}>
          <Plus size={16} /> Add Staff Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institute Faculty & Counsel staff</CardTitle>
        </CardHeader>
        <Table headers={['Staff Name', 'Email Address', 'Security Role', 'Primary Branch', 'Status', 'Actions']}>
          {staff.map((s, idx) => (
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
      </Card>

      {/* Creation Modal */}
      {showAddModal && (
        <Modal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          title={editingEmail ? `Edit Staff Profile: ${name}` : 'Create Staff Profile'}
        >
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
        </Modal>
      )}
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
