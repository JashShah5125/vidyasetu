import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import {
  ChevronLeft, BookOpen, GraduationCap, Layers, Users, Plus, Trash2, ChevronDown, ChevronRight, Clock, Tag, CheckCircle2, Circle, ShieldAlert
} from 'lucide-react';

// ─── Data Shape ───────────────────────────────────────────────────────────────

interface AcademicLevel {
  id: string;
  name: string; // e.g. "Class XI", "Year 1"
  duration?: string;
}

interface Program {
  id: string;
  name: string; // e.g. "2 Year", "1 Year Crash Course"
  code: string;
  enabled: boolean;
  levels: AcademicLevel[];
}

interface CourseData {
  name: string;
  code: string;
  duration: string;
  enabled: boolean;
  programs: Program[];
  branches?: string[];
}

// ─── Mock Seed Data ────────────────────────────────────────────────────────────

const SEED_DATA: Record<string, CourseData> = {
  'JEE-PREP': {
    name: 'JEE Prep Course', code: 'JEE-PREP', duration: '2 Years', enabled: true,
    programs: [
      {
        id: 'p1', name: '2 Year', code: 'PRG-001', enabled: true,
        levels: [
          { id: 'l1', name: 'Class XI' },
          { id: 'l2', name: 'Class XII' },
        ]
      },
      {
        id: 'p2', name: '1 Year', code: 'PRG-002', enabled: true,
        levels: [
          { id: 'l3', name: 'Class XII (Dropper)' }
        ]
      },
      { id: 'p3', name: 'Crash Course', code: 'PRG-003', enabled: false, levels: [] },
    ]
  },
  'NEET-PREM': {
    name: 'NEET Batch Premium', code: 'NEET-PREM', duration: '1 Year', enabled: true,
    programs: [
      {
        id: 'p4', name: '1 Year', code: 'PRG-004', enabled: true,
        levels: [
          { id: 'l4', name: 'Class XII' }
        ]
      },
      { id: 'p5', name: 'Repeater', code: 'PRG-005', enabled: true, levels: [{ id: 'l5', name: 'Repeater Batch' }] },
    ]
  },
  'FOUND-10': {
    name: 'Class 10 Foundation', code: 'FOUND-10', duration: '1 Year', enabled: true,
    programs: [
      {
        id: 'p6', name: '2 Year', code: 'PRG-006', enabled: true,
        levels: [
          { id: 'l6', name: 'Class VIII' },
          { id: 'l7', name: 'Class IX' },
        ]
      },
      { id: 'p7', name: '1 Year', code: 'PRG-007', enabled: false, levels: [] },
    ]
  },
  '8TH-STD': {
    name: '8th Standard', code: '8TH-STD', duration: '1 Year', enabled: true,
    programs: [
      {
        id: 'p8', name: '8th std ICSE', code: 'PRG-008', enabled: true,
        levels: [{ id: 'l8', name: 'Class VIII' }]
      },
      {
        id: 'p9', name: '8th std CBSE', code: 'PRG-009', enabled: true,
        levels: [{ id: 'l9', name: 'Class VIII' }]
      }
    ]
  }
};

const newLevel = (): AcademicLevel => ({ id: `l-${Date.now()}`, name: '' });
const newProgram = (): Program => ({ id: `p-${Date.now()}`, name: '', code: '', enabled: true, levels: [] });

// ─── Sub-components ────────────────────────────────────────────────────────────

