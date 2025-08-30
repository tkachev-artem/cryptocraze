import { API_BASE_URL } from '../lib/api';

export type EnsureFreeResponse = {
  success: true;
  rebalanced: boolean;
  before: {
    balance: number;
    freeBalance: number;
  };
  after: {
    balance: number;
    freeBalance: number;
  };
};

class FundsService {
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async ensureFreeFunds(requiredAmount?: number): Promise<EnsureFreeResponse> {
    const response = await fetch(`${API_BASE_URL}/funds/ensure-free`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: requiredAmount !== undefined ? JSON.stringify({ requiredAmount }) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated');
      }
      if (response.status === 404) {
        throw new Error('User not found');
      }
      throw new Error('Failed to ensure free funds');
    }

    return await response.json() as EnsureFreeResponse;
  }
}

export const fundsService = new FundsService();

