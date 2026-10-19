import { lazy, Suspense, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/AuthContextValue';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Finance = lazy(() => import('./pages/Finance'));
const Activities = lazy(() => import('./pages/Activities'));
const Resources = lazy(() => import('./pages/Resources'));
const Control = lazy(() => import('./pages/Control'));
const Announcements = lazy(() => import('./pages/Announcements'));
const DeveloperOptions = lazy(() => import('./pages/DeveloperOptions'));
const ForgotPassword = lazy(() => import('./pages/PasswordReset').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/PasswordReset').then((module) => ({ default: module.ResetPassword })));

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('hubtoll_sidebar_collapsed') === 'true';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 760px)').matches) {
      setMobileNavOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('hubtoll_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`hubtoll-app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      <Topbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />
      <div className="hubtoll-body-layout">
        {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
        <Sidebar collapsed={sidebarCollapsed} onNavigate={() => setMobileNavOpen(false)} />
        <main className={`hubtoll-content-wrapper ${sidebarCollapsed ? 'content-collapsed' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<div className="page-container" role="status">Loading page…</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
              <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="finance" element={<Finance />} />
                <Route path="activities" element={<Activities />} />
                <Route path="resources" element={<Resources />} />
                <Route path="control" element={<Control />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="developer-options" element={<DeveloperOptions />} />
                {/* Backwards-compatibility redirect from /admin to /control */}
                <Route path="admin" element={<Navigate to="/control" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
