import React from 'react';
import { FaHotel, FaUsers, FaChartLine, FaFileInvoice, FaCog, FaBell } from 'react-icons/fa';
import { MdMeetingRoom, MdRestaurant, MdSpa } from 'react-icons/md';
import { GiMoneyStack } from 'react-icons/gi';
import '../styles/HomePage.css';

function HomePage() {
  // Mock data for demonstration
  const stats = [
    { title: 'Total Properties', value: '24', icon: <FaHotel />, color: 'var(--primary-color)' },
    { title: 'Active Bookings', value: '156', icon: <MdMeetingRoom />, color: 'var(--success-color)' },
    { title: 'Revenue (Monthly)', value: '$48,250', icon: <GiMoneyStack />, color: 'var(--warning-color)' },
    { title: 'Pending Tasks', value: '12', icon: <FaFileInvoice />, color: 'var(--danger-color)' }
  ];

  const quickActions = [
    { title: 'Add New Property', icon: <FaHotel />, path: '/organizations/add' },
    { title: 'Manage Staff', icon: <FaUsers />, path: '/staff' },
    { title: 'View Reports', icon: <FaChartLine />, path: '/reports' },
    { title: 'System Settings', icon: <FaCog />, path: '/settings' }
  ];

  const recentActivities = [
    { id: 1, activity: 'New booking at Grand Hotel', time: '10 mins ago', icon: <FaBell /> },
    { id: 2, activity: 'Payment received from Beach Resort', time: '25 mins ago', icon: <GiMoneyStack /> },
    { id: 3, activity: 'Maintenance request at City Inn', time: '1 hour ago', icon: <FaCog /> },
    { id: 4, activity: 'New user registration', time: '2 hours ago', icon: <FaUsers /> }
  ];

  const services = [
    { title: 'Room Management', icon: <MdMeetingRoom /> },
    { title: 'Restaurant POS', icon: <MdRestaurant /> },
    { title: 'Spa Booking', icon: <MdSpa /> },
    { title: 'Housekeeping', icon: <FaHotel /> }
  ];

  return (
    <div className="homepage-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Welcome back, Admin</h1>
          <p>Here's what's happening with your properties today</p>
        </div>
        <div className="date-display">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <h3>{stat.title}</h3>
              <p>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="content-grid">
        {/* Quick Actions */}
        <div className="quick-actions-card">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <button key={index} className="action-button">
                <div className="action-icon">{action.icon}</div>
                <span>{action.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="activities-card">
          <h2 className="section-title">Recent Activities</h2>
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-details">
                  <p className="activity-text">{activity.activity}</p>
                  <p className="activity-time">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="services-section">
        <h2 className="section-title">Hotel Management Services</h2>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>Manage all aspects of your {service.title.toLowerCase()}</p>
              <button className="service-button">Access</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;