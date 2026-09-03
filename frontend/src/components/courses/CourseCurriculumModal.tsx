import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  GraduationCap, Layers, BookOpenCheck, ChevronRight, BookOpen, Clock, Tag, Info
} from 'lucide-react';

export interface CourseCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any | null;
}

export const CourseCurriculumModal: React.FC<CourseCurriculumModalProps> = ({
  isOpen,
  onClose,
  course
}) => {
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number | null>(null);

  // Reset selections when modal opens or course changes
  useEffect(() => {
    if (isOpen && course?.programs && course.programs.length > 0) {
      setSelectedProgramIndex(0);
      setSelectedLevelIndex(null);
    } else {
      setSelectedProgramIndex(null);
      setSelectedLevelIndex(null);
    }
  }, [isOpen, course]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Info size={14} className="text-blue-500" /> Click on a program and level to explore mapped subjects.
          </div>
          <Button variant="secondary" onClick={onClose} className="px-5 py-2 text-xs font-bold">
            Close Overview
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Custom Header with Title and Dynamic Breadcrumbs */}
        <div className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Curriculum Structure: <span className="text-indigo-600">{course.name}</span>
              </h2>
              <p className="text-xs font-mono font-bold text-slate-400 uppercase mt-0.5">
                Course Code: {course.code}
              </p>
            </div>
          </div>

          {/* Dynamic Breadcrumb Trail */}
          <div className="mt-3 flex items-center flex-wrap gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="text-slate-400">Curriculum</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-slate-700 font-bold">{course.name}</span>

            {selectedProgram && (
              <>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {selectedProgram.name || `Program #${selectedProgramIndex! + 1}`}
                </span>
              </>
            )}

            {selectedLevel && (
              <>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {selectedLevel.name || `Level #${selectedLevelIndex! + 1}`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3-Column Split Pane (Miller Columns / macOS Finder Style) */}
        <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm h-[440px]">
          
          {/* ── COLUMN 1: PROGRAMS ── */}
          <div className="flex flex-col border-r border-slate-200 h-full bg-slate-50/50">
            <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700">
                <GraduationCap size={16} className="text-indigo-600" />
                Programs ({programs.length})
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 scrollbar-thin">
              {programs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
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
                      className={`w-full text-left p-3 rounded-xl transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {program.name || `Program #${pIdx + 1}`}
                        </div>
                        {program.code && (
                          <div className={`text-[10px] font-mono mt-0.5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {program.code}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {program.levels?.length || 0} Lvl
                        </span>
                        <ChevronRight size={14} className={isActive ? 'text-white' : 'text-slate-400 group-hover:translate-x-0.5 transition-transform'} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── COLUMN 2: LEVELS ── */}
          <div className="flex flex-col border-r border-slate-200 h-full bg-slate-50/30">
            <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700">
                <Layers size={16} className="text-blue-600" />
                Levels {selectedProgram ? `(${levels.length})` : ''}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 scrollbar-thin">
              {!selectedProgram ? (
                <div className="p-10 text-center flex flex-col items-center justify-center h-full text-slate-400">
                  <GraduationCap size={32} className="mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Select a Program</p>
                  <p className="text-[11px] mt-1">Choose a program from Column 1 to view its levels</p>
                </div>
              ) : levels.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
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
                      className={`w-full text-left p-3 rounded-xl transition-all duration-150 flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {level.name || `Level #${lIdx + 1}`}
                        </div>
                        {level.duration && (
                          <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                            <Clock size={10} /> {level.duration}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {level.subjects?.length || 0} Subj
                        </span>
                        <ChevronRight size={14} className={isActive ? 'text-white' : 'text-slate-400 group-hover:translate-x-0.5 transition-transform'} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── COLUMN 3: SUBJECTS ── */}
          <div className="flex flex-col h-full bg-white">
            <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-700">
                <BookOpenCheck size={16} className="text-emerald-600" />
                Mapped Subjects {selectedLevel ? `(${subjects.length})` : ''}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
              {!selectedLevel ? (
                <div className="p-10 text-center flex flex-col items-center justify-center h-full text-slate-400">
                  <Layers size={32} className="mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Select a Level</p>
                  <p className="text-[11px] mt-1">Choose an academic level from Column 2 to view mapped subjects</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-400">
                  <BookOpenCheck size={32} className="mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No Subjects Mapped</p>
                  <p className="text-[11px] text-slate-400 mt-1">No subjects currently mapped to {selectedLevel.name}</p>
                </div>
              ) : (
                subjects.map((subject: any, sIdx: number) => (
                  <div
                    key={subject.id || sIdx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs shrink-0">
                        <BookOpen size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {subject.name}
                        </div>
                        {subject.code && (
                          <div className="text-[10px] font-mono font-bold text-blue-600 uppercase">
                            {subject.code}
                          </div>
                        )}
                      </div>
                    </div>
                    {subject.type && (
                      <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded text-[10px] font-bold shrink-0">
                        {subject.type}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
};
