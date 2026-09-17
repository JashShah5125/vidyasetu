import React from 'react';
import { ArrowUpRight, Calendar, MapPin, Award, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UpcomingExamItem } from '../types';

interface UpcomingExamsTableProps {
  data?: UpcomingExamItem[];
  loading?: boolean;
}

const formatDateBadge = (dateStr: string) => {
  if (!dateStr) return { day: '--', month: '---', year: '----', fullDate: '--' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: '--', month: '---', year: '----', fullDate: '--' };

  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  const fullDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return { day, month, year, fullDate };
};

const UpcomingExamsTable: React.FC<UpcomingExamsTableProps> = ({ data, loading }) => {
  const navigate = useNavigate();
  const exams = (data ?? []).slice(0, 3);

  return (
    <div
      onClick={() => navigate('/assignments')}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col space-y-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 hover:border-slate-300 cursor-pointer overflow-hidden select-none"
    >
      {/* Subtle top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header */}
      <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-950 transition-colors">
              Upcoming Examinations
            </h4>
            <ArrowUpRight
              size={13}
              className="text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0"
            />
          </div>
          <p className="h-4 overflow-hidden text-xs text-slate-500 font-normal mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate">
            Top 3 scheduled assessments date-wise
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <Calendar size={11} />
            {exams.length} Scheduled
          </span>
        </div>
      </div>

      {/* Exams Table / List */}
      <div className="space-y-2">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400">
            Loading upcoming exams...
          </div>
        ) : exams.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-400 gap-1">
            <Calendar size={20} className="text-slate-300" />
            <span>No upcoming exams scheduled</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pl-1 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Assessment & Subject</th>
                  <th className="pb-2 font-semibold hidden sm:table-cell">Branch</th>
                  <th className="pb-2 font-semibold text-center">Marks</th>
                  <th className="pb-2 pr-1 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 text-xs">
                {exams.map((exam) => {
                  const { day, month, fullDate } = formatDateBadge(exam.dueDate);
                  const isPublished =
                    exam.status === 'Published' ||
                    exam.status === 1 ||
                    exam.status === '1';

                  return (
                    <tr
                      key={exam.id}
                      className="group/row hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Date Badge */}
                      <td className="py-2.5 pl-1 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-10 rounded-lg bg-indigo-50/70 border border-indigo-100/80 flex flex-col items-center justify-center text-center shrink-0 group-hover/row:border-indigo-300 group-hover/row:bg-indigo-100/60 transition-colors">
                            <span className="text-[9px] font-bold text-indigo-600 leading-none">
                              {month}
                            </span>
                            <span className="text-xs font-extrabold text-slate-800 leading-none mt-0.5">
                              {day}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                            {fullDate}
                          </span>
                        </div>
                      </td>

                      {/* Title & Subject */}
                      <td className="py-2.5 align-middle pr-3">
                        <div className="font-semibold text-slate-800 line-clamp-1 group-hover/row:text-indigo-900 transition-colors">
                          {exam.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-medium text-indigo-700">
                            {exam.subjectName}
                          </span>
                          {exam.subjectCode && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {exam.subjectCode}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-2.5 align-middle hidden sm:table-cell pr-2">
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60">
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[110px]">{exam.branchName}</span>
                        </div>
                      </td>

                      {/* Marks */}
                      <td className="py-2.5 align-middle text-center pr-2">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                          <Award size={12} className="text-amber-500" />
                          <span>{exam.maxMarks}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 pr-1 align-middle text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isPublished ? (
                            <CheckCircle2 size={10} />
                          ) : (
                            <Clock size={10} />
                          )}
                          {exam.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
        <span>Click to manage exam schedules & grades</span>
        <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
          View All Exams <ArrowUpRight size={11} />
        </span>
      </div>
    </div>
  );
};

export default UpcomingExamsTable;
