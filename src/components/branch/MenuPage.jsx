import React, { useState, useEffect } from 'react';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { db } from '../../firebase/config';
import { FaEdit, FaTrashAlt, FaSave, FaTimes } from 'react-icons/fa';
import './MenuPage.css';

function MenuPage() {
  const branchId = localStorage.getItem('branchId');
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState({ itemName: '', itemPrice: '', itemCategory: '', isAvailable: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  // Fetch menu items
  useEffect(() => {
    if (!branchId) return;
    const menuRef = ref(db, `atithi-connect/Branches/${branchId}/Menu`);
    onValue(menuRef, snapshot => {
      const data = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, val]) => ({ id, ...val })) : [];
      setMenuItems(data);
    });
  }, [branchId]);

  // Fetch categories
  useEffect(() => {
    if (!branchId) return;
    const categoriesRef = ref(db, `atithi-connect/Branches/${branchId}/MenuCategories`);
    onValue(categoriesRef, snapshot => {
      const data = snapshot.exists() ? Object.values(snapshot.val()).map(cat => cat.name) : [];
      setMenuCategories(data);
    });
  }, [branchId]);

  const handleChange = (e, isEdit) => {
    const { name, value, type, checked } = e.target;
    if (isEdit) {
      setEditData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    const { itemName, itemPrice, itemCategory } = formData;
    if (!itemName || !itemPrice || !itemCategory) return setError('All fields are required.');
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) return setError('Price must be valid.');

    const menuRef = ref(db, `atithi-connect/Branches/${branchId}/Menu`);
    const newMenuRef = push(menuRef);
    const newItem = { menuId: newMenuRef.key, ...formData, itemPrice: price, createdAt: Date.now() };
    try {
      await set(newMenuRef, newItem);
      setFormData({ itemName: '', itemPrice: '', itemCategory: '', isAvailable: true });
      setFormVisible(false);
      setSuccess('Item added successfully!');
    } catch {
      setError('Failed to add item.');
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this item?')) return;
    const itemRef = ref(db, `atithi-connect/Branches/${branchId}/Menu/${id}`);
    remove(itemRef);
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setEditData({ itemName: item.itemName, itemPrice: item.itemPrice, itemCategory: item.itemCategory, isAvailable: item.isAvailable });
  };

  const handleSave = async (id) => {
    const price = parseFloat(editData.itemPrice);
    if (!editData.itemName || !price || !editData.itemCategory) return setError('All fields required.');

    const itemRef = ref(db, `atithi-connect/Branches/${branchId}/Menu/${id}`);
    try {
      await set(itemRef, { ...editData, itemPrice: price, menuId: id, createdAt: Date.now() });
      setEditId(null);
      setError('');
      setSuccess('Item updated successfully!');
    } catch {
      setError('Update failed.');
    }
  };

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h2>Menu Management</h2>
        <button className="add-menu-button" onClick={() => setFormVisible(!formVisible)}>
          {formVisible ? 'Close' : 'Add Menu'}
        </button>
      </div>

      {formVisible && (
        <form className="menu-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Category</label>
            <select name="itemCategory" value={formData.itemCategory} onChange={handleChange} required>
              <option value="" disabled>Select Category</option>
              {menuCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Item Name</label><input name="itemName" value={formData.itemName} onChange={handleChange} required /></div>
          <div className="form-group"><label>Price (₹)</label><input name="itemPrice" type="number" value={formData.itemPrice} onChange={handleChange} required /></div>
          <div className="form-group checkbox-group">
            <label><input name="isAvailable" type="checkbox" checked={formData.isAvailable} onChange={handleChange} /> Available</label>
          </div>
          <button className="primary-button" type="submit">Save Item</button>
          {success && <p className="success-msg">{success}</p>}
          {error && <p className="error-msg">{error}</p>}
        </form>
      )}

      <div className="menu-list">
        {menuItems.length === 0 ? <p className="no-menu">Menu not added yet.</p> : (
          <div className="menu-grid">
            {menuItems.map(item => (
              <div key={item.id} className="menu-card">
                {editId === item.id ? (
                  <>
                    <select name="itemCategory" value={editData.itemCategory} onChange={e => handleChange(e, true)}>
                      {menuCategories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                    </select>
                    <input name="itemName" value={editData.itemName} onChange={e => handleChange(e, true)} />
                    <input name="itemPrice" type="number" value={editData.itemPrice} onChange={e => handleChange(e, true)} />
                    <label><input name="isAvailable" type="checkbox" checked={editData.isAvailable} onChange={e => handleChange(e, true)} /> Available</label>
                    <div className="card-buttons">
                      <FaSave onClick={() => handleSave(item.id)} />
                      <FaTimes onClick={() => setEditId(null)} />
                    </div>
                  </>
                ) : (
                  <>
                    <h4>{item.itemName}</h4>
                    <p>₹{item.itemPrice}</p>
                    <p>Category: {item.itemCategory}</p>
                    <p>{item.isAvailable ? '✅ Available' : '❌ Unavailable'}</p>
                    <div className="card-buttons">
                      <FaEdit onClick={() => handleEdit(item)} />
                      <FaTrashAlt onClick={() => handleDelete(item.id)} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MenuPage;
