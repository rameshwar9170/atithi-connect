import React from 'react';
import {
  FaClipboardList,
  FaUsers,
  FaUtensils,
  FaMoneyBillWave,
  FaChartPie,
  FaFileInvoiceDollar,
  FaBell,
  FaCog
} from 'react-icons/fa';
import './BranchHome.css'; // Ensure you have the correct CSS file for styling
import { useNavigate } from 'react-router-dom';
import PaymentReports from './PaymentReports';

function BranchHome() {
  const navigate = useNavigate();

  const services = [
    { title: 'Orders', icon: <FaClipboardList />, path: '/branch-dashboard/branch-dashboard/orders' },
    { title: 'Staff', icon: <FaUsers />, path: '/branch-dashboard/branch-dashboard/staff' },
    { title: 'Menu', icon: <FaUtensils />, path: '/branch-dashboard/branch-dashboard/menu' },
    { title: 'Payments', icon: <FaMoneyBillWave />, path: '/branch-dashboard/branch-dashboard/payments' },
    { title: 'Reports', icon: <FaChartPie />, path: '/branch-dashboard/branch-dashboard/reports' },
    { title: 'Billing', icon: <FaFileInvoiceDollar />, path: '/branch-dashboard/branch-dashboard/billing' },
    { title: 'Notifications', icon: <FaBell />, path: '/branch-dashboard/branch-dashboard/notifications' },
    { title: 'Settings', icon: <FaCog />, path: '/branch-dashboard/branch-dashboard/settings' }
  ];

  return (
    <div className="homepage-container">

      <PaymentReports />
      {/* Welcome Banner */}
      {/* <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Welcome back, Branch Admin</h1>
          <p>Manage your daily branch operations from here.</p>
        </div>
        <div className="date-display">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div> */}

      {/* Services Section */}
      <div className="services-section">
        <h2 className="section-title">Branch Management Services</h2>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>Manage all aspects of {service.title.toLowerCase()}</p>
              <button className="service-button" onClick={() => navigate(service.path)}>
                Access
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BranchHome;
