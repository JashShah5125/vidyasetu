import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Eye, Search, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { emailTemplateService } from '../../services/emailTemplateService';
import { CATEGORY_LABELS, type EmailTemplate } from '../../data/emailTemplatesMock';

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'AUTHENTICATION', label: 'Authentication' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const CATEGORY_BADGE: Record<string, string> = {
  AUTHENTICATION: 'bg-blue-50 text-blue-700 border-blue-200',
  ONBOARDING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TENANT: 'bg-amber-50 text-amber-700 border-amber-200',
  SUBSCRIPTION: 'bg-purple-50 text-purple-700 border-purple-200',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

const PREVIEW_SAMPLE_DATA: Record<string, string> = {
  platform_name: 'Vidya Setu',
  user_name: 'Rahul Sharma',
  username: 'rahul.sharma',
  temporary_password: 'Temp@1234',
  login_url: 'https://vidyasetu.popopower.com/login',
  support_email: 'support@vidyasetu.com',
  verification_link: 'https://vidyasetu.popopower.com/verify?token=abc123',
  expiry_time: '2026-09-01 23:59:59',
  reset_link: 'https://vidyasetu.popopower.com/reset?token=xyz789',
  changed_at: '2026-08-26 14:30:00',
  student_name: 'Priya Patel',
  institute_name: 'Delhi Public School',
  student_id: 'STU-2026-0451',
  course_name: 'Science',
  program_name: 'Senior Secondary',
  batch_name: 'Batch A-2026',
  parent_name: 'Anita Patel',
  staff_name: 'Vikram Singh',
  teacher_name: 'Meena Gupta',
  admin_name: 'Rajesh Kumar',
  tenant_id: 'TEN-001',
  suspension_reason: 'Subscription expired',
  plan_name: 'Professional',
  start_date: '2026-08-01',
  end_date: '2027-07-31',
  expiry_date: '2026-09-30',
};

const ITEMS_PER_PAGE = 10;

export const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<(EmailTemplate & { _isNew?: boolean }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<'html' | 'text'>('html');
  const [toast, setToast] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const [editName, setEditName] = useState('');
  const [editTemplateKey, setEditTemplateKey] = useState('');
  const [editCategory, setEditCategory] = useState<EmailTemplate['category']>('AUTHENTICATION');
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editHtmlBody, setEditHtmlBody] = useState('');
  const [editTextBody, setEditTextBody] = useState('');

  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        setErrorMsg('');
        const result = await emailTemplateService.getTemplates({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchQuery,
          category: filterCategory === 'ALL' ? '' : filterCategory,
          status: filterStatus === 'ALL' ? '' : filterStatus,
        });
        setTemplates(result.data);
        setTotalItems(result.pagination.total);
      } catch (err: any) {
        console.error('Failed to fetch email templates:', err);
        setErrorMsg(err.response?.data?.message || 'Failed to load email templates.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, [currentPage, searchQuery, filterCategory, filterStatus]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const openEditor = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditName(template.name);
    setEditTemplateKey(template.template_key);
    setEditCategory(template.category);
    setEditSubject(template.subject);
    setEditDescription(template.description || '');
    setEditStatus(template.status);
    setEditHtmlBody(template.html_body);
    setEditTextBody(template.text_body || '');
    setView('editor');
  };

  const openCreateEditor = () => {
    setSelectedTemplate({
      id: 0,
      tenant_id: 0,
      template_key: '',
      name: '',
      description: '',
      category: 'AUTHENTICATION',
      subject: '',
      html_body: '',
      text_body: '',
      variables: null,
      status: 'ACTIVE',
      is_system: false,
      created_by: null,
      updated_by: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
      _isNew: true,
    });
    setEditName('');
    setEditTemplateKey('');
    setEditCategory('AUTHENTICATION');
    setEditSubject('');
    setEditDescription('');
    setEditStatus('ACTIVE');
    setEditHtmlBody('');
    setEditTextBody('');
    setView('editor');
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setErrorMsg('');

    if (selectedTemplate._isNew && !editTemplateKey.trim()) {
      setErrorMsg('Template key is required for new templates.');
      return;
    }

    try {
      setIsLoading(true);
      if (selectedTemplate._isNew) {
        await emailTemplateService.createTemplate({
          template_key: editTemplateKey.trim(),
          name: editName,
          category: editCategory,
          subject: editSubject,
          description: editDescription || undefined,
          html_body: editHtmlBody,
          text_body: editTextBody || undefined,
          status: editStatus,
        });
        setToast('Template created successfully!');
      } else {
        await emailTemplateService.updateTemplate(String(selectedTemplate.id), {
          name: editName,
          category: editCategory,
          subject: editSubject,
          description: editDescription || undefined,
          html_body: editHtmlBody,
          text_body: editTextBody || undefined,
        });
        setToast('Template updated successfully!');
      }
      setTimeout(() => setToast(''), 4000);
      setView('list');
      setSelectedTemplate(null);
      fetchCurrentPage();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentPage = async () => {
    try {
      setIsLoading(true);
      const result = await emailTemplateService.getTemplates({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
        category: filterCategory === 'ALL' ? '' : filterCategory,
        status: filterStatus === 'ALL' ? '' : filterStatus,
      });
      setTemplates(result.data);
      setTotalItems(result.pagination.total);
    } catch (err: any) {
      console.error('Failed to fetch email templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (template: EmailTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = template.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await emailTemplateService.updateTemplateStatus(String(template.id), newStatus);
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, status: newStatus } : t)));
      setToast(`Template ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handlePreview = () => {
    setPreviewTab('html');
    setShowPreview(true);
    setTimeout(() => {
      if (previewFrameRef.current) {
        const doc = previewFrameRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(editHtmlBody);
          doc.close();
        }
      }
    }, 100);
  };

  const getPreviewHtml = (): string => {
    let html = editHtmlBody;
    Object.entries(PREVIEW_SAMPLE_DATA).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return html;
  };

  const getPreviewText = (): string => {
    let text = editTextBody || '';
    Object.entries(PREVIEW_SAMPLE_DATA).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return text;
  };

  const showPreviewHtml = () => {
    setTimeout(() => {
      if (previewFrameRef.current) {
        const doc = previewFrameRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(getPreviewHtml());
          doc.close();
        }
      }
    }, 100);
  };

  const isNewTemplate = selectedTemplate?._isNew === true;

  if (view === 'editor' && selectedTemplate) {
    return (
      <div className="space-y-6">
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800 animate-fade-in shadow-sm">
            {errorMsg}
          </div>
        )}
        {toast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
            {toast}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setView('list'); setSelectedTemplate(null); setErrorMsg(''); }}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              {isNewTemplate ? 'Create Template' : selectedTemplate.is_system ? 'Edit System Template' : 'Edit Template'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isNewTemplate
                ? 'Define the new email template below.'
                : selectedTemplate.is_system
                  ? 'System template — template key is read-only. Other fields can be edited.'
                  : 'Modify the template content and settings below.'}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Template Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Account Created"
              required
            />
            {isNewTemplate ? (
              <Input
                label="Template Key"
                value={editTemplateKey}
                onChange={(e) => setEditTemplateKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="e.g. CUSTOM_WELCOME"
                required
              />
            ) : (
              <Input
                label="Template Key"
                value={selectedTemplate.template_key}
                disabled
                wrapperClassName="opacity-70"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as EmailTemplate['category'])}
              options={[
                { value: 'AUTHENTICATION', label: 'Authentication' },
                { value: 'ONBOARDING', label: 'Onboarding' },
                { value: 'TENANT', label: 'Tenant' },
                { value: 'SUBSCRIPTION', label: 'Subscription' },
              ]}
            />
            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>

          <Input
            label="Email Subject"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            placeholder="e.g. Your {{platform_name}} account has been created"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Brief description of when this template is sent..."
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 h-20 resize-none"
            />
          </div>

          {selectedTemplate.variables && Object.keys(selectedTemplate.variables).length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Template Variables</label>
              <p className="text-xs text-slate-400">These placeholders are replaced with real values when the email is sent.</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Variable</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(selectedTemplate.variables).map(([varName, desc]) => (
                      <tr key={varName}>
                        <td className="px-4 py-2.5 text-xs font-mono font-bold text-blue-600">{`{{${varName}}}`}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">HTML Body</label>
            <textarea
              value={editHtmlBody}
              onChange={(e) => setEditHtmlBody(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 h-64 resize-y"
              placeholder="<!DOCTYPE html>..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Plain Text Body</label>
            <textarea
              value={editTextBody}
              onChange={(e) => setEditTextBody(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 h-40 resize-y"
              placeholder="Plain text version of the email..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => { setView('list'); setSelectedTemplate(null); setErrorMsg(''); }}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              <Eye size={14} className="mr-1.5" />
              Preview
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : isNewTemplate ? 'Create Template' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Template Preview" size="4xl">
          <div className="space-y-4">
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
              <button
                onClick={() => { setPreviewTab('html'); setTimeout(showPreviewHtml, 50); }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
                  previewTab === 'html' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                HTML Preview
              </button>
              <button
                onClick={() => setPreviewTab('text')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition ${
                  previewTab === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Plain Text
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {previewTab === 'html' ? (
                <iframe
                  ref={previewFrameRef}
                  title="Email Preview"
                  sandbox=""
                  className="w-full h-[500px]"
                  style={{ border: 'none' }}
                />
              ) : (
                <pre className="p-6 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px]">
                  {getPreviewText()}
                </pre>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              Preview uses sample variable values. No email is sent.
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800 animate-fade-in shadow-sm">
          {errorMsg}
        </div>
      )}
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Email Templates</h2>
          <p className="text-base text-slate-500 mt-2">
            Manage platform email templates that control content for account notifications, onboarding messages, and system alerts.
          </p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm" onClick={openCreateEditor}>
          + Create Template
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm items-end justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
          <div className="relative">
            <Input
              label="Search"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              wrapperClassName="mb-0"
            />
            <Search size={14} className="absolute right-3 top-[38px] text-slate-400 pointer-events-none" />
          </div>
          <Select
            label="Category"
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
        </CardHeader>

        {isLoading && templates.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="mx-auto text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-semibold">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-300 mb-3">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-semibold">No templates found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <Table headers={['ID', 'Name', 'Template Key', 'Category', 'Status', 'Type', 'Actions']} dense>
            {templates.map((template) => (
              <tr
                key={template.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => openEditor(template)}
              >
                <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{template.id}</td>
                <td className="px-3 py-3 font-semibold text-slate-900 text-base min-w-[200px]">
                  <div>{template.name}</div>
                  {template.description && (
                    <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{template.description}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap">{template.template_key}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded border uppercase ${CATEGORY_BADGE[template.category]}`}>
                    {CATEGORY_LABELS[template.category]}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleStatus(template, e)}
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer transition hover:opacity-80 ${STATUS_BADGE[template.status]}`}
                    title={`Click to ${template.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                  >
                    {template.status}
                  </button>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {template.is_system ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      System
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      Custom
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditor(template); }}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}

        {totalItems > ITEMS_PER_PAGE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
};
