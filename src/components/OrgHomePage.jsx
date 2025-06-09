import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaPlus,
  FaBed,
  FaCalendarAlt,
  FaUsers,
  FaChartLine,
  FaCreditCard,
  FaConciergeBell
} from 'react-icons/fa';
import '../styles/OrgHomePage.css';

function OrgHomePage() {
  const navigate = useNavigate();

  const dashboardOptions = [
    {
      title: 'Branch Management',
      description: 'Manage all your branches',
      icon: <FaBuilding />,
      path: '/organizations-dashboard/org/branches',
      color: '#4A90E2'
    },
    {
      title: 'Add New Branch',
      description: 'Create a new branch',
      icon: <FaPlus />,
      path: '/organizations-dashboard/org/branches/add',
      color: '#50E3C2'
    },
    {
      title: 'Room Management',
      description: 'Manage rooms in your branches',
      icon: <FaBed />,
      path: '/organizations-dashboard/org/rooms',
      color: '#F5A623'
    },
    {
      title: 'Booking Management',
      description: 'Manage bookings and reservations',
      icon: <FaCalendarAlt />,
      path: '/organizations-dashboard/org/bookings',
      color: '#BD10E0'
    },
    {
      title: 'Guest Management',
      description: 'Manage guest details',
      icon: <FaUsers />,
      path: '/organizations-dashboard/org/guests',
      color: '#7ED321'
    },
    {
      title: 'Analytics & Reports',
      description: 'View analytics & reports',
      icon: <FaChartLine />,
      path: '/organizations-dashboard/org/analytics',
      color: '#D0021B'
    },
    {
      title: 'Billing & Payments',
      description: 'Manage billing & payments',
      icon: <FaCreditCard />,
      path: '/organizations-dashboard/org/billing',
      color: '#8B572A'
    },
    {
      title: 'Hotel Services',
      description: 'Access all hotel services',
      icon: <FaConciergeBell />,
      path: '/organizations-dashboard/org/services',
      color: '#417505'
    },
  ];

  return (
    <div className="org-homepage-container">
      <div className="welcome-banner">
        <h1>Welcome 👋</h1>
        <p>Manage everything about your hotel in one place</p>
      </div>

      <div className="stats-grid">
        {dashboardOptions.map((option, index) => (
          <div
            key={index}
            className="stat-card"
            onClick={() => navigate(option.path)}
          >
            <div
              className="stat-icon"
              style={{ backgroundColor: option.color }}
            >
              {option.icon}
            </div>
            <div className="stat-info">
              <h3>{option.title}</h3>
              <p>{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrgHomePage;
