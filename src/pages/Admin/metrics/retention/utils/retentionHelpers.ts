import { RetentionUser, RetentionMetric } from '../types/retention';

export const getReturnDate = (installDate: string, metricId: RetentionMetric): string => {
  const install = new Date(installDate);
  const days = metricId === 'D1' ? 1 : metricId === 'D3' ? 3 : metricId === 'D7' ? 7 : 30;
  const returnDate = new Date(install.getTime() + days * 86400000);
  return returnDate.toLocaleDateString();
};

export const getChurnReason = (user: RetentionUser): string => {
  if (!user.d1Returned && !user.d3Returned && !user.d7Returned && !user.d30Returned) {
    return 'No retention';
  }
  return 'Active';
};

export const formatRetentionValue = (value: number): string => {
  return `${Math.floor(value)}`; // Целое число
};

export const getRetentionEndpoint = (metricId: RetentionMetric): string => {
  if (metricId === 'churn_rate') {
    return '/admin/dashboard/table/churn';
  }
  return '/admin/dashboard/table/retention';
};

export const getTrendEndpoint = (metricId: RetentionMetric): string => {
  if (metricId === 'churn_rate') {
    return '/admin/dashboard/metric/D1/trend'; // Churn использует D1 тренд
  }
  return `/admin/dashboard/metric/${metricId}/trend`;
};
