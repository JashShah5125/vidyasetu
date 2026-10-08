import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Sliders,
  Smartphone,
  Mail,
  MessageCircle,
  Send,
  Zap,
  Check,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Code,
  Type,
  Minus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  HelpCircle,
  Edit2,
  ArrowLeft
} from 'lucide-react';
import { smsTemplateService } from '../../services/smsTemplateService';
import { emailTemplateService } from '../../services/emailTemplateService';
import { whatsappTemplateService } from '../../services/whatsappTemplateService';
import { systemConfigurationService } from '../../services/systemConfigurationService';
import { Pagination } from '../../components/ui/Pagination';

// Types
export type ChannelType = 'sms' | 'email' | 'whatsapp';
export type TabType = 'channel-config' | 'sms' | 'email' | 'whatsapp' | 'deliveries';

export interface VariableDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'url';
  example: string;
}

export interface UnifiedTemplate {
  id: string | number;
  dbId?: number;
  channel: ChannelType;
  name: string;
  key: string;
  category?: string;
  description: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  status: 'active' | 'inactive';
  version: string;
  variables: VariableDef[];
  isSystem?: boolean;
  dltId?: string;
  buttons?: Array<{ type: 'URL' | 'PHONE' | 'QUICK_REPLY'; text: string; url?: string; phone?: string }>;
}

export interface ChannelConfig {
  id: ChannelType;
  name: string;
  status: 'ENABLED' | 'DISABLED';
  testStatus: 'PASSED' | 'SKIPPED' | 'FAILED';
  summary: string;
  lastTested: string;
  endpoint: string;
  apiKey: string;
  sender: string;
  required: string[];
  provider: string;
  label: string;
  providerOptionsJson: string;
  enabledForSending: boolean;
}

export interface DeliveryLog {
  id: string;
  recipient: string;
  channel: ChannelType;
  templateKey: string;
  templateName: string;
  status: 'SENT' | 'FAILED';
  providerMsgId: string;
  timestamp: string;
  details?: string;
}

// Default fallback channel configurations (hydrated directly from MySQL system_configurations)
const DEFAULT_CHANNELS: Record<ChannelType, ChannelConfig> = {
  sms: {
    id: 'sms',
    name: 'SMS',
    status: 'DISABLED',
    testStatus: 'SKIPPED',
    summary: 'SMS Gateway',
    lastTested: 'No test recorded',
    endpoint: '-',
    apiKey: '',
    sender: '',
    required: ['api_key'],
    provider: 'Twilio',
    label: 'Twilio (SMS)',
    providerOptionsJson: '{}',
    enabledForSending: false
  },
  email: {
    id: 'email',
    name: 'EMAIL',
    status: 'DISABLED',
    testStatus: 'SKIPPED',
    summary: 'SMTP Server · EMAIL Gateway',
    lastTested: 'No test recorded',
    endpoint: '-',
    apiKey: '',
    sender: '',
    required: ['smtp_host', 'smtp_port'],
    provider: 'SMTP Server',
    label: 'SMTP Server (EMAIL)',
    providerOptionsJson: '{}',
    enabledForSending: false
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WHATSAPP',
    status: 'DISABLED',
    testStatus: 'SKIPPED',
    summary: 'Meta Cloud API · WHATSAPP Gateway',
    lastTested: 'No test recorded',
    endpoint: '-',
    apiKey: '',
    sender: '',
    required: ['auth_token'],
    provider: 'Meta Cloud API',
    label: 'Meta Cloud API (WHATSAPP)',
    providerOptionsJson: '{}',
    enabledForSending: false
  }
};

const mapDbConfigToChannelConfig = (cfg: any, prevConfig: ChannelConfig): ChannelConfig => {
  const cType = (cfg.channel_type || '').toLowerCase() as ChannelType;
  const creds = cfg.credentials && typeof cfg.credentials === 'object' ? cfg.credentials : {};
  const isEnabled = cfg.is_enabled === 1 || cfg.is_enabled === true;

  let endpoint = '-';
  let apiKey = '';
  let sender = cfg.sender_id || '';

  if (cType === 'sms') {
    endpoint = creds.api_endpoint || '-';
    apiKey = creds.auth_token || creds.account_sid || '';
    if (!sender && creds.from_number) sender = creds.from_number;
  } else if (cType === 'email') {
    endpoint = creds.smtp_host ? `${creds.smtp_host}${creds.smtp_port ? `:${creds.smtp_port}` : ''}` : '-';
    apiKey = creds.smtp_password || '';
    if (!sender && creds.from_email) sender = creds.from_email;
  } else if (cType === 'whatsapp') {
    endpoint = creds.api_endpoint || '-';
    apiKey = creds.auth_token || '';
    if (!sender && creds.test_phone) sender = creds.test_phone;
  }

  return {
    ...prevConfig,
    id: cType,
    name: cfg.channel_type,
    status: isEnabled ? 'ENABLED' : 'DISABLED',
    enabledForSending: isEnabled,
    provider: cfg.provider_name || prevConfig.provider,
    label: `${cfg.provider_name || 'Channel'} (${cfg.channel_type})`,
    summary: `${cfg.provider_name || 'Gateway'} · ${cfg.channel_type} Gateway`,
    endpoint,
    apiKey,
    sender,
    providerOptionsJson: JSON.stringify(creds, null, 2)
  };
};

// Templates are 100% loaded dynamically from MySQL tables


const getTemplateCategory = (tpl: UnifiedTemplate) => {
  const k = (tpl.key || '').toLowerCase();
  if (k.startsWith('admission')) return 'Admission';
  if (k.startsWith('attendance')) return 'Attendance';
  if (k.startsWith('fee') || k.startsWith('payment') || k.startsWith('receipt') || k.startsWith('invoice')) return 'Fees & Finance';
  if (k.startsWith('exam') || k.startsWith('grade') || k.startsWith('result') || k.startsWith('homework')) return 'Exams & Academics';
  if (k.startsWith('lecture') || k.startsWith('schedule') || k.startsWith('timetable')) return 'Schedule & Timetable';
  return 'General';
};

interface MessagingTemplatesProps {
  defaultTab?: TabType;
}

