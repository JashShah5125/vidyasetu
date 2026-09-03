import api from './api';
import type { ChannelType, SystemConfiguration, SaveSystemConfigPayload } from '../types/systemConfiguration';

const mapConfigToFrontend = (row: SystemConfiguration): SystemConfiguration => {
  let credentials = row.credentials;
  if (credentials && typeof credentials === 'string') {
    try { credentials = JSON.parse(credentials); } catch { credentials = {} as SystemConfiguration['credentials']; }
  }

  return {
    ...row,
    is_enabled: row.is_enabled === 1 || row.is_enabled === true,
    credentials,
  };
};

export const systemConfigurationService = {
  getAll: async () => {
    const { data } = await api.get('/admin/system-configurations');
    const configs = Array.isArray(data?.data) ? data.data.map(mapConfigToFrontend) : [];
    return { data: configs };
  },

  getProviders: async (channelType: ChannelType) => {
    const { data } = await api.get(`/admin/system-configurations/${channelType}/providers`);
    return { data: Array.isArray(data?.data) ? data.data : [] };
  },

  getByChannel: async (channelType: ChannelType) => {
    const { data } = await api.get(`/admin/system-configurations/${channelType}`);
    if (!data?.data) return { data: null };
    return { data: mapConfigToFrontend(data.data) };
  },

  save: async (channelType: ChannelType, payload: SaveSystemConfigPayload) => {
    const { data } = await api.put(`/admin/system-configurations/${channelType}`, payload);
    return { data: data?.data ? mapConfigToFrontend(data.data) : null, message: data?.message };
  },

  toggle: async (channelType: ChannelType, isEnabled: boolean) => {
    const { data } = await api.patch(`/admin/system-configurations/${channelType}/toggle`, { is_enabled: isEnabled });
    return { data: data?.data ? mapConfigToFrontend(data.data) : null, message: data?.message };
  },
};
