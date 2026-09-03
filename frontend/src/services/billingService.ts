import api from './api';

// Maps a backend saas_invoices row to the shape consumed by the Billing page.
const mapInvoiceToFrontend = (row: any) => {
  const effectiveDate = row.payment_date || row.billing_period_start || row.created_at || '';
  return {
    id: row.invoice_number || String(row.id),
    tenantName: row.tenant_name || 'Unknown',
    planName: row.plan_name || '',
    billingCycle: row.billing_cycle || '',
    amount: parseFloat(row.subtotal ?? row.plan_amount) || 0,
    tax: parseFloat(row.tax_amount) || 0,
    total: parseFloat(row.total_amount) || 0,
    date: effectiveDate ? String(effectiveDate).substring(0, 10) : '',
    dueDate: row.billing_period_end ? String(row.billing_period_end).substring(0, 10) : '',
    paymentMethod: row.payment_method || '',
    status: row.status
      ? (row.status.charAt(0).toUpperCase() + row.status.slice(1)) as any
      : 'Unpaid'
  };
};

export const billingService = {
  getInvoices: async (page = 1, limit = 50, search = '', status = 'All', tenant = 'All', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);
    if (tenant && tenant !== 'All') params.append('tenant', tenant);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const { data } = await api.get(`/admin/billing/invoices?${params.toString()}`);
    if (data && data.data && Array.isArray(data.data)) {
      data.data = data.data.map(mapInvoiceToFrontend);
    }
    return data;
  },

  getBillingSummary: async (year?: string, month?: string, startDate?: string, endDate?: string) => {
    const { data } = await api.get('/admin/billing/summary', { params: { year, month, startDate, endDate } });
    return data;
  },

  getRevenueTrend: async (year?: string, startDate?: string, endDate?: string) => {
    const { data } = await api.get('/admin/billing/revenue-trend', { params: { year, startDate, endDate } });
    return data;
  },

  getRevenueByMethod: async () => {
    const { data } = await api.get('/admin/billing/revenue-by-method');
    return data;
  },

  getRevenueByPlan: async (startDate?: string, endDate?: string) => {
    const { data } = await api.get('/admin/billing/revenue-by-plan', { params: { startDate, endDate } });
    return data;
  }
};
