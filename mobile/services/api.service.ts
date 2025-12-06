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
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('API Request:', url);

        const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

        console.log('API Response Status:', response.status);

      if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

        const data = await response.json();
        console.log('API Response Data:', data);
        return data;
    } catch (error) {
      console.error('API request failed:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
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
