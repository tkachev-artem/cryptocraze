import { API_BASE_URL } from '../lib/api';

export type OpenDealRequest = {
  symbol: string;
  direction: 'up' | 'down';
  amount: number;
  multiplier: number;
  takeProfit?: number;
  stopLoss?: number;
}

export type OpenDealResponse = {
  success: boolean;
  id: number;
  status: string;
  openPrice: string;
  openedAt: string;
}

export type CloseDealRequest = {
  dealId: number;
}

export type CloseDealResponse = {
  success: boolean;
  id: number;
  status: string;
  closePrice: string;
  profit: string;
  closedAt: string;
}

export type Deal = {
  id: number;
  userId: string;
  symbol: string;
  direction: 'up' | 'down';
  amount: string;
  multiplier: number;
  openPrice: string;
  takeProfit?: string;
  stopLoss?: string;
  openedAt: string;
  status: 'open' | 'closed';
  closedAt?: string;
  closePrice?: string;
  profit?: string;
  commission?: string;
}

export type PriceResponse = {
  symbol: string;
  price: string;
}

export type ActiveDealProfit = {
  dealId: number;
  profit: string;
}

export type UpdateDealRequest = {
  dealId: number;
  takeProfit?: number;
  stopLoss?: number;
}

export type UpdateDealResponse = {
  success: boolean;
  id: number;
  takeProfit?: string;
  stopLoss?: string;
}

class DealService {
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async openDeal(data: OpenDealRequest): Promise<OpenDealResponse> {
    const response = await fetch(`${API_BASE_URL}/deals/open`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? `Failed to open deal: ${response.statusText}`);
    }

    return response.json() as Promise<OpenDealResponse>;
  }

  async closeDeal(data: CloseDealRequest): Promise<CloseDealResponse> {
    const response = await fetch(`${API_BASE_URL}/deals/close`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? `Failed to close deal: ${response.statusText}`);
    }

    return response.json() as Promise<CloseDealResponse>;
  }

  async getUserDeals(): Promise<Deal[]> {
    const response = await fetch(`${API_BASE_URL}/deals/user`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get user deals: ${response.statusText}`);
    }

    return response.json() as Promise<Deal[]>;
  }

  async getCurrentPrice(symbol: string): Promise<PriceResponse> {
    const response = await fetch(`${API_BASE_URL}/binance/price/${symbol}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get current price: ${response.statusText}`);
    }

    return response.json() as Promise<PriceResponse>;
  }

  async getActiveDealsProfit(): Promise<ActiveDealProfit[]> {
    const response = await fetch(`${API_BASE_URL}/deals/active-profit`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get active deals profit: ${response.statusText}`);
    }

    return response.json() as Promise<ActiveDealProfit[]>;
  }

  async updateDeal(data: UpdateDealRequest): Promise<UpdateDealResponse> {
    const response = await fetch(`${API_BASE_URL}/deals/update`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? `Failed to update deal: ${response.statusText}`);
    }

    return response.json() as Promise<UpdateDealResponse>;
  }

  async getDealCommission(dealId: number): Promise<{ commission: string }> {
    const response = await fetch(`${API_BASE_URL}/deals/${dealId.toString()}/commission`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get deal commission: ${response.statusText}`);
    }

    return response.json() as Promise<{ commission: string }>;
  }
}

export const dealService = new DealService(); 