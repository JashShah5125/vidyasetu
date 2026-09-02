import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Building2, GraduationCap, DollarSign, ShieldAlert, CheckCircle, Clock, Ticket, AlertOctagon, Loader2, Layers, Award, TrendingUp, CreditCard } from 'lucide-react';
import api from '../../services/api';

interface SaasStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  draft_tenants: number;
  pending_approvals: number;
  total_plans: number;
  total_mrr: number;
  plan_distribution: { plan: string; count: number }[];
}

export const SaasAdminDashboard: React.FC = () => {
  const { auditLogs } = useApp();
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [stats, setStats] = useState<SaasStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard/saas-stats');
        if (data.status === 'success') setStats(data.data);
      } catch (err) {
        console.error('Failed to load SaaS dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({
    label, value, color, icon: Icon, bg, border,
  }: {
    label: string;
    value: React.ReactNode;
    color: string;
    icon: React.ElementType;
    bg: string;
    border: string;
  }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
        <span className={`text-2xl font-extrabold block mt-1 ${color}`}>
          {loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : value}
        </span>
      </div>
      <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center ${border}`}>
        <Icon size={18} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">SaaS Platform Operations Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Cross-tenant infrastructure health, subscription pipelines, customer success logs, and platform revenue metrics.</p>
      </div>

      {/* Section 1 — KPI Cards (4 cards, real DB data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Institutes"
          value={stats?.total_tenants ?? '—'}
          color="text-slate-900"
          icon={Building2}
          bg="bg-purple-50"
          border="border border-purple-100"
        />
        <StatCard
          label="Active Institutes"
          value={stats?.active_tenants ?? '—'}
          color="text-emerald-600"
          icon={CheckCircle}
          bg="bg-emerald-50"
          border="border border-emerald-100"
        />
        <StatCard
          label="Suspended / Inactive"
          value={stats ? (stats.suspended_tenants + stats.draft_tenants) : '—'}
          color="text-red-600"
          icon={AlertOctagon}
          bg="bg-red-50"
          border="border border-red-100"
        />
        <StatCard
          label="Pending Approvals"
          value={stats?.pending_approvals ?? '—'}
          color={stats && stats.pending_approvals > 0 ? 'text-amber-600' : 'text-slate-400'}
          icon={ShieldAlert}
          bg="bg-amber-50"
          border="border border-amber-100"
        />
      </div>

      {/* Section 2 — Plan & Subscription Analytics */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 text-sm px-1">Plan & Subscription Analytics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Available Plans"
            value={stats?.total_plans ?? '—'}
            color="text-slate-900"
            icon={Layers}
            bg="bg-slate-50"
            border="border border-slate-100"
          />

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Most Popular Plan</span>
              <span className="text-xl font-extrabold text-blue-700 block mt-1 truncate max-w-[120px]">
                {loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : (stats?.plan_distribution?.[0]?.plan || 'None')}
              </span>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <Award size={18} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Avg MRR per Tenant</span>
              <span className="text-xl font-extrabold text-emerald-600 block mt-1">
                {loading || !stats?.active_tenants ? <Loader2 size={20} className="animate-spin text-slate-300" /> : `₹${Math.round(stats.total_mrr / stats.active_tenants).toLocaleString()}`}
              </span>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
              <TrendingUp size={18} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="w-full">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Adoption Breakdown</span>
                <div className="w-6 h-6 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center border border-slate-100">
                  <CreditCard size={12} />
                </div>
              </div>
              <div className="space-y-1.5">
                {loading ? (
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-full mt-2"></div>
                ) : stats?.plan_distribution && stats.plan_distribution.length > 0 ? (
                  stats.plan_distribution.slice(0, 2).map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 truncate mr-2 font-medium">{p.plan}</span>
                      <span className="font-bold text-slate-800">{p.count}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No data</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Support Tickets</span>
            <span className="text-xl font-extrabold text-purple-700 block mt-1">3 Active Tickets</span>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center border border-purple-100">
            <Ticket size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Trial Institutes</span>
            <span className="text-xl font-extrabold text-blue-600 block mt-1">{loading ? '—' : (stats?.draft_tenants ?? '—')}</span>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Main metrics charts layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Platform Monthly Recurring Revenue (2026)</h3>
              <p className="text-xs text-slate-500 mt-0.5">SaaS subscription MRR trends across all registered institutes.</p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-purple-600/30 border border-purple-200 rounded"></span>
                <span className="text-slate-500">Past Months</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-purple-600 rounded shadow-sm shadow-purple-500/20 animate-pulse"></span>
                <span className="text-slate-800">Current Month</span>
              </div>
            </div>
          </div>

          <div className="flex h-56 pt-6">
            {/* Y-Axis values */}
            <div className="flex flex-col justify-between text-[10px] text-slate-400 font-bold pr-3 border-r border-slate-100 h-[174px] text-right w-12 shrink-0 select-none">
              <span>₹5.0L</span>
              <span>₹4.0L</span>
              <span>₹3.0L</span>
              <span>₹2.0L</span>
              <span>₹1.0L</span>
              <span>₹0</span>
            </div>

            {/* Chart Area with Gridlines */}
            <div className="flex-1 relative h-[174px] flex items-end justify-between gap-1.5 px-3">
              {/* Horizontal Gridlines */}
              <div className="absolute inset-y-0 top-0 h-[174px] flex flex-col justify-between pointer-events-none select-none left-0 right-0">
                {[0, 1, 2, 3, 4, 5].map((_, idx) => (
                  <div key={idx} className="border-b border-slate-100 w-full h-0"></div>
                ))}
              </div>

              {/* Bars */}
              {[
                { m: 'Jan', val: '₹1.80L', h: '36%', isCurrent: false },
                { m: 'Feb', val: '₹2.10L', h: '42%', isCurrent: false },
                { m: 'Mar', val: '₹2.30L', h: '46%', isCurrent: false },
                { m: 'Apr', val: '₹2.60L', h: '52%', isCurrent: false },
                { m: 'May', val: '₹3.10L', h: '62%', isCurrent: false },
                { m: 'Jun', val: '₹3.40L', h: '68%', isCurrent: false },
                { m: 'Jul', val: '₹3.80L', h: '76%', isCurrent: false },
                { m: 'Aug', val: '₹4.10L', h: '82%', isCurrent: true },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  {/* Actual Bar */}
                  <div 
                    className={`w-full rounded-t-md transition-all duration-200 cursor-pointer relative ${
                      bar.isCurrent 
                        ? 'bg-purple-600 shadow-lg shadow-purple-500/20 hover:bg-purple-700' 
                        : 'bg-purple-600/30 hover:bg-purple-600/60'
                    }`} 
                    style={{ height: bar.h }}
                  >
                    {/* Tooltip above bar on hover/active */}
                    <div className="absolute -translate-y-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-10 pointer-events-none">
                      {bar.val}
                    </div>
                  </div>
                  
                  {/* Month Label */}
                  <span className={`text-[9px] font-bold select-none mt-1 ${bar.isCurrent ? 'text-purple-700 font-extrabold scale-110' : 'text-slate-400'}`}>
                    {bar.m}
                  </span>
                </div>
              ))}
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
                <tr 
                  key={idx} 
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
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
      {selectedLog && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedLog(null)} 
          title="Audit Log Entry Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 block uppercase">Log Entry ID</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.id}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Timestamp</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.timestamp}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Actor / Operator</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedLog.actor}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Operator Role</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.role}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Action Identifier</span>
                <span className="font-mono text-blue-600 font-bold mt-0.5 block">{selectedLog.action}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Origin IP Address</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{selectedLog.ipAddress || '192.168.1.1'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-400 block uppercase">Institute / Tenant</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedLog.institute || 'System / Platform'}</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-400 block uppercase">Operation Details</span>
              <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1 leading-relaxed whitespace-pre-wrap">{selectedLog.details}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedLog(null)}>Close View</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
