// Task persistence utilities for maintaining state across page reloads

import type { Task } from '@/services/taskService';

const TASKS_STORAGE_KEY = 'cryptocraze_tasks';
const TASK_COMPLETION_KEY = 'cryptocraze_task_completions';
const TASK_COOLDOWNS_KEY = 'cryptocraze_task_cooldowns';

export type TaskCompletionRecord = {
  taskId: string;
  completedAt: number;
  expiresAt?: number;
}

export type TaskCooldownRecord = {
  taskType: string;
  cooldownUntil: number;
}

export interface TaskPersistenceState {
  tasks: Task[];
  lastUpdated: number;
  completions: TaskCompletionRecord[];
  cooldowns: TaskCooldownRecord[];
}

/**
 * Save tasks to localStorage
 */
export const saveTasks = (tasks: Task[]): void => {
  try {
    const state: TaskPersistenceState = {
      tasks,
      lastUpdated: Date.now(),
      completions: getTaskCompletions(),
      cooldowns: getTaskCooldowns()
    };
    
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state));
    console.log('[TaskPersistence] Saved tasks to localStorage:', tasks.length);
  } catch (error) {
    console.warn('[TaskPersistence] Failed to save tasks:', error);
  }
};

/**
 * Load tasks from localStorage
 */
export const loadTasks = (): TaskPersistenceState | null => {
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!stored) return null;
    
    const state: TaskPersistenceState = JSON.parse(stored);
    
    // Validate structure
    if (!state.tasks || !Array.isArray(state.tasks)) {
      console.warn('[TaskPersistence] Invalid tasks structure in storage');
      return null;
    }
    
    // Check if data is too old (older than 5 minutes)
    const maxAge = 5 * 60 * 1000;
    if (Date.now() - state.lastUpdated > maxAge) {
      console.log('[TaskPersistence] Cached tasks are too old, ignoring');
      return null;
    }
    
    console.log('[TaskPersistence] Loaded tasks from localStorage:', state.tasks.length);
    return state;
  } catch (error) {
    console.warn('[TaskPersistence] Failed to load tasks:', error);
    return null;
  }
};

/**
 * Clear persisted tasks
 */
export const clearPersistedTasks = (): void => {
  try {
    localStorage.removeItem(TASKS_STORAGE_KEY);
    console.log('[TaskPersistence] Cleared persisted tasks');
  } catch (error) {
    console.warn('[TaskPersistence] Failed to clear persisted tasks:', error);
  }
};

/**
 * Record task completion with expiration time
 */
export const recordTaskCompletion = (taskId: string, expiresAt?: number): void => {
  try {
    const completions = getTaskCompletions();
    const newCompletion: TaskCompletionRecord = {
      taskId,
      completedAt: Date.now(),
      expiresAt
    };
    
    // Remove any existing completion for this task
    const updatedCompletions = completions.filter(c => c.taskId !== taskId);
    updatedCompletions.push(newCompletion);
    
    // Clean up expired completions
    const now = Date.now();
    const validCompletions = updatedCompletions.filter(c => 
      !c.expiresAt || c.expiresAt > now
    );
    
    localStorage.setItem(TASK_COMPLETION_KEY, JSON.stringify(validCompletions));
    console.log('[TaskPersistence] Recorded task completion:', taskId);
  } catch (error) {
    console.warn('[TaskPersistence] Failed to record task completion:', error);
  }
};

/**
 * Get task completions
 */
export const getTaskCompletions = (): TaskCompletionRecord[] => {
  try {
    const stored = localStorage.getItem(TASK_COMPLETION_KEY);
    if (!stored) return [];
    
    const completions: TaskCompletionRecord[] = JSON.parse(stored);
    
    // Filter out expired completions
    const now = Date.now();
    return completions.filter(c => !c.expiresAt || c.expiresAt > now);
  } catch (error) {
    console.warn('[TaskPersistence] Failed to get task completions:', error);
    return [];
  }
};

/**
 * Check if task was recently completed
 */
export const wasTaskRecentlyCompleted = (taskId: string): boolean => {
  const completions = getTaskCompletions();
  return completions.some(c => c.taskId === taskId);
};

/**
 * Record task cooldown
 */
export const recordTaskCooldown = (taskType: string, cooldownMinutes: number): void => {
  try {
    const cooldowns = getTaskCooldowns();
    const cooldownUntil = Date.now() + (cooldownMinutes * 60 * 1000);
    
    const newCooldown: TaskCooldownRecord = {
      taskType,
      cooldownUntil
    };
    
    // Remove any existing cooldown for this task type
    const updatedCooldowns = cooldowns.filter(c => c.taskType !== taskType);
    updatedCooldowns.push(newCooldown);
    
    // Clean up expired cooldowns
    const now = Date.now();
    const validCooldowns = updatedCooldowns.filter(c => c.cooldownUntil > now);
    
    localStorage.setItem(TASK_COOLDOWNS_KEY, JSON.stringify(validCooldowns));
    console.log('[TaskPersistence] Recorded task cooldown:', taskType, 'until', new Date(cooldownUntil));
  } catch (error) {
    console.warn('[TaskPersistence] Failed to record task cooldown:', error);
  }
};

/**
 * Get task cooldowns
 */
export const getTaskCooldowns = (): TaskCooldownRecord[] => {
  try {
    const stored = localStorage.getItem(TASK_COOLDOWNS_KEY);
    if (!stored) return [];
    
    const cooldowns: TaskCooldownRecord[] = JSON.parse(stored);
    
    // Filter out expired cooldowns
    const now = Date.now();
    return cooldowns.filter(c => c.cooldownUntil > now);
  } catch (error) {
    console.warn('[TaskPersistence] Failed to get task cooldowns:', error);
    return [];
  }
};

/**
 * Check if task type is in cooldown
 */
export const isTaskTypeInCooldown = (taskType: string): boolean => {
  const cooldowns = getTaskCooldowns();
  return cooldowns.some(c => c.taskType === taskType);
};

/**
 * Get remaining cooldown time for task type (in milliseconds)
 */
export const getTaskTypeCooldownRemaining = (taskType: string): number => {
  const cooldowns = getTaskCooldowns();
  const cooldown = cooldowns.find(c => c.taskType === taskType);
  
  if (!cooldown) return 0;
  
  const remaining = cooldown.cooldownUntil - Date.now();
  return Math.max(0, remaining);
};

/**
 * Clean up all expired data
 */
export const cleanupExpiredData = (): void => {
  try {
    // Clean completions
    getTaskCompletions(); // This automatically filters expired ones
    
    // Clean cooldowns  
    getTaskCooldowns(); // This automatically filters expired ones
    
    console.log('[TaskPersistence] Cleaned up expired data');
  } catch (error) {
    console.warn('[TaskPersistence] Failed to cleanup expired data:', error);
  }
};