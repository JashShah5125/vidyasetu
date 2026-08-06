import React from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, GraduationCap, DollarSign, ShieldAlert, CheckCircle, Clock, Users, Ticket } from 'lucide-react';

export const SaasAdminDashboard: React.FC = () => {
  const { tenants, auditLogs } = useApp();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">SaaS Platform Operations Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Cross-tenant infrastructure health, subscription pipelines, customer success logs, and platform revenue metrics.</p>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Institutes</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-1">{tenants.length + 3}</span>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
            <Building2 size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Institutes</span>
            <span className="text-2xl font-extrabold text-emerald-600 block mt-1">{tenants.filter(t => t.status === 'Active').length + 2}</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Trial Institutes</span>
            <span className="text-2xl font-extrabold text-blue-600 block mt-1">2</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expired Subs</span>
            <span className="text-2xl font-extrabold text-red-600 block mt-1">1</span>
          </div>
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
            <ShieldAlert size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Users</span>
            <span className="text-2xl font-extrabold text-slate-900 block mt-1">64</span>
          </div>
          <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-100">
            <Users size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Students (All Tenants)</span>
            <span className="text-xl font-extrabold text-slate-900 block mt-1">1,480 Students</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
            <GraduationCap size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">SaaS MRR / ARR</span>
            <span className="text-xl font-extrabold text-emerald-700 block mt-1">₹4.25L / ₹51L</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-100">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending Approvals</span>
            <span className="text-xl font-extrabold text-amber-700 block mt-1">4 Requests</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center border border-amber-100">
            <ShieldAlert size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Support Tickets</span>
            <span className="text-xl font-extrabold text-purple-700 block mt-1">3 Active Tickets</span>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center border border-purple-100">
            <Ticket size={18} />
          </div>
        </div>
      </div>

      {/* Main metrics charts layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Platform Monthly Recurring Revenue (2026)</h3>
          <div className="h-48 flex items-end justify-between gap-2 pt-6 border-b border-slate-100 px-4">
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-purple-600/30 rounded-t-md hover:bg-purple-600 transition-all duration-150" style={{ height: '50px' }}></div>
              <span className="text-[9px] text-slate-400 font-bold">Jan</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-purple-600/30 rounded-t-md hover:bg-purple-600 transition-all duration-150" style={{ height: '70px' }}></div>
              <span className="text-[9px] text-slate-400 font-bold">Feb</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-purple-600/30 rounded-t-md hover:bg-purple-600 transition-all duration-150" style={{ height: '90px' }}></div>
              <span className="text-[9px] text-slate-400 font-bold">Mar</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-purple-600/30 rounded-t-md hover:bg-purple-600 transition-all duration-150" style={{ height: '110px' }}></div>
              <span className="text-[9px] text-slate-400 font-bold">Apr</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-purple-600/30 rounded-t-md hover:bg-purple-600 transition-all duration-150" style={{ height: '130px' }}></div>
              <span className="text-[9px] text-slate-400 font-bold">May</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-purple-600 rounded-t-md shadow-lg shadow-purple-500/20" style={{ height: '160px' }}></div>
              <span className="text-[9px] text-slate-800 font-bold">Jun</span>
            </div>
          </div>
        </div>

        {/* Recent activity summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Recent Tenant Activity</h3>
          <div className="space-y-3.5">
            {[
              { tenant: 'Apex IIT Academy', desc: 'Added new batch: IIT-JEE morning session', time: '5 mins ago' },
              { tenant: 'Bright Future Coaching', desc: 'Updated timetable calendar schedules', time: '12 mins ago' },
              { tenant: 'Zenith Career Hub', desc: 'Requested custom domain mapping setup', time: '2 hours ago' },
              { tenant: 'Vanguard Global', desc: 'Completed online fee gateway validation test', time: '4 hours ago' }
            ].map((act, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{act.tenant}</span>
                  <span className="text-slate-500 mt-0.5 block">{act.desc}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Platform audit logs */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Recent System Operations Registers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Institute</th>
                <th className="px-6 py-4">Action Event</th>
                <th className="px-6 py-4">Details Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {auditLogs.slice(0, 4).map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-[10px]">{log.timestamp}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {log.actor} <span className="text-[9px] text-slate-400 uppercase font-normal">({log.role})</span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-semibold">{log.institute || 'System / Platform'}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-purple-600">{log.action}</td>
                  <td className="px-6 py-4 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
