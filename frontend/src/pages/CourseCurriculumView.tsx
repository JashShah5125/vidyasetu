import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { courseApi } from '../services/courseApi';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  BookOpen, GraduationCap, Layers, BookOpenCheck, ChevronRight, Clock, ArrowLeft, Edit, Loader2, Info
} from 'lucide-react';

export const CourseCurriculumView: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [course, setCourse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number | null>(null);

  useEffect(() => {
    if (code) {
      fetchCourseDetails(code);
    }
  }, [code]);

  const fetchCourseDetails = async (courseCode: string) => {
    try {
      setIsLoading(true);
      const res = await courseApi.getByCode(courseCode);
      if (res?.status === 'success' && res.data) {
        setCourse(res.data);
        if (res.data.programs && res.data.programs.length > 0) {
          setSelectedProgramIndex(0);
          setSelectedLevelIndex(null);
        }
      } else {
        addToast('Course not found', 'error');
        navigate('/courses');
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch course curriculum', 'error');
      navigate('/courses');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 size={44} className="text-indigo-600 animate-spin" />
        <h3 className="text-base font-bold text-slate-800">Loading curriculum hierarchy...</h3>
      </div>
    );
  }

  if (!course) return null;

  const programs = course.programs || [];
  const selectedProgram = selectedProgramIndex !== null ? programs[selectedProgramIndex] : null;
  const levels = selectedProgram?.levels || [];
  const selectedLevel = selectedLevelIndex !== null ? levels[selectedLevelIndex] : null;
  const subjects = selectedLevel?.subjects || [];

  const handleSelectProgram = (idx: number) => {
    setSelectedProgramIndex(idx);
    setSelectedLevelIndex(null);
  };

  const handleSelectLevel = (idx: number) => {
    setSelectedLevelIndex(idx);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      {/* Top Page Header matching Tenants page */}
      <div className="flex flex-col gap-2">
        <Breadcrumbs
          items={[
            { label: 'Courses', href: '/courses' },
            { label: course.name, href: `/courses/${course.code}` },
            { label: 'Curriculum Overview' }
          ]}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <BookOpen size={36} className="text-indigo-600" />
              Curriculum Overview: <span className="text-indigo-600">{course.name}</span>
            </h2>
            <p className="text-base text-slate-500 mt-2">
              Full curriculum hierarchy — explore programs, subject levels, and mapped subjects.
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <Button
              variant="secondary"
              onClick={() => navigate('/courses')}
              className="flex items-center gap-1.5 font-bold"
            >
              <ArrowLeft size={16} /> Back to Courses
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/courses/${course.code}`)}
              className="px-5 py-2.5 text-sm shadow-sm gap-2 font-bold"
            >
              <Edit size={16} /> Manage Course Setup
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic Breadcrumb Navigation Trail */}
      <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-slate-400 uppercase tracking-wider font-bold">Trail:</span>
        <span className="text-slate-800 font-bold">{course.name}</span>

        {selectedProgram && (
          <>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1">
              <GraduationCap size={13} /> {selectedProgram.name || `Program #${selectedProgramIndex! + 1}`}
            </span>
          </>
        )}

        {selectedLevel && (
          <>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
              <Layers size={13} /> {selectedLevel.name || `Level #${selectedLevelIndex! + 1}`}
            </span>
          </>
        )}
      </div>

      {/* Full Page 3-Column Split Pane (Miller Columns / macOS Finder Style) */}
      <Card className="p-0 overflow-hidden shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[580px] bg-white">
          
          {/* ── COLUMN 1: PROGRAMS ── */}
          <div className="flex flex-col border-r border-slate-200 h-full bg-slate-50/50">
            <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700">
                <GraduationCap size={18} className="text-indigo-600" />
                Programs ({programs.length})
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
              {programs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 italic">
                  No programs defined for this course.
                </div>
              ) : (
                programs.map((program: any, pIdx: number) => {
                  const isActive = selectedProgramIndex === pIdx;
                  return (
                    <button
                      key={program.id || pIdx}
                      type="button"
                      onClick={() => handleSelectProgram(pIdx)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {program.name || `Program #${pIdx + 1}`}
                        </div>
                        {program.code && (
                          <div className={`text-xs font-mono font-bold mt-0.5 ${isActive ? 'text-indigo-200' : 'text-blue-600'}`}>
                            Code: {program.code}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                          isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {program.levels?.length || 0} Levels
                        </span>
                        <ChevronRight size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:translate-x-0.5 transition-transform'} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── COLUMN 2: LEVELS ── */}
          <div className="flex flex-col border-r border-slate-200 h-full bg-slate-50/20">
            <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700">
                <Layers size={18} className="text-blue-600" />
                Levels {selectedProgram ? `(${levels.length})` : ''}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
              {!selectedProgram ? (
                <div className="p-16 text-center flex flex-col items-center justify-center h-full text-slate-400">
                  <GraduationCap size={40} className="mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Select a Program</p>
                  <p className="text-xs text-slate-400 mt-1">Choose a program from Column 1 to view its levels</p>
                </div>
              ) : levels.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 italic">
                  No academic levels defined for {selectedProgram.name}.
                </div>
              ) : (
                levels.map((level: any, lIdx: number) => {
                  const isActive = selectedLevelIndex === lIdx;
                  return (
                    <button
                      key={level.id || lIdx}
                      type="button"
                      onClick={() => handleSelectLevel(lIdx)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {level.name || `Level #${lIdx + 1}`}
                        </div>
                        {level.duration && (
                          <div className={`text-xs flex items-center gap-1 mt-0.5 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                            <Clock size={12} /> Duration: {level.duration}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {level.subjects?.length || 0} Subjects
                        </span>
                        <ChevronRight size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:translate-x-0.5 transition-transform'} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── COLUMN 3: SUBJECTS ── */}
          <div className="flex flex-col h-full bg-white">
            <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700">
                <BookOpenCheck size={18} className="text-emerald-600" />
                Mapped Subjects {selectedLevel ? `(${subjects.length})` : ''}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {!selectedLevel ? (
                <div className="p-16 text-center flex flex-col items-center justify-center h-full text-slate-400">
                  <Layers size={40} className="mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Select a Level</p>
                  <p className="text-xs text-slate-400 mt-1">Choose an academic level from Column 2 to view mapped subjects</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center h-full text-slate-400">
                  <BookOpenCheck size={40} className="mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No Subjects Mapped</p>
                  <p className="text-xs text-slate-400 mt-1">No subjects currently mapped to {selectedLevel.name}</p>
                </div>
              ) : (
                subjects.map((subject: any, sIdx: number) => (
                  <div
                    key={subject.id || sIdx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs shrink-0">
                        <BookOpen size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {subject.name}
                        </div>
                        {subject.code && (
                          <div className="text-xs font-mono font-bold text-blue-600 uppercase mt-0.5">
                            Code: {subject.code}
                          </div>
                        )}
                      </div>
                    </div>
                    {subject.type && (
                      <span className="px-2.5 py-1 bg-slate-200/80 text-slate-700 rounded-lg text-[10px] font-bold shrink-0 uppercase">
                        {subject.type}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
};
