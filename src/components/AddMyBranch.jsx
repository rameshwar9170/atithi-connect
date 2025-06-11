import React, { useState, useEffect,useMemo  } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, push, set, get, child } from 'firebase/database';
import { FiPlus, FiArrowLeft, FiCheck, FiMapPin, FiPhone, FiMail, FiUser } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { Switch } from '@mui/material';
import '../styles/AddBranch.css';

const AddMyBranch = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch orgId from localStorage and construct organization object
    const orgId = localStorage.getItem('orgId');
    console.log('Fetched orgId:', orgId);
    // const organization = orgId ? { id: orgId } : null;

    const organization = useMemo(() => {
  return orgId ? { id: orgId } : null;
}, [orgId]);

    // Local states
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        branchName: '',
        managerName: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        isEnabled: true
    });

    // Fetch branches on mount or organization change
    useEffect(() => {
        if (!organization) {
            setLoading(false);
            return;
        }
        const fetchBranches = async () => {
            setLoading(true);
            setError('');
            try {
                const branchesRef = ref(db, `atithi-connect/Orgs/${organization.id}/branches`);
                const snapshot = await get(branchesRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const branchList = Object.entries(data).map(([id, val]) => ({
                        id,
                        ...val,
                        createdAt: val.createdAt || 0,
                        createdAtString: val.createdAt ? new Date(val.createdAt).toLocaleString() : ''
                    })).sort((a, b) => b.createdAt - a.createdAt);
                    setBranches(branchList);
                } else {
                    setBranches([]);
                }
            } catch (err) {
                setError('Failed to fetch branches. Please try again later.');
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBranches();
    }, [organization]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

   const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organization) return;

    try {
        const branchesRef = ref(db, `atithi-connect/Orgs/${organization.id}/branches`);
        const newBranchRef = push(branchesRef); // generates new unique key
        const branchId = newBranchRef.key;

        // Save full branch info to org path with orgId included
        const fullBranchData = {
            branchId,
            orgId: organization.id, // <-- Include orgId here
            ...formData,
            createdAt: Date.now(),
        };
        await set(newBranchRef, fullBranchData);

        // Save minimal info to users/{emailKey}
        const emailKey = formData.email.replace(/\./g, '_');
        const userRef = ref(db, `users/${emailKey}`);
        const userData = {
            email: formData.email,
            branchId,
            orgId: organization.id, // <-- Include orgId here as well
            managerName: formData.managerName,
            role: 'Branch'
        };
        await set(userRef, userData);

        // Refresh branch list
        const snapshot = await get(branchesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            const updatedBranches = Object.entries(data).map(([id, val]) => ({
                id,
                ...val,
                createdAt: val.createdAt ? new Date(val.createdAt).toLocaleString() : ''
            })).sort((a, b) => b.createdAt - a.createdAt);
            setBranches(updatedBranches);
        } else {
            setBranches([]);
        }

        // Reset form
        setFormData({
            branchName: '',
            managerName: '',
            email: '',
            phone: '',
            whatsapp: '',
            address: '',
            isEnabled: true
        });
        setShowForm(false);
        setError('');
    } catch (error) {
        console.error('Error adding branch:', error);
        setError('Failed to add branch. Please try again.');
    }
};


    if (!organization) {
        return (
            <div className="empty-state">
                <h3>No organization selected</h3>
                <p>Please go back and select an organization first</p>
                <button
                    className="primary-button"
                    onClick={() => navigate('/organizations')}
                >
                    Back to Organizations
                </button>
            </div>
        );
    }

    return (
        <div className="add-branch-container">
            <div className="header-section">
                <h2 className="page-title">
                    {organization.name} Branches
                </h2>
                <button
                    className={`toggle-button ${showForm ? 'back' : 'add'}`}
                    onClick={() => setShowForm(!showForm)}
                    aria-expanded={showForm}
                >
                    {showForm ? (
                        <>
                            <FiArrowLeft /> Back to List
                        </>
                    ) : (
                        <>
                            <FiPlus /> Add Branch
                        </>
                    )}
                </button>
            </div>

            {showForm ? (
                <form onSubmit={handleSubmit} className="branch-form">
                    <div className="form-group">
                        <label htmlFor="branchName">
                            <FiMapPin className="input-icon" />
                            Branch Name
                        </label>
                        <input
                            id="branchName"
                            type="text"
                            name="branchName"
                            value={formData.branchName}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter branch name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="managerName">
                            <FiUser className="input-icon" />
                            Manager Name
                        </label>
                        <input
                            id="managerName"
                            type="text"
                            name="managerName"
                            value={formData.managerName}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter manager name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">
                            <FiMail className="input-icon" />
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="manager@example.com"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="phone">
                                <FiPhone className="input-icon" />
                                Phone
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                required
                                placeholder="+91 9876543210"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="whatsapp">
                                <FaWhatsapp className="input-icon whatsapp" />
                                WhatsApp
                            </label>
                            <input
                                id="whatsapp"
                                type="tel"
                                name="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleInputChange}
                                placeholder="+91 9876543210"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="address">
                            <FiMapPin className="input-icon" />
                            Address
                        </label>
                        <textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            rows={3}
                            required
                            placeholder="Enter full address"
                        />
                    </div>

                    <div className="form-switch">
                        <label>
                            <Switch
                                checked={formData.isEnabled}
                                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                                color="primary"
                            />
                            <span className={formData.isEnabled ? 'active' : ''}>
                                {formData.isEnabled ? 'Active Branch' : 'Inactive Branch'}
                            </span>
                        </label>
                    </div>

                    <button type="submit" className="submit-button">
                        <FiCheck /> Save Branch
                    </button>
                </form>
            ) : (
                <div className="branches-list">
                    {loading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Loading branches...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <p>{error}</p>
                            <button
                                className="retry-button"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </button>
                        </div>
                    ) : branches.length === 0 ? (
                        <div className="empty-state">
                            <p>No branches found for this organization</p>
                            <button
                                className="primary-button"
                                onClick={() => setShowForm(true)}
                            >
                                <FiPlus /> Add First Branch
                            </button>
                        </div>
                    ) : (
                        <div className="branch-grid">
                            {branches.map(branch => (
                                <div key={branch.id} className="branch-card">
                                    <div className="card-header">
                                        <h3>{branch.branchName}</h3>
                                        <span className={`status-badge ${branch.isEnabled ? 'active' : 'inactive'}`}>
                                            {branch.isEnabled ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div className="card-body">
                                        <div className="detail-row">
                                            <FiUser className="detail-icon" />
                                            <span>{branch.managerName}</span>
                                        </div>

                                        <div className="detail-row">
                                            <FiMail className="detail-icon" />
                                            <span>{branch.email}</span>
                                        </div>

                                        <div className="detail-row">
                                            <FiPhone className="detail-icon" />
                                            <span>{branch.phone}</span>
                                        </div>

                                        {branch.whatsapp && (
                                            <div className="detail-row">
                                                <FaWhatsapp className="detail-icon whatsapp" />
                                                <span>{branch.whatsapp}</span>
                                            </div>
                                        )}

                                        <div className="detail-row">
                                            <FiMapPin className="detail-icon" />
                                            <span className="address">{branch.address}</span>
                                        </div>
                                    </div>

                                    <div className="card-footer">
                                        <span className="created-at">Added: {branch.createdAt}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AddMyBranch;
