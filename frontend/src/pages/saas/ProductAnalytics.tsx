import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';

interface ModuleMetric {
  moduleName: string;
  category: string;
  utilizationRate: number;
  status: 'High Adoption' | 'Moderate' | 'Low Utilization';
  events?: number;
  activeTenants?: number;
  activeUsers?: number;
  totalTenants?: number;
  lastActivity?: string | null;
}

// Mock per-tenant data
const TENANT_STORAGE: Record<string, { used: number; limit: number }> = {
  'VS-001': { used: 18.4, limit: 50 },
  'VS-002': { used: 9.2, limit: 20 },
  'VS-003': { used: 7.2, limit: 100 },
};
const TENANT_BRANCHES: Record<string, { count: number; limit: number }> = {
  'VS-001': { count: 3, limit: 10 },
  'VS-002': { count: 1, limit: 5 },
  'VS-003': { count: 2, limit: 5 },
};
const TENANT_USERS: Record<string, { active: number; total: number }> = {
  'VS-001': { active: 512, total: 620 },
  'VS-002': { active: 248, total: 300 },
  'VS-003': { active: 132, total: 180 },
};

const TOTAL_PLATFORM_GB = 200;

const getBarColor = (pct: number) => {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-blue-600';
};

const getUsageBadge = (pct: number) => {
  if (pct >= 80) return { label: 'Critical', cls: 'bg-red-50 text-red-700' };
  if (pct >= 60) return { label: 'High Usage', cls: 'bg-amber-50 text-amber-700' };
  if (pct >= 30) return { label: 'Moderate', cls: 'bg-blue-50 text-blue-700' };
  return { label: 'Low', cls: 'bg-emerald-50 text-emerald-700' };
};

type FilterVal = 'all' | 'high' | 'low';

