import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Deal } from '../services/dealService';
import type { RootState } from './store';

// Функция для форматирования TP/SL значений до 2 цифр после точки
const formatTPSLValue = (value: string | number | undefined): string => {
    if (!value || value === '0' || value === 0) return '';
    
    // Если значение уже строка, сначала убираем лишние нули
    if (typeof value === 'string') {
        const cleanedStr = value.replace(/\.?0+$/, '');
        const num = parseFloat(cleanedStr);
        if (isNaN(num)) return '';
        return cleanedStr;
    }
    
    // Если значение число, обрабатываем как раньше
    const num = value;
    const numStr = num.toString();
    
    // Если число целое (нет точки), возвращаем как есть
    if (!numStr.includes('.')) {
        return numStr;
    }
    
    // Если есть точка, убираем лишние нули после точки
    return numStr.replace(/\.?0+$/, '');
};

export type MoreInfoType = 'multiplier' | 'takeProfit' | 'stopLoss' | 'commission';

export type DealResult = {
  profit: number;
  isProfit: boolean;
}

export type EditDealData = {
  deal: Deal;
  takeProfit: string;
  stopLoss: string;
}

export type DealModalState = {
  isDealModalOpen: boolean;
  isMoreInfoOpen: boolean;
  moreInfoType: MoreInfoType | null;
  isDealInfoOpen: boolean;
  dealResult: DealResult | null;
  isEditDealOpen: boolean;
  editDealData: EditDealData | null;
  lastDismissedEditDealId: number | null;
}

const initialState: DealModalState = {
  isDealModalOpen: false,
  isMoreInfoOpen: false,
  moreInfoType: null,
  isDealInfoOpen: false,
  dealResult: null,
  isEditDealOpen: false,
  editDealData: null,
  lastDismissedEditDealId: null,
};

const dealModalSlice = createSlice({
  name: 'dealModal',
  initialState,
  reducers: {
    openDealModal: (state) => { 
      state.isDealModalOpen = true; 
    },
    closeDealModal: (state) => { 
      state.isDealModalOpen = false; 
    },
    openMoreInfo: (state, action: PayloadAction<MoreInfoType>) => {
      state.isMoreInfoOpen = true;
      state.moreInfoType = action.payload;
    },
    closeMoreInfo: (state) => {
      state.isMoreInfoOpen = false;
      state.moreInfoType = null;
    },
    openDealInfo: (state, action: PayloadAction<DealResult>) => {
      state.isDealInfoOpen = true;
      state.dealResult = action.payload;
    },
    closeDealInfo: (state: DealModalState) => {
      state.isDealInfoOpen = false;
      state.dealResult = null;
    },
    openEditDeal: (state, action: PayloadAction<Deal>) => {
      // Не открываем EditDealModal, если сейчас показан DealInfo
      if (state.isDealInfoOpen) {
        return;
      }
      state.isEditDealOpen = true;
      state.editDealData = {
        deal: action.payload,
        takeProfit: formatTPSLValue(action.payload.takeProfit),
        stopLoss: formatTPSLValue(action.payload.stopLoss),
      };
    },
    closeEditDeal: (state) => {
      state.isEditDealOpen = false;
      state.editDealData = null;
    },
    setLastDismissedEditDealId: (state, action: PayloadAction<number | null>) => {
      state.lastDismissedEditDealId = action.payload;
    },
    updateEditDealData: (state, action: PayloadAction<Partial<EditDealData>>) => {
      if (state.editDealData) {
        // Просто обновляем данные без форматирования (пользовательский ввод)
        state.editDealData = { ...state.editDealData, ...action.payload };
      }
    },
  },
});

export const { 
  openDealModal, 
  closeDealModal, 
  openMoreInfo, 
  closeMoreInfo,
  openDealInfo,
  closeDealInfo,
  openEditDeal,
  closeEditDeal,
  updateEditDealData,
  setLastDismissedEditDealId,
} = dealModalSlice.actions;

export const selectIsDealModalOpen = (state: RootState) => state.dealModal.isDealModalOpen;
export const selectMoreInfoState = (state: RootState) => ({
  isMoreInfoOpen: state.dealModal.isMoreInfoOpen,
  moreInfoType: state.dealModal.moreInfoType,
});
export const selectEditDealState = (state: RootState) => ({
  isEditDealOpen: state.dealModal.isEditDealOpen,
  editDealData: state.dealModal.editDealData,
});

export default dealModalSlice.reducer;