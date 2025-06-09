import React, { useEffect, useState } from 'react';
import '../styles/ViewOrganizations.css';
import { db } from '../firebase/config';
import { ref, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { FiExternalLink, FiChevronRight } from 'react-icons/fi';
import { Skeleton } from '@mui/material';

function formatAddress(address) {
  if (!address) return 'Not specified';
  if (typeof address !== 'object') return address;
  const { line1, city, state, pincode, country } = address;
  return [line1, city, state, pincode, country].filter(Boolean).join(', ');
}

const ViewOrganizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const orgRef = ref(db, 'atithi-connect/Orgs');
        const snapshot = await get(orgRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const orgList = Object.entries(data).map(([id, org]) => ({
            id,
            ...org,
          }));
          setOrganizations(orgList);
        } else {
          setOrganizations([]);
        }
      } catch (err) {
        setError('Failed to fetch organizations. Please try again later.');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleCardClick = (org) => {
    navigate(`/organizations/${org.id}/add-branch`, { 
      state: { organization: org } 
    });
  };

  if (loading) return (
    <div className="orgs-container">
      <h2 className="page-title">Organizations</h2>
      <div className="orgs-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="org-card skeleton">
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="80%" />
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="orgs-container">
      <div className="error-state">
        <h2 className="page-title">Organizations</h2>
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  if (organizations.length === 0) return (
    <div className="orgs-container">
      <h2 className="page-title">Organizations</h2>
      <div className="empty-state">
        <p>No organizations found</p>
        <button 
          className="primary-button"
          onClick={() => navigate('/create-organization')}
        >
          Create New Organization
        </button>
      </div>
    </div>
  );

  return (
    <div className="orgs-container">
      <div className="header-section">
        <h2 className="page-title">Organizations</h2>
        <div className="action-buttons">
          <button 
            className="primary-button"
            onClick={() => navigate('/create-organization')}
          >
            + New Organization
          </button>
        </div>
      </div>
      
      <div className="orgs-grid">
        {organizations.map(org => (
          <div
            key={org.id}
            className="org-card"
            role="button"
            tabIndex={0}
            onClick={() => handleCardClick(org)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' || e.key === ' ') handleCardClick(org); 
            }}
          >
            <div className="card-header">
              <h3 className="org-name">{org.name}</h3>
              <FiChevronRight className="chevron-icon" />
            </div>
            
            <div className="card-body">
              <div className="detail-row">
                <span className="detail-label">Owner</span>
                <span className="detail-value">{org.ownerName || 'Not specified'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Contact</span>
                <span className="detail-value">
                  {org.email || 'Not specified'}
                  {org.phone && <span> • {org.phone}</span>}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <span className="detail-value">
                  {formatAddress(org.address)}
                </span>
              </div>
              
              {org.website && (
                <div className="detail-row">
                  <span className="detail-label">Website</span>
                  <span className="detail-value">
                    <a 
                      href={org.website} 
                      target="_blank" 
                      rel="noreferrer" 
                      onClick={e => e.stopPropagation()}
                    >
                      {org.website.replace(/^https?:\/\//, '')}
                      <FiExternalLink className="external-link-icon" />
                    </a>
                  </span>
                </div>
              )}
            </div>
            
            <div className="card-footer">
              <span className="gst-badge">
                {org.gstNumber ? `GST: ${org.gstNumber}` : 'No GST'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewOrganizations;
