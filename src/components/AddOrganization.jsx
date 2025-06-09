import React, { useState } from 'react';
import '../styles/AddOrganization.css';
import { db } from '../firebase/config';
import { ref, set } from 'firebase/database';

function AddOrganization() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    gstNumber: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Generate orgId like "RAMESH1025"
  const generateOrgId = (email) => {
    if (!email.includes('@')) return 'ORG' + Date.now();
    const prefix = email.split('@')[0].slice(0, 6).toUpperCase();
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');       // e.g. 10
    const year = String(date.getFullYear()).slice(-2);         // e.g. 25
    return `${prefix}${day}${year}`;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage('');

  try {
    const orgId = generateOrgId(formData.email);
    const orgRef = ref(db, `atithi-connect/Orgs/${orgId}`);

    const orgData = {
      ...formData,
      orgId,
      createdAt: Date.now(),
    };

    // Save to organization path
    await set(orgRef, orgData);

    // Save to users path with role = Org
    const emailKey = formData.email.replace(/\./g, '_');
    const userRef = ref(db, `users/${emailKey}`);
    await set(userRef, {
      email: formData.email,
      orgId,
      ownerName: formData.ownerName,
      role: 'Org',
    });

    setMessage('✅ Organization added successfully!');
    setFormData({
      name: '',
      address: '',
      ownerName: '',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
      gstNumber: '',
    });
  } catch (err) {
    setMessage('❌ Failed to add: ' + err.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="org-form-wrapper">
      <h2 className="form-title">Add New Organization</h2>
      <form className="org-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Organization Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <textarea
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="ownerName"
          placeholder="Owner Name"
          value={formData.ownerName}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="whatsapp"
          placeholder="WhatsApp Number"
          value={formData.whatsapp}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="website"
          placeholder="Website (optional)"
          value={formData.website}
          onChange={handleChange}
        />
        <input
          type="text"
          name="gstNumber"
          placeholder="GST Number (optional)"
          value={formData.gstNumber}
          onChange={handleChange}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Organization'}
        </button>

        {message && <p className="form-message">{message}</p>}
      </form>
    </div>
  );
}

export default AddOrganization;
