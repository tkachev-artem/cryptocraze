import type React from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import TutorialConnectionLine from './TutorialConnectionLine';

const TutorialConnectionLineTest: React.FC = () => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">{t('ui.test.connectionLineTest')}</h2>
      
      <button
        onClick={() => { setIsVisible(!isVisible); }}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {t('ui.test.showHideLine', { action: isVisible ? t('ui.test.hide') : t('ui.test.show') })}
      </button>

      {/* Имитация модалки */}
      <div 
        ref={modalRef}
        className="w-80 h-32 bg-blue-500 rounded-lg p-4 text-white"
        style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 90 }}
      >
        <h3>{t('ui.test.tutorialModal')}</h3>
        <p>{t('ui.test.applyEMA')}</p>
      </div>

      {/* Имитация fx элемента */}
      <div 
        data-tutorial-target="fx-element"
        className="w-12 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center"
        style={{ position: 'fixed', bottom: '100px', right: '20px', zIndex: 70 }}
      >
        <span className="text-lg font-bold text-gray-800">f_x</span>
      </div>

      {/* Синяя полоса соединения */}
      {isVisible && (
        <TutorialConnectionLine
          targetSelector="[data-tutorial-target='fx-element']"
          modalRef={modalRef}
          zIndex={85}
        />
      )}

      <div className="mt-96 p-4 border rounded">
        <p>{t('ui.test.scrollDown')}</p>
      </div>
    </div>
  );
};

export default TutorialConnectionLineTest; 