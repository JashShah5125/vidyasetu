import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, BookOpen, GraduationCap, CheckCircle2,
  ChevronDown, ChevronRight, Loader2, Sparkles, AlertCircle
} from 'lucide-react';
import { branchApi } from '../../services/branchApi';
import { Button } from '../ui/Button';

interface ProgramItem {
  id: number | string;
  name: string;
  code?: string;
  is_assigned?: boolean;
}

interface MasterCourseItem {
  id: number | string;
  name: string;
  code: string;
  description?: string;
  duration?: string;
  is_assigned: boolean;
  programs?: ProgramItem[];
  assigned_programs?: Array<number | string>;
}

interface AssignCoursesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string | number;
  branchName?: string;
  onAssignedSuccess: () => void;
}

export const AssignCoursesDrawer: React.FC<AssignCoursesDrawerProps> = ({
  isOpen,
  onClose,
  branchId,
  branchName = 'Branch',
  onAssignedSuccess
}) => {
  const [courses, setCourses] = useState<MasterCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string | number>>(new Set());

  // Selected state: Map of courseId -> Set of selected programIds
  // If courseId is in selectedCourses map, it means the course is checked to be assigned.
  const [selectedCoursePrograms, setSelectedCoursePrograms] = useState<Map<string | number, Set<string | number>>>(new Map());

  // Fetch courses with assignment status for this branch
  const loadMasterCatalog = async () => {
    if (!branchId) return;
    try {
      setIsLoading(true);
      const res = await branchApi.getCourses(branchId, { assignment_status: 'all' });
      if (res?.status === 'success' && Array.isArray(res.data)) {
        const list: MasterCourseItem[] = res.data;
        setCourses(list);

        // Prepopulate current selections from assigned courses
        const initialSelected = new Map<string | number, Set<string | number>>();
        list.forEach(c => {
          if (c.is_assigned) {
            const progSet = new Set<string | number>();
            if (c.programs && c.programs.length > 0) {
              c.programs.forEach(p => {
                if (p.is_assigned) {
                  progSet.add(p.id);
                }
              });
              // If course is assigned but no specific programs marked assigned, assign all
              if (progSet.size === 0) {
                c.programs.forEach(p => progSet.add(p.id));
              }
            }
            initialSelected.set(c.id, progSet);
          }
        });
        setSelectedCoursePrograms(initialSelected);
      }
    } catch (err) {
      console.error('Failed to load courses for drawer', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMasterCatalog();
      setSearch('');
      setFilterTab('all');
    }
  }, [isOpen, branchId]);

  // Filtered master catalog
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      // Tab filter
      if (filterTab === 'unassigned' && c.is_assigned) return false;
      if (filterTab === 'assigned' && !c.is_assigned) return false;

      // Search filter
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      const matchCourse = c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query);
      const matchProgram = c.programs?.some(p => p.name.toLowerCase().includes(query) || (p.code && p.code.toLowerCase().includes(query)));
      return matchCourse || matchProgram;
    });
  }, [courses, filterTab, search]);

  const toggleCourseExpand = (courseId: string | number) => {
    setExpandedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleCourseCheck = (course: MasterCourseItem, checked: boolean) => {
    setSelectedCoursePrograms(prev => {
      const next = new Map(prev);
      if (checked) {
        // Select all programs under this course by default
        const progSet = new Set<string | number>();
        (course.programs || []).forEach(p => progSet.add(p.id));
        next.set(course.id, progSet);
        // Automatically expand so user sees selected programs
        setExpandedCourseIds(exp => new Set(exp).add(course.id));
      } else {
        next.delete(course.id);
      }
      return next;
    });
  };

  const handleProgramCheck = (course: MasterCourseItem, programId: string | number, checked: boolean) => {
    setSelectedCoursePrograms(prev => {
      const next = new Map(prev);
      const progSet = new Set(next.get(course.id) || []);
      if (checked) {
        progSet.add(programId);
        next.set(course.id, progSet);
      } else {
        progSet.delete(programId);
        if (progSet.size === 0 && (!course.programs || course.programs.length === 0)) {
          next.delete(course.id);
        } else {
          next.set(course.id, progSet);
        }
      }
      return next;
    });
  };

  const handleApplyAssignments = async () => {
    try {
      setIsSaving(true);
      const assignments: Array<{ courseId: string | number; programIds: Array<string | number> }> = [];
      
      selectedCoursePrograms.forEach((progSet, courseId) => {
        assignments.push({
          courseId,
          programIds: Array.from(progSet)
        });
      });

      await branchApi.batchAssignCourses(branchId, assignments);
      onAssignedSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to apply assignments', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalSelectedCourses = selectedCoursePrograms.size;
  let totalSelectedPrograms = 0;
  selectedCoursePrograms.forEach(set => { totalSelectedPrograms += set.size; });

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-10 flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <BookOpen size={18} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Assign Master Courses
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
              Select academic courses and programs to activate for <span className="font-semibold text-slate-800">{branchName}</span>. Levels and subjects will be inherited automatically.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search master courses or programs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Courses ({courses.length})
            </button>
            <button
              onClick={() => setFilterTab('unassigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'unassigned'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Available to Assign ({courses.filter(c => !c.is_assigned).length})
            </button>
            <button
              onClick={() => setFilterTab('assigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterTab === 'assigned'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Currently Assigned ({courses.filter(c => c.is_assigned).length})
            </button>
          </div>
        </div>

        {/* Courses List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 size={32} className="text-indigo-600 animate-spin" />
              <span className="text-sm font-semibold text-slate-600">Loading catalog courses...</span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <AlertCircle size={32} className="text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No courses match your filter</h4>
              <p className="text-xs text-slate-500">Try changing your search term or tab.</p>
            </div>
          ) : (
            filteredCourses.map(course => {
              const isSelected = selectedCoursePrograms.has(course.id);
              const isExpanded = expandedCourseIds.has(course.id);
              const assignedProgramsForCourse = selectedCoursePrograms.get(course.id) || new Set();
              const programsList = course.programs || [];

              return (
                <div
                  key={course.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white ${
                    isSelected
                      ? 'border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Course Item Header */}
                  <div className="p-4 flex items-start gap-3.5">
                    <input
                      type="checkbox"
                      id={`course-check-${course.id}`}
                      checked={isSelected}
                      onChange={(e) => handleCourseCheck(course, e.target.checked)}
                      className="mt-1 h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={`course-check-${course.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                        >
                          {course.name}
                        </label>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200">
                          {course.code}
                        </span>

                        {course.is_assigned ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-600" /> Active Offering
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Not Assigned
                          </span>
                        )}
                      </div>

                      {course.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{course.description}</p>
                      )}

                      {/* Programs Summary & Toggle */}
                      {programsList.length > 0 && (
                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <GraduationCap size={14} className="text-indigo-500" />
                            {isSelected
                              ? `${assignedProgramsForCourse.size} of ${programsList.length} programs selected`
                              : `${programsList.length} program${programsList.length > 1 ? 's' : ''} available`}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleCourseExpand(course.id)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            {isExpanded ? (
                              <>Hide Programs <ChevronDown size={14} /></>
                            ) : (
                              <>Configure Programs <ChevronRight size={14} /></>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Programs Checklist */}
                  {isExpanded && programsList.length > 0 && (
                    <div className="bg-slate-50/80 p-3.5 border-t border-slate-200 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                        Select Programs to Offer in Branch:
                      </div>

                      <div className="space-y-1.5">
                        {programsList.map(prog => {
                          const isProgSelected = assignedProgramsForCourse.has(prog.id);
                          return (
                            <label
                              key={prog.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                                isProgSelected
                                  ? 'bg-white border-indigo-200 text-slate-900 shadow-2xs'
                                  : 'bg-white/50 border-slate-200/70 text-slate-600 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isProgSelected}
                                  onChange={(e) => {
                                    handleProgramCheck(course, prog.id, e.target.checked);
                                  }}
                                  className="h-3.5 w-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold">{prog.name}</span>
                                {prog.code && (
                                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                                    {prog.code}
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                                Levels & Subjects Auto-Included
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shadow-lg">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900 text-sm">{totalSelectedCourses}</span> courses (
            <span className="font-bold text-indigo-600">{totalSelectedPrograms}</span> programs) selected
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApplyAssignments}
              disabled={isSaving}
              className="px-5 py-2 text-sm font-bold shadow-sm flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Save Assignments
            </Button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
