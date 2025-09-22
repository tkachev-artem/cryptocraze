import type { TutorialMetricId } from '../types';

export const getTutorialTableConfig = (metricId: TutorialMetricId) => {
  return {
    endpoint: '/admin/dashboard/table/tutorial',
    columns: [
      { key: 'userId', label: 'User ID', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'country', label: 'Region', sortable: true },
      { key: 'isPremium', label: 'Type', sortable: true },
      { key: 'tutorialType', label: 'Tutorial', sortable: true },
      { key: 'action', label: 'Action', sortable: true },
      { key: 'eventDate', label: 'Event Date', sortable: true }
    ],
    sortBy: 'eventDate',
    sortOrder: 'desc' as 'asc' | 'desc'
  };
};

export const sortTutorialData = (data: any[], metricId: TutorialMetricId) => {
  return data.sort((a, b) => {
    // Сортируем по дате события (новые сначала)
    return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
  });
};


