import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Layout       from './components/Layout';
import ToastManager from './components/ui/ToastManager';
import Spinner      from './components/ui/Spinner';

// Lazy-load all pages (code splitting → faster initial load)
const LoginPage       = lazy(() => import('./pages/LoginPage'));
const RegisterPage    = lazy(() => import('./pages/RegisterPage'));
const HomePage        = lazy(() => import('./pages/HomePage'));
const CoursePage      = lazy(() => import('./pages/CoursePage'));
const LessonPage      = lazy(() => import('./pages/LessonPage'));
const ProfilePage     = lazy(() => import('./pages/ProfilePage'));
const ShopPage        = lazy(() => import('./pages/ShopPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const AdminPage       = lazy(() => import('./pages/AdminPage'));
const NotFoundPage          = lazy(() => import('./pages/NotFoundPage'));
const ForgotPasswordPage  = lazy(() => import('./pages/ForgotPasswordPage'));
const KurdistanPage       = lazy(() => import('./pages/KurdistanPage'));
const CommunityPage       = lazy(() => import('./pages/CommunityPage'));
const ResetPasswordPage   = lazy(() => import('./pages/ResetPasswordPage'));
const ReviewPage          = lazy(() => import('./pages/ReviewPage'));
const VocabPage           = lazy(() => import('./pages/VocabPage'));
const ImpressumPage       = lazy(() => import('./pages/ImpressumPage'));
const DatenschutzPage     = lazy(() => import('./pages/DatenschutzPage'));
const NutzungsbedingungenPage = lazy(() => import('./pages/NutzungsbedingungenPage'));

function PageLoader() {
  return <Spinner text="Lädt…" />;
}

function RequireAuth({ children }) {
  const user        = useStore(s => s.user);
  const authChecked = useStore(s => s._authChecked);
  if (!authChecked) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const user        = useStore(s => s.user);
  const authChecked = useStore(s => s._authChecked);
  if (!authChecked) return <PageLoader />;
  if (!user)               return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function RequireGuest({ children }) {
  const user        = useStore(s => s.user);
  const authChecked = useStore(s => s._authChecked);
  if (!authChecked) return <PageLoader />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const verifySession = useStore(s => s.verifySession);
  const authChecked   = useStore(s => s._authChecked);

  // ── Einmaliger Startup-Check ─────────────────────────────────────────
  // Prüft ob der gespeicherte Token noch gültig ist, BEVOR
  // RequireAuth/RequireGuest Routing-Entscheidungen treffen.
  // Verhindert: Flash-of-Content → 401 → Redirect-Loop.
  useEffect(() => {
    if (!authChecked) verifySession();
  }, [authChecked, verifySession]);
  return (
    <>
      <ToastManager />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<RequireGuest><LoginPage /></RequireGuest>} />
          <Route path="/register"        element={<RequireGuest><RegisterPage /></RequireGuest>} />
          <Route path="/forgot-password"  element={<RequireGuest><ForgotPasswordPage /></RequireGuest>} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />

          {/* Legal (public, always accessible) */}
          <Route path="/impressum"           element={<ImpressumPage />} />
          <Route path="/datenschutz"         element={<DatenschutzPage />} />
          <Route path="/nutzungsbedingungen" element={<NutzungsbedingungenPage />} />

          {/* Protected + Layout */}
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index              element={<HomePage />} />
            <Route path="course/:id"  element={<CoursePage />} />
            <Route path="profile"     element={<ProfilePage />} />
            <Route path="shop"        element={<ShopPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="kurdistan"     element={<KurdistanPage />} />
            <Route path="community"     element={<CommunityPage />} />
            <Route path="vocab"         element={<VocabPage />} />
          </Route>

          {/* Full-screen lesson */}
          <Route path="/lesson/:id" element={
            <RequireAuth><LessonPage /></RequireAuth>
          } />

          {/* Full-screen review session */}
          <Route path="/review" element={
            <RequireAuth><ReviewPage /></RequireAuth>
          } />

          {/* Admin */}
          <Route path="/admin/*" element={
            <RequireAdmin><AdminPage /></RequireAdmin>
          } />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
