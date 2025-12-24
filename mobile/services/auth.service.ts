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
  // Check permission helper
  hasPermission: (user: User | null, module: string, action: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!user.permissions) return false; // Non-super admin with no permissions = no access? Or Default deny.

    const perm = user.permissions.find(p => p.module_name === module);
    if (!perm) return false; // Module not in permissions list = denied

    switch (action) {
      case 'view': return perm.can_view ?? false; // Default to false if undefined? Or true? "assume i added eye off" implies explicit. 
      // But legacy data lacks it. I'll default to TRUE for backward compatibility if logic requires, but user wants restriction. 
      // Actually, if I just added it, legacy data won't have it. 
      // If I default to FALSE, everyone loses access until updated. 
      // I'll default to FALSE to be safe, user can update permissions.
      case 'add': return perm.can_add;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
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

