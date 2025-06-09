import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../styles/OrgMyBranches.css';
import { FaMapMarkerAlt, FaUser, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';

const OrgMyBranches = ({ orgId }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchRef = collection(db, 'organizations', orgId, 'branches');
        const snapshot = await getDocs(branchRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBranches(data);
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [orgId]);

  return (
    <div className="branches-container">
      <h2>My Branches</h2>
      {loading ? (
        <p className="loading-text">Loading branches...</p>
      ) : branches.length === 0 ? (
        <p className="no-branches">No branches found.</p>
      ) : (
        <div className="branch-grid">
          {branches.map(branch => (
            <div className="branch-card" key={branch.id}>
              <h3>{branch.branchName}</h3>
              <p><FaMapMarkerAlt className="icon" /> {branch.address}</p>
              <p><FaUser className="icon" /> Manager: {branch.managerName}</p>
              <p><FaPhoneAlt className="icon" /> Phone: {branch.phone}</p>
              <p><FaWhatsapp className="icon" /> WhatsApp: {branch.whatsapp}</p>
              <p className="email">📧 {branch.email}</p>
              <p className={`status ${branch.isEnabled ? 'active' : 'inactive'}`}>
                {branch.isEnabled ? 'Active' : 'Inactive'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrgMyBranches;
