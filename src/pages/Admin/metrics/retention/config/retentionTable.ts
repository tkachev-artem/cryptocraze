import { RetentionUser, RetentionMetric } from '../types/retention';

export const getRetentionTableConfig = (metricId: RetentionMetric) => {
  const baseConfig = {
    columns: [
      { key: 'userId', label: 'User ID', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'country', label: 'Region', sortable: true },
      { key: 'isPremium', label: 'Type', sortable: true },
      { key: 'installDate', label: 'Registered', sortable: true },
      { key: 'returned', label: 'Returned', sortable: true }
    ],
    sortBy: 'returned', // Сначала вернувшиеся
    sortOrder: 'desc' as 'asc' | 'desc'
  };

  if (metricId === 'churn_rate') {
    return {
      ...baseConfig,
      columns: [
        { key: 'userId', label: 'User ID', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'country', label: 'Region', sortable: true },
        { key: 'isPremium', label: 'Type', sortable: true },
        { key: 'installDate', label: 'Registered', sortable: true },
        { key: 'lastActive', label: 'Last Active', sortable: true },
        { key: 'churnReason', label: 'Churn Reason', sortable: false }
      ],
      sortBy: 'installDate',
      sortOrder: 'desc' as 'asc' | 'desc'
    };
  }

  return baseConfig;
};

export const sortRetentionData = (data: RetentionUser[], metricId: RetentionMetric) => {
  const config = getRetentionTableConfig(metricId);
  
  return data.sort((a, b) => {
    if (metricId === 'churn_rate') {
      // Для churn сортируем по дате регистрации (новые сначала)
      return new Date(b.installDate).getTime() - new Date(a.installDate).getTime();
    }
    
    // Для retention метрик сортируем: сначала вернувшиеся, потом не вернувшиеся
    const aReturned = a[`${metricId.toLowerCase()}Returned` as keyof RetentionUser] as boolean;
    const bReturned = b[`${metricId.toLowerCase()}Returned` as keyof RetentionUser] as boolean;
    
    if (aReturned && !bReturned) return -1;
    if (!aReturned && bReturned) return 1;
    
    // Если статус одинаковый, сортируем по дате регистрации
    return new Date(b.installDate).getTime() - new Date(a.installDate).getTime();
  });
};
