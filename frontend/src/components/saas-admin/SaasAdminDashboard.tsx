import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2, DollarSign, ShieldAlert, CheckCircle, Clock, Ticket, AlertOctagon, Loader2, Layers, Award, TrendingUp, CreditCard, Banknote, Wallet } from 'lucide-react';
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
  mrr_trend?: { m: string; val: string; raw_val: number; h: string; isCurrent: boolean }[];
}

interface BillingSummary {
  total_revenue: number;
  net_revenue: number;
  outstanding: number;
  refunded: number;
  paid_count: number;
  outstanding_count: number;
  mrr: number;
  arr: number;
}

interface RevenueTrendItem {
  m: string;
  val: string;
  raw_val: number;
  h: string;
  isCurrent: boolean;
}

export const SaasAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SaasStats | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formatINR = (n: number) => {
    const val = Math.round(n);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard/saas-stats');
        if (data.status === 'success') setStats(data.data);
        const { data: billingData } = await api.get('/admin/billing/summary');
        if (billingData.status === 'success') setBilling(billingData.data);
        const { data: revenueData } = await api.get('/admin/dashboard/saas-revenue');
        if (revenueData.status === 'success') {
          const trend = (revenueData.data.revenue_trend || []).map((t: any) => ({
            ...t,
            // Ensure raw_val is always a plain JavaScript Number, never a string
            raw_val: Number(t.raw_val) || 0,
          }));
          setRevenueTrend(trend);
        }
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
            <span className="text-xl font-extrabold text-emerald-700 block mt-1">
              {loading ? <Loader2 size={20} className="animate-spin text-slate-300" /> : `${formatINR(billing?.mrr || 0)} / ${formatINR(billing?.arr || 0)}`}
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-100">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Support Tickets</span>
            <span className="text-xl font-extrabold text-purple-700 block mt-1">0 Active Tickets</span>
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

      {/* Section — Finance Metrics (from saas_invoices table only) */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 text-sm px-1">Revenue & Finance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={loading ? '—' : formatINR(billing?.total_revenue || 0)}
            color="text-emerald-600"
            icon={Banknote}
            bg="bg-emerald-50"
            border="border border-emerald-100"
          />
          <StatCard
            label="Net Revenue (Ex-GST)"
            value={loading ? '—' : formatINR(billing?.net_revenue || 0)}
            color="text-blue-600"
            icon={Wallet}
            bg="bg-blue-50"
            border="border border-blue-100"
          />
          <StatCard
            label="Outstanding"
            value={loading ? '—' : formatINR(billing?.outstanding || 0)}
            color="text-amber-600"
            icon={AlertOctagon}
            bg="bg-amber-50"
            border="border border-amber-100"
          />
          <StatCard
            label="MRR (Current Period)"
            value={loading ? '—' : formatINR(billing?.mrr || 0)}
            color="text-emerald-700"
            icon={TrendingUp}
            bg="bg-emerald-50"
            border="border border-emerald-100"
          />
        </div>
      </div>

      {/* Main metrics charts layout */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Platform Revenue Trend ({new Date().getFullYear()})</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cumulative SaaS subscription revenue from paid invoices across all institutes.</p>
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

          <div className="w-full h-72 pt-4">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueTrend.map(t => ({ month: t.m, revenue: t.raw_val, isCurrent: t.isCurrent }))}
                  margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(value: number) => {
                      if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                      return `₹${value.toLocaleString('en-IN')}`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600 }}
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenueTrend.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.isCurrent ? '#7c3aed' : '#c4b5fd'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

    </div>
  );
};
