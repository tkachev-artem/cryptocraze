import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Check } from 'lucide-react';
import { config } from '../../../lib/config';

type TableRow = {
  userId: string;
  email: string | null;
  username: string | null;
  [key: string]: any;
  };

  type DateRange = {
    startDate: Date;
    endDate: Date;
    label: string;
  };
  
  type MetricTableProps = {
    metricId: string;
    title: string;
    isOpen: boolean;
    onClose: () => void;
    dateRange: DateRange;
    selectedFilters: Record<string, string[]>;
  };

const MetricTable: React.FC<MetricTableProps> = ({ metricId, title, isOpen, onClose, dateRange, selectedFilters }) => {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [window, setWindow] = useState('D1');
  const size = 30;

  const fetchData = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    setData([]); // Сбрасываем данные перед новой загрузкой, чтобы избежать отображения устаревших данных
    
    try {
      let endpoint = '';
      let params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        ...Object.fromEntries(
          Object.entries(selectedFilters).map(([key, values]) => {
            // Преобразуем geography в country для сервера
            const serverKey = key === 'geography' ? 'country' : key;
            return [serverKey, values.join(',')];
          })
        )
      });

      // console.log('[MetricTable] Fetching data for metric:', metricId, 'with params:', Object.fromEntries(params.entries()));

      if (['D1', 'D3', 'D7', 'D30'].includes(metricId)) {
        endpoint = '/admin/dashboard/table/retention';
        params.append('window', metricId);
      } else if (metricId === 'churn_rate') {
        endpoint = '/admin/dashboard/table/churn';
      } else if (
        metricId === 'tutorial_start' ||
        metricId === 'tutorial_complete' ||
        metricId === 'tutorial_skip_rate' ||
        metricId === 'pro_tutorial_start' ||
        metricId === 'pro_tutorial_complete' ||
        metricId === 'pro_tutorial_skip_rate'
      ) {
        endpoint = '/admin/dashboard/table/tutorial';
        params.append('metricId', metricId);
        // bust cache for tutorial endpoints to avoid any proxy/browser caching artifacts
        params.append('_t', String(Date.now()));
      } else if (metricId === 'sessions') {
        endpoint = '/admin/dashboard/table/sessions';
      } else if (metricId === 'screens_opened') {
        endpoint = '/admin/dashboard/table/screens_opened';
      } else if (metricId === 'trades_per_user') {
        endpoint = '/admin/dashboard/table/trades_per_user';
      } else if (metricId === 'order_open') {
        endpoint = '/admin/dashboard/table/orders_open';
      } else if (metricId === 'order_close') {
        endpoint = '/admin/dashboard/table/orders_closed';
      } else if (metricId === 'avg_virtual_balance') {
        endpoint = '/admin/dashboard/table/virtual_balance';
      } else if (metricId === 'daily_reward_claimed') {
        endpoint = '/admin/dashboard/table/daily_reward_claimed';
      } else {
        // Placeholder for other metrics
        setData([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const response = await fetch(`${config.api.baseUrl}${endpoint}?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const result = await response.json();
      // console.log('[MetricTable] Data received for metric:', metricId, ':', result.data);
      
      // Сортируем данные
      let sortedData = result.data || [];

      if (['D1', 'D3', 'D7', 'D30'].includes(metricId)) {
        // Сортируем данные для retention метрик: сначала вернувшиеся
        sortedData = sortedData.sort((a: any, b: any) => {
          const aReturned = a[`${metricId.toLowerCase()}Returned`];
          const bReturned = b[`${metricId.toLowerCase()}Returned`];

          if (aReturned && !bReturned) return -1;
          if (!aReturned && bReturned) return 1;

          // Если статус одинаковый, сортируем по дате регистрации
          return new Date(b.installDate).getTime() - new Date(a.installDate).getTime();
        });
      } else if (
        metricId === 'tutorial_start' ||
        metricId === 'tutorial_complete' ||
        metricId === 'tutorial_skip_rate' ||
        metricId === 'pro_tutorial_start' ||
        metricId === 'pro_tutorial_complete' ||
        metricId === 'pro_tutorial_skip_rate'
      ) {
        // Сортируем данные для tutorial метрик: по дате события (новые сначала)
        sortedData = sortedData.sort((a: any, b: any) => {
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
        });
      } else if (metricId === 'screens_opened') {
        // Сортируем данные для screens_opened: по количеству открытых экранов (по убыванию)
        sortedData = sortedData.sort((a: any, b: any) => b.screensOpenedCount - a.screensOpenedCount);
      } else if (metricId === 'trades_per_user') {
        // Сортируем данные для trades_per_user: по дате события (новые сначала)
        sortedData = sortedData.sort((a: any, b: any) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
      } else if (metricId === 'order_open' || metricId === 'order_close') {
        // Сортируем данные по дате события
        sortedData = sortedData.sort((a: any, b: any) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
      }
      
      setData(sortedData);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOpen, metricId, page, dateRange, selectedFilters]);

  const totalPages = Math.ceil(total / size);

  const PaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Showing {data.length > 0 ? ((page - 1) * size) + 1 : 0} to {Math.min(page * size, total)} of {total} entries
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 text-sm text-gray-600">
          Page {page} of {totalPages || 1}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderTableContent = () => {
    if (['D1', 'D3', 'D7', 'D30'].includes(metricId)) {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Email</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Registered</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Returned</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.email || '—'}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {(() => {
                    const installDate = new Date(row.installDate);
                    if (isNaN(installDate.getTime())) {
                      return '—';
                    }
                    return installDate.toISOString().slice(0, 10);
                  })()}
                </td>
                <td className="py-4 px-4 text-sm">
                  {row[`${metricId.toLowerCase()}Returned`] ? (
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      <Check className="w-4 h-4 text-green-500" />
                      {(() => {
                        const installDate = new Date(row.installDate);
                        if (isNaN(installDate.getTime())) {
                          return '—';
                        }
                        const daysOffset = metricId === 'D1' ? 1 : metricId === 'D3' ? 3 : metricId === 'D7' ? 7 : 30;
                        const returnDate = new Date(installDate.getTime() + daysOffset * 86400000);
                        if (isNaN(returnDate.getTime())) {
                          return '—';
                        }
                        return returnDate.toISOString().slice(0, 10);
                      })()}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      No return
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (metricId === 'churn_rate') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Email</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Registered</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Churn Reason</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.email || '—'}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {(() => {
                    const installDate = new Date(row.installDate);
                    if (isNaN(installDate.getTime())) {
                      return '—';
                    }
                    return installDate.toISOString().slice(0, 10);
                  })()}
                </td>
                <td className="py-4 px-4 text-sm">
                  <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    No retention
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Таблица для туториалов
    if (
      metricId === 'tutorial_start' ||
      metricId === 'tutorial_complete' ||
      metricId === 'tutorial_skip_rate' ||
      metricId === 'pro_tutorial_start' ||
      metricId === 'pro_tutorial_complete' ||
      metricId === 'pro_tutorial_skip_rate'
    ) {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Active Date</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Action</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Event Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId + (row.eventDate || row.activeDate)} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.activeDate ? new Date(row.activeDate).toUTCString() : '—'}</td>
                <td className={`py-4 px-4 text-sm capitalize ${row.action === 'no_tutorial' ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{row.action === 'no_tutorial' ? 'No Tutorial' : `${row.tutorialType === 'pro' ? 'Pro' : 'Regular'} ${row.action}`}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.eventDate ? new Date(row.eventDate).toUTCString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Таблица для Sessions
    if (metricId === 'sessions') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Email</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Number</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Active Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.email || '—'}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.numberOfSessions || 0}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.lastActiveDate ? new Date(row.lastActiveDate).toUTCString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Таблица для Screens Opened
    if (metricId === 'screens_opened') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Number</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.screensOpenedCount || 0}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.lastActiveDate ? new Date(row.lastActiveDate).toUTCString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Таблица для Trades/User
    if (metricId === 'trades_per_user') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Size</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Open Price</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Close Price</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Event Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId + row.eventDate} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.tradeSize !== undefined ? `${row.tradeSize.toFixed(2)} (${row.tradeType})` : '—'}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.openPrice !== undefined ? `${row.openPrice.toFixed(2)} (${row.multiplier}x)` : '—'}</td>
                <td className="py-4 px-4 text-sm">
                  {row.closePrice !== undefined ? `${row.closePrice.toFixed(2)} ` : '—'}
                  {row.profit !== undefined && (
                    <span className={`font-medium ${row.profit > 0 ? 'text-green-600' : row.profit < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.profit > 0 ? `(+${row.profit.toFixed(2)})` : `(${row.profit.toFixed(2)})`}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {(() => {
                    const eventDateString = row.eventDate; // Сырая строка из API
                    const dateObject = new Date(eventDateString); // Преобразование в объект Date
                    const utcString = dateObject.toUTCString(); // Форматирование в UTC
                    
                    return eventDateString ? utcString : '—';
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Таблица для Virtual Balance
    if (metricId === 'avg_virtual_balance') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Email</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.email || '—'}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.balance !== undefined ? `$${row.balance}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Таблица для Orders Open
    if (metricId === 'order_open') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Open Price</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Live Price</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              // Рассчитываем потенциальную прибыль для открытых сделок
              // Используем ту же формулу, что и в DealList.tsx
              // Используем серверный расчет potentialProfit, если он есть; иначе пытаемся посчитать из currentPrice
              const potentialProfit = (() => {
                if ((row as any).potentialProfit !== undefined && (row as any).potentialProfit !== null) {
                  return Number((row as any).potentialProfit);
                }
                if (!row.openPrice || !row.multiplier || !row.tradeSize || !(row as any).currentPrice) return null;

                const openPrice = Number(row.openPrice);
                const amount = Number(row.tradeSize);
                const multiplier = Number(row.multiplier);
                const currentPrice = Number((row as any).currentPrice);
                if (!isFinite(openPrice) || !isFinite(amount) || !isFinite(multiplier) || !isFinite(currentPrice)) return null;

                const isUp = (row as any).tradeType === 'up';
                const ratio = isUp
                  ? (currentPrice - openPrice) / openPrice
                  : (openPrice - currentPrice) / openPrice;
                const pnl = ratio * amount * multiplier;
                const commission = amount * multiplier * 0.0005;
                return pnl - commission;
              })();
              
              return (
                <tr key={row.userId + row.eventDate} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                  <td className="py-4 px-4 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      {row.country && row.country !== 'Unknown' && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                          {row.country}
                        </span>
                      )}
                      <span>{row.country || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {row.isPremium ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                        PRO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                        FREE
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700">
                    {row.openPrice !== undefined ? `${row.openPrice.toFixed(2)} (${row.multiplier}x)` : '—'}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700">
                    {(row as any).currentPrice !== undefined && (row as any).currentPrice !== null 
                      ? `$${(row as any).currentPrice.toFixed(2)}` 
                      : '—'
                    }
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {potentialProfit !== null ? (
                      <span className={`font-medium ${potentialProfit > 0 ? 'text-green-600' : potentialProfit < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {potentialProfit > 0 ? `+$${potentialProfit.toFixed(2)}` : `$${potentialProfit.toFixed(2)}`}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    // Таблица для Orders Close
    if (metricId === 'order_close') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Open Price</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Close Price</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId + row.eventDate} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {row.openPrice !== undefined ? `${row.openPrice.toFixed(2)} (${row.multiplier}x)` : '—'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {row.closePrice !== undefined ? `${row.closePrice.toFixed(2)}` : '—'}
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.profit !== undefined ? (
                    <span className={`font-medium ${row.profit > 0 ? 'text-green-600' : row.profit < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.profit > 0 ? `+$${row.profit.toFixed(2)}` : `-$${Math.abs(row.profit).toFixed(2)}`}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Таблица для Daily Reward Claimed
    if (metricId === 'daily_reward_claimed') {
      return (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Amount</th>
              <th className="text-left py-4 px-4 font-bold text-gray-900">Claimed At</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.userId + (row.eventDate || '')} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.amount != null ? `$${Number(row.amount).toFixed(2)}` : '—'}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{row.eventDate ? new Date(row.eventDate).toUTCString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Общая таблица для всех остальных метрик
    return (
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left py-4 px-4 font-bold text-gray-900">User ID</th>
            <th className="text-left py-4 px-4 font-bold text-gray-900">Email</th>
            <th className="text-left py-4 px-4 font-bold text-gray-900">Name</th>
            <th className="text-left py-4 px-4 font-bold text-gray-900">Region</th>
            <th className="text-left py-4 px-4 font-bold text-gray-900">Status</th>
            <th className="text-left py-4 px-4 font-bold text-gray-900">Last Active</th>
            <th className="text-left py-4 px-4 font-bold text-gray-900">Total Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.userId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4 text-sm text-gray-900 font-mono">{row.userId}</td>
              <td className="py-4 px-4 text-sm text-gray-700">{row.email || '—'}</td>
              <td className="py-4 px-4 text-sm text-gray-700">{row.username || '—'}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    {row.country && row.country !== 'Unknown' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                        {row.country}
                      </span>
                    )}
                    <span>{row.country || 'Unknown'}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-sm">
                  {row.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-black bg-[#F5A600] rounded-full">
                      PRO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-full">
                      FREE
                    </span>
                  )}
                </td>
              <td className="py-4 px-4 text-sm text-gray-700">
                {row.lastActiveDate || row.last_active_at 
                  ? new Date(row.lastActiveDate || row.last_active_at).toISOString().slice(0, 10)
                  : '—'
                }
              </td>
              <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                ${(row.totalRevenue || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="w-full">
      {/* Top Pagination */}
      {!loading && !error && data.length > 0 && totalPages > 1 && (
        <div className="mb-4">
          <PaginationControls />
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-gray-200 bg-white table-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C54EA]" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No data found</div>
        ) : (
          renderTableContent()
        )}
      </div>

      {/* Bottom Pagination */}
      {!loading && !error && data.length > 0 && totalPages > 1 && (
        <div className="mt-4">
          <PaginationControls />
        </div>
      )}
    </div>
  );
};

export default MetricTable;
