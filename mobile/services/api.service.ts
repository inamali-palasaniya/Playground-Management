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

    // Attendance endpoints
    async checkIn(user_id: number, date?: string): Promise<any> {
        return this.request<any>('/api/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify({ user_id, date }),
        });
    }

    async getUserAttendance(userId: number, startDate?: string, endDate?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any[]>(`/api/attendance/user/${userId}${query}`);
    }

    async getAttendanceByDate(date: string): Promise<any[]> {
        return this.request<any[]>(`/api/attendance/date/${date}`);
    }

    async getAttendanceSummary(userId: number, startDate?: string, endDate?: string): Promise<any> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any>(`/api/attendance/summary/${userId}${query}`);
    }

    // Fine endpoints
    async getFineRules(): Promise<any[]> {
        return this.request<any[]>('/api/fines/rules');
    }

    async getFineRuleById(id: number): Promise<any> {
        return this.request<any>(`/api/fines/rules/${id}`);
    }

    async createFineRule(data: any): Promise<any> {
        return this.request<any>('/api/fines/rules', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateFineRule(id: number, data: any): Promise<any> {
        return this.request<any>(`/api/fines/rules/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteFineRule(id: number): Promise<any> {
        return this.request<any>(`/api/fines/rules/${id}`, {
            method: 'DELETE',
        });
    }

    async applyFine(user_id: number, rule_id: number): Promise<any> {
        return this.request<any>('/api/fines/apply', {
            method: 'POST',
            body: JSON.stringify({ user_id, rule_id }),
        });
    }

    async getUserFines(userId: number): Promise<any[]> {
        return this.request<any[]>(`/api/fines/user/${userId}`);
    }

    async getFineSummary(userId: number): Promise<any> {
        return this.request<any>(`/api/fines/summary/${userId}`);
    }

    // Payment endpoints
    async recordPayment(user_id: number, amount: number, payment_method?: string, notes?: string): Promise<any> {
        return this.request<any>('/api/payments/record', {
            method: 'POST',
            body: JSON.stringify({ user_id, amount, payment_method, notes }),
        });
    }

    async getOutstandingBalance(userId: number): Promise<any> {
        return this.request<any>(`/api/payments/balance/${userId}`);
    }

    async getPaymentHistory(userId: number, startDate?: string, endDate?: string): Promise<any> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any>(`/api/payments/history/${userId}${query}`);
    }

    async getUserLedger(userId: number, startDate?: string, endDate?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any[]>(`/api/payments/ledger/${userId}${query}`);
    }

    // Analytics endpoints
    async getFinancialSummary(startDate?: string, endDate?: string): Promise<any> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any>(`/api/analytics/financial-summary${query}`);
    }

    async getAttendanceStats(startDate?: string, endDate?: string): Promise<any> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any>(`/api/analytics/attendance-stats${query}`);
    }

    async getIncomeExpenseReport(startDate?: string, endDate?: string): Promise<any> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any>(`/api/analytics/income-expense${query}`);
    }

    // Tournament endpoints
    async getTournaments(): Promise<any[]> {
        return this.request<any[]>('/api/tournaments');
    }

    async getTournamentById(id: number): Promise<any> {
        return this.request<any>(`/api/tournaments/${id}`);
    }

    async createTournament(data: any): Promise<any> {
        return this.request<any>('/api/tournaments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTournament(id: number, data: any): Promise<any> {
        return this.request<any>(`/api/tournaments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTournament(id: number): Promise<any> {
        return this.request<any>(`/api/tournaments/${id}`, {
            method: 'DELETE',
        });
    }

    async getTeamsByTournament(tournamentId: number): Promise<any[]> {
        return this.request<any[]>(`/api/tournaments/${tournamentId}/teams`);
    }

    async createTeam(tournamentId: number, name: string): Promise<any> {
        return this.request<any>(`/api/tournaments/${tournamentId}/teams`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async updateTeam(teamId: number, name: string): Promise<any> {
        return this.request<any>(`/api/tournaments/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
        });
    }

    async deleteTeam(teamId: number): Promise<any> {
        return this.request<any>(`/api/tournaments/teams/${teamId}`, {
            method: 'DELETE',
        });
    }

    async addPlayerToTeam(teamId: number, userId: number): Promise<any> {
        return this.request<any>(`/api/tournaments/teams/${teamId}/players`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId }),
        });
    }

    async removePlayerFromTeam(teamId: number, playerId: number): Promise<any> {
        return this.request<any>(`/api/tournaments/teams/${teamId}/players/${playerId}`, {
            method: 'DELETE',
        });
    }

    // Match endpoints
    async createMatch(data: any): Promise<any> {
        return this.request<any>('/api/matches', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMatches(tournament_id?: number, status?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (tournament_id) params.append('tournament_id', tournament_id.toString());
        if (status) params.append('status', status);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any[]>(`/api/matches${query}`);
    }

    async getMatchById(id: number): Promise<any> {
        return this.request<any>(`/api/matches/${id}`);
    }

    async updateMatchStatus(id: number, status: string): Promise<any> {
        return this.request<any>(`/api/matches/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    }

    async recordBallEvent(matchId: number, data: any): Promise<any> {
        return this.request<any>(`/api/matches/${matchId}/ball-event`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getLiveScore(matchId: number): Promise<any> {
        return this.request<any>(`/api/matches/${matchId}/live-score`);
    }

    // Match Analytics endpoints
    async setManOfTheMatch(matchId: number, userId: number): Promise<any> {
        return this.request<any>(`/api/matches/${matchId}/awards`, {
            method: 'PUT',
            body: JSON.stringify({ user_id: userId }),
        });
    }

    async setManOfTheSeries(tournamentId: number, userId: number): Promise<any> {
        return this.request<any>(`/api/tournaments/${tournamentId}/awards`, {
            method: 'PUT',
            body: JSON.stringify({ user_id: userId }),
        });
    }

    async getMatchStats(matchId: number): Promise<any> {
        return this.request<any>(`/api/matches/${matchId}/stats`);
    }

    // Reports
    async downloadFinancialReport(startDate: string, endDate: string): Promise<string> {
        return `${API_BASE_URL}/api/reports/financial?startDate=${startDate}&endDate=${endDate}`;
    }

    async downloadUserReport(): Promise<string> {
        return `${API_BASE_URL}/api/reports/users`;
    }

    // Admin Controls
    async stopWebSocketServer(): Promise<any> {
        return this.request<any>('/api/admin/websocket/stop', { method: 'POST' });
    }

    async startWebSocketServer(): Promise<any> {
        return this.request<any>('/api/admin/websocket/start', { method: 'POST' });
    }
}

export default new ApiService();
