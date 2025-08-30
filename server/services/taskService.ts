import { db } from '../db.js';
import { userTasks, users } from '../../shared/schema';
import { eq, and, count, desc, gte, lt } from 'drizzle-orm';
import { EnergyService } from './energyService.js';
import { TaskTemplateService as StaticTaskTemplateService } from './taskTemplates.js';

export interface TaskReward {
  type: 'money' | 'coins' | 'energy' | 'mixed' | 'wheel';
  amount: string;
}

export interface TaskProgress {
  current: number;
  total: number;
}

export interface TaskData {
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
}

export interface CreateTaskOptions {
  taskType: string;
  title: string;
  description: string;
  rewardType: 'money' | 'coins' | 'energy' | 'mixed' | 'wheel';
  rewardAmount: string;
  progressTotal: number;
  icon?: string;
  expiresInHours?: number;
  cooldownMinutes?: number;
  maxPerDay?: number | null;
}

export class TaskService {
  private static readonly MAX_ACTIVE_TASKS = 3;
  private static readonly AUTO_FILL_INTERVAL = 60000; // 1 минута в миллисекундах

  /**
   * Get all active tasks for user and auto-fill if needed
   */
  static async getUserTasks(userId: string): Promise<TaskData[]> {
    console.log(`[TaskService] Getting tasks for user: ${userId}`);
    
    // First, expire old tasks
    await this.expireOldTasks(userId);
    
    // Auto-fill tasks to maintain 3 active tasks (temporarily disabled to debug)
    // await this.autoFillTasks(userId);
    
    let tasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.status, 'active')
        )
      )
      .orderBy(desc(userTasks.createdAt));

    console.log(`[TaskService] Found ${tasks.length} active tasks`);
    
    // If no tasks exist, create some initial tasks
    if (tasks.length === 0) {
      console.log(`[TaskService] No tasks found, creating initial tasks`);
      await this.createInitialTasks(userId);
    } else if (tasks.length < 3) {
      console.log(`[TaskService] Only ${tasks.length} tasks found, adding more test tasks`);
      await this.createTestWheelTask(userId);
    }

    // Re-fetch tasks after potential creation
    if (tasks.length === 0) {
      const newTasks = await db.select()
        .from(userTasks)
        .where(
          and(
            eq(userTasks.userId, userId),
            eq(userTasks.status, 'active')
          )
        )
        .orderBy(desc(userTasks.createdAt));
      
      console.log(`[TaskService] Re-fetched ${newTasks.length} tasks after creation`);
      tasks = newTasks;
    }

    const now = new Date();
    
    return tasks.map(task => {
      const expiresAt = task.expiresAt ? new Date(task.expiresAt) : null;
      const timeRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) : null;
      
      return {
        id: task.id.toString(),
        taskType: task.taskType,
        title: task.title,
        description: task.description || '',
        reward: {
          type: task.rewardType as 'money' | 'coins' | 'energy' | 'mixed' | 'wheel',
          amount: task.rewardAmount
        },
        progress: {
          current: task.progressCurrent || 0,
          total: task.progressTotal
        },
        status: 'active',
        icon: task.icon || '/trials/energy.svg',
        expiresAt: expiresAt?.toISOString(),
        timeRemaining: timeRemaining || undefined
      };
    });
  }

  /**
   * Create initial tasks for new users or when no tasks exist
   */
  private static async createInitialTasks(userId: string): Promise<void> {
    console.log(`[TaskService] Creating initial tasks for user: ${userId}`);
    
    // Create 3 tasks including wheel tasks for testing
    const initialTasks = [
      {
        taskType: 'quick_bonus',
        title: 'Быстрый бонус',
        description: 'Получите быструю награду',
        rewardType: 'money' as const,
        rewardAmount: '500',
        progressTotal: 1,
        icon: '/trials/energy.svg',
        expiresInHours: 6,
        cooldownMinutes: 0, // No cooldown for initial tasks
        maxPerDay: null
      },
      {
        taskType: 'lucky_wheel_test',
        title: 'Тест рулетки',
        description: 'Нажмите и испытайте удачу в рулетке!',
        rewardType: 'wheel' as const,
        rewardAmount: 'random',
        progressTotal: 1,
        icon: '/wheel/coins.svg',
        expiresInHours: 12,
        cooldownMinutes: 0,
        maxPerDay: null
      },
      {
        taskType: 'mega_wheel_test',
        title: 'Мега рулетка',
        description: 'Выполните 2 действия для большого шанса выигрыша!',
        rewardType: 'wheel' as const,
        rewardAmount: 'premium_random',
        progressTotal: 2,
        icon: '/wheel/coins.svg',
        expiresInHours: 8,
        cooldownMinutes: 0,
        maxPerDay: null
      }
    ];

    for (const taskOptions of initialTasks) {
      try {
        await this.createTask(userId, taskOptions);
      } catch (error) {
        console.error(`[TaskService] Error creating initial task: ${taskOptions.taskType}`, error);
      }
    }
  }


  /**
   * Expire old tasks
   */
  private static async expireOldTasks(userId: string): Promise<void> {
    const now = new Date();
    
    const result = await db.update(userTasks)
      .set({ status: 'expired' })
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.status, 'active'),
          lt(userTasks.expiresAt, now)
        )
      )
      .returning();
      
    if (result.length > 0) {
      console.log(`[TaskService] Expired ${result.length} old tasks for user ${userId}`);
    }
  }

  /**
   * Check if user can receive task of this type (cooldown check)
   */
  private static async canUserReceiveTask(userId: string, taskType: string, cooldownMinutes: number, maxPerDay: number | null): Promise<boolean> {
    const now = new Date();
    const cooldownStart = new Date(now.getTime() - cooldownMinutes * 60 * 1000);
    
    // Check cooldown period
    const recentTasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.taskType, taskType),
          gte(userTasks.completedAt, cooldownStart)
        )
      );
    
    if (recentTasks.length > 0) {
      console.log(`[TaskService] User ${userId} is in cooldown for task type ${taskType}`);
      return false;
    }
    
    // Check daily limit if specified
    if (maxPerDay !== null) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const todayTasks = await db.select()
        .from(userTasks)
        .where(
          and(
            eq(userTasks.userId, userId),
            eq(userTasks.taskType, taskType),
            gte(userTasks.completedAt, startOfDay)
          )
        );
      
      if (todayTasks.length >= maxPerDay) {
        console.log(`[TaskService] User ${userId} has reached daily limit for task type ${taskType}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create a new task
   */
  static async createTask(userId: string, options: CreateTaskOptions): Promise<TaskData | null> {
    console.log(`[TaskService] Creating task for user ${userId}:`, options);

    // Check active task limit
    const activeCount = await this.getActiveTasksCount(userId);
    if (activeCount >= this.MAX_ACTIVE_TASKS) {
      console.log(`[TaskService] Max tasks reached: ${activeCount}/${this.MAX_ACTIVE_TASKS}`);
      return null;
    }

    // Check cooldown and daily limits
    if (options.cooldownMinutes && options.cooldownMinutes > 0) {
      const canReceive = await this.canUserReceiveTask(
        userId, 
        options.taskType, 
        options.cooldownMinutes, 
        options.maxPerDay || null
      );
      
      if (!canReceive) {
        console.log(`[TaskService] User ${userId} cannot receive task ${options.taskType} due to cooldown/limits`);
        return null;
      }
    }

    // Calculate expiration time
    const expiresAt = options.expiresInHours 
      ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
      : null;

    // Create the task
    const [newTask] = await db.insert(userTasks).values({
      userId,
      taskType: options.taskType,
      title: options.title,
      description: options.description,
      rewardType: options.rewardType,
      rewardAmount: options.rewardAmount,
      progressTotal: options.progressTotal,
      progressCurrent: 0,
      status: 'active',
      icon: options.icon || '/trials/energy.svg',
      expiresAt: expiresAt
    }).returning();

    console.log(`[TaskService] Created task with ID: ${newTask.id}, expires: ${expiresAt?.toISOString()}`);

    const timeRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : null;

    return {
      id: newTask.id.toString(),
      taskType: newTask.taskType,
      title: newTask.title,
      description: newTask.description || '',
      reward: {
        type: newTask.rewardType as 'money' | 'coins' | 'energy' | 'mixed' | 'wheel',
        amount: newTask.rewardAmount
      },
      progress: {
        current: 0,
        total: newTask.progressTotal
      },
      status: 'active',
      icon: newTask.icon || '/trials/energy.svg',
      expiresAt: expiresAt?.toISOString(),
      timeRemaining: timeRemaining || undefined
    };
  }

  /**
   * Complete a task and give rewards
   */
  static async completeTask(taskId: number, userId: string): Promise<{
    success: boolean;
    task?: TaskData;
    newTask?: TaskData;
    error?: string;
  }> {
    console.log(`[TaskService] Completing task ${taskId} for user ${userId}`);

    try {
      // Find the task
      const [task] = await db.select()
        .from(userTasks)
        .where(
          and(
            eq(userTasks.id, taskId),
            eq(userTasks.userId, userId),
            eq(userTasks.status, 'active')
          )
        )
        .limit(1);

      if (!task) {
        console.log(`[TaskService] Task not found: ${taskId}`);
        return { success: false, error: 'Task not found' };
      }

      // Mark as completed
      const [completedTask] = await db.update(userTasks)
        .set({
          status: 'completed',
          progressCurrent: task.progressTotal,
          completedAt: new Date()
        })
        .where(eq(userTasks.id, taskId))
        .returning();

      console.log(`[TaskService] Marked task ${taskId} as completed`);

      // Give rewards
      await this.giveReward(userId, {
        type: task.rewardType as 'money' | 'coins' | 'energy' | 'mixed' | 'wheel',
        amount: task.rewardAmount
      });

      console.log(`[TaskService] Gave reward: ${task.rewardType} ${task.rewardAmount}`);

      // Create new task if needed
      let newTask: TaskData | undefined;
      const activeCount = await this.getActiveTasksCount(userId);
      if (activeCount < this.MAX_ACTIVE_TASKS) {
        newTask = await this.createRandomTask(userId);
        console.log(`[TaskService] Created new task: ${newTask?.title || 'none'}`);
      }

      return {
        success: true,
        task: {
          id: completedTask.id.toString(),
          taskType: completedTask.taskType,
          title: completedTask.title,
          description: completedTask.description || '',
          reward: {
            type: completedTask.rewardType as 'money' | 'coins' | 'energy' | 'mixed' | 'wheel',
            amount: completedTask.rewardAmount
          },
          progress: {
            current: completedTask.progressTotal,
            total: completedTask.progressTotal
          },
          status: 'completed',
          icon: completedTask.icon || '/trials/energy.svg'
        },
        newTask
      };

    } catch (error) {
      console.error(`[TaskService] Error completing task:`, error);
      return { success: false, error: 'Failed to complete task' };
    }
  }

  /**
   * Give reward to user
   */
  private static async giveReward(userId: string, reward: TaskReward): Promise<void> {
    console.log(`[TaskService] Giving reward to user ${userId}:`, reward);

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.error(`[TaskService] User not found: ${userId}`);
      return;
    }

    const updateData: any = {};

    switch (reward.type) {
      case 'money':
        const currentBalance = parseFloat(user.balance || '0');
        const rewardAmount = this.parseRewardAmount(reward.amount);
        updateData.balance = (currentBalance + rewardAmount).toFixed(2);
        console.log(`[TaskService] Adding money: ${rewardAmount} (new balance: ${updateData.balance})`);
        break;

      case 'coins':
        const currentCoins = user.coins || 0;
        const coinAmount = this.parseRewardAmount(reward.amount);
        updateData.coins = currentCoins + coinAmount;
        console.log(`[TaskService] Adding coins: ${coinAmount} (new total: ${updateData.coins})`);
        break;

      case 'energy':
        const energyAmount = this.parseRewardAmount(reward.amount);
        await EnergyService.addEnergy(userId, energyAmount);
        console.log(`[TaskService] Added energy: ${energyAmount}`);
        break;

      case 'mixed':
        // Handle mixed rewards: format "5_energy_1K_money" or "3_energy_500_coins"
        if (reward.amount.includes('_energy_')) {
          const parts = reward.amount.split('_');
          const energyAmount = parseInt(parts[0]);
          const secondaryAmount = parts[2];
          const secondaryType = parts[3];

          // Add energy
          await EnergyService.addEnergy(userId, energyAmount);
          console.log(`[TaskService] Added energy from mixed: ${energyAmount}`);

          // Add secondary reward
          if (secondaryType === 'money') {
            const currentBalance = parseFloat(user.balance || '0');
            const moneyAmount = this.parseRewardAmount(secondaryAmount);
            updateData.balance = (currentBalance + moneyAmount).toFixed(2);
            console.log(`[TaskService] Added money from mixed: ${moneyAmount}`);
          } else if (secondaryType === 'coins') {
            const currentCoins = user.coins || 0;
            const coinAmount = this.parseRewardAmount(secondaryAmount);
            updateData.coins = currentCoins + coinAmount;
            console.log(`[TaskService] Added coins from mixed: ${coinAmount}`);
          }
        }
        break;

      case 'wheel':
        console.log(`[TaskService] Wheel reward - handled separately`);
        break;
    }

    // Update database if needed
    if (Object.keys(updateData).length > 0) {
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId));
      console.log(`[TaskService] Updated user data:`, updateData);
    }
  }

  /**
   * Parse reward amount string to number
   */
  private static parseRewardAmount(amount: string): number {
    if (amount.includes('K')) {
      return parseInt(amount.replace('K', '')) * 1000;
    }
    if (amount.includes('M')) {
      return parseInt(amount.replace('M', '')) * 1000000;
    }
    return parseInt(amount) || 0;
  }

  /**
   * Get count of active tasks
   */
  static async getActiveTasksCount(userId: string): Promise<number> {
    const result = await db.select({ count: count() })
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.status, 'active')
        )
      );

    return result[0].count;
  }

  /**
   * Clear all tasks for user (for testing purposes)
   */
  static async clearAllUserTasks(userId: string): Promise<void> {
    console.log(`[TaskService] Clearing all tasks for user: ${userId}`);
    await db.delete(userTasks)
      .where(eq(userTasks.userId, userId));
    console.log(`[TaskService] All tasks cleared for user: ${userId}`);
  }

  /**
   * Create a test wheel task
   */
  static async createTestWheelTask(userId: string): Promise<void> {
    console.log(`[TaskService] Creating test wheel task for user: ${userId}`);
    
    const wheelTask = {
      taskType: 'instant_wheel_test',
      title: '🎰 Мгновенная рулетка',
      description: 'Получите мгновенный доступ к рулетке удачи!',
      rewardType: 'wheel' as const,
      rewardAmount: 'random',
      progressTotal: 1,
      icon: '/wheel/coins.svg',
      expiresInHours: 24,
      cooldownMinutes: 0,
      maxPerDay: null
    };

    try {
      await this.createTask(userId, wheelTask);
      console.log(`[TaskService] Created test wheel task`);
    } catch (error) {
      console.error(`[TaskService] Error creating test wheel task:`, error);
    }
  }

  /**
   * Create a random task
   */
  static async createRandomTask(userId: string): Promise<TaskData | null> {
    console.log(`[TaskService] Creating random task for user: ${userId}`);

    // Get random template
    const template = StaticTaskTemplateService.getRandomTemplateByRarity();
    if (!template) {
      console.log(`[TaskService] No template available`);
      return null;
    }

    const options: CreateTaskOptions = {
      taskType: template.taskType,
      title: template.title,
      description: template.description,
      rewardType: template.rewardType as 'money' | 'coins' | 'energy' | 'mixed' | 'wheel',
      rewardAmount: template.rewardAmount,
      progressTotal: template.progressTotal,
      icon: template.icon || '/trials/energy.svg',
      expiresInHours: template.expiresInHours,
      cooldownMinutes: template.cooldownMinutes,
      maxPerDay: template.maxPerDay
    };

    return this.createTask(userId, options);
  }

  /**
   * Auto-fill tasks to maximum
   */
  static async autoFillTasks(userId: string): Promise<TaskData[]> {
    console.log(`[TaskService] Auto-filling tasks for user: ${userId}`);

    const currentTasks = await this.getUserTasks(userId);
    const tasksToCreate = this.MAX_ACTIVE_TASKS - currentTasks.length;

    console.log(`[TaskService] Current tasks: ${currentTasks.length}, need to create: ${tasksToCreate}`);

    const newTasks: TaskData[] = [];
    for (let i = 0; i < tasksToCreate; i++) {
      const newTask = await this.createRandomTask(userId);
      if (newTask) {
        newTasks.push(newTask);
      }
    }

    console.log(`[TaskService] Created ${newTasks.length} new tasks`);
    return [...currentTasks, ...newTasks];
  }

  /**
   * Delete/replace a task
   */
  static async replaceTask(taskId: number, userId: string): Promise<{
    success: boolean;
    newTask?: TaskData;
    error?: string;
  }> {
    console.log(`[TaskService] Replacing task ${taskId} for user ${userId}`);

    try {
      // Delete the old task
      await db.delete(userTasks)
        .where(
          and(
            eq(userTasks.id, taskId),
            eq(userTasks.userId, userId)
          )
        );

      console.log(`[TaskService] Deleted task ${taskId}`);

      // Create a new task
      const newTask = await this.createRandomTask(userId);

      return {
        success: true,
        newTask
      };

    } catch (error) {
      console.error(`[TaskService] Error replacing task:`, error);
      return { success: false, error: 'Failed to replace task' };
    }
  }

  /**
   * Delete a task (legacy method for compatibility)
   */
  static async deleteTask(taskId: number, userId: string): Promise<boolean> {
    try {
      await db.delete(userTasks)
        .where(
          and(
            eq(userTasks.id, taskId),
            eq(userTasks.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error(`[TaskService] Error deleting task:`, error);
      return false;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async updateTaskProgress(taskId: number, userId: string, progress: number): Promise<any> {
    // For backward compatibility, redirect to completeTask if progress is complete
    const [task] = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.id, taskId),
          eq(userTasks.userId, userId),
          eq(userTasks.status, 'active')
        )
      )
      .limit(1);

    if (!task) {
      return null;
    }

    if (progress >= task.progressTotal) {
      // Check if this is a video bonus task - they should not auto-complete
      const isVideoBonus = task.taskType === 'video_bonus' || task.taskType === 'video_bonus_2';
      
      if (isVideoBonus) {
        // For video bonus tasks, update progress but don't complete - user must click pickup
        const [updatedTask] = await db.update(userTasks)
          .set({ progressCurrent: progress })
          .where(eq(userTasks.id, taskId))
          .returning();

        return {
          task: {
            id: updatedTask.id.toString(),
            taskType: updatedTask.taskType,
            title: updatedTask.title,
            description: updatedTask.description || '',
            reward: {
              type: updatedTask.rewardType as 'money' | 'coins' | 'energy' | 'mixed' | 'wheel',
              amount: updatedTask.rewardAmount
            },
            progress: {
              current: updatedTask.progressCurrent || 0,
              total: updatedTask.progressTotal
            },
            status: 'active', // Keep as active so it stays in the list
            icon: updatedTask.icon || '/trials/energy.svg'
          },
          isCompleted: true, // But mark as completed for UI
          rewardClaimed: false
        };
      } else {
        // For other tasks, complete normally
        return await this.completeTask(taskId, userId);
      }
    } else {
      // Just update progress without completing
      const [updatedTask] = await db.update(userTasks)
        .set({ progressCurrent: progress })
        .where(eq(userTasks.id, taskId))
        .returning();

      return {
        task: {
          id: updatedTask.id.toString(),
          taskType: updatedTask.taskType,
          title: updatedTask.title,
          description: updatedTask.description || '',
          reward: {
            type: updatedTask.rewardType as 'money' | 'coins' | 'energy' | 'mixed' | 'wheel',
            amount: updatedTask.rewardAmount
          },
          progress: {
            current: updatedTask.progressCurrent || 0,
            total: updatedTask.progressTotal
          },
          status: 'active',
          icon: updatedTask.icon || '/trials/energy.svg'
        },
        isCompleted: false,
        rewardClaimed: false
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async createTaskByCategory(userId: string, category: string): Promise<TaskData | null> {
    // For now, just create a random task
    return this.createRandomTask(userId);
  }

  /**
   * Create task by template ID
   */
  static async createTaskByTemplateId(userId: string, templateId: string): Promise<TaskData | null> {
    console.log(`[TaskService] Creating task by template ID: ${templateId} for user: ${userId}`);
    
    // Get template from static service
    const template = StaticTaskTemplateService.getTemplateById(templateId);
    if (!template) {
      console.log(`[TaskService] Template not found: ${templateId}`);
      return null;
    }

    // Convert template to task options
    const options: CreateTaskOptions = {
      taskType: template.taskType,
      title: template.title,
      description: template.description,
      rewardType: template.rewardType,
      rewardAmount: template.rewardAmount,
      progressTotal: template.progressTotal,
      icon: template.icon,
      expiresInHours: template.expiresInHours,
      cooldownMinutes: template.cooldownMinutes,
      maxPerDay: template.maxPerDay
    };

    return this.createTask(userId, options);
  }
}