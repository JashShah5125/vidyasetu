import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import {
  ChevronLeft, BookOpen, GraduationCap, Layers, Users, Plus, Trash2, ChevronDown, ChevronRight, Clock, Tag, CheckCircle2, Circle
} from 'lucide-react';

// ─── Data Shape ───────────────────────────────────────────────────────────────

interface AcademicLevel {
  id: string;
  name: string; // e.g. "Class XI", "Year 1"
}

interface Program {
  id: string;
  name: string; // e.g. "2 Year", "1 Year Crash Course"
  fees: number;
  enabled: boolean;
  levels: AcademicLevel[];
}

interface CourseData {
  name: string;
  code: string;
  duration: string;
  programs: Program[];
}

// ─── Mock Seed Data ────────────────────────────────────────────────────────────

const SEED_DATA: Record<string, CourseData> = {
  'JEE-PREP': {
    name: 'JEE Prep Course', code: 'JEE-PREP', duration: '2 Years',
    programs: [
      {
        id: 'p1', name: '2 Year', fees: 120000, enabled: true,
        levels: [
          { id: 'l1', name: 'Class XI' },
          { id: 'l2', name: 'Class XII' },
        ]
      },
      {
        id: 'p2', name: '1 Year', fees: 80000, enabled: true,
        levels: [
          { id: 'l3', name: 'Class XII (Dropper)' }
        ]
      },
      { id: 'p3', name: 'Crash Course', fees: 40000, enabled: false, levels: [] },
    ]
  },
  'NEET-PREM': {
    name: 'NEET Batch Premium', code: 'NEET-PREM', duration: '1 Year',
    programs: [
      {
        id: 'p4', name: '1 Year', fees: 150000, enabled: true,
        levels: [
          { id: 'l4', name: 'Class XII' }
        ]
      },
      { id: 'p5', name: 'Repeater', fees: 100000, enabled: true, levels: [{ id: 'l5', name: 'Repeater Batch' }] },
    ]
  },
  'FOUND-10': {
    name: 'Class 10 Foundation', code: 'FOUND-10', duration: '1 Year',
    programs: [
      {
        id: 'p6', name: '2 Year', fees: 60000, enabled: true,
        levels: [
          { id: 'l6', name: 'Class VIII' },
          { id: 'l7', name: 'Class IX' },
        ]
      },
      { id: 'p7', name: '1 Year', fees: 35000, enabled: false, levels: [] },
    ]
  }
};

const newLevel = (): AcademicLevel => ({ id: `l-${Date.now()}`, name: '' });
const newProgram = (): Program => ({ id: `p-${Date.now()}`, name: '', fees: 0, enabled: true, levels: [] });

// ─── Sub-components ────────────────────────────────────────────────────────────

const LevelCard: React.FC<{
  level: AcademicLevel;
  onChange: (l: AcademicLevel) => void;
  onDelete: () => void;
}> = ({ level, onChange, onDelete }) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center p-3 gap-3">
      <Layers size={16} className="text-indigo-500 shrink-0" />
      <Input
        label=""
        value={level.name}
        placeholder="Level Name (e.g. Class XI)"
        onChange={e => onChange({ ...level, name: e.target.value })}
      />
      <button
        onClick={onDelete}
        className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer mt-1"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

const ProgramCard: React.FC<{
  program: Program;
  onChange: (p: Program) => void;
  onDelete: () => void;
}> = ({ program, onChange, onDelete }) => {
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
          <button
            onClick={() => onChange({ ...program, enabled: !program.enabled })}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              program.enabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {program.enabled ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {program.enabled ? 'Active' : 'Inactive'}
          </button>
          <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
            <Trash2 size={15} />
          </button>
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
            />
            <Input
              label="Program Fees (₹)"
              type="number"
              value={program.fees}
              onChange={e => onChange({ ...program, fees: +e.target.value })}
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
            <button
              onClick={() => onChange({ ...program, levels: [...program.levels, newLevel()] })}
              className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 mt-3 cursor-pointer"
            >
              <Plus size={15} /> Add Academic Level
            </button>
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
  const { courses, addToast } = useApp();

  const isNew = code === 'new';
  const seedKey = code && SEED_DATA[code] ? code : null;

  const [activeTab, setActiveTab] = useState<'general' | 'programs'>('general');

  const [formData, setFormData] = useState<CourseData>(
    seedKey
      ? SEED_DATA[seedKey]
      : { name: '', code: '', duration: '', programs: [] }
  );

  const handleSave = () => {
    addToast(`Course "${formData.name}" saved successfully.`);
    navigate('/courses');
  };

  return (
    <div className="w-full animate-fade-in">
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
            <Button variant="secondary" onClick={() => navigate('/courses')}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              Save Course
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
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

      {/* Tab Content */}
      <div className="p-6 pt-6 space-y-6">

        {/* ── General Info ── */}
        {activeTab === 'general' && (
          <Card>
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">Course Details</h3>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Course Name"
                value={formData.name}
                placeholder="e.g. JEE Prep Course"
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="Course Code"
                value={formData.code}
                placeholder="e.g. JEE-PREP"
                onChange={e => setFormData({ ...formData, code: e.target.value })}
              />
              <Input
                label="Duration"
                value={formData.duration}
                placeholder="e.g. 2 Years / 1 Year"
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>
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
              <Button
                variant="secondary"
                onClick={() => setFormData({ ...formData, programs: [...formData.programs, newProgram()] })}
              >
                <Plus size={15} className="mr-1.5" /> Add Program
              </Button>
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
            Save & Next: Programs <ChevronLeft size={16} className="ml-2 rotate-180" />
          </Button>
        )}
        {activeTab === 'programs' && (
          <>
            <Button variant="secondary" onClick={() => setActiveTab('general')}>Back</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
            >
              Save Course
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
