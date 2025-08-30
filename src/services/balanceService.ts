import { API_BASE_URL } from '@/lib/api';

export type UserBalance = {
  balance: number;
  freeBalance: number;
}

class BalanceService {
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async getUserBalance(): Promise<UserBalance> {
    const response = await fetch(`${API_BASE_URL}/user/balance`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get user balance: ${response.statusText}`);
    }

    return response.json() as Promise<UserBalance>;
  }
}

export const balanceService = new BalanceService(); 