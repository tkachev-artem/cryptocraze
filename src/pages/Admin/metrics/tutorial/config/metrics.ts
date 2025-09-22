import React from 'react';
import { GraduationCap, CheckCircle, SkipForward } from 'lucide-react';
import type { TutorialMetricId } from '../types';

type MetricConfig = {
  id: TutorialMetricId;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: 'Tutorial';
};

export const TUTORIAL_METRICS: MetricConfig[] = [
  { id: 'tutorial_start', title: 'Tutorial Start', description: '% users who started tutorial', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-blue-600', category: 'Tutorial' },
  { id: 'tutorial_complete', title: 'Tutorial Complete', description: '% users who completed tutorial', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-green-600', category: 'Tutorial' },
  { id: 'tutorial_skip_rate', title: 'Tutorial Skip Rate', description: '% users who skipped tutorial', icon: <SkipForward className="w-4 h-4 text-white" />, color: 'bg-gray-500', category: 'Tutorial' },
  { id: 'pro_tutorial_start', title: 'Pro Tutorial Start', description: '% users who started pro tutorial', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-purple-600', category: 'Tutorial' },
  { id: 'pro_tutorial_complete', title: 'Pro Tutorial Complete', description: '% users who completed pro tutorial', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-emerald-600', category: 'Tutorial' },
  { id: 'pro_tutorial_skip_rate', title: 'Pro Tutorial Skip Rate', description: '% users who skipped pro tutorial', icon: <SkipForward className="w-4 h-4 text-white" />, color: 'bg-orange-500', category: 'Tutorial' },
];


