import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LanguageProvider from './context/LanguageProvider';
import AuthProvider from './context/AuthProvider';
import StartupBoundary from './components/layout/StartupBoundary';
import './styles/loading.css';
import SiteLayout from './components/layout/SiteLayout';
import AppLayout from './components/layout/AppLayout';
import AuthGate from './components/auth/AuthGate';
import { HomeRoute, LegacyFeedRoute } from './components/layout/HomeRoute';
import AuthPage from './pages/auth/AuthPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import FeedPage from './pages/app/FeedPage';
import CuratedPage from './pages/app/CuratedPage';
import ExplorePage, { WordPage, WordCreatePage } from './pages/app/ExplorePage';
import CreatePage from './pages/app/CreatePage';
import StoryPage from './pages/app/StoryPage';
import ProfilePage from './pages/app/ProfilePage';
import PlaceholderPage from './pages/app/PlaceholderPage';
import SettingsPage from './pages/app/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import './styles/app.css';
import './pages/auth/auth.css';
export default function App() {
  return <BrowserRouter><AuthProvider><LanguageProvider><StartupBoundary><Routes>
        <Route path="/" element={<HomeRoute />}>
      <Route element={<SiteLayout />}>
        <Route element={<AuthGate allowGuest />}>
          <Route element={<AppLayout />}>
            <Route index element={<FeedPage />} />
          </Route>
        </Route>
      </Route>
    </Route>
    <Route element={<SiteLayout />}>
    <Route element={<AuthGate guestOnly />}>
      <Route path="login" element={<AuthPage key="login" mode="login" />} />
      <Route path="signup" element={<AuthPage key="signup" mode="signup" />} />
    </Route>
    <Route element={<AuthGate onboarding />}><Route path="onboarding" element={<OnboardingPage />} /></Route>
    <Route element={<AuthGate allowGuest />}>
    <Route path="app" element={<AppLayout />}>
      <Route path="curated" element={<CuratedPage />} />
      <Route index element={<LegacyFeedRoute />} />
      <Route path="feed" element={<FeedPage />} /><Route path="stories/:id" element={<StoryPage />} /><Route path="keywords/new" element={<WordCreatePage />} /><Route path="words/:key" element={<WordPage />} /><Route path="explore" element={<ExplorePage />} /><Route path="keywords" element={<ExplorePage />} /><Route path="translation" element={<PlaceholderPage page="translation" />} />
      <Route path="search" element={<ExplorePage searchOnly />} /><Route path="profile" element={<ProfilePage />} /><Route path="profile/settings" element={<SettingsPage />} /><Route path="settings" element={<Navigate to="/app/profile/settings" replace />} />
      <Route element={<AuthGate />}>
        <Route path="write" element={<CreatePage />} /><Route path="write/:id" element={<CreatePage />} />

      </Route>
    </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Route></Routes></StartupBoundary></LanguageProvider></AuthProvider></BrowserRouter>;
}
