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

    // Subscription Plan endpoints
    async getSubscriptionPlans(): Promise<any[]> {
        return this.request<any[]>('/api/subscription-plans');
    }

    async getSubscriptionPlanById(id: number): Promise<any> {
        return this.request<any>(`/api/subscription-plans/${id}`);
    }

    async createSubscriptionPlan(data: any): Promise<any> {
        return this.request<any>('/api/subscription-plans', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateSubscriptionPlan(id: number, data: any): Promise<any> {
        return this.request<any>(`/api/subscription-plans/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteSubscriptionPlan(id: number): Promise<any> {
        return this.request<any>(`/api/subscription-plans/${id}`, {
            method: 'DELETE',
        });
    }

    // User Subscription endpoints
    async getUserSubscriptions(userId: number): Promise<any[]> {
        return this.request<any[]>(`/api/subscriptions/user/${userId}`);
    }

    async getActiveSubscription(userId: number): Promise<any> {
        return this.request<any>(`/api/subscriptions/active/${userId}`);
    }

    async createSubscription(data: any): Promise<any> {
        return this.request<any>('/api/subscriptions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateSubscriptionStatus(id: number, status: string, end_date?: string): Promise<any> {
        return this.request<any>(`/api/subscriptions/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, end_date }),
        });
    }
}

export default new ApiService();
