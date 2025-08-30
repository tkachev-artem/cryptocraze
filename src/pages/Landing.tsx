import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { redirectToLogin } from '../lib/authUtils';
import { useTranslation } from '@/lib/i18n';

export function Landing() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-indigo-100 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">{t('landing.title')}</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">{t('landing.subtitle')}</p>
          <Button
            size="lg"
            className="text-lg px-8 py-4"
            onClick={redirectToLogin}
          >
            {t('landing.getStarted')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">📈</div>
              <CardTitle className="text-xl">{t('landing.features.realData.title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-600">{t('landing.features.realData.description')}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">💰</div>
              <CardTitle className="text-xl">{t('landing.features.virtualMoney.title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-600">{t('landing.features.virtualMoney.description')}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">🐼</div>
              <CardTitle className="text-xl">{t('landing.features.learning.title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-600">{t('landing.features.learning.description')}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <div className="text-4xl mb-4">🎮</div>
              <CardTitle className="text-xl">{t('landing.features.gamification.title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-600">{t('landing.features.gamification.description')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>{t('landing.ctaTitle') || t('landing.getStarted')}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-gray-600 mb-6">{t('landing.ctaSubtitle') || t('landing.subtitle')}</p>
              <Button
                size="lg"
                onClick={redirectToLogin}
              >
                 {t('landing.getStarted')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}