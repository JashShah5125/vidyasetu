import React from 'react';
import { BookOpen, Users, Monitor, Repeat, CheckCircle } from 'lucide-react';

interface TimetableStatsProps {
  totalPeriods: number;
  totalTeachers: number;
  totalRooms: number;
  substitutions: number;
  status: 'Published' | 'Draft';
  lastUpdated: string;
}

export const TimetableStats: React.FC<TimetableStatsProps> = ({
  totalPeriods,
  totalTeachers,
  totalRooms,
  substitutions,
  status,
  lastUpdated
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Total Periods */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Periods</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalPeriods}</span>
            <span className="text-xs text-slate-500">Per Week</span>
          </div>
        </div>
      </div>

      {/* Total Teachers */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Teachers</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalTeachers}</span>
            <span className="text-xs text-slate-500">Assigned</span>
          </div>
        </div>
      </div>

      {/* Total Rooms */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Monitor className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Rooms</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalRooms}</span>
            <span className="text-xs text-slate-500">In Use</span>
          </div>
        </div>
      </div>

      {/* Substitutions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
          <Repeat className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Substitutions</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{substitutions}</span>
            <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">View Details</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-lg ${status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{status} Status</div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 leading-tight">{status}</span>
            <span className="text-xs text-slate-500 mt-0.5">On {lastUpdated}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
