import { db } from '../db.js';
import { taskTemplates } from '../../shared/schema';
import { eq, and, desc, like, sql } from 'drizzle-orm';

export interface CreateTemplateData {
  templateId: string;
  taskType: string;
  title: string;
  description: string;
  rewardType: 'money' | 'coins' | 'energy';
  rewardAmount: string;
  progressTotal: number;
  icon?: string;
  category: 'daily' | 'video' | 'trade' | 'social' | 'premium' | 'crypto' | 'energy';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  expiresInHours?: number;
}

export interface UpdateTemplateData {
  taskType?: string;
  title?: string;
  description?: string;
  rewardType?: 'money' | 'coins' | 'energy';
  rewardAmount?: string;
  progressTotal?: number;
  icon?: string;
  category?: 'daily' | 'video' | 'trade' | 'social' | 'premium' | 'crypto' | 'energy';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  expiresInHours?: number;
  isActive?: boolean;
}

export class TaskTemplateService {
  /**
   * Получить все шаблоны заданий
   */
  static async getAllTemplates(includeInactive: boolean = false) {
    const query = includeInactive 
      ? db.select().from(taskTemplates).orderBy(desc(taskTemplates.createdAt))
      : db.select().from(taskTemplates).where(eq(taskTemplates.isActive, true)).orderBy(desc(taskTemplates.createdAt));
    
    return await query;
  }

  /**
   * Получить шаблон по ID
   */
  static async getTemplateById(id: number) {
    const templates = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .limit(1);
    
    return templates[0] || null;
  }

  /**
   * Получить шаблон по templateId
   */
  static async getTemplateByTemplateId(templateId: string) {
    const templates = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.templateId, templateId))
      .limit(1);
    
    return templates[0] || null;
  }

  /**
   * Получить шаблоны по категории
   */
  static async getTemplatesByCategory(category: string, includeInactive: boolean = false) {
    const query = includeInactive
      ? db.select().from(taskTemplates).where(eq(taskTemplates.category, category)).orderBy(desc(taskTemplates.createdAt))
      : db.select().from(taskTemplates).where(and(eq(taskTemplates.category, category), eq(taskTemplates.isActive, true))).orderBy(desc(taskTemplates.createdAt));
    
    return await query;
  }

  /**
   * Получить шаблоны по редкости
   */
  static async getTemplatesByRarity(rarity: string, includeInactive: boolean = false) {
    const query = includeInactive
      ? db.select().from(taskTemplates).where(eq(taskTemplates.rarity, rarity)).orderBy(desc(taskTemplates.createdAt))
      : db.select().from(taskTemplates).where(and(eq(taskTemplates.rarity, rarity), eq(taskTemplates.isActive, true))).orderBy(desc(taskTemplates.createdAt));
    
    return await query;
  }

  /**
   * Поиск шаблонов по названию
   */
  static async searchTemplates(searchTerm: string, includeInactive: boolean = false) {
    const query = includeInactive
      ? db.select().from(taskTemplates).where(like(taskTemplates.title, `%${searchTerm}%`)).orderBy(desc(taskTemplates.createdAt))
      : db.select().from(taskTemplates).where(and(like(taskTemplates.title, `%${searchTerm}%`), eq(taskTemplates.isActive, true))).orderBy(desc(taskTemplates.createdAt));
    
    return await query;
  }

  /**
   * Создать новый шаблон
   */
  static async createTemplate(data: CreateTemplateData, createdBy: string) {
    const [newTemplate] = await db.insert(taskTemplates).values({
      ...data,
      createdBy,
      expiresInHours: data.expiresInHours || 24,
      icon: data.icon || '/trials/default.svg'
    }).returning();
    
    return newTemplate;
  }

  /**
   * Обновить шаблон
   */
  static async updateTemplate(id: number, data: UpdateTemplateData) {
    const [updatedTemplate] = await db.update(taskTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(taskTemplates.id, id))
      .returning();
    
    return updatedTemplate;
  }

  /**
   * Удалить шаблон (мягкое удаление)
   */
  static async deleteTemplate(id: number) {
    const [deletedTemplate] = await db.update(taskTemplates)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(taskTemplates.id, id))
      .returning();
    
    return deletedTemplate;
  }

  /**
   * Полностью удалить шаблон из базы данных
   */
  static async hardDeleteTemplate(id: number) {
    const result = await db.delete(taskTemplates)
      .where(eq(taskTemplates.id, id));
    
    return result.rowCount > 0;
  }

  /**
   * Активировать шаблон
   */
  static async activateTemplate(id: number) {
    const [activatedTemplate] = await db.update(taskTemplates)
      .set({
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(taskTemplates.id, id))
      .returning();
    
    return activatedTemplate;
  }

  /**
   * Получить статистику шаблонов
   */
  static async getTemplateStats() {
    const stats = await db.select({
      total: sql`count(*)`,
      active: sql`count(*) filter (where ${taskTemplates.isActive} = true)`,
      byCategory: taskTemplates.category,
      byRarity: taskTemplates.rarity
    })
    .from(taskTemplates)
    .groupBy(taskTemplates.category, taskTemplates.rarity);
    
    return stats;
  }

  /**
   * Получить случайный активный шаблон
   */
  static async getRandomActiveTemplate() {
    const templates = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.isActive, true));
    
    if (templates.length === 0) {
      return null;
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Получить случайный активный шаблон по категории
   */
  static async getRandomActiveTemplateByCategory(category: string) {
    const templates = await db.select()
      .from(taskTemplates)
      .where(and(eq(taskTemplates.isActive, true), eq(taskTemplates.category, category)));
    
    if (templates.length === 0) {
      return null;
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Получить случайный активный шаблон с учетом редкости
   */
  static async getRandomActiveTemplateByRarity() {
    const rarityWeights = {
      common: 0.6,    // 60% шанс
      rare: 0.25,     // 25% шанс
      epic: 0.12,     // 12% шанс
      legendary: 0.03 // 3% шанс
    };

    const random = Math.random();
    let cumulativeWeight = 0;

    for (const [rarity, weight] of Object.entries(rarityWeights)) {
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        const template = await this.getRandomActiveTemplateBySpecificRarity(rarity);
        if (template) {
          return template;
        }
      }
    }

    // Fallback на любой активный шаблон
    return this.getRandomActiveTemplate();
  }

  /**
   * Получить случайный активный шаблон по конкретной редкости
   */
  static async getRandomActiveTemplateBySpecificRarity(rarity: string) {
    const templates = await db.select()
      .from(taskTemplates)
      .where(and(eq(taskTemplates.isActive, true), eq(taskTemplates.rarity, rarity)));
    
    if (templates.length === 0) {
      return null;
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
} 