export const MessagingTemplates: React.FC<MessagingTemplatesProps> = ({ defaultTab = 'channel-config' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabType | null;

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>(urlTab || defaultTab);

  // Sync tab with URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Channels state - initialized with defaults, hydrated from MySQL system_configurations
  const [channels, setChannels] = useState<Record<ChannelType, ChannelConfig>>(DEFAULT_CHANNELS);
  const [configuringChannelId, setConfiguringChannelId] = useState<ChannelType | null>(null);
  const [showApiKeyMap, setShowApiKeyMap] = useState<Record<string, boolean>>({});

  // Templates state - sourced directly from MySQL database
  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Pagination state for Templates
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize, setTemplatePageSize] = useState(5);

  // Pagination state for Deliveries
  const [deliveriesPage, setDeliveriesPage] = useState(1);
  const [deliveriesPageSize, setDeliveriesPageSize] = useState(10);

  // Reset page when tab, search, or filters change
  useEffect(() => {
    setTemplatePage(1);
  }, [activeTab, searchQuery, statusFilter, categoryFilter]);

  // Deliveries state - populated by test dispatches
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);

  // Modals
  const [editingTemplate, setEditingTemplate] = useState<UnifiedTemplate | null>(null);
  const [testingTemplate, setTestingTemplate] = useState<UnifiedTemplate | null>(null);
  const [isPreviewHidden, setIsPreviewHidden] = useState(false);
  const [isTestSendModalOpen, setIsTestSendModalOpen] = useState(false);
  const [testSendRecipient, setTestSendRecipient] = useState('');
  const [isTestingChannel, setIsTestingChannel] = useState<ChannelType | null>(null);
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch real database templates & configurations on load (100% sourced from MySQL tables)
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        setIsLoadingTemplates(true);
        const [smsRes, emailRes, waRes, sysConfigRes] = await Promise.allSettled([
          smsTemplateService.getTemplates({ limit: 100 }),
          emailTemplateService.getTemplates({ limit: 100 }),
          whatsappTemplateService.getTemplates({ limit: 100 }),
          systemConfigurationService.getAll()
        ]);

        const dbTemplates: UnifiedTemplate[] = [];

        // 1. SMS Templates from MySQL (sms_templates table: active & inactive)
        const smsList = smsRes.status === 'fulfilled' && smsRes.value?.data ? smsRes.value.data : [];
        smsList.forEach((st: any) => {
          if (st.status !== 'deleted') {
            dbTemplates.push({
              id: `sms-${st.id}`,
              dbId: st.id,
              channel: 'sms',
              name: st.template_name || st.name || st.template_key,
              key: st.template_key,
              category: st.category,
              dltId: st.dlt_template_id,
              description: st.category ? `Category: ${st.category}` : 'SMS message template',
              body: st.message_body || '',
              status: st.status === 'active' ? 'active' : 'inactive',
              version: 'v1',
              variables: (st.message_body || '').match(/{{[^}]+}}/g)?.map((tok: string) => {
                const clean = tok.replace(/[{}]/g, '').trim();
                return { key: clean, label: clean, type: 'text' as const, example: clean };
              }) || [
                { key: 'student_name', label: 'Student Name', type: 'text' as const, example: 'Aarav' }
              ]
            });
          }
        });

        // 2. Email Templates from MySQL (email_templates table: active & inactive)
        const emailList = emailRes.status === 'fulfilled' && emailRes.value?.data ? emailRes.value.data : [];
        emailList.forEach((et: any) => {
          if (et.status !== 'deleted' && !et.deleted_at) {
            dbTemplates.push({
              id: `email-${et.id}`,
              dbId: et.id,
              channel: 'email',
              name: et.name || et.template_key,
              key: et.template_key,
              category: et.category,
              description: et.description || `${et.category || 'System'} notification email`,
              subject: et.subject || '',
              body: et.text_body || (et.html_body ? et.html_body.replace(/<[^>]+>/g, ' ') : ''),
              htmlBody: et.html_body || '',
              status: String(et.status).toLowerCase() === 'active' ? 'active' : 'inactive',
              version: 'v1',
              variables: et.variables && typeof et.variables === 'object'
                ? Object.entries(et.variables).map(([k, label]) => ({
                    key: k,
                    label: String(label),
                    type: 'text' as const,
                    example: String(label)
                  }))
                : (et.subject + ' ' + (et.text_body || '')).match(/{{[^}]+}}/g)?.map((tok: string) => {
                    const clean = tok.replace(/[{}]/g, '').trim();
                    return { key: clean, label: clean, type: 'text' as const, example: clean };
                  }) || [
                    { key: 'user_name', label: 'User Name', type: 'text' as const, example: 'Aarav Sharma' }
                  ]
            });
          }
        });

        // 3. WhatsApp Templates from MySQL (whatsapp_templates table: active & inactive)
        const waList = waRes.status === 'fulfilled' && waRes.value?.data ? waRes.value.data : [];
        waList.forEach((wt: any) => {
          if (wt.status !== 'deleted') {
            let parsedButtons = [];
            if (wt.buttons) {
              parsedButtons = typeof wt.buttons === 'string' ? JSON.parse(wt.buttons) : wt.buttons;
            }
            dbTemplates.push({
              id: `wa-${wt.id}`,
              dbId: wt.id,
              channel: 'whatsapp',
              name: wt.template_name || wt.name || wt.template_key,
              key: wt.template_key,
              category: wt.category,
              dltId: wt.dlt_template_id,
              description: wt.category ? `Category: ${wt.category}` : 'WhatsApp notification template',
              body: wt.message_body || '',
              status: wt.status === 'active' ? 'active' : 'inactive',
              version: 'v1',
              variables: (wt.message_body || '').match(/{{[^}]+}}/g)?.map((tok: string) => {
                const clean = tok.replace(/[{}]/g, '').trim();
                return { key: clean, label: clean, type: 'text' as const, example: clean };
              }) || [
                { key: 'student_name', label: 'Student Name', type: 'text' as const, example: 'Aarav' }
              ],
              buttons: parsedButtons
            });
          }
        });

        // Strictly set database templates
        setTemplates(dbTemplates);

        // 4. Hydrate System Configurations from MySQL system_configurations table
        const sysConfigs = sysConfigRes.status === 'fulfilled' && sysConfigRes.value?.data ? sysConfigRes.value.data : [];
        if (sysConfigs.length > 0) {
          setChannels(prev => {
            const updated = { ...prev };
            sysConfigs.forEach((cfg: any) => {
              const cType = (cfg.channel_type || '').toLowerCase() as ChannelType;
              if (updated[cType]) {
                updated[cType] = mapDbConfigToChannelConfig(cfg, updated[cType]);
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to sync backend data from database', err);
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadBackendData();
  }, []);

  // Filter templates for current active channel tab
  const currentChannelTemplates = useMemo(() => {
    if (activeTab !== 'sms' && activeTab !== 'email' && activeTab !== 'whatsapp') return [];
    return templates
      .filter(t => t.channel === activeTab)
      .filter(t => {
        // Status filter
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;

        // Category filter
        if (categoryFilter !== 'all') {
          const cat = getTemplateCategory(t);
          if (cat !== categoryFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchKey = t.key.toLowerCase().includes(q);
          const matchBody = t.body.toLowerCase().includes(q);
          const matchSubject = t.subject ? t.subject.toLowerCase().includes(q) : false;
          if (!matchName && !matchKey && !matchBody && !matchSubject) return false;
        }

        return true;
      });
  }, [templates, activeTab, searchQuery, statusFilter, categoryFilter]);

  // Template pagination calculations
  const totalTemplates = currentChannelTemplates.length;
  const totalTemplatePages = Math.max(1, Math.ceil(totalTemplates / templatePageSize));
  const paginatedTemplates = useMemo(() => {
    const startIndex = (templatePage - 1) * templatePageSize;
    return currentChannelTemplates.slice(startIndex, startIndex + templatePageSize);
  }, [currentChannelTemplates, templatePage, templatePageSize]);

  // Deliveries pagination calculations
  const totalDeliveries = deliveries.length;
  const totalDeliveriesPages = Math.max(1, Math.ceil(totalDeliveries / deliveriesPageSize));
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (deliveriesPage - 1) * deliveriesPageSize;
    return deliveries.slice(startIndex, startIndex + deliveriesPageSize);
  }, [deliveries, deliveriesPage, deliveriesPageSize]);

  // Counts - dynamically reflecting database items
  const smsCount = templates.filter(t => t.channel === 'sms').length;
  const emailCount = templates.filter(t => t.channel === 'email').length;
  const whatsappCount = templates.filter(t => t.channel === 'whatsapp').length;
  const deliveriesCount = deliveries.length;

  // Toggle template active / inactive in MySQL database
  const handleToggleStatus = async (templateId: string | number) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    const newStatus = tpl.status === 'active' ? 'inactive' : 'active';

    try {
      if (tpl.channel === 'sms' && tpl.dbId) {
        await smsTemplateService.updateTemplate(tpl.dbId, { status: newStatus });
      } else if (tpl.channel === 'email' && tpl.dbId) {
        await emailTemplateService.updateTemplateStatus(String(tpl.dbId), newStatus.toUpperCase() as 'ACTIVE' | 'INACTIVE');
      } else if (tpl.channel === 'whatsapp' && tpl.dbId) {
        await whatsappTemplateService.updateTemplate(tpl.dbId, { status: newStatus });
      }

      setTemplates(prev =>
        prev.map(t => (t.id === templateId ? { ...t, status: newStatus } : t))
      );
      showToast(`Template marked as ${newStatus} in database`);
    } catch (err: any) {
      console.error('Failed to update status in database', err);
      showToast(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  };

  // Open Template Editor (Edit or Create New)
  const handleOpenEditor = (template?: UnifiedTemplate) => {
    if (template) {
      setEditingTemplate(JSON.parse(JSON.stringify(template)));
    } else {
      const channel = (activeTab === 'sms' || activeTab === 'email' || activeTab === 'whatsapp') ? activeTab : 'sms';
      const newTemp: UnifiedTemplate = {
        id: `custom-${Date.now()}`,
        channel,
        name: `New ${channel.toUpperCase()} Template`,
        key: `custom.${channel}_${Date.now().toString().slice(-4)}`,
        category: 'General',
        description: `Custom ${channel} template for Vidya Setu`,
        subject: channel === 'email' ? 'Notification from Vidya Setu' : undefined,
        body: channel === 'email'
          ? 'Dear {{parent.name}}, this is an update regarding {{student.name}} from {{institute.name}}.'
          : 'Vidya Setu: Hello {{student.name}}, your update for {{batch.name}} is ready.',
        htmlBody: channel === 'email'
          ? `<h1 style="color:#1e3a8a;font-size:20px;">Notification from Vidya Setu</h1><p>Dear {{parent.name}},</p><p>This is an update regarding <strong>{{student.name}}</strong> from <strong>{{institute.name}}</strong>.</p>`
          : undefined,
        status: 'active',
        version: 'v1',
        variables: [
          { key: 'student.name', label: 'Student Name', type: 'text', example: 'Aarav Sharma' },
          { key: 'institute.name', label: 'Institute Name', type: 'text', example: 'Delhi Public Academy' }
        ]
      };
      setEditingTemplate(newTemp);
    }
  };

  // Save template from editor into MySQL database (create or update)
  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim() || !editingTemplate.key.trim()) {
      showToast('Name and Template Key are required');
      return;
    }

    try {
      const isEditing = Boolean(editingTemplate.dbId);
      const savedTemplate = { ...editingTemplate };

      if (editingTemplate.channel === 'sms') {
        if (isEditing) {
          await smsTemplateService.updateTemplate(editingTemplate.dbId!, {
            template_name: editingTemplate.name,
            category: editingTemplate.category || 'General',
            dlt_template_id: editingTemplate.dltId || 'DLT_DEFAULT',
            message_body: editingTemplate.body,
            status: editingTemplate.status,
          });
        } else {
          const res = await smsTemplateService.createTemplate({
            tenant_id: 1,
            template_name: editingTemplate.name,
            template_key: editingTemplate.key,
            category: editingTemplate.category || 'General',
            dlt_template_id: editingTemplate.dltId || 'DLT_DEFAULT',
            message_body: editingTemplate.body,
            status: editingTemplate.status,
          });
          if (res?.data?.id) {
            savedTemplate.dbId = res.data.id;
            savedTemplate.id = `sms-${res.data.id}`;
          }
        }
      } else if (editingTemplate.channel === 'email') {
        const varsObj = editingTemplate.variables.reduce((acc: any, v) => ({ ...acc, [v.key]: v.label }), {});
        if (isEditing) {
          await emailTemplateService.updateTemplate(String(editingTemplate.dbId!), {
            name: editingTemplate.name,
            category: editingTemplate.category || 'ONBOARDING',
            subject: editingTemplate.subject || editingTemplate.name,
            description: editingTemplate.description,
            html_body: editingTemplate.htmlBody || editingTemplate.body,
            text_body: editingTemplate.body,
            variables: varsObj,
          });
        } else {
          const res = await emailTemplateService.createTemplate({
            template_key: editingTemplate.key,
            name: editingTemplate.name,
            category: editingTemplate.category || 'ONBOARDING',
            subject: editingTemplate.subject || editingTemplate.name,
            description: editingTemplate.description,
            html_body: editingTemplate.htmlBody || editingTemplate.body,
            text_body: editingTemplate.body,
            variables: varsObj,
            status: editingTemplate.status.toUpperCase(),
          });
          if (res?.data?.id) {
            savedTemplate.dbId = res.data.id;
            savedTemplate.id = `email-${res.data.id}`;
          }
        }
      } else if (editingTemplate.channel === 'whatsapp') {
        if (isEditing) {
          await whatsappTemplateService.updateTemplate(editingTemplate.dbId!, {
            template_name: editingTemplate.name,
            category: editingTemplate.category || 'General',
            dlt_template_id: editingTemplate.dltId || 'WA_DEFAULT',
            message_body: editingTemplate.body,
            buttons: (editingTemplate.buttons as any) || null,
            status: editingTemplate.status,
          });
        } else {
          const res = await whatsappTemplateService.createTemplate({
            tenant_id: 1,
            template_name: editingTemplate.name,
            template_key: editingTemplate.key,
            category: editingTemplate.category || 'General',
            dlt_template_id: editingTemplate.dltId || 'WA_DEFAULT',
            header_type: 'none',
            header_content: null,
            footer_text: null,
            message_body: editingTemplate.body,
            buttons: (editingTemplate.buttons as any) || null,
            status: editingTemplate.status,
          });
          if (res?.data?.id) {
            savedTemplate.dbId = res.data.id;
            savedTemplate.id = `wa-${res.data.id}`;
          }
        }
      }

      setTemplates(prev => {
        const idx = prev.findIndex(t => t.id === savedTemplate.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = savedTemplate;
          return copy;
        } else {
          return [savedTemplate, ...prev];
        }
      });

      showToast(`Template "${savedTemplate.name}" saved to database`);
      setEditingTemplate(null);
    } catch (err: any) {
      console.error('Failed to save template to database', err);
      showToast(`Error saving template: ${err.response?.data?.message || err.message}`);
    }
  };

  // Delete template from MySQL database
  const handleDeleteTemplate = async (id: string | number) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;

    if (window.confirm(`Are you sure you want to delete template "${tpl.name}" from database?`)) {
      try {
        if (tpl.channel === 'sms' && tpl.dbId) {
          await smsTemplateService.deleteTemplate(tpl.dbId);
        } else if (tpl.channel === 'email' && tpl.dbId) {
          await emailTemplateService.deleteTemplate(String(tpl.dbId));
        } else if (tpl.channel === 'whatsapp' && tpl.dbId) {
          await whatsappTemplateService.deleteTemplate(tpl.dbId);
        }

        setTemplates(prev => prev.filter(t => t.id !== id));
        showToast('Template deleted from database');
        setEditingTemplate(null);
      } catch (err: any) {
        console.error('Failed to delete template from database', err);
        showToast(`Failed to delete template: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Execute channel test
  const handleTestChannel = (channelKey: ChannelType) => {
    setIsTestingChannel(channelKey);
    setTimeout(() => {
      const ch = channels[channelKey];
      const hasConfig = ch.endpoint !== '-' && ch.endpoint.length > 0;
      const nowStr = new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).toLowerCase();

      setChannels(prev => ({
        ...prev,
        [channelKey]: {
          ...prev[channelKey],
          testStatus: hasConfig ? 'PASSED' : 'SKIPPED',
          lastTested: hasConfig
            ? `Last tested ${nowStr} — HTTP 200 OK (${prev[channelKey].label})`
            : `Last tested ${nowStr} — No endpoint URL configured`
        }
      }));

      // Add a test delivery
      const newDel: DeliveryLog = {
        id: `del-${Date.now()}`,
        recipient: channelKey === 'email' ? 'admin@vidyasetu.com' : '+91 98765 00000',
        channel: channelKey,
        templateKey: 'system.channel_test_ping',
        templateName: `${channelKey.toUpperCase()} Self-Test Probe`,
        status: hasConfig ? 'SENT' : 'FAILED',
        providerMsgId: hasConfig ? `test_ack_${Date.now()}` : 'ERR_NO_ENDPOINT',
        timestamp: 'Just now',
        details: hasConfig
          ? `Ping dispatched to ${ch.endpoint} with provider ${ch.provider}`
          : 'Channel test skipped because endpoint URL is unconfigured'
      };
      setDeliveries(prev => [newDel, ...prev]);

      setIsTestingChannel(null);
      showToast(hasConfig ? `${channelKey.toUpperCase()} Test Succeeded!` : `${channelKey.toUpperCase()} Test: No endpoint configured`);
    }, 800);
  };

  // Save channel configuration to MySQL system_configurations table
  const handleSaveChannelConfig = async (channelKey: ChannelType) => {
    try {
      const ch = channels[channelKey];
      let parsedCreds: any = {};
      try {
        parsedCreds = JSON.parse(ch.providerOptionsJson);
      } catch {
        parsedCreds = {};
      }

      if (channelKey === 'sms') {
        if (ch.endpoint && ch.endpoint !== '-') parsedCreds.api_endpoint = ch.endpoint;
        if (ch.apiKey) parsedCreds.auth_token = ch.apiKey;
        if (ch.sender) parsedCreds.from_number = ch.sender;
      } else if (channelKey === 'email') {
        if (ch.endpoint && ch.endpoint !== '-') {
          const parts = ch.endpoint.split(':');
          parsedCreds.smtp_host = parts[0];
          if (parts[1]) parsedCreds.smtp_port = parts[1];
        }
        if (ch.apiKey) parsedCreds.smtp_password = ch.apiKey;
        if (ch.sender) parsedCreds.from_email = ch.sender;
      } else if (channelKey === 'whatsapp') {
        if (ch.endpoint && ch.endpoint !== '-') parsedCreds.api_endpoint = ch.endpoint;
        if (ch.apiKey) parsedCreds.auth_token = ch.apiKey;
      }

      const payload = {
        provider_name: ch.provider || (channelKey === 'sms' ? 'Twilio' : channelKey === 'email' ? 'SMTP Server' : 'Meta Cloud API'),
        is_enabled: ch.enabledForSending,
        sender_id: ch.sender || null,
        credentials: parsedCreds
      };

      await systemConfigurationService.save(channelKey.toUpperCase() as any, payload);
      showToast(`${ch.name} configuration saved to database`);
      setConfiguringChannelId(null);
    } catch (err: any) {
      console.error('Failed to save channel config to database', err);
      showToast(`Error saving configuration: ${err.response?.data?.message || err.message}`);
    }
  };

  // Open test send modal with pre-filled default
  const handleOpenTestModal = (targetTemplate: UnifiedTemplate) => {
    setTestingTemplate(targetTemplate);
    setTestSendRecipient(targetTemplate.channel === 'email' ? 'parent.sharma@gmail.com' : '+91 98201 12450');
    setIsTestSendModalOpen(true);
  };

  // Dispatch test send from template modal
  const handleSendTestFromTemplate = () => {
    const target = testingTemplate || editingTemplate;
    if (!target || isDispatchingTest) return;
    const recipient = testSendRecipient.trim() || (target.channel === 'email' ? 'parent.sharma@gmail.com' : '+91 98201 12450');

    setIsDispatchingTest(true);
    setTimeout(() => {
      const newDelivery: DeliveryLog = {
        id: `del-${Date.now()}`,
        recipient,
        channel: target.channel,
        templateKey: target.key,
        templateName: target.name,
        status: 'SENT',
        providerMsgId: `msg_${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        timestamp: 'Just now',
        details: `Test dispatch delivered to provider adapter for ${recipient}`
      };

      setDeliveries(prev => [newDelivery, ...prev]);
      setIsDispatchingTest(false);
      setIsTestSendModalOpen(false);
      setTestingTemplate(null);
      showToast(`Test message dispatched to ${recipient}!`);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className={`${editingTemplate ? 'max-w-[1520px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 pt-6 transition-all duration-150`}>
        {editingTemplate ? (
          <TemplateEditorModal
            template={editingTemplate}
            onChange={setEditingTemplate}
            onClose={() => setEditingTemplate(null)}
            onSave={handleSaveTemplate}
            onDelete={() => handleDeleteTemplate(editingTemplate.id)}
            isPreviewHidden={isPreviewHidden}
            onTogglePreview={() => setIsPreviewHidden(!isPreviewHidden)}
            showToast={showToast}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono mb-1">
                  MESSAGING
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Templates
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Channel configuration, SMS / email / WhatsApp templates and the outbound delivery log.
                </p>
              </div>

              {/* Top Action Button (Vidya Setu Blue Accent) */}
              {(activeTab === 'sms' || activeTab === 'email' || activeTab === 'whatsapp') && (
                <button
                  onClick={() => handleOpenEditor()}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-xs transition-all transform active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    New {activeTab === 'sms' ? 'SMS' : activeTab === 'email' ? 'email' : 'WhatsApp'} template
                  </span>
                </button>
              )}
            </div>

            {/* Navigation Tabs Bar (Vidya Setu Theme) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 flex items-center gap-1.5 mb-8 shadow-xs overflow-x-auto">
          {/* Tab: Channel Config */}
          <button
            onClick={() => handleTabChange('channel-config')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'channel-config'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Channel Config</span>
          </button>

          {/* Tab: SMS */}
          <button
            onClick={() => handleTabChange('sms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sms'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>SMS</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'sms' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {smsCount}
            </span>
          </button>

          {/* Tab: Email */}
          <button
            onClick={() => handleTabChange('email')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'email'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'email' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {emailCount}
            </span>
          </button>

          {/* Tab: WhatsApp */}
          <button
            onClick={() => handleTabChange('whatsapp')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'whatsapp' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {whatsappCount}
            </span>
          </button>

          {/* Tab: Deliveries */}
          <button
            onClick={() => handleTabChange('deliveries')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'deliveries'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Deliveries</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'deliveries' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deliveriesCount}
            </span>
          </button>
        </div>

        {/* TAB CONTENT 1: CHANNEL CONFIG */}
        {activeTab === 'channel-config' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Channels Cards */}
            {(['sms', 'email', 'whatsapp'] as ChannelType[]).map(channelKey => {
              const ch = channels[channelKey];
              const isConfiguring = configuringChannelId === channelKey;

              return (
                <div
                  key={channelKey}
                  className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all"
                >
                  {/* Card Header & Summary Bar */}
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Icon, Title, Badges & Subtitle */}
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-600 flex-shrink-0 mt-0.5">
                          {channelKey === 'sms' && <Smartphone className="w-5 h-5" />}
                          {channelKey === 'email' && <Mail className="w-5 h-5" />}
                          {channelKey === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center flex-wrap gap-2.5">
                            <span className="font-extrabold text-base tracking-wide text-slate-900 uppercase">
                              {ch.name}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                ch.status === 'ENABLED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {ch.status}
                            </span>
                            {ch.testStatus && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                TEST: {ch.testStatus}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 font-medium mt-1">
                            {ch.summary}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {ch.lastTested}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start lg:self-center">
                        {isConfiguring ? (
                          <button
                            onClick={() => setConfiguringChannelId(null)}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfiguringChannelId(channelKey)}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Configure
                          </button>
                        )}

                        <button
                          onClick={() => handleTestChannel(channelKey)}
                          disabled={isTestingChannel === channelKey}
                          className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Zap className={`w-3.5 h-3.5 text-blue-600 ${isTestingChannel === channelKey ? 'animate-spin' : ''}`} />
                          <span>Test</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata Columns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-100 text-xs">
                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          ENDPOINT
                        </div>
                        <div className="font-medium text-slate-700 mt-1 truncate">
                          {ch.endpoint || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          API KEY
                        </div>
                        <div className="font-semibold text-amber-600 mt-1">
                          {ch.apiKey ? '••••••••' : 'Not configured'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          {channelKey === 'email' ? 'FROM ADDRESS' : 'SENDER'}
                        </div>
                        <div className="font-medium text-slate-700 mt-1 truncate">
                          {ch.sender || '-'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          REQUIRED
                        </div>
                        <div className="font-medium text-amber-600 flex items-center gap-1 mt-1">
                          <span>⚠</span>
                          <span>{ch.required.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Channel Editor Inline Drawer */}
                  {isConfiguring && (
                    <div className="bg-slate-50/70 border-t border-slate-200 p-6 space-y-5 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Provider */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            PROVIDER
                          </label>
                          <select
                            value={ch.provider}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], provider: e.target.value }
                              }))
                            }
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Generic HTTP (any gateway)">Generic HTTP (any gateway)</option>
                            <option value="Twilio">Twilio</option>
                            <option value="AWS SNS / SES">AWS SNS / SES</option>
                            <option value="Gupshup">Gupshup</option>
                            <option value="Msg91">Msg91</option>
                            <option value="SendGrid">SendGrid</option>
                          </select>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Configure method, path, auth header and a JSON body skeleton below.
                          </p>
                        </div>

                        {/* Label */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            LABEL
                          </label>
                          <input
                            type="text"
                            value={ch.label}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], label: e.target.value }
                              }))
                            }
                            placeholder="e.g. Vidya Setu Transactional Gateway"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Endpoint URL */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          ENDPOINT URL
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            value={ch.endpoint === '-' ? '' : ch.endpoint}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], endpoint: e.target.value }
                              }))
                            }
                            placeholder="https://api.example.com/v1/send"
                            className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                          />
                          <Link2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>

                      {/* API Key & Sender ID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* API Key */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            API KEY / TOKEN
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKeyMap[channelKey] ? 'text' : 'password'}
                              value={ch.apiKey}
                              onChange={e =>
                                setChannels(prev => ({
                                  ...prev,
                                  [channelKey]: { ...prev[channelKey], apiKey: e.target.value }
                                }))
                              }
                              placeholder="Paste the key"
                              className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowApiKeyMap(p => ({ ...p, [channelKey]: !p[channelKey] }))
                              }
                              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                            >
                              {showApiKeyMap[channelKey] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-600 inline" />
                            <span>Stored securely. Masked on every read and never written to audit logs.</span>
                          </p>
                        </div>

                        {/* Sender ID */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            {channelKey === 'email' ? 'FROM ADDRESS' : 'SENDER ID'}
                          </label>
                          <input
                            type="text"
                            value={ch.sender}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: { ...prev[channelKey], sender: e.target.value }
                              }))
                            }
                            placeholder={channelKey === 'email' ? 'notifications@vidyasetu.com' : 'VIDSETU'}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Alphanumeric sender id approved with your SMS gateway / DLT template header.
                          </p>
                        </div>
                      </div>

                      {/* Provider Options (JSON) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          PROVIDER OPTIONS (JSON)
                        </label>
                        <textarea
                          rows={4}
                          value={ch.providerOptionsJson}
                          onChange={e =>
                            setChannels(prev => ({
                              ...prev,
                              [channelKey]: { ...prev[channelKey], providerOptionsJson: e.target.value }
                            }))
                          }
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Auth header/scheme and JSON body skeleton. Placeholders &#123;&#123;to&#125;&#125;, &#123;&#123;from&#125;&#125;, &#123;&#123;subject&#125;&#125;, &#123;&#123;text&#125;&#125; and &#123;&#123;html&#125;&#125; each fill a whole string value.
                        </p>
                      </div>

                      {/* Enable Checkbox & Save Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800 select-none">
                          <input
                            type="checkbox"
                            checked={ch.enabledForSending}
                            onChange={e =>
                              setChannels(prev => ({
                                ...prev,
                                [channelKey]: {
                                  ...prev[channelKey],
                                  enabledForSending: e.target.checked,
                                  status: e.target.checked ? 'ENABLED' : 'DISABLED'
                                }
                              }))
                            }
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span>Enable this channel for sending</span>
                        </label>

                        <button
                          onClick={() => handleSaveChannelConfig(channelKey)}
                          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-xs transition-all cursor-pointer"
                        >
                          <span>Save channel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* How a send works */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-6 text-xs text-slate-600 space-y-3">
              <div className="font-bold text-sm text-slate-900">
                How a send works
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-slate-600">
                <li>A SaaS or Institute admin picks an educational template and enters recipients (or triggers automated alerts on attendance, fees, or doubts).</li>
                <li>Each recipient's variables are rendered into the template body and subject dynamically.</li>
                <li>The matching channel config is read and the provider adapter builds the HTTP request — body shape comes from the channel's extra_config.</li>
                <li>Every recipient gets its own delivery-log row: SENT with the provider message id, or FAILED with the reason.</li>
              </ol>
              <div className="flex items-start gap-2 pt-2 text-amber-700 text-xs">
                <span className="font-bold">⚠</span>
                <span>
                  Delivery receipts from the gateway (DELIVERED / READ) are logged when webhook callbacks are triggered. Outbound dispatches settle at SENT or FAILED.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT 2, 3, 4: TEMPLATE LIST */}
        {(activeTab === 'sms' || activeTab === 'email' || activeTab === 'whatsapp') && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search and Filters Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3.5">
                {/* Search input with label */}
                <div className="flex-1">
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    SEARCH
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by name, key, or message..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-44">
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    STATUS
                  </label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="w-full sm:w-48">
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="Admission">Admission</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Fees & Finance">Fees & Finance</option>
                    <option value="Exams & Academics">Exams & Academics</option>
                    <option value="Schedule & Timetable">Schedule & Timetable</option>
                    <option value="General">General</option>
                  </select>
                </div>

                {/* Reset Filters button */}
                {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setCategoryFilter('all');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer self-stretch sm:self-end flex items-center justify-center gap-1.5 shrink-0 h-[38px]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Template Cards List */}
            {isLoadingTemplates ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                <p className="text-slate-500 text-sm font-medium">Loading templates from database...</p>
              </div>
            ) : currentChannelTemplates.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <p className="text-slate-500 text-sm">No templates found matching your search.</p>
              </div>
            ) : (
              paginatedTemplates.map(tpl => (
                <div
                  key={tpl.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  {/* Left: Template info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center flex-wrap gap-2.5">
                      <span className="font-bold text-slate-900 text-base">
                        {tpl.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          tpl.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tpl.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{tpl.status}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {tpl.version}
                      </span>
                    </div>

                    {/* Monospace Template Key */}
                    <div className="font-mono text-xs text-slate-400 tracking-tight">
                      {tpl.key}
                    </div>

                    {/* Subject preview if email */}
                    {tpl.subject && (
                      <div className="text-xs font-semibold text-slate-700">
                        Subject: <span className="font-normal text-slate-600">{tpl.subject}</span>
                      </div>
                    )}

                    {/* Message Body preview */}
                    <div className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-2">
                      {tpl.body}
                    </div>

                    {/* Clickable Variable Tag Pills */}
                    {tpl.variables && tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tpl.variables.map(v => (
                          <span
                            key={v.key}
                            className="bg-slate-50 border border-slate-200/80 text-slate-600 font-mono text-[11px] px-2 py-0.5 rounded-md"
                          >
                            {v.key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Test send, Edit & Deactivate */}
                  <div className="flex items-center gap-2 self-end md:self-start flex-shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenTestModal(tpl)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      <span>Test send</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditor(tpl)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(tpl.id)}
                      className="px-2 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      {tpl.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Template Pagination */}
            {totalTemplates > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <Pagination
                  currentPage={templatePage}
                  totalPages={totalTemplatePages}
                  totalItems={totalTemplates}
                  pageSize={templatePageSize}
                  onPageChange={setTemplatePage}
                  onPageSizeChange={setTemplatePageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 5: DELIVERIES (Outbound Delivery Log) */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Outbound Delivery Log
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live delivery status records generated by provider adapters across Vidya Setu channels.
                  </p>
                </div>
                <button
                  onClick={() => showToast('Delivery log refreshed')}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Recipient</th>
                      <th className="px-5 py-3.5">Channel</th>
                      <th className="px-5 py-3.5">Template</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Provider Msg ID</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDeliveries.map(del => (
                      <tr key={del.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900 font-mono">
                          {del.recipient}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              del.channel === 'sms'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : del.channel === 'email'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {del.channel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">
                          <div className="font-semibold">{del.templateName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{del.templateKey}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              del.status === 'SENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {del.status === 'SENT' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            )}
                            <span>{del.status}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                          {del.providerMsgId}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {del.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Deliveries Pagination */}
              {totalDeliveries > 0 && (
                <Pagination
                  currentPage={deliveriesPage}
                  totalPages={totalDeliveriesPages}
                  totalItems={totalDeliveries}
                  pageSize={deliveriesPageSize}
                  onPageChange={setDeliveriesPage}
                  onPageSizeChange={setDeliveriesPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* TEST SEND DISPATCH MODAL */}
      {(() => {
        const activeTestTemplate = testingTemplate || editingTemplate;
        if (!isTestSendModalOpen || !activeTestTemplate) return null;

        return createPortal(
          <div 
            className="fixed inset-0 z-[99999] bg-transparent flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => {
              if (!isDispatchingTest) {
                setIsTestSendModalOpen(false);
                setTestingTemplate(null);
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200/90 ring-1 ring-slate-900/10 space-y-5 animate-in fade-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    activeTestTemplate.channel === 'email'
                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                      : activeTestTemplate.channel === 'whatsapp'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                  }`}>
                    {activeTestTemplate.channel === 'email' && <Mail className="w-5 h-5" />}
                    {activeTestTemplate.channel === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                    {activeTestTemplate.channel === 'sms' && <Smartphone className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <span>Test Dispatch</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {activeTestTemplate.channel}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Send a test message with live substitution values.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDispatchingTest) {
                      setIsTestSendModalOpen(false);
                      setTestingTemplate(null);
                    }
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Template Information Card */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 truncate">{activeTestTemplate.name}</span>
                  <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {activeTestTemplate.key}
                  </span>
                </div>
                {activeTestTemplate.subject && (
                  <div className="text-slate-500 truncate pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="font-medium text-slate-600">Subject: </span>
                    <span>{activeTestTemplate.subject}</span>
                  </div>
                )}
              </div>

              {/* Recipient Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {activeTestTemplate.channel === 'email' ? 'RECIPIENT EMAIL ADDRESS' : 'RECIPIENT PHONE NUMBER'}
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-slate-400">
                    {activeTestTemplate.channel === 'email' ? <Mail className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  </div>
                  <input
                    type={activeTestTemplate.channel === 'email' ? 'email' : 'tel'}
                    value={testSendRecipient}
                    onChange={e => setTestSendRecipient(e.target.value)}
                    placeholder={activeTestTemplate.channel === 'email' ? 'parent.sharma@gmail.com' : '+91 98201 12345'}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <span className="text-blue-500 font-bold">ℹ</span>
                  <span>The message will be routed through the configured gateway with sample tokens replaced.</span>
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDispatchingTest}
                  onClick={() => {
                    setIsTestSendModalOpen(false);
                    setTestingTemplate(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDispatchingTest}
                  onClick={handleSendTestFromTemplate}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDispatchingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Test</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

// ==========================================
// TEMPLATE EDITOR MODAL (SPLIT-VIEW)
// ==========================================
interface TemplateEditorModalProps {
  template: UnifiedTemplate;
  onChange: (t: UnifiedTemplate) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  isPreviewHidden: boolean;
  onTogglePreview: () => void;
  showToast: (msg: string) => void;
}

const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  template,
  onChange,
  onClose,
  onSave,
  onDelete,
  isPreviewHidden,
  onTogglePreview,
  showToast
}) => {
  const isEmail = template.channel === 'email';
  const isSMS = template.channel === 'sms';
  const isWhatsApp = template.channel === 'whatsapp';

  // Refs for tracking cursor position across fields
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  const lastCursorRef = useRef<{
    field: 'subject' | 'body' | 'htmlBody';
    start: number;
    end: number;
  }>({ field: 'body', start: (template.body || '').length, end: (template.body || '').length });

  const recordCursor = (
    field: 'subject' | 'body' | 'htmlBody',
    el: HTMLInputElement | HTMLTextAreaElement | null
  ) => {
    if (!el) return;
    lastCursorRef.current = {
      field,
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length
    };
  };

  // Cursor-accurate variable insertion
  const handleInsertVariable = (varKey: string) => {
    const token = `{{${varKey}}}`;
    const { field, start, end } = lastCursorRef.current;

    if (field === 'subject' && isEmail) {
      const current = template.subject || '';
      const s = Math.min(start, current.length);
      const e = Math.min(end, current.length);
      const updated = current.substring(0, s) + token + current.substring(e);
      onChange({ ...template, subject: updated });
      const nextPos = s + token.length;
      lastCursorRef.current = { field: 'subject', start: nextPos, end: nextPos };
      setTimeout(() => {
        if (subjectInputRef.current) {
          subjectInputRef.current.focus();
          subjectInputRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    } else if (field === 'htmlBody' && isEmail) {
      const current = template.htmlBody || '';
      const s = Math.min(start, current.length);
      const e = Math.min(end, current.length);
      const updated = current.substring(0, s) + token + current.substring(e);
      onChange({ ...template, htmlBody: updated });
      const nextPos = s + token.length;
      lastCursorRef.current = { field: 'htmlBody', start: nextPos, end: nextPos };
      setTimeout(() => {
        if (htmlTextareaRef.current) {
          htmlTextareaRef.current.focus();
          htmlTextareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    } else {
      const current = template.body || '';
      const s = Math.min(start, current.length);
      const e = Math.min(end, current.length);
      const updated = current.substring(0, s) + token + current.substring(e);
      onChange({ ...template, body: updated });
      const nextPos = s + token.length;
      lastCursorRef.current = { field: 'body', start: nextPos, end: nextPos };
      setTimeout(() => {
        if (bodyTextareaRef.current) {
          bodyTextareaRef.current.focus();
          bodyTextareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 0);
    }
    showToast(`Inserted {{${varKey}}}`);
  };

  const handleAddVariable = () => {
    const newVarKey = `custom.var_${(template.variables?.length || 0) + 1}`;
    const newVars = [
      ...(template.variables || []),
      { key: newVarKey, label: 'Custom Var', type: 'text' as const, example: 'Example' }
    ];
    onChange({ ...template, variables: newVars });
  };

  const handleUpdateVariable = (idx: number, patch: Partial<VariableDef>) => {
    const copy = [...(template.variables || [])];
    copy[idx] = { ...copy[idx], ...patch };
    onChange({ ...template, variables: copy });
  };

  const handleRemoveVariable = (idx: number) => {
    const copy = [...(template.variables || [])];
    copy.splice(idx, 1);
    onChange({ ...template, variables: copy });
  };

  const handleCopyToken = (varKey: string) => {
    navigator.clipboard.writeText(`{{${varKey}}}`);
    showToast(`Copied {{${varKey}}} to clipboard`);
  };

  // Safe regex token replacement escaping special characters like dots
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderTokens = (rawText: string) => {
    if (!rawText) return '';
    let rendered = rawText;
    (template.variables || []).forEach(v => {
      if (!v.key) return;
      try {
        const reg = new RegExp(`\\{\\{${escapeRegex(v.key)}\\}\\}`, 'g');
        rendered = rendered.replace(reg, v.example || `[${v.label || v.key}]`);
      } catch (e) {
        // Fallback for safety
        rendered = rendered.split(`{{${v.key}}}`).join(v.example || `[${v.label || v.key}]`);
      }
    });
    return rendered;
  };

  const renderedSubject = renderTokens(template.subject || '');
  const renderedBody = renderTokens(template.body || '');
  const renderedHtml = renderTokens(template.htmlBody || template.body || '');

  // Exact telecom segment calculation
  const calculateSegments = (len: number) => {
    if (len === 0) return 1;
    if (len <= 160) return 1;
    return Math.ceil(len / 153);
  };

  const smsBodyLength = template.body?.length || 0;
  const smsRenderedLength = renderedBody?.length || 0;
  const smsSegments = calculateSegments(smsBodyLength);
  const renderedSmsSegments = calculateSegments(smsRenderedLength);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
      <div className="pb-1">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {template.channel.toUpperCase()} templates</span>
        </button>
      </div>

      {/* Editor Full-Page Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        {/* Card Header Title */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              {isSMS && <Smartphone className="w-5 h-5" />}
              {isEmail && <Mail className="w-5 h-5" />}
              {isWhatsApp && <MessageCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {template.name || 'Untitled Template'}
                </h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {template.version || 'v1'}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {template.key} · {template.channel.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              title="Close editor"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split View Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
          {/* LEFT COLUMN: FORM EDITOR */}
          <div className={`${isPreviewHidden ? 'lg:col-span-12' : 'lg:col-span-7'} p-6 space-y-6`}>
            {/* Name & Template Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  NAME
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={e => onChange({ ...template, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  TEMPLATE KEY
                </label>
                <input
                  type="text"
                  value={template.key}
                  onChange={e => onChange({ ...template, key: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The key is the integration contract and cannot be changed.
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                DESCRIPTION
              </label>
              <input
                type="text"
                value={template.description}
                onChange={e => onChange({ ...template, description: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Subject (for Email) */}
            {isEmail && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    SUBJECT
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {(template.subject || '').length} / 120
                  </span>
                </div>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={template.subject || ''}
                  onFocus={e => recordCursor('subject', e.target)}
                  onClick={e => recordCursor('subject', e.currentTarget)}
                  onKeyUp={e => recordCursor('subject', e.currentTarget)}
                  onSelect={e => recordCursor('subject', e.currentTarget)}
                  onChange={e => {
                    recordCursor('subject', e.target);
                    onChange({ ...template, subject: e.target.value });
                  }}
                  maxLength={120}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            )}

            {/* Plain-text / Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  {isEmail ? 'PLAIN-TEXT BODY (FALLBACK)' : 'MESSAGE BODY'}
                </label>
                {isSMS && (
                  <span className={`text-[11px] font-mono font-semibold ${smsSegments > 1 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {smsBodyLength} / 1,000 ({smsSegments} segment{smsSegments > 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <textarea
                ref={bodyTextareaRef}
                rows={isEmail ? 4 : 6}
                value={template.body}
                onFocus={e => recordCursor('body', e.target)}
                onClick={e => recordCursor('body', e.currentTarget)}
                onKeyUp={e => recordCursor('body', e.currentTarget)}
                onSelect={e => recordCursor('body', e.currentTarget)}
                onChange={e => {
                  recordCursor('body', e.target);
                  onChange({ ...template, body: e.target.value });
                }}
                className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed shadow-2xs"
              />

              {/* Progress bar for SMS */}
              {isSMS && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      smsBodyLength > 160 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (smsBodyLength / 1000) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* INSERT VARIABLE PILLS */}
            {template.variables && template.variables.length > 0 && (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  CLICK TO INSERT VARIABLE AT CURSOR
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.variables.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      title={`Insert {{${v.key}}} at cursor position`}
                      className="bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 font-mono text-[11px] px-2.5 py-1 rounded-lg transition-all border border-slate-200 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      +{v.key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* HTML Body Editor (for Email only) */}
            {isEmail && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  HTML BODY
                </label>
                {/* Mini Formatting Toolbar */}
                <div className="bg-slate-50 border border-slate-200 border-b-0 rounded-t-xl px-3 py-1.5 flex items-center gap-1 text-slate-600 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<strong>bold</strong>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs font-bold cursor-pointer"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<em>italic</em>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs italic cursor-pointer"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<h2 style="color:#1e3a8a;">Title</h2>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs font-semibold cursor-pointer"
                  >
                    T
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = template.htmlBody || '';
                      onChange({ ...template, htmlBody: cur + '<a href="https://" style="color:#2563eb;">Link</a>' });
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded text-xs flex items-center cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" />
                  </button>
                </div>
                <textarea
                  ref={htmlTextareaRef}
                  rows={8}
                  value={template.htmlBody || ''}
                  onFocus={e => recordCursor('htmlBody', e.target)}
                  onClick={e => recordCursor('htmlBody', e.currentTarget)}
                  onKeyUp={e => recordCursor('htmlBody', e.currentTarget)}
                  onSelect={e => recordCursor('htmlBody', e.currentTarget)}
                  onChange={e => {
                    recordCursor('htmlBody', e.target);
                    onChange({ ...template, htmlBody: e.target.value });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-b-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Table-based inline styles only — Gmail and Outlook strip &lt;style&gt; blocks and external CSS.
                </p>
              </div>
            )}

            {/* VARIABLE CATALOGUE */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    VARIABLE CATALOGUE
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Declared tokens become insertable in the editor. Undeclared tokens are flagged on save.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 text-slate-700 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add variable</span>
                </button>
              </div>

              {/* Variables Rows */}
              <div className="space-y-3">
                {(template.variables || []).map((v, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/80 hover:bg-slate-50/95 border border-slate-200/90 rounded-2xl p-3.5 transition-all shadow-2xs space-y-3"
                  >
                    {/* Top Tier: Key, Data Type, and Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Key Token */}
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          TOKEN KEY
                        </label>
                        <input
                          type="text"
                          value={v.key}
                          onChange={e => handleUpdateVariable(idx, { key: e.target.value })}
                          placeholder="variable.name"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        />
                      </div>

                      {/* Data Type */}
                      <div className="w-full sm:w-32 shrink-0">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          DATA TYPE
                        </label>
                        <select
                          value={v.type}
                          onChange={e => handleUpdateVariable(idx, { type: e.target.value as any })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        >
                          <option value="text">text</option>
                          <option value="number">number</option>
                          <option value="date">date</option>
                          <option value="url">url</option>
                        </select>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto sm:pt-4 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleInsertVariable(v.key)}
                          title="Insert token into template"
                          className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Insert</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyToken(v.key)}
                          title={`Copy {{${v.key}}} to clipboard`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(idx)}
                          title="Remove variable"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-slate-200 bg-white hover:border-rose-200 shadow-2xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Tier: Label and Example Value */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/60">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          HUMAN LABEL
                        </label>
                        <input
                          type="text"
                          value={v.label}
                          onChange={e => handleUpdateVariable(idx, { label: e.target.value })}
                          placeholder="e.g. Student Full Name"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          SAMPLE VALUE (FOR PREVIEW)
                        </label>
                        <input
                          type="text"
                          value={v.example}
                          onChange={e => handleUpdateVariable(idx, { example: e.target.value })}
                          placeholder="e.g. Aarav Sharma"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={template.status === 'active'}
                  onChange={e => onChange({ ...template, status: e.target.checked ? 'active' : 'inactive' })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span>Active — inactive templates cannot be sent to real recipients</span>
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY LIVE PREVIEW */}
          {!isPreviewHidden && (
            <div className="lg:col-span-5 p-6 bg-slate-50/70">
              <div className="sticky top-6 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>LIVE PREVIEW</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Real-Time Token Substitution
                  </span>
                </div>

                {/* EMAIL LIVE PREVIEW */}
                {isEmail && (
                  <div className="space-y-4">
                    {/* Subject Box */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        SUBJECT
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-1">
                        {renderedSubject || 'No subject configured'}
                      </div>
                    </div>

                    {/* Rendered Email Content Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 min-h-[160px] overflow-hidden">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        RENDERED EMAIL
                      </div>
                      {template.htmlBody ? (
                        <div className="overflow-x-auto max-w-full">
                          <div
                            className="text-xs leading-relaxed text-slate-800 prose prose-slate max-w-none break-words [&_h1]:text-lg [&_h1]:sm:text-xl [&_h1]:break-words [&_h2]:text-base [&_h2]:break-words [&_table]:w-full [&_table]:min-w-0"
                            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                          />
                        </div>
                      ) : (
                        <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                          {renderedBody}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[11px] font-mono text-slate-400">
                      {(renderedHtml || renderedBody).length} chars
                    </div>
                  </div>
                )}

                {/* SMS LIVE PREVIEW */}
                {isSMS && (
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      MESSAGE BUBBLE
                    </div>

                    {/* Dark Navy / Indigo Phone Bubble */}
                    <div className="bg-[#0f172a] text-white p-5 rounded-2xl rounded-tl-xs text-sm leading-relaxed shadow-lg max-w-sm">
                      {renderedBody || 'Your message preview will appear here.'}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                      <span>{renderedSmsSegments} SMS segment{renderedSmsSegments > 1 ? 's' : ''}</span>
                      <span>{smsRenderedLength} chars</span>
                    </div>
                  </div>
                )}

                {/* WHATSAPP LIVE PREVIEW */}
                {isWhatsApp && (
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      WHATSAPP CHAT PREVIEW
                    </div>

                    {/* WhatsApp chat container */}
                    <div className="bg-[#efeae2] border border-[#d1d7db] p-4 rounded-2xl max-w-sm shadow-xs space-y-3">
                      <div className="bg-white p-3.5 rounded-xl rounded-tr-none text-slate-800 text-sm leading-relaxed shadow-2xs">
                        <div className="whitespace-pre-wrap">
                          {renderedBody}
                        </div>
                        <div className="text-[10px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1">
                          <span>12:00 PM</span>
                          <span className="text-sky-500 font-bold">✓✓</span>
                        </div>
                      </div>

                      {/* WhatsApp action buttons */}
                      {template.buttons && template.buttons.length > 0 && (
                        <div className="space-y-1.5">
                          {template.buttons.map((btn, bidx) => (
                            <div
                              key={bidx}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 text-center py-2 px-3 rounded-lg text-xs font-semibold shadow-2xs"
                            >
                              {btn.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex items-center justify-between flex-shrink-0">
          {/* Delete Template (Left) */}
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete template</span>
          </button>

          {/* Right: Cancel, Save changes */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
