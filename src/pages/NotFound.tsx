import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Grid } from '../components/ui/grid';
import { useTranslation } from '../lib/i18n';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <Grid className="flex items-center justify-center px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <Card className="w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">🤔</div>
          <CardTitle className="text-2xl">{t('errors.404.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-gray-600">{t('errors.404.description')}</div>
          
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              {t('errors.404.goHome')}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => { window.history.back(); }}
              className="w-full"
            >
              {t('common.back')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Grid>
  );
}
