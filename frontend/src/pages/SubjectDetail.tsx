import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Save, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { subjectApi } from '../services/subjectApi';
import type { SubjectCreatePayload } from '../services/subjectApi';
import { useApp } from '../context/AppContext';

export const SubjectDetail: React.FC = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const isNew = !code || code === 'new';

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<SubjectCreatePayload>({
    name: '',
    code: '',
    type: 'core',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    if (!isNew && code) {
      fetchSubject(code);
    }
  }, [code, isNew]);

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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      addToast('Name and Code are required', 'error');
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

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    
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
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Loading subject details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/subjects')}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-800">
                {isNew ? 'Create New Subject' : `Edit Subject: ${formData.name}`}
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Configure master details for this subject in the global pool.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handleDelete} disabled={isSaving} style={{ color: '#ef4444', borderColor: '#fee2e2', backgroundColor: '#fef2f2' }}>
              <Trash2 size={16} className="mr-2" /> Delete
            </Button>
          )}
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            {isNew ? 'Create Subject' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Basic Details Form */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Subject Name *"
            placeholder="e.g. Advanced Physics"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
          />
          <Input
            label="Subject Code *"
            placeholder="e.g. PHY-ADV-101"
            value={formData.code}
            onChange={e => handleChange('code', e.target.value)}
            disabled={!isNew}
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
          />
          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            value={formData.status}
            onChange={e => handleChange('status', e.target.value)}
          />
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Provide a brief overview of this subject..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
