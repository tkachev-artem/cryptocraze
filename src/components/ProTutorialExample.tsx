import type React from 'react';
import { useState } from 'react';
import ProTutorial from './ProTutorial';

const ProTutorialExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleProceed = () => {
    if (currentStep < 6) {
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
      <h1 className="text-2xl font-bold">Pro Tutorial Test</h1>
      
      <div className="space-y-2">
        <button 
          onClick={() => { setCurrentStep(1); setIsOpen(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Step 1
        </button>
        
        <button 
          onClick={() => { setCurrentStep(2); setIsOpen(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Step 2 (FX Highlight)
        </button>
        
        <button 
          onClick={() => { setCurrentStep(3); setIsOpen(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Step 3 (EMA Highlight)
        </button>
        
        <button 
          onClick={() => { setCurrentStep(4); setIsOpen(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Step 4 (Next Task Button)
        </button>
        
        <button 
          onClick={() => { setCurrentStep(5); setIsOpen(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Step 5 (FX Highlight RSI)
        </button>
        
        <button 
          onClick={() => { setCurrentStep(6); setIsOpen(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Step 6 (RSI Highlight)
        </button>
      </div>

      {/* Имитация fx элемента для тестирования */}
      <div 
        data-tutorial-target="fx-element" 
        className="w-20 h-10 bg-gray-200 rounded flex items-center justify-center cursor-pointer"
        onClick={() => {
          window.dispatchEvent(new Event('pro:tutorial:fxClicked'));
        }}
      >
        fx
      </div>

      {/* Имитация EMA индикатора для тестирования */}
      <div 
        data-tutorial-target="ema-indicator" 
        className="w-32 h-12 bg-gray-200 rounded flex items-center justify-center"
      >
        EMA Indicator
      </div>

      {/* Имитация RSI индикатора для тестирования */}
      <div 
        data-tutorial-target="rsi-indicator" 
        className="w-32 h-12 bg-gray-200 rounded flex items-center justify-center"
      >
        RSI Indicator
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

export default ProTutorialExample; 