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

      if (['D1', 'D3', 'D7', 'D30'].includes(metricId)) {
        endpoint = '/admin/dashboard/table/retention';
        params.append('window', metricId);
      } else if (metricId === 'churn_rate') {
        endpoint = '/admin/dashboard/table/churn';
      } else {
        // Placeholder for other metrics
        setData([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const response = await fetch(`${config.api.baseUrl}${endpoint}?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const result = await response.json();
      
      // Сортируем данные для retention метрик: сначала вернувшиеся
      let sortedData = result.data || [];
      if (['D1', 'D3', 'D7', 'D30'].includes(metricId)) {
        sortedData = sortedData.sort((a: any, b: any) => {
          const aReturned = a[`${metricId.toLowerCase()}Returned`];
          const bReturned = b[`${metricId.toLowerCase()}Returned`];
          
          if (aReturned && !bReturned) return -1;
          if (!aReturned && bReturned) return 1;
          
          // Если статус одинаковый, сортируем по дате регистрации
          return new Date(b.installDate).getTime() - new Date(a.installDate).getTime();
        });
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
                <td className="py-4 px-4 text-sm text-gray-700">{new Date(row.installDate).toLocaleDateString()}</td>
                <td className="py-4 px-4 text-sm">
                  {row[`${metricId.toLowerCase()}Returned`] ? (
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      <Check className="w-4 h-4 text-green-500" />
                      {new Date(new Date(row.installDate).getTime() + (metricId === 'D1' ? 1 : metricId === 'D3' ? 3 : metricId === 'D7' ? 7 : 30) * 86400000).toLocaleDateString()}
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
                <td className="py-4 px-4 text-sm text-gray-700">{new Date(row.installDate).toLocaleDateString()}</td>
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
                  ? new Date(row.lastActiveDate || row.last_active_at).toLocaleDateString()
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
