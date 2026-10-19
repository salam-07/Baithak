import { Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import StartupLoading from '../ui/StartupLoading';
import FeedPage from '../../pages/app/FeedPage';

const LandingPage = lazy(() => import('../../pages/landing/LandingPage'));

// Resolve the session before choosing a home so returning readers never flash the landing.
export function HomeRoute() {
  const { user, status, restoreError } = useAuth();
  return status === 'ready' && !restoreError && !user
    ? <Suspense fallback={<StartupLoading />}><LandingPage /></Suspense>
    : <Outlet />;
}

// Retain public browsing and old links; signed-in readers have one canonical feed URL.
export function LegacyFeedRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <FeedPage />;
}
