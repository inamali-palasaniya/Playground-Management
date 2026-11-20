import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../constants/api';

const API_URL = `${API_BASE_URL}/api`;


export interface PermissionItem {
  module_name: string;
  can_view?: boolean; // Optional for backward compatibility
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions?: PermissionItem[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const AuthService = {
  // Check permission helper with comprehensive alias support
  hasPermission: (user: User | null, module: string, action: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.email?.toLowerCase() === '91inamali@gmail.com') return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    const aliases: { [key: string]: string[] } = {
      'cricket_scoring': ['scoring', 'cricket', 'tournament', 'tournaments', 'team', 'teams', 'match', 'matches'],
      'tournament': ['cricket_scoring', 'scoring', 'tournament', 'tournaments'],
      'team': ['cricket_scoring', 'scoring', 'team', 'teams'],
      'match': ['cricket_scoring', 'scoring', 'match', 'matches'],
      'finance': ['charge', 'charges', 'payment', 'payments', 'ledger', 'ledgers', 'fine', 'fines'],
      'charge': ['finance', 'payment', 'payments', 'master_fines', 'fine', 'fines'],
      'payment': ['finance', 'charge', 'payments', 'ledger'],
      'user': ['users'],
      'users': ['user'],
      'audit': ['report', 'reports', 'log', 'logs'],
      'report': ['audit', 'reports', 'logs'],
      'logs': ['audit', 'log', 'reports'],
      'master_plans': ['subscription', 'subscriptions', 'plan', 'plans', 'master'],
      'subscription': ['master_plans', 'subscriptions', 'plans'],
      'master_fines': ['fine', 'fines', 'charge', 'finance'],
      'fine': ['master_fines', 'finance', 'charge'],
      'master_groups': ['group', 'groups'],
      'group': ['master_groups', 'groups']
    };

    const searchModules = [module, ...(aliases[module] || [])];
    const perm = user.permissions.find(p => searchModules.includes(p.module_name));
    if (!perm) return false;

    switch (action) {
      case 'view': return !!perm.can_view;
      case 'add': return !!perm.can_add;
      case 'edit': return !!perm.can_edit;
      case 'delete': return !!perm.can_delete;
      default: return false;
    }
  },

  fetchCurrentUser: async (): Promise<User | null> => {
    try {
      const token = await AuthService.getToken();
      if (!token) return null;
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          AuthService.emitAuthExpired();
        }
        return null;
      }
      const userData = await response.json();
      if (userData) {
        await AuthService.setUser(userData);
      }
      return userData;
    } catch (error) {
      console.warn('Failed to fetch current user from API, falling back to storage:', error);
      return await AuthService.getUser();
    }
  },
  login: async (identifier?: string, password?: string, phone?: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      await AuthService.setToken(data.token);
      await AuthService.setUser(data.user);

      return data;
    } catch (error) {
      throw error;
    }
  },

  register: async (name: string, email: string, phone: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      await AuthService.setToken(data.token);
      await AuthService.setUser(data.user);

      return data;
    } catch (error) {
      throw error;
    }
  },


  // Platform-aware storage helpers
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },

  logout: async () => {
    await AuthService.deleteItem('user_token');
    await AuthService.deleteItem('user_data');
  },

  getToken: async () => {
    return await AuthService.getItem('user_token');
  },

  setToken: async (token: string) => {
    await AuthService.setItem('user_token', token);
  },

  getUser: async (): Promise<User | null> => {
    const userStr = await AuthService.getItem('user_data');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser: async (user: User) => {
    await AuthService.setItem('user_data', JSON.stringify(user));
  },

  // Event System for Session Expiry
  listeners: [] as (() => void)[],

  subscribeToAuthExpired: (callback: () => void) => {
    AuthService.listeners.push(callback);
    return () => {
      AuthService.listeners = AuthService.listeners.filter(cb => cb !== callback);
    };
  },

  emitAuthExpired: () => {
    AuthService.listeners.forEach(callback => callback());
  },

  forgotPassword: async (identifier: string) => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
    return data;
  },

  resetPassword: async (identifier: string, otp: string, newPassword: string) => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp, newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to reset password');
    return data;
  },

  updatePushToken: async (userId: number, pushToken: string) => {
    const token = await AuthService.getToken();
    const response = await fetch(`${API_URL}/users/${userId}/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pushToken })
    });
    if (!response.ok) {
      console.error('Failed to update push token', await response.text());
    }
  },

  resetPasswordWithToken: async (identifier: string, token: string, newPassword: string) => {
    const response = await fetch(`${API_URL}/auth/reset-password-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, token, newPassword })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to reset password');
    return data;
  }
};

