import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Eye, Search, Loader2, RotateCcw, Copy, Code, FileText } from 'lucide-react';
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

const ITEMS_PER_PAGE = 10;

export const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
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
  const [editCategory, setEditCategory] = useState<string>('General');
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
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
        category: filterCategory === 'ALL' ? '' : filterCategory,
        status: filterStatus === 'ALL' ? '' : filterStatus,
      });
      setTemplates(result.data || []);
      setTotalItems(result.pagination?.total || 0);
      if (result.categories && Array.isArray(result.categories)) {
        setCategoriesList(result.categories);
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
  }, [currentPage, searchQuery, filterCategory, filterStatus]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
              <p className="text-base text-slate-500 mt-2">
                Manage system and transactional email layouts used across authentication, billing, and onboarding.
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
                    setSearchQuery(e.target.value);
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
              <Table headers={['ID', 'Name', 'Key', 'Subject', 'Category', 'Status', 'Actions']} dense>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => openEditor(template)}
                  >
                    <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{template.id}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900 text-base min-w-[180px]">
                      <div>{template.name}</div>
                      {template.description && (
                        <div className="text-xs text-slate-500 font-normal mt-0.5 max-w-xs truncate">{template.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap font-mono">{template.template_key}</td>
                    <td className="px-3 py-3 text-sm text-slate-600 max-w-xs truncate">{template.subject}</td>
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
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowPreview(true);
                          }}
                          className="text-sm font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer transition flex items-center gap-1"
                        >
                          <Eye size={15} /> Preview
                        </button>
                        <button
                          onClick={() => openEditor(template)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition"
                        >
                          Edit
                        </button>
                      </div>
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
                <Input label="Template Name *" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Password Reset" required />
                <Input label="Template Key *" value={editTemplateKey} onChange={(e) => setEditTemplateKey(e.target.value)} placeholder="e.g. AUTH_PASSWORD_RESET" required disabled={!selectedTemplate?._isNew} />
                <Select
                  label="Category *"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  options={categoriesList.map((c) => ({ value: c, label: c }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Subject Line *" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="e.g. Reset your password for {{platform_name}}" required />
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

      {/* DYNAMIC PREVIEW MODAL */}
      {showPreview && (
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={`Preview: ${view === 'editor' ? editName : selectedTemplate?.name}`}
          description={`Subject: ${renderDynamicPreview(view === 'editor' ? editSubject : selectedTemplate?.subject || '', selectedTemplate)}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setPreviewTab('html')}
                className={`px-4 py-2 text-xs font-bold border-b-2 ${previewTab === 'html' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
              >
                HTML Render
              </button>
              <button
                onClick={() => setPreviewTab('text')}
                className={`px-4 py-2 text-xs font-bold border-b-2 ${previewTab === 'text' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
              >
                Text Fallback
              </button>
            </div>

            {previewTab === 'html' ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white p-4 min-h-[300px]">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderDynamicPreview(view === 'editor' ? editHtmlBody : selectedTemplate?.html_body || '', selectedTemplate)
                  }}
                />
              </div>
            ) : (
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap min-h-[200px]">
                {renderDynamicPreview(view === 'editor' ? editTextBody : selectedTemplate?.text_body || '', selectedTemplate)}
              </pre>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button onClick={() => setShowPreview(false)} variant="secondary" className="text-xs font-bold">
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
