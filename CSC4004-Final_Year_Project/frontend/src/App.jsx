import { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthContext } from './context/AuthContextValue';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Finance from './pages/Finance';
import Activities from './pages/Activities';
import Resources from './pages/Resources';
import Control from './pages/Control';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('hubtoll_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('hubtoll_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`hubtoll-app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Topbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />
      <div className="hubtoll-body-layout">
        <Sidebar collapsed={sidebarCollapsed} />
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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="finance" element={<Finance />} />
              <Route path="activities" element={<Activities />} />
              <Route path="resources" element={<Resources />} />
              <Route path="control" element={<Control />} />
              {/* Backwards-compatibility redirect from /admin to /control */}
              <Route path="admin" element={<Navigate to="/control" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
