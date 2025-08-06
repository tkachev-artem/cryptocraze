import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { apiRequest } from '../lib/queryClient';
import { useTranslation } from '../lib/i18n';
import { useAuth } from '../hooks/useAuth';

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['/api/trading/stats'],
    queryFn: () => apiRequest('/api/trading/stats'),
    enabled: !!user,
  });

  const { data: openTrades } = useQuery({
    queryKey: ['/api/trading/open-trades'],
    queryFn: () => apiRequest('/api/trading/open-trades'),
    enabled: !!user,
  });

  const { data: recentTrades } = useQuery({
    queryKey: ['/api/trading/trades', 10],
    queryFn: () => apiRequest('/api/trading/trades?limit=10'),
    enabled: !!user,
  });

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(user.virtualBalance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.freeBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(user.freeBalance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalPnL')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              Number(user.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(user.totalPnl || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('dashboard.totalTrades')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.totalTrades}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('dashboard.winRate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {stats.winRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('dashboard.maxProfit')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(stats.maxPnl)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t('dashboard.maxLoss')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(stats.minPnl)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Open Trades */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.openTrades')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!openTrades || openTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-2">{t('dashboard.noTrades')}</div>
              <div className="text-sm">{t('dashboard.startTrading')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {openTrades.map((trade: any) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.direction === 'long' ? 'default' : 'destructive'}>
                      {trade.direction.toUpperCase()}
                    </Badge>
                    <div>
                      <div className="font-medium">#{trade.id}</div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(trade.amount)} • {trade.leverage}x
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      Entry: ${parseFloat(trade.entryPrice).toFixed(2)}
                    </div>
                    <div className={`text-sm ${
                      Number(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.pnlPercentage ? formatPercentage(trade.pnlPercentage) : '--'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentTrades')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentTrades || recentTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-2">{t('dashboard.noTrades')}</div>
              <div className="text-sm">{t('dashboard.startTrading')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrades.slice(0, 5).map((trade: any) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={trade.direction === 'long' ? 'default' : 'destructive'}
                    >
                      {trade.direction.toUpperCase()}
                    </Badge>
                    <div>
                      <div className="font-medium">#{trade.id}</div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(trade.amount)} • {trade.leverage}x
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      Number(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(trade.pnl || 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {trade.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
