import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AppleNavbar from './components/AppleNavbar';
import { ToastProvider } from './components/ToastNotification';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalErrorHandler from './components/GlobalErrorHandler';
import GiftCardPage from './screens/pages/GiftCardPage';
import GiftCardDetailPage from './screens/pages/GiftCardDetailPage';
import EbookPage from './screens/pages/EbookPage';
import EbookDetailPage from './screens/pages/EbookDetailPage';
import BlogPage from './screens/pages/BlogPage';
import TemplatePage from './screens/pages/TemplatePage';
import CoursePage from './screens/pages/CoursePage';
import CartPage from './screens/pages/CartPage';
import MyOrdersPage from './screens/pages/MyOrdersPage';
import MyDownloadsPage from './screens/pages/MyDownloadsPage';
import AdminOrdersPage from './screens/admin/AdminOrdersPage';
import AdminLogin from './screens/admin/AdminLogin';
import AdminDashboard from './screens/admin/AdminDashboard';
import AdminEbookDashboard from './screens/admin/AdminEbookDashboard';
import AdminBlogDashboard from './screens/admin/AdminBlogDashboard';
import AdminTemplateDashboard from './screens/admin/AdminTemplateDashboard';
import AdminCourseDashboard from './screens/admin/AdminCourseDashboard';
import SignUpPage from './screens/auth/SignUpPage';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      let path = window.location.pathname.slice(1) || 'gift-card';

      if (path === 'home' || path === '') {
        window.history.replaceState({ page: 'gift-card' }, '', '/gift-card');
        path = 'gift-card';
      }

      if (path.startsWith('gift-card/')) return 'gift-card-detail';
      if (path.startsWith('ebook/')) return 'ebook-detail';
      return path;
    }
    return 'gift-card';
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminSection, setAdminSection] = useState('gift-cards');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const handlePopState = () => {
      let path = window.location.pathname.slice(1) || 'gift-card';
      if (path === 'home' || path === '') {
        window.history.replaceState({ page: 'gift-card' }, '', '/gift-card');
        path = 'gift-card';
      }
      setCurrentPage(path);
    };

    window.addEventListener('popstate', handlePopState);

    const path = window.location.pathname.slice(1);
    if (path === 'home' || path === '') {
      window.history.replaceState({ page: 'gift-card' }, '', '/gift-card');
      setCurrentPage('gift-card');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (route) => {
    if (route === 'home') route = 'gift-card';
    window.history.pushState({ page: route }, '', '/' + route);
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { route } }));
    setCurrentPage(route);
  };

  const handleLogin = (loggedIn) => {
    setIsAdminLoggedIn(loggedIn);
    if (loggedIn) {
      setCurrentPage('admin-dashboard');
      window.history.pushState({ page: 'admin-dashboard' }, '', '/admin-dashboard');
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentPage('admin-login');
    window.history.pushState({ page: 'admin-login' }, '', '/admin-login');
  };

  const handleAdminSectionChange = (section) => setAdminSection(section);

  const renderPage = () => {
    if (currentPage === 'admin-login') return <AdminLogin onLogin={handleLogin} />;

    if (currentPage === 'admin-dashboard' && isAdminLoggedIn) {
      if (adminSection === 'ebooks') return <AdminEbookDashboard onLogout={handleLogout} onSectionChange={handleAdminSectionChange} />;
      if (adminSection === 'blogs') return <AdminBlogDashboard onLogout={handleLogout} onSectionChange={handleAdminSectionChange} />;
      if (adminSection === 'templates') return <AdminTemplateDashboard onLogout={handleLogout} onSectionChange={handleAdminSectionChange} />;
      if (adminSection === 'courses') return <AdminCourseDashboard onLogout={handleLogout} onSectionChange={handleAdminSectionChange} />;
      return <AdminDashboard onLogout={handleLogout} onSectionChange={handleAdminSectionChange} />;
    }

    switch (currentPage) {
      case 'sign-up':
        return <SignUpPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'gift-card':
      case 'home':
        return <GiftCardPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'gift-card-detail':
        return <GiftCardDetailPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'ebook':
        return <EbookPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'ebook-detail':
        return <EbookDetailPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'blog':
        return <BlogPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'template':
        return <TemplatePage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'course':
        return <CoursePage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'cart':
        return <CartPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
      case 'my-orders':
        return (
          <ProtectedRoute>
            <MyOrdersPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />
          </ProtectedRoute>
        );
      case 'my-downloads':
        return (
          <ProtectedRoute>
            <MyDownloadsPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />
          </ProtectedRoute>
        );
      case 'admin-orders':
        return (
          <ProtectedRoute requireAdmin>
            <AdminOrdersPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />
          </ProtectedRoute>
        );
      default:
        window.history.replaceState({ page: 'gift-card' }, '', '/gift-card');
        return <GiftCardPage onNavigate={handleNavigate} onSignUp={() => setCurrentPage('sign-up')} />;
    }
  };

  return (
    <>
      <GlobalErrorHandler />
      {renderPage()}
    </>
  );
};

const App = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default App;
