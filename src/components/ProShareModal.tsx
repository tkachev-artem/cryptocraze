import { useState, useEffect } from 'react';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from '../lib/i18n';
import { createShareUtils } from '../lib/shareUtils';

type ProShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  capturedImage: { blob: Blob; url: string; file: File } | null;
  isCapturing: boolean;
  symbol: string;
  offsetBottomPx?: number;
};

const ProShareModal: React.FC<ProShareModalProps> = ({
  isOpen,
  onClose,
  capturedImage,
  isCapturing,
  symbol,
  offsetBottomPx = 0
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const shareText = t('share.chartAnalysis', { symbol }) || `Check out this ${symbol} chart analysis on CryptoCraze!`;
  const shareUrl = 'https://cryptocraze.app';

  // Create share utilities
  const shareUtils = createShareUtils({
    shareUrl,
    shareText,
    files: capturedImage ? [capturedImage.file] : undefined,
    toast,
    t
  });

  // Update image URL when captured image changes
  useEffect(() => {
    if (capturedImage?.url) {
      setImageUrl(capturedImage.url);
    }
    return () => {
      // Clean up object URL on unmount or change
      if (imageUrl && imageUrl !== capturedImage?.url) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [capturedImage?.url, imageUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute left-0 right-0 top-0 bg-black/40 pointer-events-auto"
        style={{ bottom: `calc(${String(offsetBottomPx)}px + env(safe-area-inset-bottom))` }}
        onClick={onClose}
      />
      {/* Divider line above ProBottomMenu */}
      <div
        className="absolute left-0 right-0 h-px bg-gray-200 pointer-events-none"
        style={{ bottom: `calc(${String(offsetBottomPx)}px + env(safe-area-inset-bottom))` }}
      />

      {/* Modal sheet */}
      <div
        className="relative w-full max-w-md mx-auto bg-white rounded-t-2xl p-4 border border-gray-200 shadow-none pointer-events-auto"
        style={{ 
          marginBottom: `calc(${String(offsetBottomPx)}px + env(safe-area-inset-bottom))`,
          maxHeight: `calc(100vh - ${String(offsetBottomPx)}px - env(safe-area-inset-bottom))`
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t('proModal.titles.share')}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-black">{t('proModal.titles.share')}</h2>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain">
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="bg-gray-50 rounded-2xl p-4 min-h-[200px] flex items-center justify-center">
              {isCapturing ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600">{t('ui.chart.capturing')}</p>
                </div>
              ) : imageUrl ? (
                <div className="w-full">
                  <img 
                    src={imageUrl} 
                    alt={t('share.chartPreview') || 'Chart preview'} 
                    className="w-full h-auto rounded-lg shadow-md max-h-[300px] object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p className="text-sm">{t('ui.chart.noImage')}</p>
                </div>
              )}
            </div>

            {/* Primary Actions: Share (if supported) + Save */}
            {capturedImage && (
              <div className="space-y-3">
                {/* Native Share (only if supported) */}
                {shareUtils.canShareFiles() && (
                  <button
                    onClick={() => void shareUtils.handleNativeShare()}
                    className="w-full bg-white text-black py-3 px-4 rounded-xl font-medium text-base border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
                    aria-label={t('share.shareImage') || 'Share chart image'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <path d="M8.59 13.51l6.83 3.98"></path>
                      <path d="M15.41 6.51L8.59 10.49"></path>
                    </svg>
                    {t('ui.chart.share')}
                  </button>
                )}
                <button
                  onClick={() => { shareUtils.handleSaveImage(capturedImage.file); }}
                  className="w-full bg-[#0C54EA] text-white py-3 px-4 rounded-xl font-medium text-base hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
                  aria-label={t('share.saveImage') || 'Save chart image'}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      shareUtils.handleSaveImage(capturedImage.file);
                    }
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('ui.chart.saveToDevice')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProShareModal;