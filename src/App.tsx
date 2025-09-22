import { useEffect, useRef, useState, Suspense } from "react"
import type React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"
import { Home, Tutorial, Profile, EditProfile, Landing, Welcome, Trade, ListCrypto, Settings, Language, Notifications, Share, Premium, DealList, Rating, Rewards, TradePro, Live, Trials, NotFound } from './pages';
import AdminRouter from './pages/Admin/AdminRouter';
import UserAnalytics from './pages/UserAnalytics';
import GlobalLoading from './components/GlobalLoading';
import { ScrollLock } from './components/ui/ScrollLock';
import DealInfo from './components/DealInfo';
import CoinExchangeModal from './components/CoinExchangeModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { useAppSelector, useAppDispatch } from './app/hooks';
import { selectIsAuthenticated } from './app/userSlice';
import { closeCoinExchange } from './app/coinExchangeSlice';
import { useTranslation } from './lib/i18n';

// Loading fallback component for lazy routes
const RouteLoading: React.FC = () => (
  <div className="min-h-dvh flex items-center justify-center bg-[#F1F7FF]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

export const App: React.FC = () => {
  const appScrollRef = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isCoinExchangeOpen = useAppSelector(state => state.coinExchange.isModalOpen)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const { t } = useTranslation();

  // Глобальный запрет back-свайпа (слева-направо) и pull-to-refresh (сверху-вниз)
  useEffect(() => {
    const el = appScrollRef.current ?? document.body

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      touchStartXRef.current = e.touches[0].clientX
      touchStartYRef.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      const startX = touchStartXRef.current
      const startY = touchStartYRef.current
      if (startX == null || startY == null) return

      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const deltaX = currentX - startX
      const deltaY = currentY - startY

      const startedFromLeftEdge = startX <= 20
      if (startedFromLeftEdge && deltaX > 10) {
        e.preventDefault()
        return
      }

      const scrollable = appScrollRef.current
      const atTop = !!scrollable && scrollable.scrollTop <= 0
      if (atTop && deltaY > 10) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      touchStartXRef.current = null
      touchStartYRef.current = null
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener)
      el.removeEventListener('touchmove', handleTouchMove as EventListener)
      el.removeEventListener('touchend', handleTouchEnd as EventListener)
    }
  }, [])



  const AppContent = () => (
    <ErrorBoundary>
      <GlobalLoading initialLoadingTime={3000}>
        <ScrollLock enabled={true} allowScrollWithinRef={appScrollRef as unknown as React.RefObject<HTMLElement>} />
        <div className="h-dvh bg-white">
          <div
            ref={appScrollRef}
            data-app-scroll="true"
            className="h-dvh overflow-y-auto overscroll-y-contain allow-pan-y"
          >
            <div className="w-full h-full">
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  {/* Главная точка входа: авторизованных ведем на /home, неавторизованным показываем Welcome */}
                  <Route path="/" element={
                    isAuthenticated ? <Navigate to="/home" replace /> : 
                    <RouteErrorBoundary routeName="Welcome"><Welcome /></RouteErrorBoundary>
                  } />

                  {/* Защищенные маршруты: доступны только авторизованным */}
                  <Route element={<RequireAuth isAuthenticated={isAuthenticated} /> }>
                    <Route path="/home" element={<RouteErrorBoundary routeName="Home"><Home /></RouteErrorBoundary>} />
                    <Route path="/landing" element={<RouteErrorBoundary routeName="Landing"><Landing /></RouteErrorBoundary>} />
                    <Route path="/tutorial" element={<RouteErrorBoundary routeName="Tutorial"><Tutorial /></RouteErrorBoundary>} />
                    <Route path="/trade" element={<RouteErrorBoundary routeName="Trade"><Trade /></RouteErrorBoundary>} />
                    <Route path="/trade/pro" element={<RouteErrorBoundary routeName="Pro Trading"><TradePro /></RouteErrorBoundary>} />
                    <Route path="/live" element={<RouteErrorBoundary routeName="Live"><Live /></RouteErrorBoundary>} />
                    <Route path="/profile" element={<RouteErrorBoundary routeName="Profile"><Profile /></RouteErrorBoundary>} />
                    <Route path="/edit-profile" element={<RouteErrorBoundary routeName="Edit Profile"><EditProfile /></RouteErrorBoundary>} />
                    <Route path="/home/settings" element={<RouteErrorBoundary routeName="Settings"><Settings /></RouteErrorBoundary>} />
                    <Route path="/home/language" element={<RouteErrorBoundary routeName="Language"><Language /></RouteErrorBoundary>} />
                    <Route path="/home/notifications" element={<RouteErrorBoundary routeName="Notifications"><Notifications /></RouteErrorBoundary>} />
                    <Route path="/home/share" element={<RouteErrorBoundary routeName="Share"><Share /></RouteErrorBoundary>} />
                    <Route path="/trade/list" element={<RouteErrorBoundary routeName="Crypto List"><ListCrypto /></RouteErrorBoundary>} />
                    <Route path="/home/premium" element={<RouteErrorBoundary routeName="Premium"><Premium /></RouteErrorBoundary>} />
                    <Route path="/rating" element={<RouteErrorBoundary routeName="Rating"><Rating /></RouteErrorBoundary>} />
                    <Route path="/rewards" element={<RouteErrorBoundary routeName="Rewards"><Rewards /></RouteErrorBoundary>} />
                    <Route path="/deals" element={<RouteErrorBoundary routeName="Deals"><DealList /></RouteErrorBoundary>} />
                    <Route path="/trials" element={<RouteErrorBoundary routeName="Trials"><Trials /></RouteErrorBoundary>} />
                    <Route path="/analytics" element={<RouteErrorBoundary routeName="User Analytics"><UserAnalytics /></RouteErrorBoundary>} />
                    <Route path="/admin/*" element={<RouteErrorBoundary routeName="Admin Dashboard"><AdminRouter /></RouteErrorBoundary>} />
                  </Route>

                  {/* 404 страница для неизвестных маршрутов */}
                  <Route path="*" element={<RouteErrorBoundary routeName="NotFound"><NotFound /></RouteErrorBoundary>} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </div>
        
        {/* Global modals that need to overlay everything */}
        <ErrorBoundary>
          <DealInfo />
        </ErrorBoundary>
        <ErrorBoundary>
          <CoinExchangeModal 
            isOpen={isCoinExchangeOpen} 
            onClose={() => dispatch(closeCoinExchange())} 
          />
        </ErrorBoundary>
      </GlobalLoading>
    </ErrorBoundary>
  );

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

type RequireAuthProps = { isAuthenticated: boolean }
const RequireAuth: React.FC<RequireAuthProps> = ({ isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