const FilterChips: React.FC<{ value: FilterVal; onChange: (v: FilterVal) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
    <span className="text-slate-400 flex items-center gap-1"><Filter size={11} /> Filter:</span>
    {(['all', 'high', 'low'] as FilterVal[]).map(f => (
      <button
        key={f}
        type="button"
        onClick={() => onChange(f)}
        className={`px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
          value === f
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        {f === 'all' ? 'All' : f === 'high' ? '≥ 60%' : '< 30%'}
      </button>
    ))}
  </div>
);

const TenantRow: React.FC<{
  id: string | number; name: string; status: string | number;
  value: number; max: number; unit: string; decimals?: number;
  isUnlimited?: boolean;
}> = ({ id, name, status, value, max, unit, decimals = 0, isUnlimited = false }) => {
  const pct = isUnlimited ? Math.min((value / max) * 100, 100) : (max > 0 ? Math.min((value / max) * 100, 100) : 0);
  const badge = isUnlimited ? { label: 'Unlimited', cls: 'bg-indigo-50 text-indigo-700' } : getUsageBadge(pct);
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const isActive = status === 'Active' || status === 1 || status === '1' || status === 'active';
  return (
    <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
        {initials}
      </div>
      <div className="min-w-[130px]">
        <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
        <div className="text-[10px] text-slate-400 font-mono">{id}</div>
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getBarColor(pct)}`}
            style={{ width: `${pct.toFixed(1)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
          <span>{decimals > 0 ? value.toFixed(decimals) : value} {unit}</span>
          <span>{isUnlimited ? 'Unlimited plan' : `${max} ${unit} limit`}</span>
        </div>
      </div>
      <div className="text-sm font-bold text-slate-700 w-10 text-right flex-shrink-0">{pct.toFixed(0)}%</div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
        isActive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'
      }`}>{isActive ? 'Active' : 'Inactive'}</span>
    </div>
  );
};

interface TenantBranchMetric {
  tenantId: number;
  tenantName: string;
  tenantStatus: number | string;
  count: number;
  limit: number;
  isUnlimited?: boolean;
}

interface TenantUserMetric {
  tenantId: number;
  tenantName: string;
  tenantStatus: number | string;
  active: number;
  total: number;
  limit: number;
  isUnlimited?: boolean;
}

interface ProductAnalyticsData {
  branches: {
    totalBranches: number;
    growthRate: number;
    tenants: TenantBranchMetric[];
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    slaMetPercentage: number;
    tenants: TenantUserMetric[];
  };
}

export const ProductAnalytics: React.FC = () => {
  const { tenants } = useApp();

  const [analytics, setAnalytics] = useState<ProductAnalyticsData | null>(null);
  const [_isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/admin/product-analytics/overview');
        if (res.data?.status === 'success' && isMounted) {
          setAnalytics(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load product analytics from database:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, []);

  const [usageMetrics, setUsageMetrics] = useState<ModuleMetric[]>([]);
  const [usageLoading, setUsageLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'total'>('month');
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [tenantsList, setTenantsList] = useState<{ id: number; name: string }[]>([]);

  // Fetch live module usage from audit logs (with optional timeRange and tenant filter)
  useEffect(() => {
    let isMounted = true;
    const fetchUsage = async () => {
      try {
        setUsageLoading(true);
        const res = await api.get(`/admin/product-analytics/module-usage?timeRange=${timeRange}&tenantId=${selectedTenant}`);
        if (res.data?.status === 'success' && isMounted) {
          setUsageMetrics(res.data.data.modules || []);
          if (res.data.data.tenantsList) {
            setTenantsList(res.data.data.tenantsList);
          }
        }
      } catch (err) {
        console.error('Failed to load module usage analytics:', err);
      } finally {
        if (isMounted) setUsageLoading(false);
      }
    };
    fetchUsage();
    return () => { isMounted = false; };
  }, [timeRange, selectedTenant]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(usageMetrics.length / itemsPerPage));
  const paginatedMetrics = usageMetrics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusColors: Record<string, string> = {
    'High Adoption': 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    Moderate: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    'Low Utilization': 'bg-slate-100 text-slate-600 border border-slate-200'
  };

  // Expanded state for each card
  const [branchOpen, setBranchOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  // Filter state for each card
  const [branchFilter, setBranchFilter] = useState<FilterVal>('all');
  const [storageFilter, setStorageFilter] = useState<FilterVal>('all');
  const [usersFilter, setUsersFilter] = useState<FilterVal>('all');

  // Build rows dynamically from DB analytics when available, with fallback
  const branchRows = analytics?.branches?.tenants
    ? analytics.branches.tenants.map(t => ({
        id: `VS-${String(t.tenantId).padStart(3, '0')}`,
        name: t.tenantName,
        status: t.tenantStatus,
        count: t.count,
        limit: t.limit,
        isUnlimited: t.isUnlimited,
      }))
    : tenants.map(t => ({
        ...t,
        count: TENANT_BRANCHES[t.id]?.count ?? 1,
        limit: TENANT_BRANCHES[t.id]?.limit ?? 5,
        isUnlimited: false,
      }));

  // Storage rows stay unchanged
  const storageRows = tenants.map(t => ({
    ...t,
    used: TENANT_STORAGE[t.id]?.used ?? 3,
    limit: TENANT_STORAGE[t.id]?.limit ?? 20,
  }));

  const userRows = analytics?.users?.tenants
    ? analytics.users.tenants.map(t => ({
        id: `VS-${String(t.tenantId).padStart(3, '0')}`,
        name: t.tenantName,
        status: t.tenantStatus,
        active: t.active,
        total: t.total,
        limit: t.limit,
        isUnlimited: t.isUnlimited,
      }))
    : tenants.map(t => ({
        ...t,
        active: TENANT_USERS[t.id]?.active ?? 50,
        total: TENANT_USERS[t.id]?.total ?? 100,
        limit: TENANT_USERS[t.id]?.total ?? 100,
        isUnlimited: false,
      }));

  const applyFilter = (rows: { count?: number; used?: number; active?: number; limit?: number; total?: number }[], filter: FilterVal, valueKey: string, limitKey: string) =>
    rows.filter(r => {
      const v = (r as any)[valueKey] as number;
      const l = (r as any)[limitKey] as number;
      const pct = l > 0 ? v / l : 0;
      if (filter === 'high') return pct >= 0.6;
      if (filter === 'low') return pct < 0.3;
      return true;
    });

  const totalBranches = analytics?.branches?.totalBranches ?? branchRows.reduce((a, r) => a + r.count, 0);
  const totalUsedGB = storageRows.reduce((a, r) => a + r.used, 0);
  const totalPlatformUsers = analytics?.users?.totalUsers ?? userRows.reduce((a, r) => a + r.total, 0);
  const totalActiveUsers = analytics?.users?.activeUsers ?? userRows.reduce((a, r) => a + r.active, 0);
  const branchGrowthRate = analytics?.branches?.growthRate ?? 8.3;
  const userSla = analytics?.users?.slaMetPercentage ?? 99.98;

  const filteredBranchRows = applyFilter(branchRows, branchFilter, 'count', 'limit') as typeof branchRows;
  const filteredStorageRows = applyFilter(storageRows, storageFilter, 'used', 'limit') as typeof storageRows;
  const filteredUserRows = applyFilter(userRows, usersFilter, 'active', 'total') as typeof userRows;

  const ExpandToggle: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => (
    <button
      onClick={onClick}
      type="button"
      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer mt-1"
    >
      {open ? <><ChevronUp size={13} /> Hide breakdown</> : <><ChevronDown size={13} /> View per-tenant</>}
    </button>
  );

  const EmptyBreakdown = () => (
    <div className="px-5 py-6 text-center text-sm text-slate-400">No tenants match this filter.</div>
  );

  const BreakdownFooter: React.FC<{ label: string; value: string; total: string }> = ({ label, value, total }) => (
    <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between text-xs font-semibold text-slate-600">
      <span>{label}</span>
      <span className="font-bold text-slate-900">{value} / {total}</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 w-full animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">Product Usage & Adoption Analytics</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review core telemetry metrics, database utilization rates, storage quotas and feature adoptions across all active customer portfolios.
        </p>
      </div>

      {/* Stat cards — each expandable with per-tenant breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* --- Active Branches Card --- */}
        <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${branchOpen ? 'md:col-span-3' : ''}`}>
          <div className="p-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Branches Registered</span>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <span className="text-3xl font-extrabold text-slate-900 block">{totalBranches} Branches</span>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <span>↑ {branchGrowthRate}% growth rate</span>
                  <span className="text-slate-400 font-normal">this month</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {branchOpen && <FilterChips value={branchFilter} onChange={setBranchFilter} />}
                <ExpandToggle open={branchOpen} onClick={() => setBranchOpen(o => !o)} />
              </div>
            </div>
          </div>
          {branchOpen && (
            <div className="border-t border-slate-100">
              <div className="divide-y divide-slate-100">
                {filteredBranchRows.length === 0 ? <EmptyBreakdown /> : filteredBranchRows.map(r => (
                  <TenantRow key={r.id} id={r.id} name={r.name} status={r.status}
                    value={r.count} max={r.limit} unit="branches" isUnlimited={r.isUnlimited} />
                ))}
              </div>
              <BreakdownFooter label="Total Branches" value={`${totalBranches}`} total={`${totalBranches} registered`} />
            </div>
          )}
        </div>

        {/* --- Global Storage Card --- */}
        <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${storageOpen ? 'md:col-span-3' : ''}`}>
          <div className="p-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Global SaaS Cloud Storage Load</span>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <span className="text-3xl font-extrabold text-slate-900 block">{totalUsedGB.toFixed(1)} GB / {TOTAL_PLATFORM_GB} GB</span>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 min-w-[100px]">
                    <div
                      className={`h-1.5 rounded-full ${getBarColor((totalUsedGB / TOTAL_PLATFORM_GB) * 100)}`}
                      style={{ width: `${Math.min((totalUsedGB / TOTAL_PLATFORM_GB) * 100, 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap">{((totalUsedGB / TOTAL_PLATFORM_GB) * 100).toFixed(1)}% capacity</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {storageOpen && <FilterChips value={storageFilter} onChange={setStorageFilter} />}
                <ExpandToggle open={storageOpen} onClick={() => setStorageOpen(o => !o)} />
              </div>
            </div>
          </div>
          {storageOpen && (
            <div className="border-t border-slate-100">
              <div className="divide-y divide-slate-100">
                {filteredStorageRows.length === 0 ? <EmptyBreakdown /> : filteredStorageRows.map(r => (
                  <TenantRow key={r.id} id={r.id} name={r.name} status={r.status}
                    value={r.used} max={r.limit} unit="GB" decimals={1} />
                ))}
              </div>
              <BreakdownFooter label="Total Storage Used" value={`${totalUsedGB.toFixed(1)} GB`} total={`${TOTAL_PLATFORM_GB} GB`} />
            </div>
          )}
        </div>

        {/* --- Active Users / Concurrency Card --- */}
        <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${usersOpen ? 'md:col-span-3' : ''}`}>
          <div className="p-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Registered Platform Users</span>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <span className="text-3xl font-extrabold text-slate-900 block">{totalPlatformUsers.toLocaleString()} Users</span>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                  <span>● {totalActiveUsers.toLocaleString()} Active Users</span>
                  <span className="text-slate-400 font-normal">({userSla}% SLA met)</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {usersOpen && <FilterChips value={usersFilter} onChange={setUsersFilter} />}
                <ExpandToggle open={usersOpen} onClick={() => setUsersOpen(o => !o)} />
              </div>
            </div>
          </div>
          {usersOpen && (
            <div className="border-t border-slate-100">
              <div className="divide-y divide-slate-100">
                {filteredUserRows.length === 0 ? <EmptyBreakdown /> : filteredUserRows.map(r => (
                  <TenantRow key={r.id} id={r.id} name={r.name} status={r.status}
                    value={r.total} max={r.limit} unit="users" isUnlimited={r.isUnlimited} />
                ))}
              </div>
              <BreakdownFooter label="Total Users Across Tenants" value={`${totalPlatformUsers.toLocaleString()}`} total={`${totalPlatformUsers.toLocaleString()} registered`} />
            </div>
          )}
        </div>

      </div>

      {/* Feature/Module adoption table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Module Adoption & Operational Usage</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live data modifications recorded from audit activity {selectedTenant !== 'all' ? 'for the selected tenant academy' : 'across all tenant academies'}.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Tenant Selector Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Tenant:</span>
              <select
                value={selectedTenant}
                onChange={e => {
                  setSelectedTenant(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="all">All Tenants (Platform-Wide)</option>
                {tenantsList.map(t => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeline Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {[
                { label: 'Last Month', val: 'month' as const },
                { label: 'Last Year', val: 'year' as const },
                { label: 'Total (All-Time)', val: 'total' as const },
              ].map(p => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    setTimeRange(p.val);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    timeRange === p.val
                      ? 'bg-white text-blue-600 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Module Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions / Events</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Utilization Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Adoption Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {usageLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-medium animate-pulse">Aggregating live module usage from audit trail...</p>
                  </td>
                </tr>
              ) : usageMetrics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-medium">No activity recorded yet for this selection.</p>
                  </td>
                </tr>
              ) : (
                paginatedMetrics.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 leading-relaxed whitespace-nowrap">
                      {item.moduleName}
                    </td>
                    <td className="px-6 py-4 text-slate-500 leading-relaxed whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-600">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 leading-relaxed whitespace-nowrap font-mono text-xs font-semibold">
                      {(item.events ?? 0).toLocaleString()} actions
                    </td>
                    <td className="px-6 py-4 leading-relaxed whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-full min-w-[80px] max-w-[130px] bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.utilizationRate >= 60 ? 'bg-emerald-500' : item.utilizationRate >= 30 ? 'bg-blue-600' : 'bg-slate-400'
                            }`}
                            style={{ width: `${item.utilizationRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-800 text-xs font-mono">{item.utilizationRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 leading-relaxed whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={usageMetrics.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
