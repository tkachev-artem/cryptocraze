import { useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/lib/i18n';

type ProExitModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const ProExitModal: React.FC<ProExitModalProps> = ({ isOpen, onCancel, onConfirm }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [isOpen, onCancel]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      zIndexClass="z-[70]"
      backdropClassName="bg-black/60"
      hideClose
      containerClassName="items-center justify-center"
    >
      <div className="flex flex-col items-center text-center w-full max-w-sm" role="dialog" aria-labelledby="pro-exit-title">
        <div className="mb-[30px] flex max-w-[200px] items-center gap-2">
          <h2 id="pro-exit-title" className="text-xl font-bold text-black">{t('proExit.title')}</h2>
        </div>

        <div className="w-full flex flex-row gap-4 justify-center">
          <button
            onClick={onConfirm}
            className="bg-white text-[#0C54EA] font-semibold text-center py-3 px-8 rounded-full border-2 border-[#0C54EA] hover:bg-gray-50 transition-colors"
            aria-label={t('proExit.yes')}
          >
            {t('proExit.yes')}
          </button>
          <button
            onClick={onCancel}
            className="bg-[#0C54EA] text-white font-semibold text-center py-3 px-8 rounded-full hover:bg-[#0A47C7] transition-colors"
            aria-label={t('proExit.no')}
          >
            {t('proExit.no')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProExitModal;

