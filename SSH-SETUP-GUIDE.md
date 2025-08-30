# 🔑 Настройка SSH доступа к Yandex Cloud

## Ваш публичный SSH ключ:

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDA0hG3AtuvvdMbc7tnMXfgT8gahwegJizX184AP/X3pLrYmSFs1yApeqaq8fhbTuLozj3mYVuXpa5rR/PZqT73BfQ3ZY/D60zQC1dTPLZTZIwRbyGzszl1vgkj5dAdvuoQo1NGFnZVVagIm0ENTM/2XCejM6VUef1X6YHhgIe8cwPm4azIapyda/u6Od7Vo1hNp/GVQT2NXGyJKHSQ4XeYdSYTwi5wBhjkKI5wCr9ufuC0xt4UF4u3MfXOTRxWff6jzXcTJfxpoAvx+6NH/5/DIFo/sEzljeQUnIxJkEtlFZhI1EAvS8/ufjZGT/u+de/yFIuRNYI1kv/Y9koiHHWTDQD2IXlZzrXS1sVn9lejzmqDPDfGt1JsCi6KrNCMclui2oN5GZUB4muqfuyLoG+JSux/eShw7ddTzHL/XS0oJ38+rSSk7PdXKLXsOanuYYcx0d/jdX6UutJzD/a+BZb9C+HIFcanhqcTK3YFZJi3e5+5HxrHRA7kCIFraegvwkV4hmqHWAAA58P20CI/riQwAy6FOD3AIFoAUc1/6Iwleozfx3Xc+ooHKTANI39g91+nxwQK3ao8JwpLMMqugbidJrGAVq7DEMDPivaVWQRvMbvmDnJXh8Q5PRTgBQAIh0OLGpQj0ANR0ISBpTlF7qAyXvhiR1AnsyXegdY1NkpEZQ== artemtkacev@MacBook-Pro-Artem.local
```

## 🔧 Добавление ключа в Yandex Cloud:

### Способ 1: Через Yandex Cloud Console (Рекомендуется)

1. **Зайдите в Yandex Cloud Console:**
   - Откройте: https://console.cloud.yandex.ru/
   - Войдите в свой аккаунт

2. **Найдите ваш сервер:**
   - Перейдите в "Compute Cloud" → "Виртуальные машины"
   - Найдите сервер с IP `84.201.139.242`

3. **Добавьте SSH ключ:**
   - Нажмите на сервер → вкладка "SSH ключи"
   - Нажмите "Добавить SSH ключ"
   - Вставьте публичный ключ (выше)
   - Укажите пользователя: `ubuntu`
   - Сохраните

### Способ 2: Через метаданные сервера

1. В настройках сервера найдите раздел "Метаданные"
2. Добавьте ключ `ssh-keys` со значением:
   ```
   ubuntu:ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDA0hG3AtuvvdMbc7tnMXfgT8gahwegJizX184AP/X3pLrYmSFs1yApeqaq8fhbTuLozj3mYVuXpa5rR/PZqT73BfQ3ZY/D60zQC1dTPLZTZIwRbyGzszl1vgkj5dAdvuoQo1NGFnZVVagIm0ENTM/2XCejM6VUef1X6YHhgIe8cwPm4azIapyda/u6Od7Vo1hNp/GVQT2NXGyJKHSQ4XeYdSYTwi5wBhjkKI5wCr9ufuC0xt4UF4u3MfXOTRxWff6jzXcTJfxpoAvx+6NH/5/DIFo/sEzljeQUnIxJkEtlFZhI1EAvS8/ufjZGT/u+de/yFIuRNYI1kv/Y9koiHHWTDQD2IXlZzrXS1sVn9lejzmqDPDfGt1JsCi6KrNCMclui2oN5GZUB4muqfuyLoG+JSux/eShw7ddTzHL/XS0oJ38+rSSk7PdXKLXsOanuYYcx0d/jdX6UutJzD/a+BZb9C+HIFcanhqcTK3YFZJi3e5+5HxrHRA7kCIFraegvwkV4hmqHWAAA58P20CI/riQwAy6FOD3AIFoAUc1/6Iwleozfx3Xc+ooHKTANI39g91+nxwQK3ao8JwpLMMqugbidJrGAVq7DEMDPivaVWQRvMbvmDnJXh8Q5PRTgBQAIh0OLGpQj0ANR0ISBpTlF7qAyXvhiR1AnsyXegdY1NkpEZQ== artemtkacev@MacBook-Pro-Artem.local
   ```

## ✅ Проверка подключения

После добавления ключа проверьте подключение:

```bash
ssh -o StrictHostKeyChecking=no ubuntu@84.201.139.242
```

Если подключение успешно, увидите приглашение командной строки Ubuntu.

## 🚀 Что делать дальше

После успешного подключения к серверу:

1. **Загрузите проект:**
   ```bash
   # На вашем Mac:
   scp ../cryptocraze-deploy.tar.gz ubuntu@84.201.139.242:~/
   ```

2. **На сервере распакуйте и запустите:**
   ```bash
   tar -xzf cryptocraze-deploy.tar.gz
   cd cryptocraze
   ./deploy-yandex-cloud.sh
   ```

## 🔧 Альтернативные способы подключения

### Если SSH ключ не работает:

1. **Через Yandex Cloud Console:**
   - В консоли найдите сервер → "Подключиться" → "Подключиться через браузер"

2. **Создать новый пользователь с паролем:**
   ```bash
   # Через консоль браузера:
   sudo adduser developer
   sudo usermod -aG sudo developer
   sudo passwd developer
   ```

3. **Разрешить аутентификацию по паролю:**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Найти и изменить:
   # PasswordAuthentication yes
   sudo systemctl restart sshd
   ```

## 📞 Нужна помощь?

Если возникли проблемы:
1. Проверьте, что ключ добавлен правильно в Yandex Cloud
2. Убедитесь, что сервер запущен
3. Попробуйте подключение через браузер в Yandex Cloud Console
4. Проверьте, что пользователь `ubuntu` существует на сервере

После успешного подключения мы сможем автоматически развернуть приложение с рабочей рулеткой! 🎰