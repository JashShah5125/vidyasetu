import React, { useState, useEffect, useRef } from 'react';
import { Plus, Eye, Edit3, Trash2, Search, Loader2, Copy, Check, Smartphone, AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { smsTemplateService, type SmsTemplate } from '../../services/smsTemplateService';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DELETED', label: 'Deleted' },
];

const CATEGORY_BADGE: Record<string, string> = {
  'Fee & Billing': 'bg-purple-50 text-purple-700 border-purple-200',
  'Admissions': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Exams & Results': 'bg-blue-50 text-blue-700 border-blue-200',
  'Attendance': 'bg-amber-50 text-amber-700 border-amber-200',
  'System Alerts': 'bg-red-50 text-red-700 border-red-200',
  'General': 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  deleted: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ITEMS_PER_PAGE = 10;

export const SmsTemplates: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SmsTemplate | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<SmsTemplate | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formDltId, setFormDltId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await smsTemplateService.getTemplates({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        category: filterCategory === 'ALL' ? '' : filterCategory,
        status: filterStatus === 'ALL' ? '' : filterStatus
      });
      if (res.status === 'success') {
        setTemplates(res.data || []);
        setTotalItems(res.pagination?.total || 0);
        if (res.categories && Array.isArray(res.categories)) {
          setCategoriesList(res.categories);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load SMS templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentPage, pageSize, filterCategory, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchTemplates();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterCategory('ALL');
    setFilterStatus('ALL');
    setCurrentPage(1);
  };

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormCategory(categoriesList.length > 0 ? categoriesList[0] : 'General');
    setFormDltId('');
    setFormStatus('active');
    setFormMessage('');
    setFormError('');
    setView('editor');
  };

  const handleOpenEdit = (t: SmsTemplate) => {
    setEditingTemplate(t);
    setFormName(t.template_name);
    setFormCategory(t.category);
    setFormDltId(t.dlt_template_id);
    setFormStatus(t.status as 'active' | 'inactive');
    setFormMessage(t.message_body);
    setFormError('');
    setView('editor');
  };

  const handleOpenPreview = (t: SmsTemplate) => {
    setPreviewTemplate(t);
    setShowPreviewModal(true);
  };

  const handleOpenDelete = (t: SmsTemplate) => {
    setDeletingTemplate(t);
    setShowDeleteModal(true);
  };

  const insertPlaceholder = (placeholderToken: string) => {
    const tokenStr = `{{${placeholderToken}}}`;
    if (!textareaRef.current) {
      setFormMessage((prev) => prev + tokenStr);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formMessage;
    const newText = text.substring(0, start) + tokenStr + text.substring(end);
    setFormMessage(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tokenStr.length, start + tokenStr.length);
    }, 0);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim()) {
      setFormError('Template Name is required');
      return;
    }
    if (!formDltId.trim()) {
      setFormError('DLT Template ID is required');
      return;
    }
    if (!formMessage.trim()) {
      setFormError('Message Body is required');
      return;
    }

    try {
      setIsLoading(true);

      // Extract placeholder variables dynamically
      const tokens = Array.from(new Set(formMessage.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []))
        .map(t => t.replace(/[{}]/g, ''));
      
      const variablesMap: Record<string, string> = {};
      tokens.forEach(token => {
        variablesMap[token] = editingTemplate?.variables?.[token] || token.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      });

      const payload = {
        tenant_id: 1,
        template_name: formName,
        template_key: formName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        category: formCategory,
        dlt_template_id: formDltId,
        message_body: formMessage,
        variables: variablesMap,
        status: formStatus
      };

      if (editingTemplate) {
        await smsTemplateService.updateTemplate(editingTemplate.id, payload);
        showToast('SMS template updated successfully');
      } else {
        await smsTemplateService.createTemplate(payload);
        showToast('SMS template created successfully');
      }
      setView('list');
      fetchTemplates();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save SMS template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      setIsLoading(true);
      await smsTemplateService.deleteTemplate(deletingTemplate.id);
      showToast('SMS template deleted successfully');
      setShowDeleteModal(false);
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (t: SmsTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    try {
      await smsTemplateService.updateTemplate(t.id, { status: newStatus });
      showToast(`Template ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchTemplates();
    } catch (err: any) {
      showToast('Failed to update status');
    }
  };

  // Dynamic Placeholder Extractor
  const getDynamicPlaceholders = (template: SmsTemplate | null) => {
    const tokensFromText = (formMessage.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []).map(t => t.replace(/[{}]/g, ''));
    const tokensFromDbVars = template?.variables ? Object.keys(template.variables) : [];
    const tokensFromAllTemplates = templates.flatMap(t => (t.variables ? Object.keys(t.variables) : []));
    return Array.from(new Set([...tokensFromDbVars, ...tokensFromText, ...tokensFromAllTemplates]));
  };

  // Dynamic Preview text replacement using database variables map
  const formatDynamicPreviewText = (text: string, template: SmsTemplate | null) => {
    if (!text) return '';
    let formatted = text;
    const dbVars = template?.variables || {};

    const matches = formatted.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    matches.forEach(tokenWithBrackets => {
      const key = tokenWithBrackets.replace(/[{}]/g, '');
      const dynamicVal = dbVars[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      formatted = formatted.replace(new RegExp(tokenWithBrackets.replace(/[{}]/g, '\\$&'), 'g'), dynamicVal);
    });

    return formatted;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  };

  const smsPartCount = Math.ceil((formMessage.length || 1) / 160);

  const dynamicCategoriesOptions = [
    { value: 'ALL', label: 'All Categories' },
    ...categoriesList.map(c => ({ value: c, label: c }))
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          {toast}
        </div>
      )}

      {view === 'list' ? (
        <>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                SMS Templates
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Manage SMS message templates and notification alerts.
              </p>
            </div>
            <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm" onClick={handleOpenAdd}>
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
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                options={dynamicCategoriesOptions}
              />

              <Select
                label="Status"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
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
              <CardTitle>SMS Templates</CardTitle>
            </CardHeader>

            {isLoading && templates.length === 0 ? (
              <div className="p-12 text-center">
                <Loader2 size={32} className="mx-auto text-blue-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-semibold">Loading SMS templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-slate-300 mb-3">
                  <Smartphone className="mx-auto h-12 w-12 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500 font-semibold">No SMS templates found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <Table minWidth="860px" headers={['ID', 'Name', 'DLT Template ID', 'Category', 'Status', 'Actions']} dense colWidths={['50px', '30%', '20%', '16%', '12%', '110px']}>
                {templates.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => handleOpenPreview(t)}
                  >
                    <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{t.id}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {t.template_name}
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap font-mono">
                      {t.dlt_template_id}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase ${CATEGORY_BADGE[t.category] || CATEGORY_BADGE['General']}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleStatus(t, e)}
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer transition hover:opacity-80 ${STATUS_BADGE[t.status]}`}
                      >
                        {t.status.toUpperCase()}
                      </button>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(t)}
                          title="Preview template"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          title="Edit template"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(t)}
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
        /* FULL COMPLETE PAGE EDITOR VIEW */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition cursor-pointer text-slate-600"
                title="Back to templates"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingTemplate ? `Edit: ${editingTemplate.template_name}` : 'Create SMS Template'}
                </h2>
                <p className="text-xs text-slate-500">Configure TRAI-compliant SMS template parameters and message text.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPreviewTemplate({
                    id: editingTemplate?.id || 0,
                    tenant_id: 1,
                    template_name: formName || 'Untitled Template',
                    template_key: formName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
                    category: formCategory,
                    dlt_template_id: formDltId || 'DLT_PENDING',
                    message_body: formMessage,
                    status: formStatus,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                  setShowPreviewModal(true);
                }}
                className="flex items-center gap-1.5"
              >
                <Eye size={16} /> Preview Template
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView('list')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleSave()}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </Button>
            </div>
          </div>

          <Card>
            <div className="p-6 space-y-5">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-600 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Template Name *"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Fee Due Reminder"
                  required
                />

                <Select
                  label="Category *"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  options={categoriesList.map(c => ({ value: c, label: c }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="DLT Template ID *"
                    value={formDltId}
                    onChange={(e) => setFormDltId(e.target.value)}
                    placeholder="e.g., 14071628192038102"
                    required
                  />
                  <span className="block text-xs text-slate-400 mt-1">
                    Distributed Ledger Technology ID registered on DLT portal (Jio, Airtel, Vodafone)
                  </span>
                </div>

                <Select
                  label="Status *"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>

              {/* Dynamic Available Placeholders (From Database) */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Dynamic Placeholders (Click to Insert)</h4>
                  <span className="text-xs text-slate-400">Inserts at cursor position in text body</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {getDynamicPlaceholders(editingTemplate).map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertPlaceholder(token)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white border border-slate-700 transition cursor-pointer"
                    >
                      <Copy size={11} className="text-slate-400" />
                      {`{{${token}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body & Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700">
                      Message Text Body *
                    </label>
                    <span className="text-xs text-slate-500 font-mono">
                      {formMessage.length} characters ({smsPartCount} SMS part{smsPartCount > 1 ? 's' : ''})
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    rows={8}
                    placeholder="Enter SMS message text containing {{placeholders}}..."
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="w-full text-sm font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700">
                      Live Dynamic Preview
                    </label>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <Check size={13} /> Sample Values
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans text-slate-800 leading-relaxed min-h-[175px] flex flex-col justify-between">
                    <div>
                      {formMessage ? (
                        formatDynamicPreviewText(formMessage, editingTemplate)
                      ) : (
                        <span className="text-slate-400 italic">Type message text on the left to see live preview here...</span>
                      )}
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>Sender: <strong className="font-mono text-slate-700">VSETU-DLT</strong></span>
                      <span>Category: <strong className="text-slate-700">{formCategory}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* DYNAMIC PREVIEW MODAL */}
      {showPreviewModal && previewTemplate && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="SMS Template Preview"
          description="Live mobile preview rendering dynamic sample data"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-900">{previewTemplate.template_name}</p>
                <span className="text-xs text-slate-500 font-mono">DLT ID: {previewTemplate.dlt_template_id}</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${CATEGORY_BADGE[previewTemplate.category] || CATEGORY_BADGE['General']}`}>
                {previewTemplate.category}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dynamic Message Preview</label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans text-slate-800 leading-relaxed min-h-[90px]">
                {formatDynamicPreviewText(previewTemplate.message_body, previewTemplate)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(previewTemplate.message_body)}
                className="text-xs font-semibold gap-1.5"
              >
                <Copy size={14} />
                Copy Raw Template
              </Button>
              <Button onClick={() => setShowPreviewModal(false)} className="text-xs font-bold px-4">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && deletingTemplate && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete SMS Template"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Warning: This action cannot be undone.</p>
                <p className="mt-1 text-red-700 leading-relaxed">
                  Are you sure you want to delete SMS template <strong className="text-slate-900 font-bold">{deletingTemplate.template_name}</strong> (DLT ID: <span className="font-mono">{deletingTemplate.dlt_template_id}</span>)?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4">
                {isLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Delete Template
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DYNAMIC PREVIEW MODAL */}
      {showPreviewModal && previewTemplate && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="SMS Template Preview"
          description="Live mobile preview rendering dynamic sample data"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-900">{previewTemplate.template_name}</p>
                <span className="text-xs text-slate-500 font-mono">DLT ID: {previewTemplate.dlt_template_id}</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${CATEGORY_BADGE[previewTemplate.category] || CATEGORY_BADGE['General']}`}>
                {previewTemplate.category}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dynamic Message Preview</label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-sans text-slate-800 leading-relaxed min-h-[90px]">
                {formatDynamicPreviewText(previewTemplate.message_body, previewTemplate)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(previewTemplate.message_body)}
                className="text-xs font-semibold gap-1.5"
              >
                <Copy size={14} />
                Copy Raw Template
              </Button>
              <Button onClick={() => setShowPreviewModal(false)} className="text-xs font-bold px-4">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && deletingTemplate && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete SMS Template"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Warning: This action cannot be undone.</p>
                <p className="mt-1 text-red-700 leading-relaxed">
                  Are you sure you want to delete SMS template <strong className="text-slate-900 font-bold">{deletingTemplate.template_name}</strong> (DLT ID: <span className="font-mono">{deletingTemplate.dlt_template_id}</span>)?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4">
                {isLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Delete Template
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
