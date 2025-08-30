-- Добавляем поле energy_spent в таблицу box_openings
ALTER TABLE box_openings ADD COLUMN energy_spent INTEGER NOT NULL DEFAULT 0; 