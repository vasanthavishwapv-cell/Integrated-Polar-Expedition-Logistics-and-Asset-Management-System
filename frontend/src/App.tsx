import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useSyncStore } from './store/syncStore';
import api from './services/api';

// Layouts
import AppLayout from './layouts/AppLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExpeditionsPage from './pages/ExpeditionsPage';
import ExpeditionDetailPage from './pages/ExpeditionDetailPage';
import CargoPage from './pages/CargoPage';
import ShipmentDetailPage from './pages/ShipmentDetailPage';
import InventoryPage from './pages/InventoryPage';
import InventoryDetailPage from './pages/InventoryDetailPage';
import IntelligencePage from './pages/IntelligencePage';
import PersonnelPage from './pages/PersonnelPage';
import PersonnelDetailPage from './pages/PersonnelDetailPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import EmergencyPage from './pages/EmergencyPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-text-muted">Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  const { setAuth, clearAuth, setLoading } = useAuthStore();
  const { setOnline } = useSyncStore();

  useEffect(() => {
    // Try silent refresh on mount
    setLoading(true);
    api.post('/auth/refresh')
      .then((res) => {
        const { accessToken, user } = res.data.data;
        setAuth(user, accessToken);
      })
      .catch(() => {
        clearAuth();
      });

    // Online/offline listeners
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — Root goes straight to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />

        {/* Protected — inside AppLayout */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expeditions" element={<ExpeditionsPage />} />
          <Route path="/expeditions/:id" element={<ExpeditionDetailPage />} />
          <Route path="/cargo" element={<CargoPage />} />
          <Route path="/cargo/:id" element={<ShipmentDetailPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/:id" element={<InventoryDetailPage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="/personnel" element={<PersonnelPage />} />
          <Route path="/personnel/:id" element={<PersonnelDetailPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/emergency/:id" element={<IncidentDetailPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
