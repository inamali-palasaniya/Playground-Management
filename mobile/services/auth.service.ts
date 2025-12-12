import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '../constants/api';

const API_URL = `${API_BASE_URL}/api`;


export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const AuthService = {
  login: async (email?: string, password?: string, phone?: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, phone, password }),
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

  logout: async () => {
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_data');
  },

  getToken: async () => {
    return await SecureStore.getItemAsync('user_token');
  },

  setToken: async (token: string) => {
    await SecureStore.setItemAsync('user_token', token);
  },

  getUser: async (): Promise<User | null> => {
    const userStr = await SecureStore.getItemAsync('user_data');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser: async (user: User) => {
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
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
};

