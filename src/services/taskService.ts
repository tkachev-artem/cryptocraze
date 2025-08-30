// Simple task service with clean API calls

const API_BASE_URL = '/api';

export type TaskReward = {
  type: 'money' | 'coins' | 'energy' | 'mixed' | 'wheel';
  amount: string;
}

export type TaskProgress = {
  current: number;
  total: number;
}

export type Task = {
  id: string;
  taskType: string;
  title: string;
  description: string;
  reward: TaskReward;
  progress: TaskProgress;
  status: 'active' | 'completed' | 'expired';
  icon: string;
  expiresAt?: string; // ISO timestamp when task expires
  timeRemaining?: number; // seconds remaining until expiration
  isCompleted?: boolean; // For tasks that are done but not claimed
  rewardClaimed?: boolean; // Whether reward has been claimed
}

export type TaskResponse = {
  tasks: Task[];
}

export type CompleteTaskResponse = {
  success: boolean;
  completedTask?: Task;
  newTask?: Task;
  wheelResult?: { prize: number; index: number; label: string };
  error?: string;
}

export type ReplaceTaskResponse = {
  success: boolean;
  newTask?: Task;
  error?: string;
}

export type UpdateProgressResponse = {
  task: Task;
  isCompleted: boolean;
  rewardClaimed: boolean;
  newTask?: Task;
}

export type WheelPrize = {
  value: number;
  label: string;
  index: number;
}

export type SpinWheelResponse = {
  prize: WheelPrize;
  newBalance: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TaskService {
  const baseUrl = `${API_BASE_URL}/tasks`;

  /**
   * Get all active tasks
   */
  export async function getTasks(): Promise<Task[]> {
    console.log('[TaskService] Getting tasks');
    
    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const data: TaskResponse = await response.json() as TaskResponse;
      console.log(`[TaskService] Got ${data.tasks.length.toString()} tasks`);
      
      return data.tasks;
    } catch (error) {
      console.error('[TaskService] Error getting tasks:', error);
      throw error;
    }
  }

  /**
   * Complete a task
   */
  export async function completeTask(taskId: string): Promise<CompleteTaskResponse> {
    console.log(`[TaskService] Completing task: ${taskId}`);
    
    try {
      const response = await fetch(`${baseUrl}/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        throw new Error(errorData.error ?? `HTTP error! status: ${response.status.toString()}`);
      }

      const result: CompleteTaskResponse = await response.json() as CompleteTaskResponse;
      console.log(`[TaskService] Task completed:`, result);
      
      return result;
    } catch (error) {
      console.error('[TaskService] Error completing task:', error);
      throw error;
    }
  }

  /**
   * Replace a task with a new one
   */
  export async function replaceTask(taskId: string): Promise<ReplaceTaskResponse> {
    console.log(`[TaskService] Replacing task: ${taskId}`);
    
    try {
      const response = await fetch(`${baseUrl}/${taskId}/replace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        throw new Error(errorData.error ?? `HTTP error! status: ${response.status.toString()}`);
      }

      const result: ReplaceTaskResponse = await response.json() as ReplaceTaskResponse;
      console.log(`[TaskService] Task replaced:`, result);
      
      return result;
    } catch (error) {
      console.error('[TaskService] Error replacing task:', error);
      throw error;
    }
  }

  /**
   * Update task progress without completing it
   */
  export async function updateTaskProgress(taskId: string, progress: number): Promise<UpdateProgressResponse> {
    console.log(`[TaskService] Updating task progress: ${taskId}, progress: ${progress.toString()}`);
    
    try {
      const response = await fetch(`${baseUrl}/${taskId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ progress }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        throw new Error(errorData.error ?? `HTTP error! status: ${response.status.toString()}`);
      }

      const result: UpdateProgressResponse = await response.json() as UpdateProgressResponse;
      console.log(`[TaskService] Task progress updated:`, result);
      
      return result;
    } catch (error) {
      console.error('[TaskService] Error updating task progress:', error);
      throw error;
    }
  }

  /**
   * Get wheel prizes (for wheel tasks)
   */
  export async function getWheelPrizes(): Promise<WheelPrize[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/wheel/prizes`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const result = await response.json() as { prizes: WheelPrize[] };
      return result.prizes;

    } catch (error) {
      console.error('[TaskService] Error getting wheel prizes:', error);
      throw error;
    }
  }

  /**
   * Spin the wheel (for wheel tasks)
   */
  export async function spinWheel(): Promise<SpinWheelResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/wheel/spin`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      return await response.json() as SpinWheelResponse;

    } catch (error) {
      console.error('[TaskService] Error spinning wheel:', error);
      throw error;
    }
  }
}