import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import { AdminAnalyticsProvider } from './context';

const Dashboard = React.lazy(() => import('./Dashboard.tsx'));
const UserAnalytics = React.lazy(() => import('./UserAnalytics.tsx'));
const Monetization = React.lazy(() => import('./Monetization.tsx'));

const AdminRouter: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <React.Suspense fallback={<div className="p-6">Loading...</div>}>
            <AdminAnalyticsProvider><AdminLayout>
              <Dashboard />
            </AdminLayout></AdminAnalyticsProvider>
          </React.Suspense>
        }
      />

      <Route
        path="/user-analytics"
        element={
          <React.Suspense fallback={<div className="p-6">Loading...</div>}>
            <AdminAnalyticsProvider><AdminLayout fullscreen>
              <UserAnalytics />
            </AdminLayout></AdminAnalyticsProvider>
          </React.Suspense>
        }
      />

      <Route
        path="/monetization"
        element={
          <React.Suspense fallback={<div className="p-6">Loading...</div>}>
            <AdminAnalyticsProvider><AdminLayout>
              <Monetization />
            </AdminLayout></AdminAnalyticsProvider>
          </React.Suspense>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AdminRouter;


