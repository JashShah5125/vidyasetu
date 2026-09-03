import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { courseApi } from '../services/courseApi';
import { subjectApi, type Subject } from '../services/subjectApi';
import type { CourseCreatePayload, CourseApiProgram, CourseApiProgramLevel } from '../services/courseApi';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import {
  BookOpen, GraduationCap, Layers, Plus, Trash2, ShieldAlert, Loader2, ArrowRight, ArrowLeft, BookOpenCheck, Search
} from 'lucide-react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

const newLevel = (): CourseApiProgramLevel => ({ id: `l-${Date.now()}`, name: '', duration: '', subjects: [] });
const newProgram = (): CourseApiProgram => ({ id: `p-${Date.now()}`, name: '', code: '', is_active: true, levels: [] });

// ─── Level Card Component ──────────────────────────────────────────────────
const LevelCard: React.FC<{
  level: CourseApiProgramLevel;
  onChange: (l: CourseApiProgramLevel) => void;
  onDelete: () => void;
  onSetupSubjects?: () => void;
  disableInputs?: boolean;
}> = ({ level, onChange, onDelete, onSetupSubjects, disableInputs }) => {
  const mappedCount = level.subjects?.length || 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-4 space-y-3">
      {/* Top Row: Inputs */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <Layers size={18} className="text-indigo-600 shrink-0 hidden md:block" />
        <div className="flex-1 w-full">
          <Input
            label="Level Name"
            value={level.name || ''}
            placeholder="Level Name (e.g. Class XI, Foundation Phase 1)"
            onChange={e => onChange({ ...level, name: e.target.value })}
            disabled={disableInputs}
            className="disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-default"
          />
        </div>
        <div className="w-full md:w-48 shrink-0">
          <Select
            label="Duration"
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
            type="button"
            onClick={onDelete}
            className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer mt-6"
            title="Delete Level"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Bottom Sub-bar within Level Card: Setup Subjects */}
      {onSetupSubjects && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 bg-white/70 p-3 rounded-xl">
          <div className="text-xs font-semibold text-slate-500">
            Subjects Configured: <strong className="text-slate-800 font-bold">{mappedCount} Subjects Mapped</strong>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onSetupSubjects}
            className="px-4 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpenCheck size={14} /> Setup Subjects <ArrowRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Main Course Detail Component ──────────────────────────────────────────
export const CourseDetail: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { addToast, currentUser } = useApp();

  const isNew = code === 'new';
  const isReadOnly = false;

  const [activeTab, setActiveTab] = useState<'general' | 'programs' | 'levels' | 'subjects'>('general');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Global Subjects list for mapping modal
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [showMapSubjectModal, setShowMapSubjectModal] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

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
    fetchGlobalSubjects();
  }, [code, isNew]);

  const fetchGlobalSubjects = async () => {
    try {
      const res = await subjectApi.list({ limit: 100 });
      if (res?.status === 'success' && res.data) {
        setAvailableSubjects(res.data);
      }
    } catch (e) {
      console.error('Failed to load global subjects:', e);
    }
  };

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
      setActiveTab('general');
      return;
    }

    try {
      setIsSaving(true);
      if (isNew) {
        await courseApi.create(formData);
        addToast(`Course "${formData.name}" created successfully.`, 'info');
      } else if (code) {
        await courseApi.update(code, formData);
        addToast(`Course "${formData.name}" updated successfully.`, 'info');
      }
      navigate('/courses');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save course', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigateToLevels = (programKey?: string) => {
    if (programKey) {
      setSelectedProgramId(programKey);
    } else if (formData.programs && formData.programs.length > 0) {
      const firstKey = formData.programs[0].id || formData.programs[0].code || 'p-0';
      setSelectedProgramId(firstKey);
    }
    setActiveTab('levels');
  };

  const handleNavigateToSubjects = (levelKey: string, programKey: string) => {
    setSelectedProgramId(programKey);
    setSelectedLevelId(levelKey);
    setActiveTab('subjects');
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
        <h3 className="text-sm font-bold text-slate-700">Loading course details...</h3>
      </div>
    );
  }

  const disableInputs = currentUser?.role === 'branch-admin' && !isNew;

  return (
    <div className="w-full animate-fade-in">
      {isReadOnly && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 shadow-sm flex items-center gap-2">
          <ShieldAlert size={16} /> Read-Only Mode: Only Institute Owners can modify course setup.
        </div>
      )}

      {/* Page Header matching Tenants */}
      <div className="flex flex-col gap-2 p-6 pb-0">
        <Breadcrumbs
          items={[
            { label: 'Courses', href: '/courses' },
            { label: isNew ? 'Create New Course' : formData.name }
          ]}
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {isNew ? 'Create New Course' : formData.name}
            </h2>
            <p className="text-base text-slate-500 mt-2">
              Configure course programs, level durations, subjects mapping, and course setup.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="secondary" onClick={() => navigate('/courses')}>
              {isReadOnly ? 'Back' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm shadow-sm font-bold"
              >
                {isSaving ? 'Saving...' : 'Save Course'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {currentUser?.role !== 'branch-admin' && (
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none mt-6 px-6">
          {[
            { id: 'general', label: '1. Course Details', icon: BookOpen },
            { id: 'programs', label: '2. Programs', icon: GraduationCap },
            { id: 'levels', label: '3. Academic Levels', icon: Layers },
            { id: 'subjects', label: '4. Level Subjects', icon: BookOpenCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer select-none ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <fieldset disabled={isReadOnly} className="contents">
        <div className="p-6 pt-6 space-y-6">

          {/* ── TAB 1: GENERAL INFO ── */}
          {activeTab === 'general' && (
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-base">Course Basic Information</h3>
                </div>
                <Toggle
                  checked={formData.is_active !== false}
                  onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  label={formData.is_active !== false ? 'Course Active' : 'Course Inactive'}
                />
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Course Name *"
                  value={formData.name}
                  placeholder="e.g. JEE Preparation / NEET Medical / Class X Board Prep"
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  disabled={disableInputs}
                  required
                />
                <Input
                  label="Course Code *"
                  value={formData.code}
                  placeholder="e.g. JEE-PREP, NEET-MED"
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  disabled={disableInputs}
                  required
                />
              </div>
            </Card>
          )}

          {/* ── TAB 2: PROGRAMS ONLY ── */}
          {activeTab === 'programs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Programs Catalog</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Define the programs for this course (e.g. 2 Year Regular, 1 Year Crash Course, Repeater Batch).
                  </p>
                </div>
                {!disableInputs && (
                  <Button
                    variant="primary"
                    onClick={() => setFormData({ ...formData, programs: [...(formData.programs || []), newProgram()] })}
                    className="px-4 py-2 text-sm font-bold gap-1.5"
                  >
                    <Plus size={16} /> Add Program
                  </Button>
                )}
              </div>

              {(!formData.programs || formData.programs.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <GraduationCap size={44} className="mb-3 text-slate-300" />
                  <p className="font-bold text-base text-slate-700">No programs added yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Click "Add Program" to define academic programs for this course.</p>
                  {!disableInputs && (
                    <Button
                      variant="primary"
                      onClick={() => setFormData({ ...formData, programs: [...(formData.programs || []), newProgram()] })}
                      className="px-4 py-2 text-xs font-bold gap-1.5"
                    >
                      <Plus size={15} /> Add First Program
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.programs.map((program, pi) => {
                    const pKey = program.id || program.code || `p-${pi}`;
                    return (
                      <Card key={pKey} className="overflow-hidden">
                        <div className="p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              <GraduationCap size={20} className="text-blue-600" />
                              <h4 className="font-bold text-slate-900 text-base">
                                Program #{pi + 1}: {program.name || 'Unnamed Program'}
                              </h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <Toggle
                                checked={program.is_active !== false}
                                onChange={(checked) => {
                                  const programs = [...(formData.programs || [])];
                                  programs[pi] = { ...program, is_active: checked };
                                  setFormData({ ...formData, programs });
                                }}
                                label={program.is_active !== false ? 'Active' : 'Inactive'}
                              />
                              {!disableInputs && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const programs = (formData.programs || []).filter((_, i) => i !== pi);
                                    setFormData({ ...formData, programs });
                                  }}
                                  className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                  title="Delete Program"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Program Name"
                              value={program.name || ''}
                              placeholder="e.g. 2 Year Integrated / 1 Year Crash Course"
                              onChange={e => {
                                const programs = [...(formData.programs || [])];
                                programs[pi] = { ...program, name: e.target.value };
                                setFormData({ ...formData, programs });
                              }}
                              disabled={disableInputs}
                            />
                            <Input
                              label="Program Code"
                              value={program.code || ''}
                              placeholder="e.g. PRG-2YR, PRG-1YR"
                              onChange={e => {
                                const programs = [...(formData.programs || [])];
                                programs[pi] = { ...program, code: e.target.value };
                                setFormData({ ...formData, programs });
                              }}
                              disabled={disableInputs}
                            />
                          </div>

                          {/* Setup Levels Button */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 bg-slate-50/60 p-3 rounded-xl">
                            <div className="text-xs font-semibold text-slate-500">
                              Levels Configured: <strong className="text-slate-800 font-bold">{program.levels?.length || 0} Levels</strong>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleNavigateToLevels(pKey)}
                              className="px-4 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
                            >
                              <Layers size={14} /> Setup Levels <ArrowRight size={14} />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: ACADEMIC LEVELS ── */}
          {activeTab === 'levels' && (() => {
            if (!formData.programs || formData.programs.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <GraduationCap size={44} className="mb-3 text-slate-300" />
                  <p className="font-bold text-base text-slate-700">No programs available</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Please add a program first under the Programs tab before configuring academic levels.</p>
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab('programs')}
                    className="px-4 py-2 text-xs font-bold gap-1.5"
                  >
                    Go to Programs Tab
                  </Button>
                </div>
              );
            }

            const targetIndex = formData.programs.findIndex((p, i) => (p.id || p.code || `p-${i}`) === selectedProgramId);
            const pi = targetIndex >= 0 ? targetIndex : 0;
            const program = formData.programs[pi];
            const pKey = program.id || program.code || `p-${pi}`;

            return (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <GraduationCap size={22} className="text-indigo-600" />
                    Academic Levels for: <span className="text-indigo-700 font-extrabold">{program.name || `Program #${pi + 1}`}</span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Configure academic levels (e.g. Class XI, Class XII, Foundation) and duration for this program.
                  </p>
                </div>

                <Card className="overflow-hidden">
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">
                          {program.name || `Program #${pi + 1}`}
                        </h4>
                        {program.code && (
                          <span className="font-mono text-xs font-bold text-slate-400 uppercase">
                            Program Code: {program.code}
                          </span>
                        )}
                      </div>

                      {!disableInputs && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const programs = [...(formData.programs || [])];
                            const updatedLevels = [...(program.levels || []), newLevel()];
                            programs[pi] = { ...program, levels: updatedLevels };
                            setFormData({ ...formData, programs });
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
                        >
                          <Plus size={14} /> Add Academic Level
                        </Button>
                      )}
                    </div>

                    {/* Levels List */}
                    <div className="space-y-3">
                      {(!program.levels || program.levels.length === 0) ? (
                        <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400">
                          No academic levels added for <strong className="text-slate-700">{program.name || 'this program'}</strong>. Click "+ Add Academic Level" to configure.
                        </div>
                      ) : (
                        program.levels.map((level, li) => {
                          const lKey = level.id || level.name || `l-${li}`;
                          return (
                            <LevelCard
                              key={lKey}
                              level={level}
                              onChange={updated => {
                                const programs = [...(formData.programs || [])];
                                const levels = [...(program.levels || [])];
                                levels[li] = updated;
                                programs[pi] = { ...program, levels };
                                setFormData({ ...formData, programs });
                              }}
                              onDelete={() => {
                                const programs = [...(formData.programs || [])];
                                const levels = (program.levels || []).filter((_, i) => i !== li);
                                programs[pi] = { ...program, levels };
                                setFormData({ ...formData, programs });
                              }}
                              onSetupSubjects={() => handleNavigateToSubjects(lKey, pKey)}
                              disableInputs={disableInputs}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ── TAB 4: LEVEL SUBJECTS ── */}
          {activeTab === 'subjects' && (() => {
            if (!formData.programs || formData.programs.length === 0) {
              return (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No levels available to map subjects.
                </div>
              );
            }

            const programIndex = formData.programs.findIndex((p, i) => (p.id || p.code || `p-${i}`) === selectedProgramId);
            const pi = programIndex >= 0 ? programIndex : 0;
            const program = formData.programs[pi];

            const levelIndex = (program?.levels || []).findIndex((l, i) => (l.id || l.name || `l-${i}`) === selectedLevelId);
            const li = levelIndex >= 0 ? levelIndex : 0;
            const level = program?.levels?.[li];

            if (!level) {
              return (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Select a level from the Academic Levels tab to map subjects.
                </div>
              );
            }

            const mappedSubjects = level.subjects || [];

            const handleUnmapSubject = (subId: string) => {
              const programs = [...(formData.programs || [])];
              const levels = [...(program.levels || [])];
              const updatedSubjects = (level.subjects || []).filter(s => String(s.id) !== String(subId));
              levels[li] = { ...level, subjects: updatedSubjects };
              programs[pi] = { ...program, levels };
              setFormData({ ...formData, programs });
            };

            const handleMapSubject = (sub: Subject) => {
              const programs = [...(formData.programs || [])];
              const levels = [...(program.levels || [])];
              const current = level.subjects || [];
              if (current.some(s => String(s.id) === String(sub.id))) {
                addToast('Subject already mapped to this level.', 'error');
                return;
              }
              levels[li] = {
                ...level,
                subjects: [...current, { id: String(sub.id), name: sub.name, code: sub.code }]
              };
              programs[pi] = { ...program, levels };
              setFormData({ ...formData, programs });
              setShowMapSubjectModal(false);
              addToast(`Subject "${sub.name}" mapped to ${level.name || 'level'}.`, 'info');
            };

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <BookOpenCheck size={22} className="text-indigo-600" />
                      Subjects Mapped to Level: <span className="text-indigo-700 font-extrabold">{level.name || `Level #${li + 1}`}</span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Program: <strong className="text-slate-800">{program.name}</strong> — Manage subject catalog assignments for this academic level.
                    </p>
                  </div>

                  {!disableInputs && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setShowMapSubjectModal(true)}
                      className="px-4 py-2 text-xs font-bold gap-1.5 shadow-sm"
                    >
                      <Plus size={15} /> Map Additional Subject
                    </Button>
                  )}
                </div>

                <Card>
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mapped Subjects List ({mappedSubjects.length})
                    </span>
                  </div>

                  {mappedSubjects.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 text-slate-400 text-xs">
                      <BookOpen size={36} className="mx-auto mb-2 text-slate-300" />
                      No subjects currently mapped to <strong className="text-slate-700">{level.name || 'this level'}</strong>.
                      <p className="text-slate-400 mt-1">Click <strong>+ Map Additional Subject</strong> above to map subjects from your catalog.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {mappedSubjects.map((sub) => (
                        <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              <BookOpen size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                              <div className="font-mono text-xs font-bold text-blue-600 uppercase">
                                Code: {sub.code}
                              </div>
                            </div>
                          </div>

                          {!disableInputs && (
                            <button
                              type="button"
                              onClick={() => handleUnmapSubject(sub.id)}
                              className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                              title="Unmap Subject from Level"
                            >
                              <Trash2 size={13} /> Unmap Subject
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* MODAL FOR MAPPING SUBJECTS */}
                {showMapSubjectModal && (
                  <Modal
                    isOpen={showMapSubjectModal}
                    onClose={() => setShowMapSubjectModal(false)}
                    title={`Map Subject to ${level.name || 'Level'}`}
                    description="Select a subject from your institute's catalog to map to this academic level."
                    size="md"
                  >
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          label="Search Subjects Catalog"
                          placeholder="Search by subject name or code..."
                          value={subjectSearch}
                          onChange={(e) => setSubjectSearch(e.target.value)}
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                        {availableSubjects
                          .filter(s => !subjectSearch || s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || s.code.toLowerCase().includes(subjectSearch.toLowerCase()))
                          .map((sub) => {
                            const isAlreadyMapped = mappedSubjects.some(m => String(m.id) === String(sub.id));
                            return (
                              <div key={sub.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{sub.name}</div>
                                  <div className="font-mono text-[10px] font-bold text-slate-400">Code: {sub.code}</div>
                                </div>
                                {isAlreadyMapped ? (
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                    Already Mapped
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => handleMapSubject(sub)}
                                    className="px-3 py-1 text-xs font-bold"
                                  >
                                    Map Subject
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      <div className="flex justify-end pt-2 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setShowMapSubjectModal(false)} className="text-xs font-semibold">
                          Close
                        </Button>
                      </div>
                    </div>
                  </Modal>
                )}
              </div>
            );
          })()}

        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex justify-between items-center px-6 pb-8 border-t border-slate-200 pt-5">
          <div>
            {activeTab === 'programs' && (
              <Button type="button" variant="secondary" onClick={() => setActiveTab('general')} className="flex items-center gap-1.5 font-bold">
                <ArrowLeft size={16} /> Back: Courses Details
              </Button>
            )}
            {activeTab === 'levels' && (
              <Button type="button" variant="secondary" onClick={() => setActiveTab('programs')} className="flex items-center gap-1.5 font-bold">
                <ArrowLeft size={16} /> Back: Programs
              </Button>
            )}
            {activeTab === 'subjects' && (
              <Button type="button" variant="secondary" onClick={() => setActiveTab('levels')} className="flex items-center gap-1.5 font-bold">
                <ArrowLeft size={16} /> Back: Academic Levels
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {!isReadOnly && (
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 text-sm font-bold shadow-sm"
              >
                {isSaving ? 'Saving Course...' : 'Save Course'}
              </Button>
            )}
          </div>
        </div>
      </fieldset>
    </div>
  );
};
