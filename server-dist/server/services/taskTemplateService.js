"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTemplateService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
class TaskTemplateService {
    /**
     * Получить все шаблоны заданий
     */
    static async getAllTemplates(includeInactive = false) {
        const query = includeInactive
            ? db_js_1.db.select().from(schema_1.taskTemplates).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt))
            : db_js_1.db.select().from(schema_1.taskTemplates).where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.isActive, true)).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt));
        return await query;
    }
    /**
     * Получить шаблон по ID
     */
    static async getTemplateById(id) {
        const templates = await db_js_1.db.select()
            .from(schema_1.taskTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.id, id))
            .limit(1);
        return templates[0] || null;
    }
    /**
     * Получить шаблон по templateId
     */
    static async getTemplateByTemplateId(templateId) {
        const templates = await db_js_1.db.select()
            .from(schema_1.taskTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.templateId, templateId))
            .limit(1);
        return templates[0] || null;
    }
    /**
     * Получить шаблоны по категории
     */
    static async getTemplatesByCategory(category, includeInactive = false) {
        const query = includeInactive
            ? db_js_1.db.select().from(schema_1.taskTemplates).where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.category, category)).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt))
            : db_js_1.db.select().from(schema_1.taskTemplates).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taskTemplates.category, category), (0, drizzle_orm_1.eq)(schema_1.taskTemplates.isActive, true))).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt));
        return await query;
    }
    /**
     * Получить шаблоны по редкости
     */
    static async getTemplatesByRarity(rarity, includeInactive = false) {
        const query = includeInactive
            ? db_js_1.db.select().from(schema_1.taskTemplates).where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.rarity, rarity)).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt))
            : db_js_1.db.select().from(schema_1.taskTemplates).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taskTemplates.rarity, rarity), (0, drizzle_orm_1.eq)(schema_1.taskTemplates.isActive, true))).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt));
        return await query;
    }
    /**
     * Поиск шаблонов по названию
     */
    static async searchTemplates(searchTerm, includeInactive = false) {
        const query = includeInactive
            ? db_js_1.db.select().from(schema_1.taskTemplates).where((0, drizzle_orm_1.like)(schema_1.taskTemplates.title, `%${searchTerm}%`)).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt))
            : db_js_1.db.select().from(schema_1.taskTemplates).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.like)(schema_1.taskTemplates.title, `%${searchTerm}%`), (0, drizzle_orm_1.eq)(schema_1.taskTemplates.isActive, true))).orderBy((0, drizzle_orm_1.desc)(schema_1.taskTemplates.createdAt));
        return await query;
    }
    /**
     * Создать новый шаблон
     */
    static async createTemplate(data, createdBy) {
        const [newTemplate] = await db_js_1.db.insert(schema_1.taskTemplates).values({
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
    static async updateTemplate(id, data) {
        const [updatedTemplate] = await db_js_1.db.update(schema_1.taskTemplates)
            .set({
            ...data,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.id, id))
            .returning();
        return updatedTemplate;
    }
    /**
     * Удалить шаблон (мягкое удаление)
     */
    static async deleteTemplate(id) {
        const [deletedTemplate] = await db_js_1.db.update(schema_1.taskTemplates)
            .set({
            isActive: false,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.id, id))
            .returning();
        return deletedTemplate;
    }
    /**
     * Полностью удалить шаблон из базы данных
     */
    static async hardDeleteTemplate(id) {
        const result = await db_js_1.db.delete(schema_1.taskTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.id, id));
        return result.rowCount > 0;
    }
    /**
     * Активировать шаблон
     */
    static async activateTemplate(id) {
        const [activatedTemplate] = await db_js_1.db.update(schema_1.taskTemplates)
            .set({
            isActive: true,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.id, id))
            .returning();
        return activatedTemplate;
    }
    /**
     * Получить статистику шаблонов
     */
    static async getTemplateStats() {
        const stats = await db_js_1.db.select({
            total: (0, drizzle_orm_1.sql) `count(*)`,
            active: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.taskTemplates.isActive} = true)`,
            byCategory: schema_1.taskTemplates.category,
            byRarity: schema_1.taskTemplates.rarity
        })
            .from(schema_1.taskTemplates)
            .groupBy(schema_1.taskTemplates.category, schema_1.taskTemplates.rarity);
        return stats;
    }
    /**
     * Получить случайный активный шаблон
     */
    static async getRandomActiveTemplate() {
        const templates = await db_js_1.db.select()
            .from(schema_1.taskTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.taskTemplates.isActive, true));
        if (templates.length === 0) {
            return null;
        }
        return templates[Math.floor(Math.random() * templates.length)];
    }
    /**
     * Получить случайный активный шаблон по категории
     */
    static async getRandomActiveTemplateByCategory(category) {
        const templates = await db_js_1.db.select()
            .from(schema_1.taskTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taskTemplates.isActive, true), (0, drizzle_orm_1.eq)(schema_1.taskTemplates.category, category)));
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
            common: 0.6, // 60% шанс
            rare: 0.25, // 25% шанс
            epic: 0.12, // 12% шанс
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
    static async getRandomActiveTemplateBySpecificRarity(rarity) {
        const templates = await db_js_1.db.select()
            .from(schema_1.taskTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taskTemplates.isActive, true), (0, drizzle_orm_1.eq)(schema_1.taskTemplates.rarity, rarity)));
        if (templates.length === 0) {
            return null;
        }
        return templates[Math.floor(Math.random() * templates.length)];
    }
}
exports.TaskTemplateService = TaskTemplateService;
