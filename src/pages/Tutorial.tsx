import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { PandaMentor } from '../components/PandaMentor';
import { Grid } from '../components/ui/grid';
import { apiRequest } from '../lib/queryClient';
import { API_BASE_URL } from '@/lib/api';
import { useTranslation } from '../lib/i18n';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { isUnauthorizedError } from '../lib/authUtils';

type TutorialStep = {
  id: string;
  title: string;
  content: string;
  image?: string;
  interactive?: boolean;
}

export function Tutorial() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: t('tutorial.welcome'),
      content: t('tutorial.pandaIntro'),
    },
    {
      id: 'interface',
      title: t('tutorial.step1.title'),
      content: t('tutorial.step1.content'),
    },
    {
      id: 'charts',
      title: t('tutorial.step2.title'),
      content: t('tutorial.step2.content'),
    },
    {
      id: 'trading',
      title: t('tutorial.step3.title'),
      content: t('tutorial.step3.content'),
    },
    {
      id: 'risk',
      title: t('tutorial.step4.title'),
      content: t('tutorial.step4.content'),
    },
    {
      id: 'gamification',
      title: t('tutorial.step5.title'),
      content: t('tutorial.step5.content'),
    },
  ];

  // Complete tutorial mutation
  const completeTutorialMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/tutorial/complete', {
        method: 'POST',
      }) as Promise<void>;
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('tutorial.congratulations'),
      });
      void queryClient.invalidateQueries({ queryKey: [`${API_BASE_URL}/auth/user`] });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('auth.unauthorized'),
          description: t('auth.sessionExpired'),
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = `${API_BASE_URL}/login`;
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle unauthorized access
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('auth.unauthorized'),
        description: t('auth.loginRequired'),
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = `${API_BASE_URL}/login`;
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, t]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsCompleting(true);
    completeTutorialMutation.mutate();
  };

  const handleSkip = () => {
    completeTutorialMutation.mutate();
  };

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  const currentTutorialStep = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <Grid>
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🎓</div>
              <h1 className="text-xl font-bold">{t('tutorial.title')}</h1>
            </div>
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isCompleting}
            >
              {t('tutorial.skipTutorial')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">
                  {t('tutorial.stepProgress', { current: currentStep + 1, total: tutorialSteps.length })}
                </span>
                <span className="text-sm text-gray-600">
                  {t('tutorial.percentComplete', { percent: Math.round(progress) })}
                </span>
              </div>
              <Progress value={progress} />
            </CardContent>
          </Card>

          {/* Tutorial Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {currentTutorialStep.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-lg leading-relaxed">
                    {currentTutorialStep.content}
                  </div>

                  {/* Interactive Demo Area */}
                  <div className="bg-gray-50 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">
                        {currentStep === 0 && '👋'}
                        {currentStep === 1 && '🖥️'}
                        {currentStep === 2 && '📊'}
                        {currentStep === 3 && '💰'}
                        {currentStep === 4 && '⚠️'}
                        {currentStep === 5 && '🎮'}
                      </div>
                      <div className="text-gray-600">
                        {t('tutorial.interactiveArea')}
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentStep === 0}
                    >
                      {t('common.previous')}
                    </Button>

                    {currentStep === tutorialSteps.length - 1 ? (
                      <Button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        {isCompleting
                          ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {t('common.loading')}
                            </>
                          )
                          : t('common.finish')
                        }
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleNext}
                        disabled={isCompleting}
                      >
                        {t('common.next')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panda Mentor Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <PandaMentor
                  mode="tutorial"
                  message={
                    currentStep === 0
                      ? t('tutorial.pandaIntro')
                      : `${t('panda.tip')}: ${currentTutorialStep.content.substring(0, 100)}...`
                  }
                />

                {/* Tutorial Steps Overview */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">{t('tutorial.stepsTitle') || 'Tutorial Steps'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tutorialSteps.map((step, index) => (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            index === currentStep
                              ? 'bg-blue-100 text-blue-900'
                              : index < currentStep
                              ? 'bg-green-100 text-green-900'
                              : 'text-gray-600'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === currentStep
                                ? 'bg-blue-600 text-white'
                                : index < currentStep
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-300 text-gray-600'
                            }`}
                          >
                            {index < currentStep ? '✓' : index + 1}
                          </div>
                          <div className="text-sm font-medium">
                            {step.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Grid>
  );
}
