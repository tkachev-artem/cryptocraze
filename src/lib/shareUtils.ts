import type { useToast } from '../hooks/use-toast';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export type ShareOptions = {
  shareUrl?: string;
  shareText?: string;
  files?: File[];
  toast: ReturnType<typeof useToast>['toast'];
  t: TFunction;
};

export const createShareUtils = ({ shareUrl = 'https://cryptocraze.app', shareText, files, toast, t }: ShareOptions) => {
  const handleWhatsAppClick = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText ?? ''} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleTelegramClick = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText ?? '')}`;
    window.open(telegramUrl, '_blank');
  };

  const handleSMSClick = () => {
    const smsText = `${shareText ?? ''} ${shareUrl}`;
    const smsUrl = `sms:?body=${encodeURIComponent(smsText)}`;
    window.open(smsUrl, '_blank');
  };

  const handleEmailClick = () => {
    const emailUrl = `mailto:?subject=CryptoCraze - Trading&body=${encodeURIComponent(`${shareText ?? ''}\n\n${shareUrl}`)}`;
    window.open(emailUrl, '_blank');
  };

  const handleCopyLinkClick = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: t('share.copied'),
        description: t('share.copiedDesc'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('share.copyError'),
        variant: 'destructive',
      });
    }
  };

  const handleMoreClick = () => {
    try {
      if ('share' in navigator) {
        // Prioritize sharing the image if available and supported
        if (files && files.length > 0 && 'canShare' in navigator && navigator.canShare({ files })) {
          navigator.share({
            files,
            title: 'CryptoCraze Chart',
            text: shareText ?? 'Check out this chart analysis!',
          }).catch((error: unknown) => {
            if ((error as Error).name !== 'AbortError') {
              toast({
                title: t('common.error'),
                description: t('share.shareError'),
                variant: 'destructive',
              });
            }
          });
        } else {
          // Fallback to link sharing
          navigator.share({
            title: 'CryptoCraze',
            text: shareText ?? '',
            url: shareUrl,
          }).catch((error: unknown) => {
            if ((error as Error).name !== 'AbortError') {
              toast({
                title: t('common.error'),
                description: t('share.shareError'),
                variant: 'destructive',
              });
            }
          });
        }
      } else {
        // Fallback for browsers without Web Share API
        void handleCopyLinkClick();
      }
    } catch {
      // Any runtime error while checking canShare -> fallback
      void handleCopyLinkClick();
    }
  };

  const handleNativeShare = async () => {
    try {
      if (!files || files.length === 0) {
        throw new Error('no-files');
      }
      if (!('canShare' in navigator) || !navigator.canShare({ files })) {
        throw new Error('unsupported');
      }

      await navigator.share({
        files,
        title: 'CryptoCraze Chart',
        text: shareText ?? 'Check out this chart!',
      });

      toast({
        title: t('common.success'),
        description: 'Chart shared successfully!',
      });
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') return; // user cancelled
      // Fallback: show error and do nothing fatal
      toast({
        title: t('common.error'),
        description: t('share.shareError'),
        variant: 'destructive',
      });
    }
  };

  const handleSaveImage = (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: t('common.success'),
        description: 'Chart saved successfully!',
      });
    } catch {
      toast({
        title: t('common.error'),
        description: 'Failed to save chart',
        variant: 'destructive',
      });
    }
  };

  const canShareFiles = () => {
    try {
      return Boolean(
        files &&
        files.length > 0 &&
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        navigator.canShare({ files })
      );
    } catch {
      return false;
    }
  };

  return {
    handleWhatsAppClick,
    handleTelegramClick,
    handleSMSClick,
    handleEmailClick,
    handleCopyLinkClick,
    handleMoreClick,
    handleNativeShare,
    handleSaveImage,
    canShareFiles,
  };
};