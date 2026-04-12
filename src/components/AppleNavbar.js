import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, ScrollView } from 'react-native';
import { getCartCount } from '../utils/cart';
import { useAuth, logout } from '../utils/auth';

const { width } = Dimensions.get('window');

const AppleNavbar = ({ onNavigate, onSignUp }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const { user: currentUser, loading: authLoading } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Update screen width on resize
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => setCartCount(getCartCount());

    updateCartCount();

    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  // Custom navbar items
  const navItems = [
    { id: 'gift-card', label: 'Gift Card', route: 'gift-card', icon: '🎁' },
    { id: 'ebook', label: 'eBook', route: 'ebook', icon: '📚' },
    { id: 'blog', label: 'Blog', route: 'blog', icon: '📝' },
    { id: 'template', label: 'Template', route: 'template', icon: '🎨' },
    { id: 'course', label: 'Course', route: 'course', icon: '🎓' },
    { id: 'my-orders', label: 'My Orders', route: 'my-orders', icon: '📋', mobileOnly: true },
    { id: 'my-downloads', label: 'My Downloads', route: 'my-downloads', icon: '📥', mobileOnly: true },
  ];

  const handleMouseEnter = (itemId) => {
    setActiveMenu(itemId);
  };

  const handleMouseLeave = () => {
    setActiveMenu(null);
  };

  const handleClick = (route) => {
    console.log('=== NAVBAR CLICKED ===', route);
    setSidebarOpen(false);
    if (onNavigate) {
      onNavigate(route);
    }
  };

  const handleLogoClick = () => {
    console.log('=== LOGO CLICKED ===');
    setSidebarOpen(false);
    if (onNavigate) {
      onNavigate('home');
    }
  };

  const handleSignUpClick = () => {
    setSidebarOpen(false);
    if (onSignUp) {
      onSignUp();
    }
    // Navigate to sign-up page
    window.history.pushState({ page: 'sign-up' }, '', '/sign-up');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    window.location.reload();
  };

  const isMobile = screenWidth < 768;

  if (isMobile) {
    return (
      <>
        <View style={styles.mobileContainer}>
          {/* Mobile Header Row */}
          <View style={styles.mobileHeader}>
            {/* Hamburger Menu Button */}
            <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setSidebarOpen(true)}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </TouchableOpacity>
            
            {/* Logo */}
            <TouchableOpacity style={styles.mobileLogoBtn} onPress={handleLogoClick}>
              <Image source={{ uri: '/logo.png' }} style={styles.mobileLogo} />
            </TouchableOpacity>
            
            {/* Right Icons (User + Cart) */}
            <View style={styles.mobileRightSection}>
              {currentUser && (
                <TouchableOpacity style={styles.mobileUserBtn} onPress={() => setSidebarOpen(true)}>
                  <Image
                    source={{ 
                      uri: currentUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0066CC&color=fff&size=64&bold=true` 
                    }}
                    style={styles.mobileUserAvatar}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.mobileCartBtn} onPress={() => { setSidebarOpen(false); onNavigate && onNavigate('cart'); }}>
                <Text style={styles.mobileCartIcon}>🛒</Text>
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sidebar Overlay + Drawer - Moved outside mobileContainer to avoid clipping/containing block issues */}
        {sidebarOpen && (
          <View style={styles.sidebarOverlay}>
            {/* Dark backdrop */}
            <TouchableOpacity
              activeOpacity={1}
              style={styles.overlayBackdrop}
              onPress={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar Drawer */}
            <View style={styles.sidebarDrawer}>
              <View style={styles.sidebarHeader}>
                <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                  <Image source={{ uri: '/logo.png' }} style={styles.sidebarLogo} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSidebarOpen(false)}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sidebarNav} contentContainerStyle={{ flexGrow: 1 }}>
                {navItems.map((item) => {
                  // Only show My Orders and My Downloads if user is logged in
                  if ((item.id === 'my-orders' || item.id === 'my-downloads') && !currentUser) {
                    return null;
                  }
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sidebarNavItem, activeMenu === item.id && styles.sidebarNavItemActive]}
                      onPress={() => handleClick(item.route)}
                      onPressIn={() => handleMouseEnter(item.id)}
                      onPressOut={() => handleMouseLeave()}
                    >
                      <Text style={styles.sidebarItemIcon}>{item.icon}</Text>
                      <Text style={[styles.sidebarItemText, activeMenu === item.id && styles.sidebarItemTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Auth Section Inside ScrollView */}
                <View style={styles.sidebarAuth}>
                  {currentUser ? (
                    <View style={styles.sidebarUserSection}>
                      <View style={styles.sidebarUserInfo}>
                        {currentUser.picture ? (
                          <Image source={{ uri: currentUser.picture }} style={styles.sidebarUserAvatar} />
                        ) : (
                          <Image
                            source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0066CC&color=fff&size=128&bold=true` }}
                            style={styles.sidebarUserAvatar}
                          />
                        )}
                        <Text style={styles.sidebarUserName}>{currentUser.name}</Text>
                        <Text style={styles.sidebarUserEmail}>{currentUser.email}</Text>
                      </View>
                      <View style={styles.sidebarUserLinks}>
                        {currentUser.is_admin && (
                          <TouchableOpacity style={styles.sidebarUserLink} onPress={() => handleClick('admin-orders')}>
                            <Text style={styles.sidebarUserLinkText}>📦 Admin Orders</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.sidebarUserLink} onPress={() => handleClick('my-orders')}>
                          <Text style={styles.sidebarUserLinkText}>📋 My Orders</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarUserLink} onPress={() => handleClick('my-downloads')}>
                          <Text style={styles.sidebarUserLinkText}>📥 Downloads</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={handleLogout}>
                          <Text style={styles.sidebarLogoutText}>Sign Out</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.sidebarSignUpBtn} onPress={handleSignUpClick}>
                      <Text style={styles.sidebarSignUpText}>Sign Up / Login</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </>
    );
  }

  return (
    <nav style={styles.navbar}>
      <div style={styles.navbarContent}>
        <div style={styles.logoContainer}>
          <button
            onClick={handleLogoClick}
            style={styles.logoButton}
          >
            <Image source={{ uri: '/logo.png' }} style={styles.logo} />
          </button>
        </div>
        <div style={styles.navItemsContainer}>
          {navItems.filter(item => !item.mobileOnly).map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item.route)}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              style={{
                ...styles.navItem,
                ...(activeMenu === item.id ? styles.activeItem : {}),
              }}
            >
              <Text
                style={[
                  styles.navText,
                  activeMenu === item.id && styles.activeText,
                ]}
              >
                {item.label}
              </Text>
            </button>
          ))}
        </div>
        <div style={styles.authContainer}>
          <button onClick={() => onNavigate && onNavigate('cart')} style={styles.cartIcon} title="Shopping Cart">
            <Text style={styles.cartIconText}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </button>
          {currentUser ? (
            <View style={styles.userMenu}>
              {currentUser.is_admin && (
                <button onClick={() => onNavigate && onNavigate('admin-orders')} style={styles.adminOrdersButton}>
                  <Text style={styles.adminOrdersButtonText}>📦 Admin Orders</Text>
                </button>
              )}
              <button onClick={() => onNavigate && onNavigate('my-orders')} style={styles.myOrdersButton}>
                <Text style={styles.myOrdersButtonText}>📋 Orders</Text>
              </button>
              <button onClick={() => onNavigate && onNavigate('my-downloads')} style={styles.myDownloadsButton}>
                <Text style={styles.myDownloadsButtonText}>📥 Downloads</Text>
              </button>
              {currentUser.picture ? (
                <Image
                  source={{ uri: currentUser.picture }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Image
                  source={{
                    uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0066CC&color=fff&size=128&bold=true`
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                  }}
                />
              )}
              <Text style={styles.userName}>{currentUser.name}</Text>
              <button onClick={handleLogout} style={styles.logoutButton}>
                Sign Out
              </button>
            </View>
          ) : (
            <button
              onClick={handleSignUpClick}
              onMouseEnter={() => handleMouseEnter('sign-up')}
              onMouseLeave={handleMouseLeave}
              style={{
                ...styles.navItem,
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                ...(activeMenu === 'sign-up' ? styles.activeItem : {}),
              }}
            >
              <Text
                style={[
                  styles.navText,
                  styles.activeText,
                  styles.signUpText,
                ]}
              >
                Sign Up
              </Text>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    height: 44,
    width: '100%',
    position: 'sticky',
    top: 0,
    zIndex: 9999,
    borderBottomWidth: 1,
    borderBottomColor: '#D2D2D7',
  },
  navbarContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 20,
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 160,
  },
  logoButton: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    outline: 'none',
  },
  logo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  navItemsContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    gap: 20,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 4,
    minHeight: 28,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  navText: {
    fontSize: 12,
    color: '#1D1D1F',
    fontWeight: '400',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  logoText: {
    fontSize: 18,
    color: '#1D1D1F',
    fontWeight: '300',
  },
  activeItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  activeText: {
    color: '#000000',
  },
  authContainer: {
    marginLeft: 'auto',
    marginRight: 20,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIcon: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    fontSize: 20,
    outline: 'none',
    position: 'relative',
  },
  cartIconText: {
    fontSize: 20,
    lineHeight: 1,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 1,
  },
  signUpButton: {
    backgroundColor: '#0066CC',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none',
  },
  adminOrdersButton: {
    backgroundColor: '#0066CC',
    border: 'none',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    cursor: 'pointer',
    outline: 'none',
  },
  adminOrdersButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  myOrdersButton: {
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    border: 'none',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    cursor: 'pointer',
    outline: 'none',
  },
  myOrdersButtonText: {
    color: '#0066CC',
    fontSize: 13,
    fontWeight: '600',
  },
  myDownloadsButton: {
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    cursor: 'pointer',
    outline: 'none',
  },
  myDownloadsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  userMenu: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    objectFit: 'cover',
  },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    color: '#0066CC',
    border: 'none',
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none',
  },
  mobileContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#D2D2D7',
    height: 50,
    justifyContent: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 999999,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, height: 50 },
  hamburgerBtn: { padding: 8, flexDirection: 'column', gap: 4, justifyContent: 'center', alignItems: 'center' },
  hamburgerLine: { width: 22, height: 2, backgroundColor: '#1D1D1F', borderRadius: 1 },
  mobileLogoBtn: { padding: 6 },
  mobileLogo: { width: 24, height: 24, resizeMode: 'contain' },
  mobileRightSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mobileUserBtn: { padding: 4 },
  mobileUserAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#D2D2D7' },
  mobileCartBtn: { padding: 8, position: 'relative' },
  mobileCartIcon: { fontSize: 22 },
  cartBadge: { position: 'absolute', top: -2, right: -6, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  
  // Sidebar styles
  sidebarOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000000 },
  overlayBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sidebarDrawer: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    bottom: 0, 
    width: 280, 
    backgroundColor: '#FFFFFF', 
    boxShadow: '2px 0 8px rgba(0,0,0,0.25)',
    display: 'flex', 
    flexDirection: 'column', 
    zIndex: 1000001,
    overflow: 'hidden'
  },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  sidebarLogo: { width: 28, height: 28, resizeMode: 'contain' },
  closeBtn: { padding: 8, backgroundColor: '#F5F5F7', borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: '#1D1D1F', fontWeight: '600' },
  sidebarNav: { flex: 1 },
  sidebarNavItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  sidebarNavItemActive: { backgroundColor: '#F0F7FF' },
  sidebarItemIcon: { fontSize: 20, marginRight: 12 },
  sidebarItemText: { fontSize: 16, color: '#1D1D1F', fontWeight: '500' },
  sidebarItemTextActive: { color: '#0066CC', fontWeight: '700' },
  sidebarAuth: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E5E5', backgroundColor: '#FFFFFF' },
  sidebarUserSection: { alignItems: 'center' },
  sidebarUserInfo: { alignItems: 'center', marginBottom: 16 },
  sidebarUserAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 10 },
  sidebarUserName: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', textAlign: 'center' },
  sidebarUserEmail: { fontSize: 12, color: '#86868B', textAlign: 'center', marginTop: 2 },
  sidebarUserLinks: { width: '100%', gap: 8 },
  sidebarUserLink: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F5F5F7', borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  sidebarUserLinkText: { fontSize: 14, color: '#1D1D1F', fontWeight: '500' },
  sidebarLogoutBtn: { paddingVertical: 12, backgroundColor: '#FEE2E2', borderRadius: 10, alignItems: 'center', marginTop: 8 },
  sidebarLogoutText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  sidebarSignUpBtn: { paddingVertical: 14, backgroundColor: '#0066CC', borderRadius: 12, alignItems: 'center' },
  sidebarSignUpText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

export default AppleNavbar;
