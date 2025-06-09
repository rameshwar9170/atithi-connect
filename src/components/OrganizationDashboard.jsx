import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaHotel,
  FaPlus,
  FaTachometerAlt,
  FaSitemap,
  FaUserCircle,
  FaCog,
  FaBell,
  FaSignOutAlt,
  FaChevronDown,
  FaSearch,
  FaBed,
  FaUsers,
  FaCalendarAlt,
  FaChartLine,
  FaCreditCard,
  FaConciergeBell
} from 'react-icons/fa';
import '../styles/OrganizationDashboard.css';

// Mock functions for demo
const mockGetDocs = () => Promise.resolve({ size: 8 });
const mockGetBookings = () => Promise.resolve({ size: 24 });
const mockGetGuests = () => Promise.resolve({ size: 156 });

function OrganizationDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [branchesCount, setBranchesCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [guestsCount, setGuestsCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(5);
  const [mobileView, setMobileView] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Mock organization data
  const organizationInfo = {
    name: "Grand Hotel Chain",
    logo: "GH",
    plan: "Premium Plan"
  };

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
    async function fetchCounts() {
      try {
        const [branchesSnapshot, bookingsSnapshot, guestsSnapshot] = await Promise.all([
          mockGetDocs(),
          mockGetBookings(),
          mockGetGuests()
        ]);
        setBranchesCount(branchesSnapshot.size);
        setBookingsCount(bookingsSnapshot.size);
        setGuestsCount(guestsSnapshot.size);
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    }
    fetchCounts();
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
    if (currentPath === '//org' || currentPath === '/org/') return 'Dashboard Overview';
    if (currentPath === '/my-branches') return 'Branch Management';
    if (currentPath === '/org/branches/add') return 'Add New Branch';
    if (currentPath === '/org/rooms') return 'Room Management';
    if (currentPath === '/org/bookings') return 'Booking Management';
    if (currentPath === '/org/guests') return 'Guest Management';
    if (currentPath === '/org/analytics') return 'Analytics & Reports';
    if (currentPath === '/org/billing') return 'Billing & Payments';
    if (currentPath === '/org/services') return 'Hotel Services';
    return currentPath
      .split('/')
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  };

const navigationItems = [
  {
    path: '/organizations-dashboard/org',
    icon: FaTachometerAlt,
    label: 'Dashboard',
    isActive: currentPath === '/organizations-dashboard/org' || currentPath === '/organizations-dashboard/org/',
  },
  {
    path: '/organizations-dashboard/org/my-branches',
    icon: FaSitemap,
    label: 'Branches',
    badge: branchesCount,
    isActive: currentPath.startsWith('/organizations-dashboard/org/branches') && currentPath !== '/organizations-dashboard/org/branches/add',
  },
  {
    path: '/organizations-dashboard/org/branches/add',
    icon: FaPlus,
    label: 'Add Branch',
    isActive: currentPath === '/organizations-dashboard/org/branches/add',
  },
  {
    path: '/organizations-dashboard/org/rooms',
    icon: FaBed,
    label: 'Rooms',
    isActive: currentPath.startsWith('/organizations-dashboard/org/rooms'),
  },
  {
    path: '/organizations-dashboard/org/bookings',
    icon: FaCalendarAlt,
    label: 'Bookings',
    badge: bookingsCount,
    isActive: currentPath.startsWith('/organizations-dashboard/org/bookings'),
  },
  {
    path: '/organizations-dashboard/org/guests',
    icon: FaUsers,
    label: 'Guests',
    badge: guestsCount,
    isActive: currentPath.startsWith('/organizations-dashboard/org/guests'),
  },
  {
    path: '/organizations-dashboard/org/services',
    icon: FaConciergeBell,
    label: 'Services',
    isActive: currentPath.startsWith('/organizations-dashboard/org/services'),
  },
  {
    path: '/organizations-dashboard/org/analytics',
    icon: FaChartLine,
    label: 'Analytics',
    isActive: currentPath.startsWith('/organizations-dashboard/org/analytics'),
  },
  {
    path: '/organizations-dashboard/org/billing',
    icon: FaCreditCard,
    label: 'Billing',
    isActive: currentPath.startsWith('/organizations-dashboard/org/billing'),
  },
];


  return (
    <div className={`org-dashboard ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {mobileView && sidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`} 
        aria-label="Organization Navigation"
      >
        <div className="sidebar-header">
          <div className="brand-container">
            <div className="brand-logo org-logo">
              <span className="logo-text">{organizationInfo.logo}</span>
            </div>
            {sidebarOpen && (
              <div className="brand-text">
                <h2 className="brand-title">{organizationInfo.name}</h2>
                <span className="brand-subtitle">{organizationInfo.plan}</span>
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
                <span className="user-name">Michael Rodriguez</span>
                <span className="user-role">Hotel Manager</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
       <header className="topbar">
  <button
    onClick={toggleSidebar}
    className="mobile-menu-toggle"
    aria-label="Toggle navigation menu"
  >
    <FaBars />
  </button>

  <div className="topbar-left">
    <div className="page-header">
      <h1 className="page-title">{getPageTitle()}</h1>
      <div className="breadcrumb">
        <span>{organizationInfo.name}</span>
      </div>
    </div>
  </div>

  <div className="topbar-center">
    <div className="search-container">
      <FaSearch className="search-icon" />
      <input
        type="text"
        placeholder="Search branches, rooms, bookings..."
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
        <span className="user-name-small">Michael R.</span>
        <FaChevronDown className={`chevron ${userMenuOpen ? 'rotated' : ''}`} />
      </button>

      {userMenuOpen && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <div className="user-info-dropdown">
              <strong>Michael Rodriguez</strong>
              <span>michael.rodriguez@grandhotel.com</span>
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
            <button className="dropdown-item">
              <FaHotel />
              Organization Settings
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger">
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
            <Outlet context={{ 
              branchesCount, 
              bookingsCount, 
              guestsCount,
              organizationInfo 
            }} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default OrganizationDashboard;