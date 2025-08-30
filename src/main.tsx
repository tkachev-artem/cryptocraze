import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { App } from "./App"
import { store } from "./app/store"
import "./index.css"
import { ensureLanguageInitialized } from "./lib/languageUtils"
import { installKeyboardZoomFix, installNativeLikeGestureGuards } from "./lib/viewportUtils"

const queryClient = new QueryClient()

const container = document.getElementById("root")

if (container) {
  // Инициализируем язык и синхронизируем meta/html/cookie/localStorage
  ensureLanguageInitialized()
  // Устанавливаем фикс для зума после закрытия клавиатуры
  installKeyboardZoomFix()
  // Глобальные гварды жестов (pinch/multitouch/double-tap/drag)
  installNativeLikeGestureGuards()

  const root = createRoot(container)

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <App />
        </Provider>
      </QueryClientProvider>
    </StrictMode>,
  )
} else {
  throw new Error(
    "Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",
  )
}

// Регистрация сервис-воркера для кэширования изображений
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // умышленно глушим ошибку регистрации, чтобы не ломать приложение
      })
  })
}
