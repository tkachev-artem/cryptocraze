import { API_BASE_URL } from '@/lib/api';
import type { 
  EnergyProgress, 
  EnergyAddRequest, 
  EnergyAddResponse, 
  EnergyResetResponse,
  UserStats 
} from '@/types/energy';

/**
 * Сервис для работы с энергетической системой
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EnergyService {
  const baseUrl = `${API_BASE_URL}/energy`;

  /**
   * Получить текущий прогресс энергии
   */
  export async function getProgress(): Promise<EnergyProgress> {
    try {
      const response = await fetch(`${baseUrl}/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Для работы с куками
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      return await response.json() as EnergyProgress;
    } catch (error) {
      console.error('Ошибка при получении прогресса энергии:', error);
      throw error;
    }
  }

  /**
   * Добавить энергию к прогрессу
   */
  export async function addEnergy(amount: number): Promise<EnergyAddResponse> {
    try {
      const response = await fetch(`${baseUrl}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ amount } as EnergyAddRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      return await response.json() as EnergyAddResponse;
    } catch (error) {
      console.error('Ошибка при добавлении энергии:', error);
      throw error;
    }
  }

  /**
   * Сбросить прогресс энергии
   */
  export async function resetProgress(): Promise<EnergyResetResponse> {
    try {
      const response = await fetch(`${baseUrl}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      return await response.json() as EnergyResetResponse;
    } catch (error) {
      console.error('Ошибка при сбросе прогресса энергии:', error);
      throw error;
    }
  }

  /**
   * Получить статистику пользователя (включая энергию)
   */
  export async function getUserStats(): Promise<UserStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/user/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      return await response.json() as UserStats;
    } catch (error) {
      console.error('Ошибка при получении статистики пользователя:', error);
      throw error;
    }
  }

  /**
   * Явно списать энергию на клиенте (подстраховка после открытия коробки)
   */
  export async function spend(amount: number, expectedBefore?: number): Promise<{ previous: number; next: number; spentApplied: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/energy/spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ amount, expectedBefore }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
      return await response.json() as { previous: number; next: number; spentApplied: boolean };
    } catch (error) {
      console.error('Ошибка при списании энергии:', error);
      throw error;
    }
  }
}