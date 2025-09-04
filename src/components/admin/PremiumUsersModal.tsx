import React, { useEffect, useState } from 'react';
import { X, Crown, Calendar, User } from 'lucide-react';
import { config } from '../../lib/config';
import { useTranslation } from '../../lib/i18n';

interface PremiumUser {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  premiumExpiresAt: string;
  // For purchased users
  planType?: 'monthly' | 'yearly';
  amount?: string;
  // For rewards users  
  rewardsCount?: number;
  lastRewardLevel?: number;
  proDaysGranted?: number;
}

interface PremiumUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'purchased' | 'rewards' | null;
}

const ITEMS_PER_PAGE = 10;

const PremiumUsersModal: React.FC<PremiumUsersModalProps> = ({ isOpen, onClose, type }) => {
  const [users, setUsers] = useState<PremiumUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const currentUsers = users.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (!isOpen || !type) {
      setUsers([]);
      setCurrentPage(1);
      setError(null);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const endpoint = type === 'purchased' 
          ? '/admin/premium-purchased' 
          : '/admin/premium-rewards';
          
        const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setUsers(data.users || []);
        setTotal(data.users?.length || 0);
      } catch (err) {
        console.error('Failed to fetch premium users:', err);
        setError(t('admin.dashboard.errorLoadingUsers'));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, type]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return t('admin.dashboard.invalidDate');
    }
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getUserDisplayName = (user: PremiumUser) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || t('admin.dashboard.notAvailable');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPremiumTypeColor = (planType?: string) => {
    switch (planType) {
      case 'month': return 'bg-blue-100 text-blue-800';
      case 'year': return 'bg-purple-100 text-purple-800';
      case 'monthly': return 'bg-blue-100 text-blue-800';
      case 'yearly': return 'bg-purple-100 text-purple-800';
      default: return 'bg-amber-100 text-amber-800'; // purchased but unknown type
    }
  };

  const getPremiumTypeLabel = (planType?: string) => {
    switch (planType) {
      case 'month': return t('admin.dashboard.premiumMonth');
      case 'year': return t('admin.dashboard.premiumYear');
      case 'monthly': return t('admin.dashboard.premiumMonth');
      case 'yearly': return t('admin.dashboard.premiumYear');
      default: return t('admin.dashboard.premiumPurchased');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />
      <div className="bg-white w-[90%] max-w-lg max-h-[85vh] rounded-xl overflow-hidden pointer-events-auto relative z-10">
        {/* Header - styled like rewards sticky header */}
        <div className="sticky top-0 z-30 bg-white">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-yellow-600" />
              </div>
              <h2 className="text-xl font-extrabold text-black">
                {type === 'purchased' ? t('admin.dashboard.purchasedPremium') : t('admin.dashboard.receivedPremium')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Table header - styled like rewards */}
          <div className="px-4 pb-4">
            <div className="flex items-center w-full h-[44px] px-4 rounded-[12px] border border-gray-200">
              <span className="text-sm font-bold w-[100px]">{t('admin.dashboard.user')}</span>
              <span className="text-sm font-bold flex-1 text-left pl-4">
                {type === 'purchased' ? t('admin.dashboard.subscriptionType') : t('admin.dashboard.daysGranted')}
              </span>
              <span className="text-sm font-bold">{t('admin.dashboard.activeUntil')}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white">
          <div className="px-4 pb-12">
            {/* Loading State */}
            {loading && (
              <div className="space-y-2" role="status" aria-label="Loading users">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="py-[6px]">
                    <div className="h-16 rounded-[12px] bg-gray-100 animate-pulse" />
                  </div>
                ))}
                <div className="text-center text-sm text-gray-500 mt-4">
                  {t('admin.dashboard.loadingUsers')}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="py-8 text-center" role="alert">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('admin.dashboard.errorLoading')}
                  </h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {!loading && !error && (
              <>
                {currentUsers.length > 0 ? (
                  <>
                    <div className="space-y-2" role="list">
                      {currentUsers.map((user) => (
                        <div key={user.id} className="py-[6px]" role="listitem">
                          <div className="flex items-center w-full min-h-[56px] px-4 rounded-[12px] border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="w-[100px] flex flex-col">
                              <span className="text-sm font-semibold text-gray-900 truncate">
                                {getUserDisplayName(user)}
                              </span>
                              <span className="text-xs text-gray-500 truncate">
                                {user.id.slice(0, 8)}...
                              </span>
                            </div>
                            
                            <div className="flex-1 text-left pl-4">
                              {type === 'purchased' ? (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPremiumTypeColor(user.planType)}`}>
                                  {getPremiumTypeLabel(user.planType)}
                                </span>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {user.proDaysGranted || 0} {t('admin.dashboard.days')}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {t('admin.dashboard.level')}: {user.lastRewardLevel || 0}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {formatDate(user.premiumExpiresAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination - styled like rewards */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === 1
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          {t('admin.dashboard.back')}
                        </button>
                        
                        <span className="text-sm text-gray-600 font-medium">
                          {t('admin.dashboard.page')} {currentPage} {t('admin.dashboard.of')} {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === totalPages
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          {t('admin.dashboard.next')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('admin.dashboard.usersNotFound')}
                    </h3>
                    <p className="text-gray-600">
                      {type === 'purchased' 
                        ? t('admin.dashboard.noPurchasedPremiumUsers')
                        : t('admin.dashboard.noRewardPremiumUsers')
                      }
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumUsersModal;