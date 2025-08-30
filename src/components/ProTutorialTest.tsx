import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import ProTutorial from './ProTutorial';

const ProTutorialTest: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleProceed = () => {
    if (currentStep < 19) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsOpen(false);
      setCurrentStep(1);
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    setCurrentStep(1);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">{t('ui.test.proTutorial')}</h2>
      
      <div className="space-y-2">
        <button
          onClick={() => {
            setCurrentStep(1);
            setIsOpen(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {t('ui.test.openStep1')}
        </button>
        
        <button
          onClick={() => {
            setCurrentStep(2);
            setIsOpen(true);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          {t('ui.test.openStep2')}
        </button>
        
        <button
          onClick={() => {
            setCurrentStep(3);
            setIsOpen(true);
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          {t('ui.test.openStep3')}
        </button>
        
        <button
          onClick={() => {
            setCurrentStep(4);
            setIsOpen(true);
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded"
        >
          {t('ui.test.openStep4')}
        </button>
        
        <button
          onClick={() => {
            setCurrentStep(5);
            setIsOpen(true);
          }}
          className="px-4 py-2 bg-teal-500 text-white rounded"
        >
          {t('ui.test.openStep5')}
        </button>
      </div>

      <div className="p-4 border rounded">
        <p>{t('ui.test.currentStep', { step: currentStep })}</p>
        <p>{t('ui.test.modalOpen', { status: isOpen ? t('ui.test.yes') : t('ui.test.no') })}</p>
      </div>

      {/* Имитация fx кнопки для подсветки */}
      <div className="flex gap-2">
        <button className="w-12 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">f_x</span>
        </button>
        <button 
          data-tutorial-target="fx-element"
          className="w-12 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center"
          onClick={() => {
            // Имитируем открытие fx модалки
            console.log('fx clicked');
            window.dispatchEvent(new Event('pro:tutorial:fxClicked'));
          }}
        >
          <span className="text-lg font-bold text-gray-800">f_x</span>
        </button>
      </div>

      {/* Имитация fx модалки с EMA индикатором */}
      <div className="mt-4 p-4 border rounded-lg bg-white">
        <h3 className="text-sm font-semibold mb-2">{t('ui.test.indicators')}</h3>
        <div className="space-y-2">
          <div 
            data-tutorial-target="ema-indicator"
            className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
          >
            <span className="text-sm font-semibold text-black">{t('indicators.ema')}</span>
            <button className="relative w-10 h-5 rounded-full bg-[#F1F7FF]">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#0C46BE]"></div>
            </button>
          </div>
          <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-sm font-semibold text-black">RSI</span>
            <button className="relative w-10 h-5 rounded-full bg-[#F1F7FF]">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#0C46BE]"></div>
            </button>
          </div>
        </div>
      </div>

      <ProTutorial
        isOpen={isOpen}
        currentStep={currentStep}
        onProceed={handleProceed}
        onSkip={handleSkip}
      />
    </div>
  );
};

export default ProTutorialTest; 