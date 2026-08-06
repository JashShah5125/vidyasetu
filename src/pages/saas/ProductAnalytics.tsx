import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface ModuleMetric {
  moduleName: string;
  category: string;
  utilizationRate: number;
  status: 'High Adoption' | 'Moderate' | 'Low Utilization';
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
const TOTAL_PLATFORM_BRANCHES = 50;
const TOTAL_PLATFORM_USERS = 1500;

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
  id: string; name: string; status: string;
  value: number; max: number; unit: string; decimals?: number;
}> = ({ id, name, status, value, max, unit, decimals = 0 }) => {
  const pct = Math.min((value / max) * 100, 100);
  const badge = getUsageBadge(pct);
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
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
          <span>{max} {unit} limit</span>
        </div>
      </div>
      <div className="text-sm font-bold text-slate-700 w-10 text-right flex-shrink-0">{pct.toFixed(0)}%</div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
        status === 'Active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'
      }`}>{status}</span>
    </div>
  );
};

export const ProductAnalytics: React.FC = () => {
  const { tenants } = useApp();

  const usageMetrics: ModuleMetric[] = [
    { moduleName: 'Attendance Manager & Registers', category: 'Core ERP', utilizationRate: 98, status: 'High Adoption' },
    { moduleName: 'Online Fees Checkout & Ledgers', category: 'Finance', utilizationRate: 85, status: 'High Adoption' },
    { moduleName: 'Leads CRM Pipeline', category: 'CRM', utilizationRate: 72, status: 'Moderate' },
    { moduleName: 'Assignments & Doubt Hub', category: 'Academic', utilizationRate: 40, status: 'Moderate' },
    { moduleName: 'Legacy SMS Broadcast System', category: 'Communication', utilizationRate: 15, status: 'Low Utilization' }
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(usageMetrics.length / itemsPerPage);
  const paginatedMetrics = usageMetrics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusColors = {
    'High Adoption': 'bg-emerald-50 text-emerald-700',
    Moderate: 'bg-blue-50 text-blue-700',
    'Low Utilization': 'bg-red-50 text-red-700'
  };

  // Expanded state for each card
  const [branchOpen, setBranchOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  // Filter state for each card
  const [branchFilter, setBranchFilter] = useState<FilterVal>('all');
  const [storageFilter, setStorageFilter] = useState<FilterVal>('all');
  const [usersFilter, setUsersFilter] = useState<FilterVal>('all');

  // Build rows
  const branchRows = tenants.map(t => ({
    ...t,
    count: TENANT_BRANCHES[t.id]?.count ?? 1,
    limit: TENANT_BRANCHES[t.id]?.limit ?? 5,
  }));
  const storageRows = tenants.map(t => ({
    ...t,
    used: TENANT_STORAGE[t.id]?.used ?? 3,
    limit: TENANT_STORAGE[t.id]?.limit ?? 20,
  }));
  const userRows = tenants.map(t => ({
    ...t,
    active: TENANT_USERS[t.id]?.active ?? 50,
    total: TENANT_USERS[t.id]?.total ?? 100,
  }));

  const applyFilter = (rows: { count?: number; used?: number; active?: number; limit?: number; total?: number }[], filter: FilterVal, valueKey: string, limitKey: string) =>
    rows.filter(r => {
      const v = (r as any)[valueKey] as number;
      const l = (r as any)[limitKey] as number;
      const pct = v / l;
      if (filter === 'high') return pct >= 0.6;
      if (filter === 'low') return pct < 0.3;
      return true;
    });

  const totalBranches = branchRows.reduce((a, r) => a + r.count, 0);
  const totalUsedGB = storageRows.reduce((a, r) => a + r.used, 0);
  const totalActiveUsers = userRows.reduce((a, r) => a + r.active, 0);

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
    <div className="space-y-6">
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
            <div className="flex items-end justify-between gap-2 flex-wrap">
              <div className="space-y-1.5 w-full">
                <span className="text-3xl font-extrabold text-slate-900 block">{totalBranches} Branches</span>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <span>↑ 8.3% growth rate</span>
                  <span className="text-slate-400 font-normal">this month</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
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
                    value={r.count} max={r.limit} unit="branches" />
                ))}
              </div>
              <BreakdownFooter label="Total Branches" value={`${totalBranches}`} total={`${TOTAL_PLATFORM_BRANCHES} capacity`} />
            </div>
          )}
        </div>

        {/* --- Global Storage Card --- */}
        <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${storageOpen ? 'md:col-span-3' : ''}`}>
          <div className="p-5 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Global SaaS Cloud Storage Load</span>
            <div className="flex items-end justify-between gap-2 flex-wrap">
              <div className="space-y-1.5 w-full">
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
              <div className="flex flex-col items-end gap-1">
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Peak Active Concurrency Load</span>
            <div className="flex items-end justify-between gap-2 flex-wrap">
              <div className="space-y-1.5 w-full">
                <span className="text-3xl font-extrabold text-slate-900 block">{totalActiveUsers.toLocaleString()} Active Users</span>
                <div className="text-xs text-emerald-600 font-semibold">
                  <span>● 99.98% Service Level Agreement met</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
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
                    value={r.active} max={r.total} unit="users" />
                ))}
              </div>
              <BreakdownFooter label="Total Active Users" value={`${totalActiveUsers.toLocaleString()}`} total={`${TOTAL_PLATFORM_USERS.toLocaleString()} capacity`} />
            </div>
          )}
        </div>

      </div>

      {/* Feature/Module adoption table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Feature & Module Adoption Telemetry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Module Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Feature Group</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usage Index Rate</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Adoption Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {paginatedMetrics.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.moduleName}</td>
                  <td className="px-6 py-4 text-slate-500">{item.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-full max-w-[150px] bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.utilizationRate}%` }} />
                      </div>
                      <span className="font-bold text-slate-700 text-xs">{item.utilizationRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 select-none">
            <div>Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, usageMetrics.length)}</span> to <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, usageMetrics.length)}</span> of <span className="font-bold">{usageMetrics.length}</span> modules</div>
            <div className="flex gap-1">
              <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} type="button" onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${currentPage === i + 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  {i + 1}
                </button>
              ))}
              <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
