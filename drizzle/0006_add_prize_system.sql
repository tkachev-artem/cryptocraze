-- Создание enum для типов коробок
CREATE TYPE box_type AS ENUM ('red', 'green', 'x');

-- Создание enum для типов призов
CREATE TYPE prize_type AS ENUM ('money', 'pro');

-- Таблица типов коробок
CREATE TABLE box_types (
    id SERIAL PRIMARY KEY,
    type box_type NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    required_energy INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица призов
CREATE TABLE prizes (
    id SERIAL PRIMARY KEY,
    box_type_id INTEGER NOT NULL REFERENCES box_types(id) ON DELETE CASCADE,
    prize_type prize_type NOT NULL,
    amount DECIMAL(15, 2), -- Для денежных призов
    pro_days INTEGER, -- Для PRO призов
    chance DECIMAL(5, 2) NOT NULL, -- Шанс выпадения в процентах
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица истории открытий коробок
CREATE TABLE box_openings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    box_type_id INTEGER NOT NULL REFERENCES box_types(id),
    prize_id INTEGER NOT NULL REFERENCES prizes(id),
    prize_type prize_type NOT NULL,
    amount DECIMAL(15, 2), -- Полученная сумма
    pro_days INTEGER, -- Полученные дни PRO
    opened_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_prizes_box_type ON prizes(box_type_id);
CREATE INDEX idx_prizes_active ON prizes(is_active);
CREATE INDEX idx_box_openings_user ON box_openings(user_id);
CREATE INDEX idx_box_openings_date ON box_openings(opened_at);

-- Вставка базовых типов коробок
INSERT INTO box_types (type, name, required_energy, description) VALUES
('red', 'Красная коробка', 30, 'Базовая коробка с небольшими призами'),
('green', 'Зеленая коробка', 70, 'Средняя коробка с хорошими призами'),
('x', 'X коробка', 100, 'Премиум коробка с лучшими призами');

-- Вставка призов для красной коробки
INSERT INTO prizes (box_type_id, prize_type, amount, chance) VALUES
(1, 'money', 100, 15),
(1, 'money', 200, 12),
(1, 'money', 300, 10),
(1, 'money', 400, 8),
(1, 'money', 500, 7),
(1, 'money', 600, 6),
(1, 'money', 700, 5),
(1, 'money', 800, 4),
(1, 'money', 900, 3),
(1, 'money', 1000, 3),
(1, 'money', 1200, 2),
(1, 'money', 1500, 2),
(1, 'money', 1800, 1.5),
(1, 'money', 2000, 1.5),
(1, 'money', 2500, 1),
(1, 'money', 3000, 1);

INSERT INTO prizes (box_type_id, prize_type, pro_days, chance) VALUES
(1, 'pro', 3, 0.5);

-- Вставка призов для зеленой коробки
INSERT INTO prizes (box_type_id, prize_type, amount, chance) VALUES
(2, 'money', 500, 15),
(2, 'money', 1000, 12),
(2, 'money', 1500, 10),
(2, 'money', 2000, 8),
(2, 'money', 2500, 7),
(2, 'money', 3000, 6),
(2, 'money', 4000, 5),
(2, 'money', 5000, 4),
(2, 'money', 6000, 3),
(2, 'money', 7000, 3),
(2, 'money', 8000, 2),
(2, 'money', 10000, 2),
(2, 'money', 12000, 1.5),
(2, 'money', 15000, 1.5),
(2, 'money', 20000, 1),
(2, 'money', 25000, 1);

INSERT INTO prizes (box_type_id, prize_type, pro_days, chance) VALUES
(2, 'pro', 7, 1);

-- Вставка призов для X коробки
INSERT INTO prizes (box_type_id, prize_type, amount, chance) VALUES
(3, 'money', 1000, 15),
(3, 'money', 2000, 12),
(3, 'money', 3000, 10),
(3, 'money', 5000, 8),
(3, 'money', 7000, 7),
(3, 'money', 10000, 6),
(3, 'money', 15000, 5),
(3, 'money', 20000, 4),
(3, 'money', 25000, 3),
(3, 'money', 30000, 3),
(3, 'money', 40000, 2),
(3, 'money', 50000, 2),
(3, 'money', 75000, 1.5),
(3, 'money', 100000, 1.5),
(3, 'money', 150000, 1),
(3, 'money', 200000, 1);

INSERT INTO prizes (box_type_id, prize_type, pro_days, chance) VALUES
(3, 'pro', 30, 2); 