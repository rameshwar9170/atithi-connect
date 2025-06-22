import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaBuilding,
  FaPlus,
  FaTachometerAlt,
  FaSitemap,
  FaUserCircle,
  FaCog,
  FaBell,
  FaSignOutAlt,
  FaChevronDown,
  FaSearch
} from 'react-icons/fa';
import { ref, get } from 'firebase/database';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../firebase/config';
import '../styles/Dashboard.css';

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [organizationsCount, setOrganizationsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(7);
  const [mobileView, setMobileView] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setMobileView(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function fetchCount() {
      try {
        const orgsRef = ref(db, 'atithi-connect/Orgs');
        const snapshot = await get(orgsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setOrganizationsCount(Object.keys(data).length);
        } else {
          setOrganizationsCount(0);
        }
      } catch (error) {
        console.error('Error fetching organizations count:', error);
      }
    }
    fetchCount();
  }, []);

  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      localStorage.clear(); // Clear all localStorage
      navigate('/login', { replace: true }); // Force redirect
    } catch (error) {
      console.error('Sign-out error:', error.message);
    }
  };

  const currentPath = location.pathname;

  const handleKeyDown = (e, path) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  const goTo = (path) => {
    navigate(path);
    if (mobileView) setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getPageTitle = () => {
    if (currentPath === '/') return 'Dashboard Overview';
    if (currentPath === '/organizations') return 'Organizations Management';
    if (currentPath === '/organizations/add') return 'Add New Organization';
    if (currentPath.includes('/branches')) return 'Branch Management';
    return currentPath
      .split('/')
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  };

  const navigationItems = [
    {
      path: '/',
      icon: FaTachometerAlt,
      label: 'Dashboard',
      isActive: currentPath === '/',
    },
    {
      path: '/organizations',
      icon: FaBuilding,
      label: 'Organizations',
      badge: organizationsCount,
      isActive: currentPath.startsWith('/organizations') &&
                !currentPath.includes('/branches') &&
                currentPath !== '/organizations/add',
    },
    {
      path: '/branches',
      icon: FaSitemap,
      label: 'Branches',
      isActive: currentPath.includes('/branches'),
    },
    {
      path: '/organizations/add',
      icon: FaPlus,
      label: 'Add Organization',
      isActive: currentPath === '/organizations/add',
    },
  ];

  return (
    <div className={`dashboard ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {mobileView && sidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`} 
        aria-label="Main Navigation"
      >
        <div className="sidebar-header">
          <div className="brand-container">
            <div className="brand-logo">
              <FaBuilding />
            </div>
            {sidebarOpen && (
              <div className="brand-text">
                <h2 className="brand-title">HotelHub</h2>
                <span className="brand-subtitle">Admin Portal</span>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        <nav className="sidebar-nav" role="navigation">
          <ul className="nav-list">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.path} className="nav-item">
                  <button
                    className={`nav-link ${item.isActive ? 'active' : ''}`}
                    onClick={() => goTo(item.path)}
                    onKeyDown={(e) => handleKeyDown(e, item.path)}
                    aria-current={item.isActive ? 'page' : undefined}
                    title={item.label}
                  >
                    <IconComponent className="nav-icon" />
                    {sidebarOpen && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="nav-badge" aria-label={`${item.badge} items`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {item.isActive && <div className="active-indicator" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {sidebarOpen && (
          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar-container">
                <FaUserCircle className="user-avatar-icon" />
                <div className="status-indicator online" />
              </div>
              <div className="user-details">
                <span className="user-name">Sarah Johnson</span>
                <span className="user-role">System Administrator</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              onClick={toggleSidebar}
              className="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
            >
              <FaBars />
            </button>
            <div className="page-header">
              <h1 className="page-title">{getPageTitle()}</h1>
              <div className="breadcrumb">
                <span>Admin</span>
                <span className="separator">•</span>
                <span>{getPageTitle()}</span>
              </div>
            </div>
          </div>

          <div className="topbar-center">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search organizations, branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="topbar-right">
            <button className="action-btn notification-btn" aria-label="Notifications">
              <FaBell />
              {unreadNotifications > 0 && (
                <span className="notification-badge">{unreadNotifications}</span>
              )}
            </button>

            <button className="action-btn settings-btn" aria-label="Settings">
              <FaCog />
            </button>

            <div className="user-menu-container">
              <button
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="user-avatar-small">
                  <FaUserCircle />
                </div>
                <span className="user-name-small">Sarah J.</span>
                <FaChevronDown className={`chevron ${userMenuOpen ? 'rotated' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="user-info-dropdown">
                      <strong>Sarah Johnson</strong>
                      <span>sarah.johnson@hotelhub.com</span>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-content">
                    <button className="dropdown-item">
                      <FaUserCircle />
                      Profile Settings
                    </button>
                    <button className="dropdown-item">
                      <FaCog />
                      Account Settings
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleSignOut}>
                      <FaSignOutAlt />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="content-area">
          <div className="content-wrapper">
            <Outlet context={{ organizationsCount }} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;