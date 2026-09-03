export type ChannelType = 'SMS' | 'EMAIL' | 'WHATSAPP';

export interface SmsCredentials {
  account_sid: string;
  auth_token: string;
  from_number: string;
  api_endpoint: string;
  test_phone: string;
}

export interface EmailCredentials {
  encryption: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  reply_to_email: string;
  test_email: string;
}

export interface WhatsAppCredentials {
  auth_token: string;
  api_endpoint: string;
  webhook_url: string;
  webhook_verify_token: string;
  test_phone: string;
}

export type ChannelCredentials = SmsCredentials | EmailCredentials | WhatsAppCredentials;

export interface SystemConfiguration {
  id: number;
  tenant_id: number;
  channel_type: ChannelType;
  provider_name: string;
  is_enabled: boolean | number;
  credentials: ChannelCredentials;
  sender_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
}

export interface SaveSystemConfigPayload {
  provider_name: string;
  is_enabled?: boolean;
  credentials: ChannelCredentials;
  sender_id?: string | null;
}
