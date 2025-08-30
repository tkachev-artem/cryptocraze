import { createSlice } from '@reduxjs/toolkit';

type CoinExchangeState = {
  isModalOpen: boolean;
}

const initialState: CoinExchangeState = {
  isModalOpen: false,
};

const coinExchangeSlice = createSlice({
  name: 'coinExchange',
  initialState,
  reducers: {
    openCoinExchange: (state) => {
      state.isModalOpen = true;
    },
    closeCoinExchange: (state) => {
      state.isModalOpen = false;
    },
  },
});

export const { openCoinExchange, closeCoinExchange } = coinExchangeSlice.actions;
export default coinExchangeSlice.reducer;