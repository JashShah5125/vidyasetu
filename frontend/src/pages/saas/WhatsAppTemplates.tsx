import React, { useState, useEffect, useRef } from 'react';
import { Plus, Eye, Edit, Trash2, Search, Loader2, Copy, Check, MessageCircle, AlertTriangle, RotateCcw, Image, FileText, Video, Link as LinkIcon, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { whatsappTemplateService, type WhatsAppTemplate, type WhatsAppButton } from '../../services/whatsappTemplateService';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DELETED', label: 'Deleted' },
];

const CATEGORY_BADGE: Record<string, string> = {
  'MARKETING': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'UTILITY': 'bg-blue-50 text-blue-800 border-blue-200',
  'AUTHENTICATION': 'bg-purple-50 text-purple-800 border-purple-200',
  'Fee & Billing': 'bg-amber-50 text-amber-800 border-amber-200',
  'Admissions': 'bg-cyan-50 text-cyan-800 border-cyan-200',
  'Exams & Results': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'General': 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  deleted: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ITEMS_PER_PAGE = 10;

export const WhatsAppTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
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
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<WhatsAppTemplate | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('MARKETING');
  const [formDltId, setFormDltId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');

  // Rich Media Features Toggles
  const [enableHeader, setEnableHeader] = useState(false);
  const [headerType, setHeaderType] = useState<'text' | 'image' | 'video' | 'document'>('text');
  const [headerContent, setHeaderContent] = useState('');

  const [enableFooter, setEnableFooter] = useState(false);
  const [footerText, setFooterText] = useState('');

  const [enableButtons, setEnableButtons] = useState(false);
  const [buttons, setButtons] = useState<WhatsAppButton[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await whatsappTemplateService.getTemplates({
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
      showToast(err.message || 'Failed to load WhatsApp templates');
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
    setFormCategory(categoriesList.length > 0 ? categoriesList[0] : 'MARKETING');
    setFormDltId('');
    setFormStatus('active');
    setFormMessage('');
    setEnableHeader(false);
    setHeaderType('text');
    setHeaderContent('');
    setEnableFooter(false);
    setFooterText('');
    setEnableButtons(false);
    setButtons([]);
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (t: WhatsAppTemplate) => {
    setEditingTemplate(t);
    setFormName(t.template_name);
    setFormCategory(t.category);
    setFormDltId(t.dlt_template_id);
    setFormStatus(t.status as 'active' | 'inactive');
    setFormMessage(t.message_body);
    
    setEnableHeader(t.header_type !== 'none');
    setHeaderType(t.header_type === 'none' ? 'text' : t.header_type);
    setHeaderContent(t.header_content || '');

    setEnableFooter(Boolean(t.footer_text));
    setFooterText(t.footer_text || '');

    setEnableButtons(Boolean(t.buttons && t.buttons.length > 0));
    setButtons(t.buttons && t.buttons.length > 0 ? t.buttons : []);
    
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenPreview = (t: WhatsAppTemplate) => {
    setPreviewTemplate(t);
    setShowPreviewModal(true);
  };

  const handleOpenDelete = (t: WhatsAppTemplate) => {
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

  const handleAddButton = () => {
    if (buttons.length >= 3) {
      showToast('Maximum 3 action buttons allowed');
      return;
    }
    setButtons([...buttons, { type: 'URL', text: 'Action Link', url: '' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: keyof WhatsAppButton, value: string) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value };
    setButtons(updated);
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

      // Dynamically extract placeholder variables
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
        header_type: enableHeader ? headerType : ('none' as const),
        header_content: enableHeader ? headerContent : null,
        message_body: formMessage,
        footer_text: enableFooter ? footerText : null,
        buttons: enableButtons && buttons.length > 0 ? buttons : null,
        variables: variablesMap,
        status: formStatus
      };

      if (editingTemplate) {
        await whatsappTemplateService.updateTemplate(editingTemplate.id, payload);
        showToast('WhatsApp template updated successfully');
      } else {
        await whatsappTemplateService.createTemplate(payload);
        showToast('WhatsApp template created successfully');
      }
      setShowAddEditModal(false);
      fetchTemplates();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save WhatsApp template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    try {
      setIsLoading(true);
      await whatsappTemplateService.deleteTemplate(deletingTemplate.id);
      showToast('WhatsApp template deleted successfully');
      setShowDeleteModal(false);
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (t: WhatsAppTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    try {
      await whatsappTemplateService.updateTemplate(t.id, { status: newStatus });
      showToast(`Template ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchTemplates();
    } catch (err: any) {
      showToast('Failed to update status');
    }
  };

  // Dynamic Placeholder Extractor
  const getDynamicPlaceholders = (template: WhatsAppTemplate | null) => {
    const tokensFromText = (formMessage.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []).map(t => t.replace(/[{}]/g, ''));
    const tokensFromDbVars = template?.variables ? Object.keys(template.variables) : [];
    const tokensFromAllTemplates = templates.flatMap(t => (t.variables ? Object.keys(t.variables) : []));
    return Array.from(new Set([...tokensFromDbVars, ...tokensFromText, ...tokensFromAllTemplates]));
  };

  // Dynamic Preview text replacement using database variables map
  const formatDynamicWhatsAppText = (text: string, template: WhatsAppTemplate | null) => {
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
            <MessageCircle size={32} className="text-emerald-600" />
            WhatsApp Templates
          </h2>
          <p className="text-base text-slate-500 mt-2">
            Manage WhatsApp Business message templates with rich media options, custom headers, footers, and quick action buttons.
          </p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleOpenAdd}>
          + Add Template
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
          <CardTitle>WhatsApp Templates</CardTitle>
        </CardHeader>

        {isLoading && templates.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="mx-auto text-emerald-500 animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-semibold">Loading WhatsApp templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-300 mb-3">
              <MessageCircle className="mx-auto h-12 w-12 text-emerald-300" />
            </div>
            <p className="text-sm text-slate-500 font-semibold">No WhatsApp templates found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <Table headers={['ID', 'Template Name', 'Category', 'Features', 'Status', 'Actions']} dense>
            {templates.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleOpenPreview(t)}
              >
                <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{t.id}</td>
                <td className="px-3 py-3 font-semibold text-slate-900 text-base min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="block font-bold">{t.template_name}</span>
                      <span className="text-xs text-slate-500 font-normal mt-0.5 block">
                        Created: {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${CATEGORY_BADGE[t.category] || CATEGORY_BADGE['General']}`}>
                    {t.category}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {t.header_type !== 'none' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                        Header: {t.header_type}
                      </span>
                    )}
                    {t.footer_text && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Footer
                      </span>
                    )}
                    {t.buttons && t.buttons.length > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Buttons ({t.buttons.length})
                      </span>
                    )}
                    {t.header_type === 'none' && !t.footer_text && (!t.buttons || t.buttons.length === 0) && (
                      <span className="text-xs text-slate-400 font-medium">Text Only</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleStatus(t, e)}
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer transition hover:opacity-80 ${STATUS_BADGE[t.status]}`}
                  >
                    {t.status.toUpperCase()}
                  </button>
                </td>
                <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenPreview(t)}
                      className="text-sm font-semibold text-slate-500 hover:text-emerald-600 cursor-pointer transition flex items-center gap-1"
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
          title={editingTemplate ? 'Edit WhatsApp Template' : 'Add WhatsApp Template'}
          description="Create a new WhatsApp Business template with rich media options"
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
                placeholder="e.g., Match Day Reminder"
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
                  placeholder="e.g., DLT123456789"
                  required
                />
                <span className="block text-xs text-slate-400 mt-1">
                  Distributed Ledger Technology ID for regulatory compliance
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

            {/* Rich Media Feature Sections */}
            <div className="space-y-3 pt-2">
              {/* Add Header Option */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableHeader}
                    onChange={(e) => setEnableHeader(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Add Header (Image/Video/Document/Text)
                </label>

                {enableHeader && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <Select
                      label="Header Type"
                      value={headerType}
                      onChange={(e) => setHeaderType(e.target.value as any)}
                      options={[
                        { value: 'text', label: 'Text Header' },
                        { value: 'image', label: 'Image URL' },
                        { value: 'video', label: 'Video URL' },
                        { value: 'document', label: 'Document PDF URL' },
                      ]}
                    />
                    <Input
                      label={headerType === 'text' ? 'Header Text' : 'Media Asset URL'}
                      value={headerContent}
                      onChange={(e) => setHeaderContent(e.target.value)}
                      placeholder={headerType === 'text' ? 'e.g. Notice Title' : 'https://...'}
                    />
                  </div>
                )}
              </div>

              {/* Add Footer Option */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFooter}
                    onChange={(e) => setEnableFooter(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Add Footer
                </label>

                {enableFooter && (
                  <Input
                    label="Footer Subtext"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="e.g. Vidya Setu Education Services"
                  />
                )}
              </div>

              {/* Add Action Buttons Option */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableButtons}
                      onChange={(e) => setEnableButtons(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Add Action Buttons (Max 3)
                  </label>
                  {enableButtons && buttons.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddButton}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      + Add Button
                    </button>
                  )}
                </div>

                {enableButtons && (
                  <div className="space-y-2.5 pt-1">
                    {buttons.map((btn, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                        <Select
                          value={btn.type}
                          onChange={(e) => handleButtonChange(idx, 'type', e.target.value)}
                          options={[
                            { value: 'URL', label: 'URL Link' },
                            { value: 'PHONE', label: 'Phone Call' },
                            { value: 'QUICK_REPLY', label: 'Quick Reply' },
                          ]}
                          className="text-xs min-w-[120px]"
                        />
                        <Input
                          placeholder="Button Label"
                          value={btn.text}
                          onChange={(e) => handleButtonChange(idx, 'text', e.target.value)}
                          className="text-xs"
                        />
                        {btn.type === 'URL' && (
                          <Input
                            placeholder="https://..."
                            value={btn.url || ''}
                            onChange={(e) => handleButtonChange(idx, 'url', e.target.value)}
                            className="text-xs"
                          />
                        )}
                        {btn.type === 'PHONE' && (
                          <Input
                            placeholder="+91..."
                            value={btn.phone || ''}
                            onChange={(e) => handleButtonChange(idx, 'phone', e.target.value)}
                            className="text-xs"
                          />
                        )}
                        {buttons.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveButton(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700">
                  Message Body *
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  Use <code className="bg-slate-100 text-slate-800 px-1 rounded">*text*</code> for bold, <code className="bg-slate-100 text-slate-800 px-1 rounded">_text_</code> for italic
                </span>
              </div>
              <textarea
                ref={textareaRef}
                rows={4}
                placeholder="Enter your WhatsApp message here..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="w-full text-sm font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-y"
              />
            </div>

            {/* Dynamic Available Placeholders (From Database) */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
              <h4 className="text-sm font-bold text-white">Dynamic Placeholders (From Database)</h4>
              <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto pr-1">
                {getDynamicPlaceholders(editingTemplate).map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertPlaceholder(token)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white border border-slate-700 transition cursor-pointer"
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
              <Button type="submit" variant="primary" disabled={isLoading} className="text-sm font-bold px-5 bg-emerald-600 hover:bg-emerald-700 text-white">
                {isLoading ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DYNAMIC PREVIEW WHATSAPP CHAT MODAL */}
      {showPreviewModal && previewTemplate && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="WhatsApp Template Preview"
          description="Live WhatsApp chat bubble interface preview"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-900">{previewTemplate.template_name}</p>
                <span className="text-xs text-slate-500 font-mono">DLT: {previewTemplate.dlt_template_id}</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${CATEGORY_BADGE[previewTemplate.category] || CATEGORY_BADGE['General']}`}>
                {previewTemplate.category}
              </span>
            </div>

            {/* WhatsApp Chat Bubble Simulation */}
            <div className="bg-[#efeae2] p-4 rounded-2xl border border-slate-300 space-y-3 font-sans shadow-inner">
              <div className="bg-white rounded-xl p-3.5 shadow-sm max-w-sm ml-auto space-y-2 border border-slate-200 text-slate-800 text-sm">
                {/* Header Asset / Text */}
                {previewTemplate.header_type === 'image' && previewTemplate.header_content && (
                  <img src={previewTemplate.header_content} alt="Header" className="w-full h-40 object-cover rounded-lg mb-2" />
                )}
                {previewTemplate.header_type === 'text' && previewTemplate.header_content && (
                  <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{previewTemplate.header_content}</p>
                )}
                {previewTemplate.header_type === 'document' && (
                  <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg text-xs font-semibold text-slate-700">
                    <FileText size={16} className="text-red-500" />
                    <span>Attached Document</span>
                  </div>
                )}

                {/* Message Body */}
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">
                  {formatDynamicWhatsAppText(previewTemplate.message_body, previewTemplate)}
                </p>

                {/* Subtext Footer */}
                {previewTemplate.footer_text && (
                  <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-1.5 font-medium">
                    {previewTemplate.footer_text}
                  </p>
                )}

                <div className="text-[10px] text-slate-400 text-right font-mono pt-1">
                  10:42 AM ✓✓
                </div>
              </div>

              {/* Action Buttons Stack */}
              {previewTemplate.buttons && previewTemplate.buttons.length > 0 && (
                <div className="max-w-sm ml-auto space-y-1.5">
                  {previewTemplate.buttons.map((btn, idx) => (
                    <div key={idx} className="bg-white hover:bg-slate-50 p-2.5 rounded-xl text-center text-xs font-bold text-emerald-600 border border-slate-200 shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
                      {btn.type === 'URL' && <LinkIcon size={13} />}
                      {btn.type === 'PHONE' && <Phone size={13} />}
                      <span>{btn.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(previewTemplate.message_body)}
                className="text-xs font-semibold gap-1.5"
              >
                <Copy size={14} />
                Copy Template Body
              </Button>
              <Button onClick={() => setShowPreviewModal(false)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && deletingTemplate && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete WhatsApp Template"
          description="Are you sure you want to delete this template?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This action will mark WhatsApp template <strong className="text-slate-900">{deletingTemplate.template_name}</strong> (DLT: {deletingTemplate.dlt_template_id}) as <strong className="text-red-600">deleted</strong>.
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
