import { useEffect } from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndexClass?: string; // optional override for stacking context
  backdropClassName?: string; // optional override for backdrop appearance
  hideClose?: boolean; // hide default close icon/button
  containerClassName?: string; // override alignment/spacing of the outer flex container
  contentClassName?: string; // override content styles/size
  containerStyle?: React.CSSProperties; // inline style for precise vertical positioning
  contentRef?: React.Ref<HTMLDivElement>; // ref to measure modal content size
  contentStyle?: React.CSSProperties; // inline style for absolute positioning
  disableBackdropClose?: boolean; // prevent closing when clicking on backdrop
};

export function Modal({ isOpen, onClose, children, zIndexClass = 'z-50', backdropClassName = 'bg-black/70', hideClose = false, containerClassName = 'items-center justify-center', contentClassName, containerStyle, contentRef, contentStyle, disableBackdropClose = false }: ModalProps) {
  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex ${containerClassName} px-[14px] py-4 ${disableBackdropClose ? 'pointer-events-none' : ''}`} style={containerStyle}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 ${backdropClassName} ${disableBackdropClose ? 'pointer-events-none' : ''}`}
        onClick={disableBackdropClose ? undefined : onClose}
      />
      
      {/* Модальное окно */}
        <div ref={contentRef} className={`${contentClassName ?? 'relative z-[80] bg-white rounded-2xl p-6 max-w-md w-full shadow-xl'} ${disableBackdropClose ? 'pointer-events-auto' : ''}`} style={contentStyle}>
          {!hideClose && (
            <div onClick={onClose} className='w-full flex justify-end mb-4'>
              <img src="/close.svg" alt="Close" className="w-6 h-6" />
            </div>
          )}
          
          {children}
        </div>
    </div>
  );
} 