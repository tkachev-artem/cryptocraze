export type TutorialMetricId =
  | 'tutorial_start'
  | 'tutorial_complete'
  | 'tutorial_skip_rate'
  | 'pro_tutorial_start'
  | 'pro_tutorial_complete'
  | 'pro_tutorial_skip_rate';

export type TutorialTrendPoint = {
  date: string;
  percent: number;
  userCount: number;
};

export type TutorialUserDetail = {
  userId: string;
  email: string;
  country: string;
  isPremium?: boolean;
  eventDate: string;
  action: 'start' | 'complete' | 'skip';
  tutorialType: 'regular' | 'pro';
};


