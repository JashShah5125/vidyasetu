import React, { useState, useEffect } from 'react';
import { Search, Loader2, RotateCcw, Sliders, Eye, EyeOff, Edit, Trash2, Key } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { platformSettingsService, type PlatformSetting } from '../../services/platformSettingsService';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DELETED', label: 'Deleted' },
];

const ITEMS_PER_PAGE = 10;

export const SystemConfiguration: React.FC = () => {
  const { addToast } = useApp();
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Mask toggle for secrets
  const [showSecretsMap, setShowSecretsMap] = useState<Record<number, boolean>>({});

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<PlatformSetting | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSetting, setDeletingSetting] = useState<PlatformSetting | null>(null);

  // Form state
  const [formKeyName, setFormKeyName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formIsSecret, setFormIsSecret] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await platformSettingsService.getSettings({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
        category: 'general',
        status: filterStatus === 'ALL' ? '' : filterStatus
      });
      if (res.status === 'success') {
        setSettings(res.data || []);
        setTotalItems(res.pagination?.total || 0);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load platform settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [currentPage, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchSettings();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('ALL');
    setCurrentPage(1);
  };

  const toggleSecretVisibility = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSecretsMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingSetting(null);
    setFormKeyName('');
    setFormValue('');
    setFormIsSecret(false);
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (s: PlatformSetting) => {
    setEditingSetting(s);
    setFormKeyName(s.key_name);
    setFormValue(s.value || '');
    setFormIsSecret(Boolean(s.is_secret));
    setFormError('');
    setShowAddEditModal(true);
  };

  const handleOpenDelete = (s: PlatformSetting) => {
    setDeletingSetting(s);
    setShowDeleteModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKeyName.trim()) {
      setFormError('Setting Key Name is required');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        category: 'general',
        key_name: formKeyName,
        value: formValue,
        is_secret: formIsSecret ? 1 : 0
      };

      if (editingSetting) {
        await platformSettingsService.updateSetting(editingSetting.id, payload);
        addToast(`Platform setting "${formKeyName}" updated successfully.`, 'success');
      } else {
        await platformSettingsService.createSetting(payload);
        addToast(`Platform setting "${formKeyName}" created successfully.`, 'success');
      }
      setShowAddEditModal(false);
      fetchSettings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save platform setting');
      addToast(err.message || 'Failed to save platform setting', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSetting) return;
    try {
      setIsLoading(true);
      await platformSettingsService.deleteSetting(deletingSetting.id);
      addToast(`Platform setting "${deletingSetting.key_name}" deleted successfully.`, 'success');
      setShowDeleteModal(false);
      fetchSettings();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete setting parameter', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">

      {/* Header Section Matching Tenants */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            System Configuration
          </h2>
          <p className="text-base text-slate-500 mt-2">
            Manage global platform configuration parameters, operational keys, and environment settings.
          </p>
        </div>
        <Button variant="primary" style={{ gap: '6px' }} className="px-5 py-2.5 text-sm shadow-sm" onClick={handleOpenAdd}>
          + Add Parameter
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-4 items-start w-full">
          <div className="relative">
            <Input
              label="Search Parameters"
              placeholder="Search setting keys or values..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              wrapperClassName="mb-0"
            />
            <Search size={14} className="absolute right-3 top-[38px] text-slate-400 pointer-events-none" />
          </div>

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
          <CardTitle>Platform Settings Directory</CardTitle>
        </CardHeader>

        {isLoading && settings.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="mx-auto text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-semibold">Loading platform settings...</p>
          </div>
        ) : settings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-300 mb-3">
              <Key className="mx-auto h-12 w-12 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 font-semibold">No platform setting parameters found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <Table headers={['ID', 'Setting Key', 'Category', 'Last Updated', 'Actions']} dense>
            {settings.map((s) => {
              const isRevealed = Boolean(showSecretsMap[s.id]);
              const displayValue = s.is_secret && !isRevealed ? '••••••••••••••••' : (s.value || '-');

              return (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleOpenEdit(s)}
                >
                  <td className="px-3 py-3 font-bold text-sm whitespace-nowrap">{s.id}</td>
                  <td className="px-3 py-3 font-mono font-bold text-blue-600 text-sm whitespace-nowrap min-w-[200px]">
                    {s.key_name}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase border bg-indigo-50 text-indigo-700 border-indigo-200">
                      {s.category}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap font-normal">
                    {formatDate(s.updated_at)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        title="View / Edit"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(s)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
          title={editingSetting ? 'Edit Platform Parameter' : 'Add Platform Parameter'}
          description="Define platform configuration key and value parameters"
          size="md"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800">
                {formError}
              </div>
            )}

            <Input
              label="Setting Key Name *"
              value={formKeyName}
              onChange={(e) => setFormKeyName(e.target.value)}
              placeholder="e.g., saas_platform_name, default_gst_rate"
              required
              disabled={Boolean(editingSetting)}
            />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Setting Value *
              </label>
              <textarea
                rows={3}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="Enter parameter value..."
                className="w-full text-sm font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <input
                type="checkbox"
                id="is_secret"
                checked={formIsSecret}
                onChange={(e) => setFormIsSecret(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="is_secret" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                Mask as Secret Parameter (Encrypt / Hide in UI by default)
              </label>
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
                {editingSetting ? 'Update Parameter' : 'Create Parameter'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && deletingSetting && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Soft Delete Parameter"
          description="Are you sure you want to soft-delete this parameter?"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Trash2 size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">This action cannot be undone</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Parameter <span className="font-mono font-bold">{deletingSetting.key_name}</span> will be marked as <strong>deleted</strong> and removed from active configuration.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="text-xs font-semibold">
                Cancel
              </Button>
              <Button onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4">
                {isLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Delete Parameter
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
