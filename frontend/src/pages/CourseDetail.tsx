import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { courseApi } from '../services/courseApi';
import type { CourseCreatePayload, CourseApiProgram, CourseApiProgramLevel } from '../services/courseApi';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import {
  ChevronLeft, BookOpen, GraduationCap, Layers, Plus, Trash2, ChevronDown, ChevronRight, ShieldAlert, Loader2
} from 'lucide-react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

const newLevel = (): CourseApiProgramLevel => ({ id: `l-${Date.now()}`, name: '', duration: '' });
const newProgram = (): CourseApiProgram => ({ id: `p-${Date.now()}`, name: '', code: '', is_active: true, levels: [] });

// ─── Sub-components ────────────────────────────────────────────────────────────

const LevelCard: React.FC<{
  level: CourseApiProgramLevel;
  onChange: (l: CourseApiProgramLevel) => void;
  onDelete: () => void;
}> = ({ level, onChange, onDelete }) => {
  const { currentUser } = useApp();
  const { code } = useParams<{ code: string }>();
  const isNew = code === 'new';
  const disableInputs = currentUser?.role === 'branch-admin' && !isNew;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col md:flex-row items-center p-3 gap-3">
      <Layers size={16} className="text-indigo-500 shrink-0 hidden md:block" />
      <div className="flex-1 w-full">
        <Input
          label=""
          value={level.name || ''}
          placeholder="Level Name (e.g. Class XI)"
          onChange={e => onChange({ ...level, name: e.target.value })}
          disabled={disableInputs}
          className="disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-default"
        />
      </div>
      <div className="w-full md:w-48 shrink-0">
        <Select
          label=""
          options={[
            { value: '', label: 'Select Duration' },
            { value: '2 Months', label: '2 Months' },
            { value: '3 Months', label: '3 Months' },
            { value: '6 Months', label: '6 Months' },
            { value: '1 Year', label: '1 Year' },
          ]}
          value={level.duration || ''}
          onChange={e => onChange({ ...level, duration: e.target.value })}
          disabled={disableInputs}
        />
      </div>
      {!disableInputs && (
        <button
          onClick={onDelete}
          className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer mt-1"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

const ProgramCard: React.FC<{
  program: CourseApiProgram;
  onChange: (p: CourseApiProgram) => void;
  onDelete: () => void;
}> = ({ program, onChange, onDelete }) => {
  const { currentUser } = useApp();
  const { code } = useParams<{ code: string }>();
  const isNew = code === 'new';
  const disableInputs = currentUser?.role === 'branch-admin' && !isNew;
  const [open, setOpen] = useState(program.is_active !== false);

  return (
    <Card className="hover:-translate-y-0.5 transition-transform duration-200">
      <div className="p-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 rounded-t-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
          {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
          <GraduationCap size={18} className="text-blue-600" />
          <div>
            <span className="font-bold text-slate-800">{program.name || 'Unnamed Program'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle 
            checked={program.is_active !== false} 
            onChange={(checked) => onChange({ ...program, is_active: checked })} 
            label={program.is_active !== false ? 'Active' : 'Inactive'} 
          />
          {!disableInputs && (
            <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Program Name"
              value={program.name || ''}
              placeholder="e.g. 2 Year / 1 Year Crash Course / Repeater"
              onChange={e => onChange({ ...program, name: e.target.value })}
              disabled={disableInputs}
              className="disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default"
            />
            <Input
              label="Program Code"
              type="text"
              value={program.code || ''}
              placeholder="e.g. PRG-001"
              onChange={e => onChange({ ...program, code: e.target.value })}
              disabled={disableInputs}
              className="disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Academic Levels</p>
            <div className="space-y-3">
              {(program.levels || []).map((level, li) => (
                <LevelCard
                  key={level.id || li}
                  level={level}
                  onChange={updated => {
                    const levels = [...(program.levels || [])];
                    levels[li] = updated;
                    onChange({ ...program, levels });
                  }}
                  onDelete={() => onChange({ ...program, levels: (program.levels || []).filter((_, i) => i !== li) })}
                />
              ))}
            </div>
            {!disableInputs && (
              <button
                onClick={() => onChange({ ...program, levels: [...(program.levels || []), newLevel()] })}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 mt-3 cursor-pointer"
              >
                <Plus size={15} /> Add Academic Level
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export const CourseDetail: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { addToast, currentUser, branches } = useApp();

  const isNew = code === 'new';
  const isReadOnly = false;

  const [activeTab, setActiveTab] = useState<'general' | 'programs'>('general');
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<CourseCreatePayload>({
    name: '',
    code: '',
    description: '',
    is_active: true,
    programs: [],
    branches: []
  });

  useEffect(() => {
    if (!isNew && code) {
      fetchCourse(code);
    }
  }, [code, isNew]);

  const fetchCourse = async (courseCode: string) => {
    try {
      setIsLoading(true);
      const res = await courseApi.getByCode(courseCode);
      if (res?.status === 'success' && res.data) {
        setFormData({
          name: res.data.name || '',
          code: res.data.code || '',
          description: res.data.description || '',
          is_active: res.data.is_active ?? true,
          branches: res.data.branches || [],
          programs: res.data.programs || []
        });
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch course details', 'error');
      navigate('/courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      addToast('Please enter both Course Name and Course Code.', 'error');
      return;
    }
    const selectedBranches = formData.branches || [];
    

    try {
      setIsSaving(true);
      if (isNew) {
        await courseApi.create(formData);
        addToast(`Course "${formData.name}" created successfully.`, 'success');
      } else if (code) {
        await courseApi.update(code, formData);
        addToast(`Course "${formData.name}" updated successfully.`, 'success');
      }
      navigate('/courses');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save course', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-1">Loading details...</h3>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {isReadOnly && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 shadow-sm flex items-center gap-2">
          <ShieldAlert size={16} /> Read-Only Mode: Only Institute Owners can modify course setup.
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col gap-2 p-6 pb-0">
        <Breadcrumbs
          items={[
            { label: 'Courses', href: '/courses' },
            { label: isNew ? 'Create New Course' : formData.name }
          ]}
        />
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-display font-bold text-slate-900">
            {isNew ? 'Create New Course' : formData.name}
          </h2>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/courses')}>
              {isReadOnly ? 'Back' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button
                variant="primary"
                onClick={handleSave}
                style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
              >
                Save Course
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      {currentUser?.role !== 'branch-admin' && (
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none mt-6 px-6">
          {[
            { id: 'general', label: 'General Info', icon: BookOpen },
            { id: 'programs', label: 'Programs & Levels', icon: Layers },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer select-none ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <fieldset disabled={isReadOnly} className="contents">
        {/* Tab Content */}
        <div className="p-6 pt-6 space-y-6">

        {/* ── General Info ── */}
        {activeTab === 'general' && (
          <Card>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Course Details</h3>
              </div>
              <Toggle 
                checked={formData.is_active !== false} 
                onChange={(checked) => setFormData({ ...formData, is_active: checked })} 
                label={formData.is_active !== false ? 'Course Active' : 'Course Inactive'} 
              />
            </div>
            {(() => {
              const disableInputs = currentUser?.role === 'branch-admin' && !isNew;
              return (
                <>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      label="Course Name"
                      value={formData.name}
                      placeholder="e.g. JEE Prep Course"
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      disabled={disableInputs}
                      className="disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default"
                    />
                    <Input
                      label="Course Code"
                      value={formData.code}
                      placeholder="e.g. JEE-PREP"
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      disabled={disableInputs}
                      className="disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default"
                    />
                  </div>
                </>
              );
            })()}
          </Card>
        )}

        {/* ── Programs & Levels ── */}
        {activeTab === 'programs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Programs</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Define which programs are available (e.g. 1 Year, 2 Year) and add academic levels under each.
                </p>
              </div>
              {!(currentUser?.role === 'branch-admin' && !isNew) && (
                <Button
                  variant="secondary"
                  onClick={() => setFormData({ ...formData, programs: [...(formData.programs || []), newProgram()] })}
                >
                  <Plus size={15} className="mr-1.5" /> Add Program
                </Button>
              )}
            </div>

            {(!formData.programs || formData.programs.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <GraduationCap size={40} className="mb-3 opacity-40" />
                <p className="font-semibold text-sm">No programs added yet</p>
                <p className="text-xs mt-1">Click "Add Program" to define programs for this course</p>
              </div>
            )}

            {(formData.programs || []).map((program, pi) => (
              <ProgramCard
                key={program.id}
                program={program}
                onChange={updated => {
                  const programs = [...(formData.programs || [])];
                  programs[pi] = updated;
                  setFormData({ ...formData, programs });
                }}
                onDelete={() =>
                  setFormData({ ...formData, programs: (formData.programs || []).filter((_, i) => i !== pi) })
                }
              />
            ))}
          </div>
        )}

      </div>

      {/* Footer nav */}
      <div className="flex justify-end gap-3 px-6 pb-8 border-t border-slate-200 pt-5">
        {activeTab === 'general' && (
          <Button
            variant="primary"
            onClick={() => setActiveTab('programs')}
            style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
          >
            {isReadOnly ? 'Next: Programs' : 'Save & Next: Programs'} <ChevronLeft size={16} className="ml-2 rotate-180" />
          </Button>
        )}
        {activeTab === 'programs' && (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('general')}>Back</Button>
            {!isReadOnly && (
              <Button
                variant="primary"
                onClick={handleSave}
                style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
              >
                Save Course
              </Button>
            )}
          </>
        )}
      </div>
      </fieldset>
    </div>
  );
};
