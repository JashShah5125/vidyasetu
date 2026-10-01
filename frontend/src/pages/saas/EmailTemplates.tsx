import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Eye,
  Edit3,
  Search,
  Loader2,
  RotateCcw,
  Copy,
  Code,
  FileText,
  Trash2,
  AlertTriangle,
  Monitor,
  Smartphone,
  Mail,
  Check,
  FileCode
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { emailTemplateService } from '../../services/emailTemplateService';
import { type EmailTemplate } from '../../data/emailTemplatesMock';

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

const DEFAULT_CATEGORIES = ['AUTHENTICATION', 'ONBOARDING', 'TENANT', 'SUBSCRIPTION', 'NOTIFICATIONS', 'MARKETING', 'GENERAL'];

const ITEMS_PER_PAGE = 10;

export const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_CATEGORIES);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<(EmailTemplate & { _isNew?: boolean }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<'visual' | 'code' | 'text'>('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const [editName, setEditName] = useState('');
  const [editTemplateKey, setEditTemplateKey] = useState('');
  const [editCategory, setEditCategory] = useState<string>('GENERAL');
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editHtmlBody, setEditHtmlBody] = useState('');
  const [editTextBody, setEditTextBody] = useState('');

  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const result = await emailTemplateService.getTemplates({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        category: filterCategory === 'ALL' ? '' : filterCategory,
        status: filterStatus === 'ALL' ? '' : filterStatus,
      });
      setTemplates(result.data || []);
      setTotalItems(result.pagination?.total || 0);
      if (result.categories && Array.isArray(result.categories) && result.categories.length > 0) {
        setCategoriesList(Array.from(new Set([...result.categories, ...DEFAULT_CATEGORIES])));
      } else {
        setCategoriesList(DEFAULT_CATEGORIES);
      }
    } catch (err: any) {
      console.error('Failed to fetch email templates:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load email templates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentPage, pageSize, searchQuery, filterCategory, filterStatus]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterCategory('ALL');
    setFilterStatus('ALL');
    setCurrentPage(1);
  };

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
    const defaultCat = categoriesList.length > 0 ? categoriesList[0] : 'General';
    setSelectedTemplate({
      id: 0,
      tenant_id: 1,
      template_key: '',
      name: '',
      description: '',
      category: defaultCat as any,
      subject: '',
      html_body: '',
      text_body: '',
      variables: null,
      status: 'ACTIVE',
      is_system: false,
      created_by: null,
      updated_by: null,
      _isNew: true,
    });
    setEditName('');
    setEditTemplateKey('');
    setEditCategory(defaultCat);
    setEditSubject('');
    setEditDescription('');
    setEditStatus('ACTIVE');
    setEditHtmlBody('');
    setEditTextBody('');
    setView('editor');
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setErrorMsg('Template Name is required');
      return;
    }
    if (!editTemplateKey.trim()) {
      setErrorMsg('Template Key is required');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');

      // Dynamically extract variables JSON object from html and text body
      const extractedTokens = Array.from(
        new Set([
          ...(editHtmlBody.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []),
          ...(editTextBody.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []),
          ...(editSubject.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [])
        ])
      ).map(t => t.replace(/[{}]/g, ''));

      const variablesMap: Record<string, string> = {};
      extractedTokens.forEach(token => {
        variablesMap[token] = selectedTemplate?.variables?.[token] || token.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      });

      const payload = {
        name: editName,
        template_key: editTemplateKey,
        category: editCategory as any,
        subject: editSubject,
        description: editDescription,
        status: editStatus,
        html_body: editHtmlBody,
        text_body: editTextBody,
        variables: variablesMap,
      };

      if (selectedTemplate?._isNew) {
        await emailTemplateService.createTemplate({ ...payload, tenant_id: 1 });
        setToast('Email template created successfully!');
      } else if (selectedTemplate?.id) {
        await emailTemplateService.updateTemplate(selectedTemplate.id, payload);
        setToast('Email template updated successfully!');
      }

      setView('list');
      fetchTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save template.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (template: EmailTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = template.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await emailTemplateService.updateStatus(template.id, newStatus);
      setToast(`Template ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
      fetchTemplates();
    } catch (err: any) {
      console.error('Failed to update status:', err);
    }
  };

  const handleOpenDelete = (template: EmailTemplate) => {
    setDeletingTemplate(template);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    setDeleting(true);
    try {
      await emailTemplateService.deleteTemplate(deletingTemplate.id);
      setToast('Email template deleted successfully.');
      setShowDeleteModal(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete template.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  // Copy to clipboard helper with status feedback
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Dynamically extract placeholders from currently active template
  const getDynamicPlaceholders = (template: EmailTemplate | null) => {
    if (!template) return [];
    const tokensFromText = [
      ...(template.html_body?.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []),
      ...(template.text_body?.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []),
      ...(template.subject?.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [])
    ].map(t => t.replace(/[{}]/g, ''));

    const tokensFromDbVars = template.variables ? Object.keys(template.variables) : [];
    return Array.from(new Set([...tokensFromDbVars, ...tokensFromText]));
  };

  // Dynamic preview generator replacing placeholders using DB variables map
  const renderDynamicPreview = (text: string, template: EmailTemplate | null) => {
    if (!text) return '';
    let processed = text;
    const dbVars = template?.variables || {};

    const matches = processed.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    matches.forEach((tokenWithBrackets) => {
      const key = tokenWithBrackets.replace(/[{}]/g, '');
      const dynamicVal = dbVars[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      processed = processed.replace(new RegExp(tokenWithBrackets.replace(/[{}]/g, '\\$&'), 'g'), dynamicVal);
    });

    return processed;
  };

  // Build clean, standalone email HTML with isolated typography and email client card styles
  const buildEmailIframeDocument = (htmlContent: string, template: EmailTemplate | null) => {
    const rawContent = htmlContent || '<p style="color:#64748b;font-style:italic;">No HTML content provided.</p>';
    const dynamicHtml = renderDynamicPreview(rawContent, template);

    // Extract body inner content if it already has full HTML wrapper
    let bodyInner = dynamicHtml;
    const hasBodyTag = /<body[\s\S]*<\/body>/i.test(dynamicHtml);
    if (hasBodyTag) {
      const match = dynamicHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (match && match[1]) {
        bodyInner = match[1];
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #f8fafc;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #334155;
      line-height: 1.6;
      padding: 24px 12px;
      -webkit-font-smoothing: antialiased;
    }
    .email-card {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .email-header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      padding: 22px 28px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .email-brand {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.025em;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
    }
    .email-category-pill {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(4px);
      color: #93c5fd;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .email-body-content {
      padding: 32px 28px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 700;
      line-height: 1.35;
      margin-bottom: 16px;
    }
    h1 { font-size: 22px; }
    h2 { font-size: 19px; }
    h3 { font-size: 16px; }
    p {
      margin-bottom: 16px;
      color: #334155;
      font-size: 14.5px;
      line-height: 1.65;
    }
    strong {
      color: #0f172a;
      font-weight: 600;
    }
    a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }
    /* Call to Action Button styling for primary links */
    a[href] {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      padding: 11px 22px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      text-decoration: none !important;
      margin: 12px 0;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
    }
    a[href]:hover {
      background-color: #1d4ed8;
    }
    ul, ol {
      margin-bottom: 16px;
      padding-left: 24px;
      font-size: 14.5px;
      color: #334155;
    }
    li {
      margin-bottom: 6px;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }
    .email-footer-banner {
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      padding: 20px 28px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-header-banner">
      <div class="email-brand">
        <span>✦</span> Vidyasetu
      </div>
      <div class="email-category-pill">
        ${template?.category || 'Notification'}
      </div>
    </div>
    <div class="email-body-content">
      ${bodyInner}
    </div>
    <div class="email-footer-banner">
      <p style="margin-bottom: 4px; font-weight: 600; color: #475569;">© ${new Date().getFullYear()} Vidyasetu Platform</p>
      <p style="margin-bottom: 0; font-size: 11px;">This is an automated system notification sent from Vidyasetu.</p>
    </div>
  </div>
</body>
</html>`;
  };

  const dynamicCategoriesOptions = [
    { value: 'ALL', label: 'All Categories' },
    ...categoriesList.map((c) => ({ value: c, label: c }))
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-800 animate-fade-in shadow-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-900 font-bold">×</button>
        </div>
      )}

      {view === 'list' ? (
        <>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Email Templates</h2>
              <p className="text-sm text-slate-500 mt-1">
                Manage system and transactional email layouts.
              </p>
            </div>
            <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm" onClick={openCreateEditor}>
              + Create Template
            </Button>
          </div>

          {/* Dynamic Filter and Search Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-start w-full">
              <div className="relative">
                <Input
                  label="Search"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
                    setSearchQuery(sanitized);
                    setCurrentPage(1);
                  }}
                  wrapperClassName="mb-0"
                />
                <Search size={14} className="absolute right-3 top-[38px] text-slate-400 pointer-events-none" />
              </div>
              <Select
                label="Category"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                options={dynamicCategoriesOptions}
              />
              <Select
                label="Status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                options={STATUS_OPTIONS}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-transparent select-none opacity-0" aria-hidden="true">Action</span>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 rounded-lg gap-1.5 h-[38px] shrink-0 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  <RotateCcw size={14} />
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>

            {isLoading && templates.length === 0 ? (
              <div className="p-12 text-center">
                <Loader2 size={32} className="mx-auto text-blue-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-semibold">Loading email templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-slate-500 font-semibold">No email templates found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <Table minWidth="860px" headers={['ID', 'Name', 'Subject', 'Category', 'Status', 'Actions']} dense colWidths={['50px', '25%', '30%', '16%', '12%', '110px']}>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => openEditor(template)}
                  >
                    <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{template.id}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {template.name}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap truncate max-w-xs">{template.subject}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${CATEGORY_BADGE[template.category] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {template.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleStatus(template, e)}
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer transition hover:opacity-80 ${STATUS_BADGE[template.status]}`}
                      >
                        {template.status}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowPreview(true);
                          }}
                          title="Preview template"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditor(template)}
                          title="Edit template"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(template)}
                          title="Delete template"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            )}

            {totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 25, 50]}
              />
            )}
          </Card>
        </>
      ) : (
        /* EDITOR VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition cursor-pointer">
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedTemplate?._isNew ? 'Create Email Template' : `Edit: ${editName}`}
                </h2>
                <p className="text-xs text-slate-500">Configure template details, HTML layout, and plain text content.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setShowPreview(true)} className="flex items-center gap-1.5">
                <Eye size={16} /> Preview Template
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={isLoading}>
                {isLoading ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
                Save Changes
              </Button>
            </div>
          </div>

          <Card>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Template Name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Password Reset" required />
                <Input label="Template Key" value={editTemplateKey} onChange={(e) => setEditTemplateKey(e.target.value)} placeholder="e.g. AUTH_PASSWORD_RESET" required disabled={!selectedTemplate?._isNew} />
                <Select
                  label="Category"
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  options={categoriesList.map((c) => ({ value: c, label: c }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Subject Line" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="e.g. Reset your password for {{platform_name}}" required />
                <Select
                  label="Status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </div>

              <Input label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Brief description of when this email is sent" />

              {/* Dynamic Placeholders extracted from DB variables & template text */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-white">Dynamic Placeholders (From Database)</h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {getDynamicPlaceholders(selectedTemplate).map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => setEditHtmlBody((prev) => prev + `{{${token}}}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition cursor-pointer"
                    >
                      <Copy size={11} className="text-slate-400" />
                      {`{{${token}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">HTML Body *</label>
                <textarea
                  rows={12}
                  value={editHtmlBody}
                  onChange={(e) => setEditHtmlBody(e.target.value)}
                  placeholder="Enter HTML email content..."
                  className="w-full font-mono text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Plain Text Body (Optional)</label>
                <textarea
                  rows={5}
                  value={editTextBody}
                  onChange={(e) => setEditTextBody(e.target.value)}
                  placeholder="Enter fallback text content..."
                  className="w-full font-mono text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* DYNAMIC HIGH-FIDELITY PREVIEW MODAL */}
      {showPreview && (
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={`Email Preview: ${view === 'editor' ? editName || 'Untitled Template' : selectedTemplate?.name}`}
          size="4xl"
        >
          <div className="space-y-4">
            {/* Top Metadata Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono bg-slate-200/80 px-2 py-0.5 rounded">
                    {view === 'editor' ? editTemplateKey || 'CUSTOM_KEY' : selectedTemplate?.template_key}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${CATEGORY_BADGE[view === 'editor' ? editCategory : selectedTemplate?.category || 'AUTHENTICATION'] || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {view === 'editor' ? editCategory : selectedTemplate?.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium truncate max-w-xl">
                  <strong>Subject:</strong> {renderDynamicPreview(view === 'editor' ? editSubject : selectedTemplate?.subject || '', selectedTemplate)}
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center bg-slate-200/70 p-1 rounded-lg border border-slate-300/60">
                <button
                  type="button"
                  onClick={() => setPreviewTab('visual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    previewTab === 'visual'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye size={13} />
                  Visual Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('code')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    previewTab === 'code'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCode size={13} />
                  HTML Source
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    previewTab === 'text'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={13} />
                  Plain Text
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            {previewTab === 'visual' && (
              <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-sm bg-white">
                {/* Simulated Email Client Window Chrome */}
                <div className="bg-slate-900 text-slate-200 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-xs text-slate-400 font-medium ml-2 hidden sm:inline-block">Inbox • Vidyasetu Mail Client</span>
                  </div>

                  {/* Device Preview Toggle */}
                  <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                        previewDevice === 'desktop'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Desktop view"
                    >
                      <Monitor size={12} />
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                        previewDevice === 'mobile'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Mobile view"
                    >
                      <Smartphone size={12} />
                      Mobile
                    </button>
                  </div>
                </div>

                {/* Email Client Header Envelope */}
                <div className="bg-slate-50/90 border-b border-slate-200 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        VS
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">Vidyasetu System</span>
                          <span className="text-xs text-slate-400 font-mono">&lt;notifications@vidyasetu.com&gt;</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>To: <strong className="text-slate-700 font-medium">user@example.com</strong></span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap bg-white px-2 py-1 rounded-md border border-slate-200">
                      Today, 10:45 AM
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Mail size={14} className="text-blue-600 shrink-0" />
                      {renderDynamicPreview(view === 'editor' ? editSubject : selectedTemplate?.subject || '', selectedTemplate) || '(No Subject)'}
                    </p>
                  </div>
                </div>

                {/* Email Body Canvas */}
                <div className="bg-slate-100/90 p-4 sm:p-6 flex justify-center items-start min-h-[440px] max-h-[580px] overflow-y-auto">
                  <div
                    className={`transition-all duration-300 w-full ${
                      previewDevice === 'mobile'
                        ? 'max-w-[380px] rounded-2xl shadow-xl border-4 border-slate-800 bg-white overflow-hidden'
                        : 'max-w-2xl'
                    }`}
                  >
                    <iframe
                      title="Email HTML Preview"
                      srcDoc={buildEmailIframeDocument(view === 'editor' ? editHtmlBody : selectedTemplate?.html_body || '', selectedTemplate)}
                      className="w-full min-h-[480px] border-0 rounded-xl bg-transparent"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'code' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw HTML Source Code</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(view === 'editor' ? editHtmlBody : selectedTemplate?.html_body || '', 'html')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'html' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'html' ? 'Copied HTML!' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap min-h-[360px] max-h-[520px] overflow-y-auto border border-slate-800 leading-relaxed select-all">
                  {(view === 'editor' ? editHtmlBody : selectedTemplate?.html_body) || '<!-- No HTML content -->'}
                </pre>
              </div>
            )}

            {previewTab === 'text' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fallback Plain Text Content</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(renderDynamicPreview(view === 'editor' ? editTextBody : selectedTemplate?.text_body || '', selectedTemplate), 'text')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'text' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedField === 'text' ? 'Copied Text!' : 'Copy Text'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-mono whitespace-pre-wrap min-h-[300px] max-h-[480px] overflow-y-auto leading-relaxed select-all">
                  {renderDynamicPreview(view === 'editor' ? editTextBody : selectedTemplate?.text_body || '', selectedTemplate) || '(No plain text fallback provided)'}
                </pre>
              </div>
            )}

            {/* Bottom Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                ✦ Placeholders like <code className="text-blue-600 font-mono">{'{{user_name}}'}</code> are dynamically resolved with live sample data.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(view === 'editor' ? editHtmlBody : selectedTemplate?.html_body || '', 'html_all')}
                  className="text-xs font-semibold gap-1.5"
                >
                  {copiedField === 'html_all' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedField === 'html_all' ? 'Copied HTML!' : 'Copy HTML'}
                </Button>
                <Button onClick={() => setShowPreview(false)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4">
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteModal && deletingTemplate && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Email Template"
          size="md"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Template
              </Button>
            </div>
          }
        >
          <div className="flex items-start gap-3 text-sm">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1 text-slate-600">
              <p className="font-semibold text-slate-800">Are you sure you want to delete this template?</p>
              <p>
                This will soft-delete <strong className="text-slate-900">{deletingTemplate.name}</strong> (key:{' '}
                <span className="font-mono text-blue-600">{deletingTemplate.template_key}</span>). It will no longer appear
                in the template list, but the record is retained for audit.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
