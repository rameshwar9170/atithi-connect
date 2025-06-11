import React, { useState, useEffect } from 'react';
import { ref, set, get, push } from 'firebase/database';
import { db } from '../../firebase/config';
import { FaUtensils, FaClipboardList } from 'react-icons/fa';
import './SettingsPage.css';

function SettingsPage() {
  const branchId = localStorage.getItem('branchId');
  const [view, setView] = useState(null); // "table" or "category"

  const [existingTableNumbers, setExistingTableNumbers] = useState([]);
  const [selectedTableNumber, setSelectedTableNumber] = useState('');
  const [totalSeats, setTotalSeats] = useState('');

  const [categoryName, setCategoryName] = useState('');
  const [existingCategories, setExistingCategories] = useState([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing tables
  useEffect(() => {
    if (!branchId) return;
    const tableRef = ref(db, `atithi-connect/Branches/${branchId}/tables`);
    get(tableRef).then(snapshot => {
      if (snapshot.exists()) {
        const tableNums = Object.keys(snapshot.val()).map(num => parseInt(num));
        setExistingTableNumbers(tableNums);
      }
    });

    const categoryRef = ref(db, `atithi-connect/Branches/${branchId}/MenuCategories`);
    get(categoryRef).then(snapshot => {
      if (snapshot.exists()) {
        setExistingCategories(Object.values(snapshot.val()));
      }
    });
  }, [branchId]);

  // Auto-select table number
  useEffect(() => {
    for (let i = 1; i <= 100; i++) {
      if (!existingTableNumbers.includes(i)) {
        setSelectedTableNumber(i.toString());
        break;
      }
    }
  }, [existingTableNumbers]);

  const handleAddTable = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const total = parseInt(totalSeats);

    if (!selectedTableNumber || isNaN(total) || total <= 0) {
      setError('Please provide valid table number and seats.');
      return;
    }

    if (existingTableNumbers.includes(parseInt(selectedTableNumber))) {
      setError(`Table number ${selectedTableNumber} already exists.`);
      return;
    }

    try {
      const tableRef = ref(db, `atithi-connect/Branches/${branchId}/tables/${selectedTableNumber}`);
      await set(tableRef, {
        tableId: selectedTableNumber,
        tableNumber: selectedTableNumber,
        totalSeats: total,
        filledSeats: 0,
        remainingSeats: total,
      });
      setSuccess('✅ Table added successfully!');
      setTotalSeats('');
      setExistingTableNumbers(prev => [...prev, parseInt(selectedTableNumber)]);
    } catch (err) {
      setError('Failed to add table.');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!categoryName.trim()) {
      setError('Please enter a category name.');
      return;
    }

    try {
      const categoryRef = push(ref(db, `atithi-connect/Branches/${branchId}/MenuCategories`));
      await set(categoryRef, {
        categoryId: categoryRef.key,
        name: categoryName.trim(),
        createdAt: Date.now()
      });
      setSuccess('✅ Category added successfully!');
      setCategoryName('');
    } catch (err) {
      setError('Failed to add category.');
    }
  };

  return (
    <div className="settings-container">
      <h2>Branch Settings</h2>
      <p>Manage your branch settings like tables and menu categories</p>

   <div className="settings-buttons">
  <button
    onClick={() => setView('table')}
    className={`settings-option ${view === 'table' ? 'active' : ''}`}
  >
    <FaUtensils style={{ marginRight: '8px' }} />
    Add Table
  </button>
  
  <button
    onClick={() => setView('category')}
    className={`settings-option ${view === 'category' ? 'active' : ''}`}
  >
    <FaClipboardList style={{ marginRight: '8px' }} />
    Add Menu Category
  </button>
</div>

      {view === 'table' && (
        <form className="settings-form" onSubmit={handleAddTable}>
          <div className="form-group">
            <label>Table Number</label>
            <select value={selectedTableNumber} onChange={e => setSelectedTableNumber(e.target.value)} required>
              {[...Array(100)].map((_, i) => {
                const num = i + 1;
                return (
                  <option key={num} value={num} disabled={existingTableNumbers.includes(num)}>
                    {num}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label>Total Seats</label>
            <input
              type="number"
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
              min="1"
              required
            />
          </div>

          <button className="primary-button" type="submit">Add Table</button>
        </form>
      )}

      {view === 'category' && (
        <form className="settings-form" onSubmit={handleAddCategory}>
          <div className="form-group">
            <label>Category Name</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
          </div>
          <button className="primary-button" type="submit">Add Category</button>
        </form>
      )}

      {(success || error) && (
        <p className={success ? 'success-msg' : 'error-msg'}>
          {success || error}
        </p>
      )}
    </div>
  );
}

export default SettingsPage;
