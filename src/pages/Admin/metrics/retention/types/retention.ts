export interface RetentionUser {
  userId: string;
  email: string;
  installDate: string;
  isPremium: boolean;
  country: string;
  d1Returned: boolean;
  d3Returned: boolean;
  d7Returned: boolean;
  d30Returned: boolean;
}

export interface RetentionTableData {
  data: RetentionUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RetentionTrendData {
  date: string;
  value: number;
}

export interface RetentionFilters {
  userType?: string;
  country?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

export type RetentionMetric = 'D1' | 'D3' | 'D7' | 'D30' | 'churn_rate';
