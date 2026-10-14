import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LandingPage from '../../pages/landing/LandingPage';
import FeedPage from '../../pages/app/FeedPage';

// Resolve the session before choosing a home so returning readers never flash the landing.
export function HomeRoute() {
  const { user, status, restoreError } = useAuth();
  return status === 'ready' && !restoreError && !user ? <LandingPage /> : <Outlet />;
}

// Retain public browsing and old links; signed-in readers have one canonical feed URL.
export function LegacyFeedRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <FeedPage />;
}
