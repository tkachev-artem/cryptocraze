// Типы для энергетической системы
export type EnergyProgress = {
  progress: number;
};

export type EnergyAddRequest = {
  amount: number;
};

export type EnergyAddResponse = {
  newProgress: number;
  isCompleted: boolean;
  completedTasks: number;
};

export type EnergyResetResponse = {
  success: boolean;
};

export type UserStats = {
  balance: number;
  freeBalance: number;
  energyTasksBonus: number;
  tradesCount: number;
  isPremium: boolean;
  // Другие поля статистики пользователя
}; 