import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { BookOpen, Users, Clock, ArrowRight, Plus, GraduationCap, Layers } from 'lucide-react';

export const CourseSetup: React.FC = () => {
  const { courses } = useApp();
  const navigate = useNavigate();

  const colorPalette = [
    { bg: 'from-blue-600 to-indigo-700', light: 'bg-blue-50 text-blue-700 border-blue-200' },
    { bg: 'from-emerald-500 to-teal-700', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { bg: 'from-violet-500 to-purple-700', light: 'bg-violet-50 text-violet-700 border-violet-200' },
    { bg: 'from-orange-500 to-red-600', light: 'bg-orange-50 text-orange-700 border-orange-200' },
    { bg: 'from-pink-500 to-rose-600', light: 'bg-pink-50 text-pink-700 border-pink-200' },
  ];

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Course Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure academic catalog — courses, programs, and levels.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/courses/new')}
          style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}
        >
          <Plus size={16} className="mr-2" /> Add New Course
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
        {courses.map((course, idx) => {
          const palette = colorPalette[idx % colorPalette.length];
          return (
            <div
              key={course.code}
              className="relative flex flex-col bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-200 group overflow-hidden"
            >
              {/* Header gradient bar */}
              <div className={`bg-gradient-to-r ${palette.bg} p-6 text-white`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <GraduationCap size={22} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold font-mono bg-white/20 px-2.5 py-1 rounded-full tracking-widest uppercase">
                    {course.code}
                  </span>
                </div>
                <h3 className="text-xl font-bold leading-snug">{course.name}</h3>
                <p className="text-sm text-white/70 mt-1">{course.duration}</p>
              </div>



              {/* Info rows */}
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Layers size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>Programs: <strong className="text-slate-800 leading-snug">{course.programs?.join(', ') || 'None configured'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Users size={15} className="text-slate-400 shrink-0" />
                  <span>Students enrolled: <strong className="text-slate-800">—</strong></span>
                </div>
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                <Button
                  variant="secondary"
                  className="w-full justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
                  onClick={() => navigate(`/courses/${course.code}`)}
                >
                  Manage Course <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Empty state "Add" card */}
        <button
          onClick={() => navigate('/courses/new')}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200 p-8 text-slate-400 hover:text-blue-500 min-h-[280px]"
        >
          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
            <Plus size={24} />
          </div>
          <span className="text-sm font-semibold">Add New Course</span>
        </button>
      </div>
    </div>
  );
};
