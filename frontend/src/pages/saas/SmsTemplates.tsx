import React, { useState, useEffect, useRef } from 'react';
import { Plus, Eye, Edit, Trash2, Search, Loader2, Copy, Check, Smartphone, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { smsTemplateService, type SmsTemplate } from '../../services/smsTemplateService';

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
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
        limit: ITEMS_PER_PAGE,
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
  }, [currentPage, filterCategory, filterStatus]);

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
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (t: SmsTemplate) => {
    setEditingTemplate(t);
    setFormName(t.template_name);
    setFormCategory(t.category);
    setFormDltId(t.dlt_template_id);
    setFormStatus(t.status as 'active' | 'inactive');
    setFormMessage(t.message_body);
    setFormError('');
    setShowAddEditModal(true);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setShowAddEditModal(false);
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

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
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

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Smartphone size={32} className="text-indigo-600" />
            SMS Templates
          </h2>
          <p className="text-base text-slate-500 mt-2">
            Manage SMS message templates that control content for instant mobile notifications, fee alerts, and system messages.
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
          <Table headers={['ID', 'Name', 'DLT Template ID', 'Category', 'Status', 'Actions']} dense>
            {templates.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleOpenPreview(t)}
              >
                <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{t.id}</td>
                <td className="px-3 py-3 font-semibold text-slate-900 text-base min-w-[200px]">
                  <div>{t.template_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Created: {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap font-mono">
                  {t.dlt_template_id}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded border uppercase ${CATEGORY_BADGE[t.category] || CATEGORY_BADGE['General']}`}>
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenPreview(t)}
                      className="text-sm font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer transition flex items-center gap-1"
                    >
                      <Eye size={15} /> Preview
                    </button>
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleOpenDelete(t)}
                      className="text-sm font-semibold text-red-600 hover:text-red-800 cursor-pointer transition"
                    >
                      Delete
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

      {/* ADD / EDIT MODAL */}
      {showAddEditModal && (
        <Modal
          isOpen={showAddEditModal}
          onClose={() => setShowAddEditModal(false)}
          title={editingTemplate ? 'Edit SMS Template' : 'Create SMS Template'}
          description="Manage TRAI-compliant SMS template parameters and message text"
          size="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle size={16} />
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700">
                  Message Text Body *
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  {formMessage.length} characters ({smsPartCount} SMS parts)
                </span>
              </div>
              <textarea
                ref={textareaRef}
                rows={4}
                placeholder="Enter SMS message text containing {{placeholders}}..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="w-full text-sm font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Dynamic Available Placeholders (From Database) */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
              <h4 className="text-sm font-bold text-white">Dynamic Placeholders (From Database)</h4>
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddEditModal(false)}
                className="text-sm font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading} className="text-sm font-bold px-5">
                {isLoading ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </Button>
            </div>
          </form>
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
          description="Are you sure you want to delete this template?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This action will mark SMS template <strong className="text-slate-900">{deletingTemplate.template_name}</strong> (DLT: {deletingTemplate.dlt_template_id}) as <strong className="text-red-600">deleted</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