const LevelCard: React.FC<{
  level: AcademicLevel;
  onChange: (l: AcademicLevel) => void;
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
          value={level.name}
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
  program: Program;
  onChange: (p: Program) => void;
  onDelete: () => void;
}> = ({ program, onChange, onDelete }) => {
  const { currentUser } = useApp();
  const { code } = useParams<{ code: string }>();
  const isNew = code === 'new';
  const disableInputs = currentUser?.role === 'branch-admin' && !isNew;
  const [open, setOpen] = useState(program.enabled);

  return (
    <Card>
      {/* Program Header */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 rounded-t-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
          {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
          <GraduationCap size={18} className="text-blue-600" />
          <div>
            <span className="font-bold text-slate-800">{program.name || 'Unnamed Program'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle enabled */}
          <Toggle 
            checked={program.enabled} 
            onChange={(checked) => onChange({ ...program, enabled: checked })} 
            label={program.enabled ? 'Active' : 'Inactive'} 
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
              value={program.name}
              placeholder="e.g. 2 Year / 1 Year Crash Course / Repeater"
              onChange={e => onChange({ ...program, name: e.target.value })}
              disabled={disableInputs}
              className="disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default"
            />
            <Input
              label="Program Code"
              type="text"
              value={program.code}
              placeholder="e.g. PRG-001"
              onChange={e => onChange({ ...program, code: e.target.value })}
              disabled={disableInputs}
              className="disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-default"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Academic Levels</p>
            <div className="space-y-3">
              {program.levels.map((level, li) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  onChange={updated => {
                    const levels = [...program.levels];
                    levels[li] = updated;
                    onChange({ ...program, levels });
                  }}
                  onDelete={() => onChange({ ...program, levels: program.levels.filter((_, i) => i !== li) })}
                />
              ))}
            </div>
            {!disableInputs && (
              <button
                onClick={() => onChange({ ...program, levels: [...program.levels, newLevel()] })}
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
  const { courses, setCourses, addToast, currentUser, branches } = useApp();

  const isNew = code === 'new';
  const isReadOnly = false;

  const seedKey = code && SEED_DATA[code] ? code : null;

  const [activeTab, setActiveTab] = useState<'general' | 'programs'>('general');

  const [formData, setFormData] = useState<CourseData>(
    seedKey
      ? { ...JSON.parse(JSON.stringify(SEED_DATA[seedKey])), branches: [] }
      : { name: '', code: '', duration: '', enabled: true, programs: [], branches: [] }
  );

  React.useEffect(() => {
    const existing = courses.find(c => c.code === code);
    if (existing) {
      setFormData({
        name: existing.name || '',
        code: existing.code || '',
        duration: existing.duration || '',
        enabled: true,
        programs: existing.programs ? existing.programs.map((p: any, idx: number) => ({
          id: `p-${idx}`,
          name: p,
          code: `PRG-00${idx}`,
          enabled: true,
          levels: []
        })) : [],
        branches: existing.branches || []
      });
    } else if (seedKey && SEED_DATA[seedKey]) {
      setFormData({
        ...JSON.parse(JSON.stringify(SEED_DATA[seedKey])),
        branches: []
      });
    } else {
      setFormData({ name: '', code: code === 'new' ? '' : (code || ''), duration: '', enabled: true, programs: [], branches: [] });
    }
  }, [code, seedKey, courses]);

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      addToast('Please enter both Course Name and Course Code.');
      return;
    }
    const selectedBranches = formData.branches || [];
    if (selectedBranches.length === 0) {
      addToast('Please select at least one branch.');
      return;
    }
    
    const existingIndex = courses.findIndex(c => c.code === code);
    if (existingIndex > -1) {
      // Edit mode
      setCourses(prev => prev.map(c => {
        if (c.code === code) {
          return {
            ...c,
            name: formData.name,
            code: formData.code,
            branches: selectedBranches,
            programs: formData.programs.map(p => p.name)
          };
        }
        return c;
      }));
      addToast(`Course "${formData.name}" updated successfully.`);
    } else {
      // Create mode
      const newCourseItem = {
        name: formData.name,
        code: formData.code,
        duration: formData.duration || '1 Year',
        fees: 80000,
        programs: formData.programs.map(p => p.name),
        branches: selectedBranches
      };
      setCourses(prev => [...prev, newCourseItem]);
      addToast(`Course "${formData.name}" created successfully.`);
    }
    
    navigate('/courses');
  };

  return (
    <div className="w-full animate-fade-in">
      {isReadOnly && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 shadow-sm flex items-center gap-2">
          <ShieldAlert size={16} /> Read-Only Mode: Only Institute Owners can modify course setup.
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col gap-2 p-6 pb-0">
        <button
          onClick={() => navigate('/courses')}
          className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 w-fit transition-colors"
        >
          <ChevronLeft size={16} /> Back to Courses
        </button>
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
                checked={formData.enabled} 
                onChange={(checked) => setFormData({ ...formData, enabled: checked })} 
                label={formData.enabled ? 'Course Active' : 'Course Inactive'} 
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
                  <div className="p-5 border-t border-slate-100 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Offered in Branches</label>
                    <div className="flex flex-wrap gap-5 mt-1">
                      {branches.map(branch => {
                        const isChecked = (formData.branches || []).includes(branch.name);
                        return (
                          <label key={branch.id} className={`flex items-center gap-2.5 select-none ${disableInputs ? 'cursor-default opacity-60' : 'cursor-pointer group'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={disableInputs}
                              onChange={e => {
                                const checked = e.target.checked;
                                const currentBranches = formData.branches || [];
                                const updated = checked
                                  ? [...currentBranches, branch.name]
                                  : currentBranches.filter(name => name !== branch.name);
                                setFormData({ ...formData, branches: updated });
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 transition-all duration-150 cursor-pointer disabled:cursor-default"
                            />
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                              {branch.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
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
                  onClick={() => setFormData({ ...formData, programs: [...formData.programs, newProgram()] })}
                >
                  <Plus size={15} className="mr-1.5" /> Add Program
                </Button>
              )}
            </div>

            {formData.programs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <GraduationCap size={40} className="mb-3 opacity-40" />
                <p className="font-semibold text-sm">No programs added yet</p>
                <p className="text-xs mt-1">Click "Add Program" to define programs for this course</p>
              </div>
            )}

            {formData.programs.map((program, pi) => (
              <ProgramCard
                key={program.id}
                program={program}
                onChange={updated => {
                  const programs = [...formData.programs];
                  programs[pi] = updated;
                  setFormData({ ...formData, programs });
                }}
                onDelete={() =>
                  setFormData({ ...formData, programs: formData.programs.filter((_, i) => i !== pi) })
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
