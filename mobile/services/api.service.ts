import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';

interface Match {
  id: number;
  tournament_id: number;
  team_a_id: number;
  team_b_id: number;
  start_time: string;
  status: string;
  overs: number;
  team_a?: any;
  team_b?: any;
  tournament?: any;
}

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: string;
  group?: any;
}

interface CreateMatchData {
  tournament_id: number;
  team_a_id: number;
  team_b_id: number;
  start_time: string;
  overs: number;
}

interface CreateUserData {
  name: string;
  phone: string;
  email?: string;
  role: string;
  group_id?: number;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Match endpoints
  async getMatches(): Promise<Match[]> {
    return this.request<Match[]>(API_ENDPOINTS.matches);
  }

  async getMatchById(id: number): Promise<Match> {
    return this.request<Match>(`${API_ENDPOINTS.matches}/${id}`);
  }

  async createMatch(data: CreateMatchData): Promise<Match> {
    return this.request<Match>(API_ENDPOINTS.matches, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User endpoints
  async getUsers(): Promise<User[]> {
    return this.request<User[]>(API_ENDPOINTS.users);
  }

  async getUserById(id: number): Promise<User> {
    return this.request<User>(`${API_ENDPOINTS.users}/${id}`);
  }

  async createUser(data: CreateUserData): Promise<User> {
    return this.request<User>(API_ENDPOINTS.users, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiService();
