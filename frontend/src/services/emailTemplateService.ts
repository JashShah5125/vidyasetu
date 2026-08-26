import api from './api';

interface EmailTemplateRow {
  id: number;
  tenant_id: number;
  template_key: string;
  name: string;
  description: string | null;
  category: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: Record<string, string> | string | null;
  status: string;
  is_system: number | boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const mapTemplateToFrontend = (row: EmailTemplateRow) => {
  let variables: Record<string, string> | null = null;
  if (row.variables) {
    if (typeof row.variables === 'string') {
      try { variables = JSON.parse(row.variables); } catch { variables = null; }
    } else {
      variables = row.variables;
    }
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    template_key: row.template_key,
    name: row.name,
    description: row.description,
    category: row.category as 'AUTHENTICATION' | 'ONBOARDING' | 'TENANT' | 'SUBSCRIPTION',
    subject: row.subject,
    html_body: row.html_body,
    text_body: row.text_body,
    variables,
    status: row.status as 'ACTIVE' | 'INACTIVE',
    is_system: row.is_system === 1 || row.is_system === true,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
};

export interface GetTemplatesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export const emailTemplateService = {
  getTemplates: async (params: GetTemplatesParams = {}) => {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = params;
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));
    if (search) queryParams.set('search', search);
    if (category) queryParams.set('category', category);
    if (status) queryParams.set('status', status);

    const { data } = await api.get(`/admin/email-templates?${queryParams.toString()}`);
    const templates = Array.isArray(data?.data) ? data.data.map(mapTemplateToFrontend) : [];

    return {
      data: templates,
      pagination: {
        total: data?.pagination?.total ?? 0,
        page: data?.pagination?.page ?? page,
        limit: data?.pagination?.limit ?? limit,
      },
    };
  },

  getTemplateById: async (id: string) => {
    const { data } = await api.get(`/admin/email-templates/${id}`);
    return { data: mapTemplateToFrontend(data.data) };
  },

  createTemplate: async (templateData: {
    template_key: string;
    name: string;
    category: string;
    subject: string;
    description?: string;
    html_body: string;
    text_body?: string;
    variables?: Record<string, string> | null;
    status?: string;
  }) => {
    const { data } = await api.post('/admin/email-templates', templateData);
    return { data: mapTemplateToFrontend(data.data), message: data.message };
  },

  updateTemplate: async (id: string, templateData: {
    name?: string;
    category?: string;
    subject?: string;
    description?: string;
    html_body?: string;
    text_body?: string;
    variables?: Record<string, string> | null;
  }) => {
    const { data } = await api.put(`/admin/email-templates/${id}`, templateData);
    return { data: mapTemplateToFrontend(data.data), message: data.message };
  },

  updateTemplateStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE') => {
    const { data } = await api.patch(`/admin/email-templates/${id}/status`, { status });
    return { data: mapTemplateToFrontend(data.data), message: data.message };
  },
};
