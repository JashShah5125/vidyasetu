import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Save, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { subjectApi } from '../services/subjectApi';
import type { SubjectCreatePayload } from '../services/subjectApi';
import { useApp } from '../context/AppContext';

export const SubjectDetail: React.FC = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { currentUser, addToast } = useApp();
  const isBranchAdmin = currentUser?.role === 'branch-admin';
  const isNew = !code || code === 'new';

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<SubjectCreatePayload>({
    name: '',
    code: '',
    type: 'core',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    if (isBranchAdmin && isNew) {
      addToast('Branch Admins only have view access to subjects.', 'error');
      navigate('/subjects');
      return;
    }

    if (!isNew && code) {
      fetchSubject(code);
    }
  }, [code, isNew, isBranchAdmin]);

  const fetchSubject = async (subjectCode: string) => {
    try {
      setIsLoading(true);
      const res = await subjectApi.getByCode(subjectCode);
      if (res?.status === 'success' && res.data) {
        setFormData({
          name: res.data.name,
          code: res.data.code,
          type: res.data.type,
          description: res.data.description || '',
          status: res.data.status
        });
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch subject details', 'error');
      navigate('/subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof SubjectCreatePayload, value: any) => {
    if (isBranchAdmin) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (isBranchAdmin) return;
    if (!formData.name.trim() || !formData.code.trim()) {
      addToast('Subject Name and Code are required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (isNew) {
        await subjectApi.create(formData);
        addToast('Subject created successfully', 'success');
        navigate('/subjects');
      } else {
        await subjectApi.update(code!, formData);
        addToast('Subject updated successfully', 'success');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save subject', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isBranchAdmin) return;
    try {
      setIsSaving(true);
      await subjectApi.delete(code!);
      addToast('Subject deleted successfully', 'success');
      navigate('/subjects');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to delete subject', 'error');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <Loader2 size={36} className="text-blue-500 animate-spin mb-3" />
        <h3 className="text-sm font-bold text-slate-700">Loading subject details...</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Subjects', href: '/subjects' },
          { label: isNew ? 'Create New Subject' : (formData.name || code || 'Subject Details') }
        ]}
      />

      {/* View-Only Alert Banner for Branch Admin */}
      {isBranchAdmin && (
        <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200 p-4 rounded-2xl text-blue-900 text-sm shadow-xs">
          <ShieldAlert size={20} className="shrink-0 text-blue-600" />
          <div>
            <span className="font-bold">View Only Access: </span>
            You are viewing master subject configuration. Academic subjects and syllabus definitions are managed centrally by Institute Admins.
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/subjects')}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Back to Subjects"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <BookOpen size={32} className="text-indigo-600" />
              {isBranchAdmin
                ? `Subject Details: ${formData.name}`
                : isNew
                ? 'Create New Subject'
                : `Edit Subject: ${formData.name}`}
            </h2>
            <p className="text-base text-slate-500 mt-2">
              {isBranchAdmin
                ? 'View master details, syllabus category, and curriculum parameters for this subject.'
                : 'Configure master details, syllabus category, and curriculum parameters for this subject.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="secondary" onClick={() => navigate('/subjects')}>
            {isBranchAdmin ? 'Back to Subjects' : 'Cancel'}
          </Button>
          {!isBranchAdmin && !isNew && (
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isSaving}
              className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 size={16} className="mr-2" /> Delete Subject
            </Button>
          )}
          {!isBranchAdmin && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 text-sm shadow-sm gap-2 font-bold"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isNew ? 'Create Subject' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Details Form Card */}
      <Card className="shadow-sm border border-slate-200 overflow-hidden">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Subject Name *"
              placeholder="e.g. Advanced Physics"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              disabled={isBranchAdmin}
              required
            />
            <Input
              label="Subject Code *"
              placeholder="e.g. PHY-ADV-101"
              value={formData.code}
              onChange={e => handleChange('code', e.target.value)}
              disabled={!isNew || isBranchAdmin}
              required
            />
            <Select
              label="Subject Type"
              options={[
                { value: 'core', label: 'Core / Compulsory' },
                { value: 'elective', label: 'Elective / Optional' },
                { value: 'practical', label: 'Practical / Lab' },
                { value: 'language', label: 'Language' },
                { value: 'vocational', label: 'Vocational' }
              ]}
              value={formData.type || 'core'}
              onChange={e => handleChange('type', e.target.value)}
              disabled={isBranchAdmin}
            />
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.status}
              onChange={e => handleChange('status', e.target.value)}
              disabled={isBranchAdmin}
            />
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Provide a brief overview of this subject..."
                rows={4}
                disabled={isBranchAdmin}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-white disabled:bg-slate-50 disabled:text-slate-600 resize-y shadow-2xs font-normal"
              />
            </div>
          </div>
        </div>
      </Card>

      {!isBranchAdmin && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          itemType="subject"
          itemName={formData.name || code}
          description="Deleting this subject will remove it from active curriculum mappings across courses."
        />
      )}
    </div>
  );
};
