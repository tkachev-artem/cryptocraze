import { db } from '../db.js';
import { userTasks, users } from '../../shared/schema';
import { eq, and, count, desc, gte, lt } from 'drizzle-orm';
import { EnergyService } from './energyService.js';
import { TaskTemplateService as StaticTaskTemplateService } from './taskTemplates.js';
import { notificationService } from './notifications.js';

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
   * Get all active tasks for user (READ ONLY - no auto-creation)
   */
  static async getUserTasks(userId: string): Promise<TaskData[]> {
    console.log(`[TaskService] Getting tasks for user: ${userId}`);
    
    // First, expire old tasks
    await this.expireOldTasks(userId);
    
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
        status: task.status as 'active' | 'completed' | 'expired',
        icon: task.icon || '/trials/energy.svg',
        // Add completion flags
        isCompleted: task.progressCurrent >= task.progressTotal && task.status === 'active',
        rewardClaimed: task.status === 'completed',
        expiresAt: expiresAt?.toISOString(),
        timeRemaining: timeRemaining || undefined
      };
    });
  }

  /**
   * Ensure user has tasks (create if needed) - call this explicitly when needed
   */
  static async ensureUserHasTasks(userId: string): Promise<TaskData[]> {
    console.log(`[TaskService] 🎯 Ensuring user has tasks: ${userId}`);
    
    // First get current tasks
    const currentTasks = await this.getUserTasks(userId);
    console.log(`[TaskService] 📊 Current tasks count: ${currentTasks.length}/${this.MAX_ACTIVE_TASKS}`);
    
    // If no tasks, create initial set
    if (currentTasks.length === 0) {
      console.log(`[TaskService] 🆕 No tasks found, creating initial tasks`);
      await this.createInitialTasks(userId);
    } else if (currentTasks.length < this.MAX_ACTIVE_TASKS) {
      // Auto-fill to maintain 3 active tasks
      console.log(`[TaskService] 🔧 Auto-filling tasks (need ${this.MAX_ACTIVE_TASKS - currentTasks.length} more)`);
      await this.autoFillTasks(userId);
    } else {
      console.log(`[TaskService] ✅ User already has max tasks (${currentTasks.length})`);
    }
    
    // Return updated tasks
    const finalTasks = await this.getUserTasks(userId);
    console.log(`[TaskService] 🏁 Final tasks count: ${finalTasks.length}`);
    return finalTasks;
  }

  /**
   * Create initial tasks for new users or when no tasks exist
   */
  private static async createInitialTasks(userId: string): Promise<void> {
    console.log(`[TaskService] Creating initial tasks for user: ${userId}`);
    
    // Create 3 random tasks using the template system
    for (let i = 0; i < this.MAX_ACTIVE_TASKS; i++) {
      try {
        const newTask = await this.createRandomTask(userId);
        if (!newTask) {
          console.log(`[TaskService] Could not create initial task ${i + 1}`);
        } else {
          console.log(`[TaskService] Created initial task: ${newTask.title}`);
        }
      } catch (error) {
        console.error(`[TaskService] Error creating initial task ${i + 1}:`, error);
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
   * Check if user can receive task of this type (cooldown and active task checks)
   */
  private static async canUserReceiveTask(userId: string, taskType: string, cooldownMinutes: number, maxPerDay: number | null): Promise<boolean> {
    const now = new Date();
    const cooldownStart = new Date(now.getTime() - cooldownMinutes * 60 * 1000);
    
    // Check if there's already an active task of this type
    const activeTasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.taskType, taskType),
          eq(userTasks.status, 'active')
        )
      );
    
    if (activeTasks.length > 0) {
      console.log(`[TaskService] User ${userId} already has active task of type ${taskType}`);
      return false;
    }
    
    // Check cooldown period on completed tasks
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

    // Create notification for new daily and premium tasks (with 3-hour cooldown)
    const notifiableTaskTypes = [
      'daily_bonus', 'daily_trader', 'premium_login', 'premium_vip'
    ];
    if (notifiableTaskTypes.includes(options.taskType)) {
      try {
        await notificationService.createDailyTaskNotification(userId, options.title, options.description);
        console.log(`[TaskService] Created notification for new task: ${options.title}`);
      } catch (error) {
        console.error(`[TaskService] Failed to create notification for task:`, error);
        // Don't fail the task creation, just log the error
      }
    }

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
    console.log(`[TaskService] 🚨🚨🚨 === CRITICAL ALERT === completeTask called: taskId=${taskId}, userId=${userId} - THIS SHOULD NOT HAPPEN!`);
    console.log(`[TaskService] 🚨🚨🚨 Call stack:`, new Error().stack);
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
        // DEBUG: Check if task exists with different status
        const [anyTask] = await db.select()
          .from(userTasks)
          .where(
            and(
              eq(userTasks.id, taskId),
              eq(userTasks.userId, userId)
            )
          )
          .limit(1);
        
        if (anyTask) {
          console.log(`[TaskService] Task ${taskId} exists but status is '${anyTask.status}', not 'active'. Progress: ${anyTask.progressCurrent}/${anyTask.progressTotal}, rewardClaimed: ${anyTask.rewardClaimed || 'undefined'}`);
          return { success: false, error: 'Task already completed or not active' };
        } else {
          console.log(`[TaskService] Task ${taskId} does not exist at all for user ${userId}`);
          return { success: false, error: 'Task not found' };
        }
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

    // Try up to 10 times to find a suitable template
    for (let attempt = 0; attempt < 10; attempt++) {
      // Get random template
      const template = StaticTaskTemplateService.getRandomTemplateByRarity();
      if (!template) {
        console.log(`[TaskService] No template available on attempt ${attempt + 1}`);
        continue;
      }

      console.log(`[TaskService] Attempt ${attempt + 1}: trying template ${template.id} (${template.taskType})`);

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

      const task = await this.createTask(userId, options);
      if (task) {
        console.log(`[TaskService] Successfully created task: ${task.taskType}`);
        return task;
      }
      
      console.log(`[TaskService] Failed to create task ${template.taskType}, trying again...`);
    }

    console.log(`[TaskService] Could not create any task after 10 attempts`);
    return null;
  }

  /**
   * Auto-fill tasks to maximum
   */
  static async autoFillTasks(userId: string): Promise<void> {
    console.log(`[TaskService] Auto-filling tasks for user: ${userId}`);

    const activeCount = await this.getActiveTasksCount(userId);
    const tasksToCreate = this.MAX_ACTIVE_TASKS - activeCount;

    console.log(`[TaskService] Current tasks: ${activeCount}, need to create: ${tasksToCreate}`);

    if (tasksToCreate > 0) {
      for (let i = 0; i < tasksToCreate; i++) {
        const newTask = await this.createRandomTask(userId);
        if (newTask) {
          console.log(`[TaskService] Auto-created task: ${newTask.title}`);
        } else {
          console.log(`[TaskService] Could not auto-create task ${i + 1} (cooldowns or limits)`);
        }
      }
    }
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
    console.log(`[TaskService] 🚨 === CRITICAL DEBUG === updateTaskProgress called: taskId=${taskId}, userId=${userId}, progress=${progress}`);
    console.log(`[TaskService] 🚨 Call stack:`, new Error().stack);
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
      // UNIVERSAL FIX: ALL TASKS should not auto-complete - user must click pickup
      console.log(`[TaskService] 🚨 Task ${taskId} progress complete (${progress}>=${task.progressTotal}), but NOT auto-completing. User must pickup manually.`);
      console.log(`[TaskService] 🚨 Task details before update:`, {
        id: task.id,
        taskType: task.taskType,
        title: task.title,
        status: task.status,
        progressCurrent: task.progressCurrent,
        progressTotal: task.progressTotal,
        rewardType: task.rewardType,
        rewardAmount: task.rewardAmount
      });
      
      // For ALL tasks, update progress but don't complete - user must click pickup
      const [updatedTask] = await db.update(userTasks)
        .set({ progressCurrent: progress })
        .where(eq(userTasks.id, taskId))
        .returning();

      const responseData = {
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
        rewardClaimed: false // Task is NOT claimed yet - user must click pickup
      };
      
      console.log(`[TaskService] 🚨 Returning updateTaskProgress response:`, responseData);
      return responseData;
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