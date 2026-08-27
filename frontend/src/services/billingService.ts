import api from './api';

const mapInvoiceToFrontend = (row: any) => {
  return {
    id: row.invoice_number || row.id,
    tenantName: row.tenant_name || 'Unknown',
    amount: parseFloat(row.amount) || 0,
    tax: parseFloat(row.tax_amount) || 0,
    date: row.created_at ? row.created_at.substring(0, 10) : '',
    dueDate: row.due_date ? row.due_date.substring(0, 10) : '',
    status: row.status 
      ? (row.status.charAt(0).toUpperCase() + row.status.slice(1)) as any
      : 'Unpaid'
  };
};

export const billingService = {
  getInvoices: async (page = 1, limit = 50, search = '', status = 'All') => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);

    const { data } = await api.get(`/admin/billing/invoices?${params.toString()}`);
    if (data && data.data && Array.isArray(data.data.data)) {
      // Return just the mapped array to match what BillingRevenue component expects as data payload
      data.data = data.data.data.map(mapInvoiceToFrontend);
    }
    return data;
  },

  getBillingSummary: async () => {
    const { data } = await api.get('/admin/billing/summary');
    return data;
  }
};
