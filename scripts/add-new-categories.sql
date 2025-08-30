-- Добавление новых категорий для заданий
-- Этот скрипт добавляет категории 'energy' и 'crypto' в таблицу task_templates

-- Проверяем, есть ли ограничения на категории
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'task_templates'::regclass 
AND contype = 'c';

-- Если есть ограничения, удаляем их
-- ALTER TABLE task_templates DROP CONSTRAINT IF EXISTS task_templates_category_check;

-- Добавляем новые категории (если есть enum или check constraint)
-- ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'energy';
-- ALTER TYPE task_category ADD VALUE IF NOT EXISTS 'crypto';

-- Или просто обновляем существующие записи для тестирования
-- UPDATE task_templates SET category = 'daily' WHERE category = 'energy';
-- UPDATE task_templates SET category = 'trade' WHERE category = 'crypto';

-- Проверяем текущие категории
SELECT DISTINCT category FROM task_templates ORDER BY category; 