import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const SystemConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'smtp' | 'sms' | 'payments' | 'branding' | 'security' | 'permissions'>('general');
  
  // General Constants State
  const [platformName, setPlatformName] = useState('Vidya Setu');
  const [supportEmail, setSupportEmail] = useState('support@vidyasetu.com');
  const [taxRate, setTaxRate] = useState('18');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [sessionTimeout, setSessionTimeout] = useState('60'); // minutes

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('apikey');
  const [smtpPass, setSmtpPass] = useState('SG.xxxxxxxxxxxxxxxxx');
  const [senderEmail, setSenderEmail] = useState('noreply@vidyasetu.com');

  // SMS & WhatsApp Gateway Settings
  const [smsGateway, setSmsGateway] = useState('Twilio');
  const [smsApiKey, setSmsApiKey] = useState('SK_twilio_xxxxxxxxx');
  const [waApiKey, setWaApiKey] = useState('WA_meta_xxxxxxxxx');
  const [dltId, setDltId] = useState('1101234567890123456');

  // Payment Settings
  const [stripeSecret, setStripeSecret] = useState('sk_live_51Pxxxxxxxxxxxxxxxx');
  const [stripePublishable, setStripePublishable] = useState('pk_live_51Pxxxxxxxxxxxxxxxx');
  const [razorpayId, setRazorpayId] = useState('rzp_live_xxxxxxxxxxx');
  const [razorpaySecret, setRazorpaySecret] = useState('xxxxxxxxxxxxxxxxxxxx');

  // Branding
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [logoUrl, setLogoUrl] = useState('https://vidyasetu.com/assets/logo.png');

  // Security & Backups
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [backupSchedule, setBackupSchedule] = useState('Daily');
  const [passwordMinLength, setPasswordMinLength] = useState('8');

  // RBAC State
  const [selectedRole, setSelectedRole] = useState<'institute_admin' | 'branch_admin' | 'teacher' | 'counsellor' | 'finance'>('institute_admin');
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    institute_admin: {
      'View Dashboard': true, 'Export Dashboard Data': true,
      'View Programs': true, 'Create Programs': false, 'Edit Programs': false, 'Delete Programs': false,
      'View Sessions': true, 'Create Sessions': true, 'Edit Sessions': true, 'Delete Sessions': true, 'Approve Sessions': true, 'Edit Session Links': false,
      'View Batches': true, 'Create Batches': true, 'Edit Batches': true, 'Delete Batches': false,
      'View Enrollments': true, 'Create Enrollments': true, 'Edit Enrollments': true, 'Approve Enrollments': true,
      'View Certificates': true, 'Generate Certificates': true, 'Issue Certificates': false
    },
    branch_admin: {
      'View Dashboard': true, 'Export Dashboard Data': false,
      'View Programs': true, 'Create Programs': false, 'Edit Programs': false, 'Delete Programs': false,
      'View Sessions': true, 'Create Sessions': true, 'Edit Sessions': true, 'Delete Sessions': false, 'Approve Sessions': false, 'Edit Session Links': true,
      'View Batches': true, 'Create Batches': true, 'Edit Batches': false, 'Delete Batches': false,
      'View Enrollments': true, 'Create Enrollments': true, 'Edit Enrollments': false, 'Approve Enrollments': false,
      'View Certificates': true, 'Generate Certificates': false, 'Issue Certificates': false
    },
    teacher: {
      'View Dashboard': true, 'Export Dashboard Data': false,
      'View Programs': true, 'Create Programs': false, 'Edit Programs': false, 'Delete Programs': false,
      'View Sessions': true, 'Create Sessions': false, 'Edit Sessions': false, 'Delete Sessions': false, 'Approve Sessions': false, 'Edit Session Links': true,
      'View Batches': true, 'Create Batches': false, 'Edit Batches': false, 'Delete Batches': false,
      'View Enrollments': false, 'Create Enrollments': false, 'Edit Enrollments': false, 'Approve Enrollments': false,
      'View Certificates': false, 'Generate Certificates': false, 'Issue Certificates': false
    },
    counsellor: {
      'View Dashboard': true, 'Export Dashboard Data': false,
      'View Programs': true, 'Create Programs': false, 'Edit Programs': false, 'Delete Programs': false,
      'View Sessions': false, 'Create Sessions': false, 'Edit Sessions': false, 'Delete Sessions': false, 'Approve Sessions': false, 'Edit Session Links': false,
      'View Batches': false, 'Create Batches': false, 'Edit Batches': false, 'Delete Batches': false,
      'View Enrollments': true, 'Create Enrollments': true, 'Edit Enrollments': true, 'Approve Enrollments': false,
      'View Certificates': false, 'Generate Certificates': false, 'Issue Certificates': false
    },
    finance: {
      'View Dashboard': true, 'Export Dashboard Data': true,
      'View Programs': false, 'Create Programs': false, 'Edit Programs': false, 'Delete Programs': false,
      'View Sessions': false, 'Create Sessions': false, 'Edit Sessions': false, 'Delete Sessions': false, 'Approve Sessions': false, 'Edit Session Links': false,
      'View Batches': false, 'Create Batches': false, 'Edit Batches': false, 'Delete Batches': false,
      'View Enrollments': true, 'Create Enrollments': false, 'Edit Enrollments': false, 'Approve Enrollments': false,
      'View Certificates': false, 'Generate Certificates': false, 'Issue Certificates': false
    }
  });

  const [toast, setToast] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToast('Configuration settings updated successfully.');
    setTimeout(() => setToast(''), 4000);
  };

  const handleTogglePermission = (permission: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [permission]: !prev[selectedRole][permission]
      }
    }));
  };

  const tabs = [
    { id: 'general', label: 'General Parameters' },
    { id: 'smtp', label: 'SMTP & Email' },
    { id: 'sms', label: 'SMS & WhatsApp' },
    { id: 'payments', label: 'Payment Gateways' },
    { id: 'branding', label: 'White-Label & DNS' },
    { id: 'security', label: 'Security & Backups' },
    { id: 'permissions', label: 'Roles & Permissions' }
  ] as const;

  const rolesList = [
    { id: 'institute_admin', label: 'Institute Admin', desc: 'Institute-level administration and setups' },
    { id: 'branch_admin', label: 'Branch Admin', desc: 'Branch operations and registrations' },
    { id: 'teacher', label: 'Teacher', desc: 'Schedules and doubt clearance' },
    { id: 'counsellor', label: 'Counsellor', desc: 'Lead pipeline and enquiry logs' },
    { id: 'finance', label: 'Finance', desc: 'Fee ledger and invoice records' }
  ] as const;

  const modulesData = [
    {
      title: 'Dashboard',
      permissions: ['View Dashboard', 'Export Dashboard Data']
    },
    {
      title: 'Programs',
      permissions: ['View Programs', 'Create Programs', 'Edit Programs', 'Delete Programs']
    },
    {
      title: 'Sessions',
      permissions: ['View Sessions', 'Create Sessions', 'Edit Sessions', 'Delete Sessions', 'Approve Sessions', 'Edit Session Links']
    },
    {
      title: 'Batches',
      permissions: ['View Batches', 'Create Batches', 'Edit Batches', 'Delete Batches']
    },
    {
      title: 'Enrollments',
      permissions: ['View Enrollments', 'Create Enrollments', 'Edit Enrollments', 'Approve Enrollments']
    },
    {
      title: 'Certificates',
      permissions: ['View Certificates', 'Generate Certificates', 'Issue Certificates']
    }
  ];

  const currentPermissions = rolePermissions[selectedRole] || {};
  const totalPermissions = Object.keys(currentPermissions).length;
  const selectedCount = Object.values(currentPermissions).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 animate-fade-in shadow-sm">
          ✓ {toast}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900">System Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Update SaaS defaults, system parameter keys, white-label configurations, email/SMS template defaults.
        </p>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 text-sm font-semibold cursor-pointer border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-350'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'permissions' ? (
        <div className="w-full space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
              
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Global Platform Configuration Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="SaaS Platform Name" value={platformName} onChange={e => setPlatformName(e.target.value)} />
                    <Input label="Global Support Relay Email" type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Default GST Rate (%)" type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                    <Select 
                      label="Platform Base Currency" 
                      value={defaultCurrency} 
                      onChange={e => setDefaultCurrency(e.target.value)}
                      options={[
                        { value: 'INR', label: 'INR (₹)' },
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'EUR', label: 'EUR (€)' }
                      ]} 
                    />
                    <Input label="Admin Idle Timeout (min)" type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} />
                  </div>
                </div>
              )}

              {activeTab === 'smtp' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">SMTP Mail Relay Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="SMTP Host Server" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
                    <Input label="SMTP Port" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="SMTP Username" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} />
                    <Input label="SMTP Password" type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
                  </div>
                  <Input label="Global Default Sender Email (From)" type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} />
                </div>
              )}

              {activeTab === 'sms' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">SMS & WhatsApp Gateway Keys</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select 
                      label="Primary SMS Gateway" 
                      value={smsGateway} 
                      onChange={e => setSmsGateway(e.target.value)}
                      options={[
                        { value: 'Twilio', label: 'Twilio Cloud API' },
                        { value: 'MessageBird', label: 'MessageBird' },
                        { value: 'Msg91', label: 'Msg91 (India DLT)' }
                      ]} 
                    />
                    <Input label="DLT Registration Entity ID (Header log)" value={dltId} onChange={e => setDltId(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="SMS Gateway Authentication Secret" type="password" value={smsApiKey} onChange={e => setSmsApiKey(e.target.value)} />
                    <Input label="WhatsApp Cloud API Bearer Token" type="password" value={waApiKey} onChange={e => setWaApiKey(e.target.value)} />
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Payment Gateway Integration Keys</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Stripe Publishable Key" value={stripePublishable} onChange={e => setStripePublishable(e.target.value)} />
                    <Input label="Stripe Secret Private Key" type="password" value={stripeSecret} onChange={e => setStripeSecret(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Razorpay Account ID" value={razorpayId} onChange={e => setRazorpayId(e.target.value)} />
                    <Input label="Razorpay Secret Key" type="password" value={razorpaySecret} onChange={e => setRazorpaySecret(e.target.value)} />
                  </div>
                </div>
              )}

              {activeTab === 'branding' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">White-Label & DNS Configurations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Brand Primary Theme Color (HEX)" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                    <Input label="Brand Secondary Theme Color (HEX)" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                  </div>
                  <Input label="White-Label Tenant Brand Logo URL" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Security & Auto-Backup Policies</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select 
                      label="Auto-Backup Schedule" 
                      value={backupSchedule} 
                      onChange={e => setBackupSchedule(e.target.value)}
                      options={[
                        { value: 'Hourly', label: 'Every Hour' },
                        { value: 'Daily', label: 'Daily at Midnight' },
                        { value: 'Weekly', label: 'Weekly on Sundays' }
                      ]} 
                    />
                    <Input label="Enforce Minimum Password Length" type="number" value={passwordMinLength} onChange={e => setPasswordMinLength(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <input 
                      type="checkbox" 
                      id="mfa" 
                      checked={mfaEnforced} 
                      onChange={e => setMfaEnforced(e.target.checked)} 
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="mfa" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Enforce Multi-Factor Authentication (MFA) on all Institute & SaaS admin accounts
                    </label>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <Button type="submit" variant="primary">
                  Save Platform Constants
                </Button>
              </div>
            </form>
          </div>
      ) : (
        /* Roles & Permissions Matrix View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          
          {/* Left panel: Roles List */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm h-fit">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mb-4">User Roles Definition</h3>
            {rolesList.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left p-3.5 rounded-lg border text-sm transition-all cursor-pointer block ${
                  selectedRole === role.id
                    ? 'border-blue-600 bg-blue-50/50 text-blue-800 font-semibold shadow-sm'
                    : 'border-slate-100 hover:border-slate-250 bg-slate-50/30 text-slate-700'
                }`}
              >
                <div className="font-semibold text-xs text-slate-900">{role.label}</div>
                <div className="text-[10px] text-slate-500 mt-1">{role.desc}</div>
              </button>
            ))}
          </div>

          {/* Right panel: Permissions Checkbox Cards */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Status counter banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 flex items-center justify-between text-xs text-blue-800 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">ℹ</span>
                <span>Select permissions to assign to this role. Changes are saved when you click "Save Permissions".</span>
              </div>
              <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                {selectedCount} / {totalPermissions} selected
              </span>
            </div>

            {/* Modules Checkbox Panels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modulesData.map((module) => {
                // Calculate checked status for parent module header
                const allChecked = module.permissions.every(p => currentPermissions[p]);
                const someChecked = module.permissions.some(p => currentPermissions[p]) && !allChecked;

                const handleToggleAllModule = () => {
                  const targetState = !allChecked;
                  setRolePermissions(prev => {
                    const nextObj = { ...prev[selectedRole] };
                    module.permissions.forEach(p => {
                      nextObj[p] = targetState;
                    });
                    return {
                      ...prev,
                      [selectedRole]: nextObj
                    };
                  });
                };

                return (
                  <div key={module.title} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={el => {
                            if (el) el.indeterminate = someChecked;
                          }}
                          onChange={handleToggleAllModule}
                          className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-bold text-slate-800 text-xs">{module.title}</span>
                      </div>
                      <span className="bg-slate-100 text-slate-600 font-bold text-[9px] px-2 py-0.2 rounded-full">
                        {module.permissions.length}
                      </span>
                    </div>

                    {/* Permissions list */}
                    <div className="space-y-2">
                      {module.permissions.map((perm) => (
                        <div key={perm} className="flex items-center gap-2.5 hover:bg-slate-50/50 p-1.5 rounded transition">
                          <input
                            type="checkbox"
                            id={`${selectedRole}-${perm}`}
                            checked={!!currentPermissions[perm]}
                            onChange={() => handleTogglePermission(perm)}
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor={`${selectedRole}-${perm}`} className="text-xs text-slate-600 cursor-pointer select-none">
                            {perm}
                          </label>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} variant="primary">
                Save Permissions
              </Button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
