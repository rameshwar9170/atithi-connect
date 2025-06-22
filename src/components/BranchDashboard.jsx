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
  FaSearch,
  FaClipboardList,
  FaUsers,
  FaUtensils,
  FaMoneyBillWave,
  FaChartPie,
  FaFileInvoiceDollar,
  FaBed,
  FaListAlt
} from 'react-icons/fa';
import { ref, get } from 'firebase/database';
import { db } from '../firebase/config';
import '../styles/Dashboard.css';

function BranchDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [mobileView, setMobileView] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();


  const handleSignOut = () => {
  localStorage.clear();
  navigate('/login', { replace: true });
};

  useEffect(() => {
    const handleResize = () => {
      setMobileView(window.innerWidth < 768);
      setSidebarOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const pathMap = {
      '/': 'Branch Dashboard',
      '/orders': 'Tables & Orders',
      '/rooms': 'Rooms Management',
      '/inventory': 'Inventory Management',
      '/staff': 'Staff Management',
      '/menu': 'Menu Management',
      '/payments': 'Payments',
      '/reports': 'Reports',
      '/billing': 'Billing',
      '/notifications': 'Notifications',
      '/settings': 'Settings',
    };
    return pathMap[currentPath] || 'Branch Dashboard';
  };

 const navigationItems = [
  {
    path: '/branch-dashboard',
    icon: FaTachometerAlt,
    label: 'Dashboard',
    isActive: currentPath === '/branch-dashboard',
  },
  {
    path: '/branch-dashboard/orders',
    icon: FaClipboardList,
    label: 'Tables & Orders',
    isActive: currentPath === '/branch-dashboard/orders',
  },
  {
    path: '/branch-dashboard/rooms',
    icon: FaBed,
    label: 'Rooms',
    isActive: currentPath === '/branch-dashboard/rooms',
  },
  {
    path: '/branch-dashboard/inventory',
    icon: FaListAlt,
    label: 'Inventory',
    isActive: currentPath === '/branch-dashboard/inventory',
  },
  {
    path: '/branch-dashboard/staff',
    icon: FaUsers,
    label: 'Staff',
    isActive: currentPath === '/branch-dashboard/staff',
  },
  {
    path: '/branch-dashboard/menu',
    icon: FaUtensils,
    label: 'Menu',
    isActive: currentPath === '/branch-dashboard/menu',
  },
  // {
  //   path: '/branch-dashboard/payments',
  //   icon: FaMoneyBillWave,
  //   label: 'Payments',
  //   isActive: currentPath === '/branch-dashboard/payments',
  // },
  {
    path: '/branch-dashboard/reports',
    icon: FaChartPie,
    label: 'Reports',
    isActive: currentPath === '/branch-dashboard/reports',
  },
  // {
  //   path: '/branch-dashboard/billing',
  //   icon: FaFileInvoiceDollar,
  //   label: 'Billing',
  //   isActive: currentPath === '/branch-dashboard/billing',
  // },
  // {
  //   path: '/branch-dashboard/notifications',
  //   icon: FaBell,
  //   label: 'Notifications',
  //   isActive: currentPath === '/branch-dashboard/notifications',
  // },
  {
    path: '/branch-dashboard/settings',
    icon: FaCog,
    label: 'Settings',
    isActive: currentPath === '/branch-dashboard/settings',
  },
];


  return (
    <div className={`dashboard ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {mobileView && sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <aside className={`sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`} aria-label="Main Navigation">
        <div className="sidebar-header">
          <div className="brand-container">
            <div className="brand-logo">
              <FaSitemap />
            </div>
            {sidebarOpen && (
              <div className="brand-text">
                <h2 className="brand-title">Atithi Connect</h2>
                <span className="brand-subtitle">Branch Manager</span>
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
                    {sidebarOpen && <span className="nav-label">{item.label}</span>}
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
                <span className="user-name">Branch Manager</span>
                <span className="user-role">Manager</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button onClick={toggleSidebar} className="mobile-menu-toggle" aria-label="Toggle navigation menu">
              <FaBars />
            </button>
            <div className="page-header">
              <h1 className="page-title">{getPageTitle()}</h1>
              <div className="breadcrumb">
                <span>Branch</span>
                <span className="separator">•</span>
                <span>{getPageTitle()}</span>
              </div>
            </div>
          </div>

          {/* <div className="topbar-center">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div> */}

          <div className="topbar-right">
            {/* <button className="action-btn notification-btn" aria-label="Notifications">
              <FaBell />
              {unreadNotifications > 0 && <span className="notification-badge">{unreadNotifications}</span>}
            </button> */}

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
                <span className="user-name-small">Branch M.</span>
                <FaChevronDown className={`chevron ${userMenuOpen ? 'rotated' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="user-info-dropdown">
                      <strong>Branch Manager</strong>
                      <span>branch@atithi.com</span>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-content">
                    <button className="dropdown-item">
                      <FaUserCircle /> Profile Settings
                    </button>
                    <button className="dropdown-item">
                      <FaCog /> Account Settings
                    </button>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleSignOut}>
                      <FaSignOutAlt /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="content-area">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}

export default BranchDashboard;
