import type { TutorialMetricId } from '../../tutorial/types';

export const getTutorialTrendEndpoint = (metricId: TutorialMetricId) => `/admin/dashboard/metric/${metricId}/trend`;


