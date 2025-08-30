# Компоненты загрузки

## Описание

В проекте реализованы компоненты для отображения красивой загрузки с логотипом на синем фоне (#0C54EA).

## Компоненты

### LoadingScreen

Основной компонент загрузки с логотипом по центру.

**Пропсы:**
- `isLoading` (boolean, по умолчанию: true) - показывает/скрывает экран загрузки

**Использование:**
```tsx
import LoadingScreen from '../components/LoadingScreen';

const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      {/* Остальной контент */}
    </>
  );
};
```

### GlobalLoading

Глобальный компонент загрузки для инициализации приложения.

**Пропсы:**
- `children` (ReactNode) - дочерние компоненты
- `initialLoadingTime` (number, по умолчанию: 2000ms) - время показа загрузки

**Использование:**
```tsx
import GlobalLoading from './components/GlobalLoading';

export const App = () => (
  <GlobalLoading initialLoadingTime={3000}>
    <BrowserRouter>
      {/* Роуты приложения */}
    </BrowserRouter>
  </GlobalLoading>
);
```

## Хук useLoading

Хук для управления состоянием загрузки в компонентах.

**Возвращает:**
- `isLoading` (boolean) - текущее состояние загрузки
- `startLoading` (function) - начать загрузку
- `stopLoading` (function) - остановить загрузку
- `withLoading` (function) - обернуть асинхронную функцию в загрузку

**Использование:**
```tsx
import { useLoading } from '../hooks/useLoading';

const MyComponent = () => {
  const { isLoading, startLoading, stopLoading, withLoading } = useLoading();

  const handleAsyncAction = async () => {
    startLoading();
    try {
      await someAsyncOperation();
    } finally {
      stopLoading();
    }
  };

  // Или используя withLoading
  const handleAsyncActionWithWrapper = () => {
    withLoading(async () => {
      await someAsyncOperation();
    });
  };

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      {/* Остальной контент */}
    </>
  );
};
```

## Особенности

1. **Цвет фона:** #0C54EA (синий)
2. **Логотип:** Отображается по центру из `/logo/logo.svg`
3. **Анимация:** Три точки с bounce-анимацией
4. **Z-index:** 50 для отображения поверх всего контента
5. **Адаптивность:** Полноэкранный режим с flexbox центрированием

## Примеры интеграции

### В компоненте с API запросами:
```tsx
const ProfileComponent = () => {
  const { isLoading, withLoading } = useLoading();

  const loadUserData = () => {
    withLoading(async () => {
      await fetchUserData();
    });
  };

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      <div className="profile-content">
        {/* Контент профиля */}
      </div>
    </>
  );
};
```

### В компоненте с формами:
```tsx
const LoginForm = () => {
  const { isLoading, withLoading } = useLoading();

  const handleSubmit = (data: LoginData) => {
    withLoading(async () => {
      await loginUser(data);
    });
  };

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      <form onSubmit={handleSubmit}>
        {/* Поля формы */}
      </form>
    </>
  );
};
``` 