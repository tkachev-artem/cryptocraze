# 🖥️ Создание новой виртуальной машины в Yandex Cloud

## 🚀 Пошаговое создание ВМ для CryptoCraze

### 1. Войдите в Yandex Cloud Console
- Откройте: https://console.cloud.yandex.ru/
- Войдите с токеном: `y0__xChkd6pCBjB3RMgq8D2lhQbzXneWVWnMk2HTYRC5tRT55IPrQ`

### 2. Создание новой виртуальной машины

#### Перейдите в раздел создания:
1. **Compute Cloud** → **Виртуальные машины**
2. Нажмите **"Создать ВМ"**

#### Основные настройки:
```
📝 Имя: cryptocraze-prod
📝 Описание: CryptoCraze Production Server
🌍 Зона доступности: ru-central1-a (или любая другая)
```

#### Выбор образа:
```
💿 Операционная система: Ubuntu
📋 Версия: Ubuntu 22.04 LTS
💾 Тип диска: SSD
💾 Размер диска: 20 GB (минимум)
```

#### Вычислительные ресурсы:
```
🔧 Платформа: Intel Ice Lake
💻 vCPU: 2 (минимум)
💾 RAM: 4 GB (минимум)
📊 Гарантированная доля vCPU: 20%
```

#### Сетевые настройки:
```
🌐 Сеть: default (или создать новую)
🔒 Подсеть: default-ru-central1-a
📡 Публичный IP: Автоматически
🛡️ Группы безопасности: default (открыть порты 22, 80, 443, 3001)
```

#### SSH доступ:
**Вставьте ваш публичный SSH ключ:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDA0hG3AtuvvdMbc7tnMXfgT8gahwegJizX184AP/X3pLrYmSFs1yApeqaq8fhbTuLozj3mYVuXpa5rR/PZqT73BfQ3ZY/D60zQC1dTPLZTZIwRbyGzszl1vgkj5dAdvuoQo1NGFnZVVagIm0ENTM/2XCejM6VUef1X6YHhgIe8cwPm4azIapyda/u6Od7Vo1hNp/GVQT2NXGyJKHSQ4XeYdSYTwi5wBhjkKI5wCr9ufuC0xt4UF4u3MfXOTRxWff6jzXcTJfxpoAvx+6NH/5/DIFo/sEzljeQUnIxJkEtlFZhI1EAvS8/ufjZGT/u+de/yFIuRNYI1kv/Y9koiHHWTDQD2IXlZzrXS1sVn9lejzmqDPDfGt1JsCi6KrNCMclui2oN5GZUB4muqfuyLoG+JSux/eShw7ddTzHL/XS0oJ38+rSSk7PdXKLXsOanuYYcx0d/jdX6UutJzD/a+BZb9C+HIFcanhqcTK3YFZJi3e5+5HxrHRA7kCIFraegvwkV4hmqHWAAA58P20CI/riQwAy6FOD3AIFoAUc1/6Iwleozfx3Xc+ooHKTANI39g91+nxwQK3ao8JwpLMMqugbidJrGAVq7DEMDPivaVWQRvMbvmDnJXh8Q5PRTgBQAIh0OLGpQj0ANR0ISBpTlF7qAyXvhiR1AnsyXegdY1NkpEZQ== artemtkacev@MacBook-Pro-Artem.local
```

**Пользователь:** `ubuntu`

#### Дополнительно:
```
🔧 Прерываемая: НЕТ (для production)
🏷️ Метки: 
  - environment: production
  - app: cryptocraze
```

### 3. Настройка группы безопасности

Если создаете новую группу безопасности, добавьте правила:

**Входящий трафик:**
```
🔐 SSH: порт 22, источник 0.0.0.0/0
🌐 HTTP: порт 80, источник 0.0.0.0/0  
🔒 HTTPS: порт 443, источник 0.0.0.0/0
🎰 App: порт 3001, источник 0.0.0.0/0
```

**Исходящий трафик:**
```
🌍 Все: любой порт, назначение 0.0.0.0/0
```

### 4. Создание ВМ

1. **Проверьте все настройки**
2. **Нажмите "Создать ВМ"**
3. **Дождитесь создания** (2-3 минуты)
4. **Запишите новый IP адрес**

### 5. Обновление конфигурации

После создания ВМ обновите файл `.env.production`:

```env
# Обновить с новым IP адреса (если нужно)
# Остальные настройки БД остаются те же
DATABASE_URL=postgresql://crypto_user:zAlBIauWxJ7JM3huObuew7LYG@rc1b-2aagh30c96ig0pkn.mdb.yandexcloud.net:6432/crypto_db?sslmode=require
```

## 🔧 Рекомендуемые настройки ВМ

### Минимальная конфигурация:
- **CPU:** 2 vCPU
- **RAM:** 4 GB
- **Диск:** 20 GB SSD
- **ОС:** Ubuntu 22.04 LTS

### Оптимальная конфигурация:
- **CPU:** 4 vCPU
- **RAM:** 8 GB  
- **Диск:** 40 GB SSD
- **ОС:** Ubuntu 22.04 LTS

### Для высоких нагрузок:
- **CPU:** 8 vCPU
- **RAM:** 16 GB
- **Диск:** 80 GB SSD
- **ОС:** Ubuntu 22.04 LTS

## 📊 Примерная стоимость

**Минимальная конфигурация (~1000₽/месяц):**
- 2 vCPU × 20%: ~300₽
- 4 GB RAM: ~400₽  
- 20 GB SSD: ~200₽
- Трафик: ~100₽

## ✅ После создания ВМ

Когда ВМ будет создана:

1. **Запишите новый IP адрес**
2. **Проверьте SSH подключение:**
   ```bash
   ssh ubuntu@НОВЫЙ_IP_АДРЕС
   ```
3. **Запустите автоматический деплой:**
   ```bash
   ./deploy-to-new-vm.sh НОВЫЙ_IP_АДРЕС
   ```

## 🎯 Преимущества новой ВМ

✅ **Чистая система** - никаких конфликтов  
✅ **Настроенный SSH** - с вашим ключом  
✅ **Правильные порты** - все необходимые открыты  
✅ **Современная ОС** - Ubuntu 22.04 LTS  
✅ **Оптимизированная** - только для CryptoCraze

## 📞 Что дальше?

После создания ВМ сообщите новый IP адрес, и мы запустим автоматический деплой CryptoCraze с рабочей рулеткой! 🎰✨