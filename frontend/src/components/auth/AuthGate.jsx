import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { errorMessage } from '../../lib/api';
import LoadingState from '../ui/LoadingState';
import Notice from '../ui/Notice';
import Button from '../ui/Button';
export default function AuthGate({ guestOnly = false, allowGuest = false, onboarding = false }) {
  const { user, status, restoreError, restore } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const Container = guestOnly || allowGuest || onboarding ? 'main' : 'section';
  const landmark = guestOnly || allowGuest || onboarding ? { id: 'page-content', tabIndex: -1 } : {};
  if (status === 'loading') return <Container {...landmark} className="status-page" aria-live="polite"><LoadingState label="restoring" compact /></Container>;
  if (restoreError) return <Container {...landmark} className="status-page"><h1>{t('sessionProblem')}</h1><Notice>{t(errorMessage(restoreError))}</Notice><Button onClick={restore} className="primary">{t('retry')}</Button><Link className="guest-link" to="/app">{t('guest')}</Link></Container>;
  const destination = typeof location.state?.from === 'string' && /^\/app(?:\/|$)/.test(location.state.from) ? location.state.from : '/app';
  if (user?.onboardingCompleted === false && !onboarding) return <Navigate to="/onboarding" replace state={{ from: location.pathname.startsWith('/app') ? location.pathname + location.search : destination }} />;
  if (onboarding && user && user.onboardingCompleted !== false) return <Navigate to={destination} replace />;
  if (guestOnly) return user ? <Navigate to={destination} replace /> : <Outlet />;
  return user || allowGuest ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
