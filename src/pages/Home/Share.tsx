import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

const Share: FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const shareUrl = 'https://cryptocraze.app';
  const shareText = t('share.message') || 'Try CryptoCraze — the best crypto trading simulator!';

  const handleBackClick = () => {
    void navigate('/home/settings');
  };

  const handleWhatsAppClick = () => {
    // Логика для шаринга в WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleTelegramClick = () => {
    // Логика для шаринга в Telegram
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleSMSClick = () => {
    // Логика для шаринга через SMS
    const smsText = `${shareText} ${shareUrl}`;
    const smsUrl = `sms:?body=${encodeURIComponent(smsText)}`;
    window.open(smsUrl, '_blank');
  };

  const handleEmailClick = () => {
    // Логика для шаринга через Email
    const emailUrl = `mailto:?subject=CryptoCraze - Торговля криптовалютой&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(emailUrl, '_blank');
  };

  const handleCopyLinkClick = async () => {
    // Логика для копирования ссылки
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: t('share.copied') || 'Ссылка скопирована',
        description: t('share.copiedDesc') || 'Ссылка на приложение скопирована в буфер обмена',
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('share.copyError') || 'Не удалось скопировать ссылку',
        variant: 'destructive',
      });
    }
  };

  const handleMoreClick = () => {
    // Логика для дополнительных опций шаринга
    
    if ('share' in navigator) {
      void navigator.share({
        title: 'CryptoCraze',
        text: shareText,
        url: shareUrl,
      }).catch(() => {
        toast({
          title: t('common.error'),
          description: t('share.shareError') || 'Не удалось поделиться',
          variant: 'destructive',
        });
      });
    } else {
      // Fallback для браузеров без поддержки Web Share API
      void handleCopyLinkClick();
    }
  };

  return (
    <div className="bg-white min-h-screen pb-[env(safe-area-inset-bottom)]">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-10 bg-white">
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-2 pt-4 pb-2">
          <div className="flex items-center gap-1">
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              onClick={handleBackClick}
              aria-label={t('common.back')}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackClick();
                }
              }}
            >
              <img src="/top-menu/back.svg" alt="Back" className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-black">{t('settings.share')}</h1>
          </div>
        </div>
      </div>

      {/* Share List */}
      <div className="px-4 py-3 space-y-2">
        {/* WhatsApp */}
        <div 
          className="bg-white rounded-[20px] border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleWhatsAppClick}
          aria-label={t('share.whatsappAria')}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleWhatsAppClick();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center">
              <img src="/share/whatsapp.svg" alt="WhatsApp" className="w-6 h-6" />
            </div>
            <span className="text-black font-medium text-base truncate">WhatsApp</span>
          </div>
          <img src="/share/arrow.svg" alt="Arrow" className="w-3 h-6" />
        </div>

        {/* Telegram */}
        <div 
          className="bg-white rounded-[20px] border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleTelegramClick}
          aria-label={t('share.telegramAria')}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleTelegramClick();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center">
              <img src="/share/telegram.svg" alt="Telegram" className="w-6 h-6" />
            </div>
            <span className="text-black font-medium text-base truncate">Telegram</span>
          </div>
          <img src="/share/arrow.svg" alt="Arrow" className="w-3 h-6" />
        </div>

        {/* SMS */}
        <div 
          className="bg-white rounded-[20px] border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleSMSClick}
          aria-label={t('share.smsAria')}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleSMSClick();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center opacity-50">
              <img src="/share/sms.svg" alt="SMS" className="w-6 h-6" />
            </div>
            <span className="text-black font-medium text-base truncate">SMS</span>
          </div>
          <img src="/share/arrow.svg" alt="Arrow" className="w-3 h-6" />
        </div>

        {/* Email */}
        <div 
          className="bg-white rounded-[20px] border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleEmailClick}
          aria-label={t('share.emailAria')}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleEmailClick();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center opacity-50">
              <img src="/share/email.svg" alt="Email" className="w-6 h-6" />
            </div>
            <span className="text-black font-medium text-base truncate">Email</span>
          </div>
          <img src="/share/arrow.svg" alt="Arrow" className="w-3 h-6" />
        </div>

        {/* Copy Link */}
        <div 
          className="bg-white rounded-[20px] border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                     onClick={() => void handleCopyLinkClick()}
           aria-label={t('share.copyLink')}
           tabIndex={0}
           onKeyDown={(e) => {
             if (e.key === 'Enter' || e.key === ' ') {
               void handleCopyLinkClick();
             }
           }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center opacity-50">
              <img src="/share/link.svg" alt="Copy Link" className="w-6 h-6" />
            </div>
            <span className="text-black font-medium text-base truncate">{t('share.copyLink')}</span>
          </div>
          <img src="/share/arrow.svg" alt="Arrow" className="w-3 h-6" />
        </div>

        {/* More */}
        <div 
          className="bg-white rounded-[20px] border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleMoreClick}
           aria-label={t('share.more')}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleMoreClick();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center opacity-50">
              <img src="/share/more.svg" alt="More" className="w-6 h-6" />
            </div>
            <span className="text-black font-medium text-base truncate">{t('share.more')}</span>
          </div>
          <img src="/share/arrow.svg" alt="Arrow" className="w-3 h-6" />
        </div>
      </div>
    </div>
  );
};

export default Share;
