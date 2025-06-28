import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../../firebase/config';
import './InventoryManagement.css';

function InventoryManagement() {
  const branchId = localStorage.getItem('branchId');
  const [activeTab, setActiveTab] = useState('items');
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'housekeeping',
    unit: 'pieces',
    currentStock: '',
    unitPrice: '',
  });
  const [newTransaction, setNewTransaction] = useState({
    type: 'stock-in',
    itemId: '',
    quantity: 0,
    reason: '',
    staff: '',
  });
  const [editItemId, setEditItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!branchId) {
      setError('No branch selected. Please log in.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const itemsRef = ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items`);
    const transactionsRef = ref(db, `atithi-connect/Branches/${branchId}/Inventory/Transactions`);

    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const itemsArray = Object.entries(data).map(([id, item]) => ({
            id,
            ...item,
          }));
          setItems(itemsArray);
        } else {
          setItems([]);
        }
      } catch (err) {
        setError('Failed to fetch items.');
      }
    });

    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const transactionsArray = Object.entries(data).map(([id, transaction]) => ({
            id,
            ...transaction,
          }));
          setTransactions(transactionsArray);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        setError('Failed to fetch transactions.');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeItems();
      unsubscribeTransactions();
    };
  }, [branchId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (
      !newItem.name ||
      newItem.currentStock < 0 ||
      newItem.unitPrice < 0
    ) {
      setError('Please fill in all fields with valid values.');
      return;
    }

    try {
      // Check for existing item by name
      const itemsRef = ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items`);
      const itemQuery = query(itemsRef, orderByChild('name'), equalTo(newItem.name));
      let existingItem = null;

      await new Promise((resolve, reject) => {
        onValue(itemQuery, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const itemArray = Object.entries(data).map(([id, item]) => ({ id, ...item }));
            existingItem = itemArray[0];
          }
          resolve();
        }, { onlyOnce: true }, reject);
      });

      if (existingItem && !editItemId) {
        // Update existing item's stock
        const itemRef = ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items/${existingItem.id}`);
        const updatedStock = Number(existingItem.currentStock) + Number(newItem.currentStock);
        await update(itemRef, {
          currentStock: updatedStock,
          category: newItem.category,
          unit: newItem.unit,
          unitPrice: newItem.unitPrice,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Add new item or update existing
        const itemRef = editItemId
          ? ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items/${editItemId}`)
          : push(itemsRef);
        await set(itemRef, {
          ...newItem,
          createdAt: editItemId ? newItem.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setShowItemModal(false);
      setNewItem({
        name: '',
        category: 'housekeeping',
        unit: 'pieces',
        currentStock: '',
        unitPrice: '',
      });
      setEditItemId(null);
    } catch (err) {
      setError('Failed to save item.');
    }
  };

  const handleEditItem = (item) => {
    setNewItem({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: item.currentStock,
      unitPrice: item.unitPrice,
      createdAt: item.createdAt,
    });
    setEditItemId(item.id);
    setShowItemModal(true);
    setShowDetailsModal(false);
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await remove(ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items/${itemId}`));
      setShowDetailsModal(false);
    } catch (err) {
      setError('Failed to delete item.');
    }
  };

  const handleShowDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (
      !newTransaction.itemId ||
      newTransaction.quantity <= 0 ||
      !newTransaction.reason ||
      !newTransaction.staff
    ) {
      setError('Please fill in all fields with valid values.');
      return;
    }

    try {
      const item = items.find((i) => i.id === newTransaction.itemId);
      if (!item) {
        setError('Selected item not found.');
        return;
      }

      let newStock = item.currentStock;
      if (newTransaction.type === 'stock-in') {
        newStock += Number(newTransaction.quantity);
      } else {
        if (newTransaction.quantity > item.currentStock) {
          setError('Insufficient stock for stock-out.');
          return;
        }
        newStock -= Number(newTransaction.quantity);
      }

      const transactionRef = push(
        ref(db, `atithi-connect/Branches/${branchId}/Inventory/Transactions`)
      );
      const itemRef = ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items/${newTransaction.itemId}`);

      await Promise.all([
        set(transactionRef, {
          ...newTransaction,
          date: new Date().toISOString(),
          itemName: item.name,
        }),
        update(itemRef, { currentStock: newStock }),
      ]);

      setShowTransactionModal(false);
      setNewTransaction({
        type: 'stock-in',
        itemId: '',
        quantity: 0,
        reason: '',
        staff: '',
      });
    } catch (err) {
      setError('Failed to save transaction.');
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(
    (transaction) =>
      (!dateFilter || transaction.date.startsWith(dateFilter)) &&
      (transaction.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exportToCSV = (data, filename) => {
    const headers =
      filename === 'inventory'
        ? ['Item Name', 'Category', 'Unit', 'Current Stock', 'Unit Price', 'Value']
        : ['Date', 'Item Name', 'Type', 'Quantity', 'Reason', 'Staff'];
    const rows = data.map((item) =>
      filename === 'inventory'
        ? [
            item.name,
            item.category,
            item.unit,
            item.currentStock,
            item.unitPrice,
            (item.currentStock * item.unitPrice).toFixed(2),
          ]
        : [
            new Date(item.date).toLocaleString('en-IN'),
            item.itemName,
            item.type,
            item.quantity,
            item.reason,
            item.staff,
          ]
    );

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="inventory-management-container">
      {loading && (
        <div className="inventory-management-loading">
          <div className="inventory-management-spinner"></div>
          Loading...
        </div>
      )}
      {error && <div className="inventory-management-error">{error}</div>}

      <div className="inventory-management-tabs">
        <button
          className={`inventory-management-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
          aria-label="View Items"
        >
          Items
        </button>
        <button
          className={`inventory-management-tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
          aria-label="View Transactions"
        >
          Transactions
        </button>
        <button
          className={`inventory-management-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
          aria-label="View Reports"
        >
          Reports
        </button>
      </div>

      <div className="inventory-management-search-filter">
        <input
          type="text"
          placeholder="Search by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="inventory-management-search"
          aria-label="Search inventory"
        />
        {activeTab === 'transactions' && (
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="inventory-management-date-filter"
            aria-label="Filter by date"
          />
        )}
      </div>

      {activeTab === 'items' && (
        <div className="inventory-management-items-section">
          <button
            onClick={() => setShowItemModal(true)}
            className="inventory-management-add-item-btn"
            aria-label="Add New Item"
          >
            Add New Item
          </button>
          <div className="inventory-management-table-wrapper">
            <table className="inventory-management-items-table">
              <thead>
                <tr className="inventory-management-table-header">
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th>Unit Price</th>
                  <th>Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="inventory-management-table-row"
                    onClick={() => handleShowDetails(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td>{item.currentStock}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.currentStock * item.unitPrice)}</td>
                    <td className="inventory-management-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditItem(item);
                        }}
                        className="inventory-management-edit-btn"
                        aria-label={`Edit ${item.name}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="inventory-management-delete-btn"
                        aria-label={`Delete ${item.name}`}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="inventory-management-transactions-section">
          <button
            onClick={() => setShowTransactionModal(true)}
            className="inventory-management-add-transaction-btn"
            aria-label="Record Transaction"
          >
            Record Transaction
          </button>
          <div className="inventory-management-table-wrapper">
            <table className="inventory-management-transactions-table">
              <thead>
                <tr className="inventory-management-table-header">
                  <th>Date</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="inventory-management-table-row">
                    <td>{formatDateTime(transaction.date)}</td>
                    <td>{transaction.itemName}</td>
                    <td>{transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out'}</td>
                    <td>{transaction.quantity}</td>
                    <td>{transaction.reason}</td>
                    <td>{transaction.staff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="inventory-management-reports-section">
          <h3>Reports</h3>
          <div className="inventory-management-report-actions">
            <button
              onClick={() => exportToCSV(items, 'inventory')}
              className="inventory-management-export-btn"
              aria-label="Export Inventory Report"
            >
              Export Inventory Report
            </button>
            <button
              onClick={() => exportToCSV(transactions, 'transactions')}
              className="inventory-management-export-btn"
              aria-label="Export Transaction Report"
            >
              Export Transaction Report
            </button>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="inventory-management-modal">
          <div className="inventory-management-modal-content">
            <h3>{editItemId ? 'Edit Item' : 'Add New Item'}</h3>
            <form onSubmit={handleAddItem} className="inventory-management-form">
              <div className="inventory-management-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                  aria-required="true"
                />
              </div>
              <div className="inventory-management-form-group">
                <label>Category *</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  required
                  aria-required="true"
                >
                  <option value="housekeeping">Housekeeping</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="front-desk">Front Desk</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="inventory-management-form-group">
                <label>Unit *</label>
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  required
                  aria-required="true"
                >
                  <option value="pieces">Pieces</option>
                  <option value="liters">Liters</option>
                  <option value="kilograms">Kilograms</option>
                  <option value="boxes">Boxes</option>
                </select>
              </div>
              <div className="inventory-management-form-group">
                <label>Current Stock *</label>
                <input
                  type="number"
                  value={newItem.currentStock}
                  onChange={(e) =>
                    setNewItem({ ...newItem, currentStock: Number(e.target.value) })
                  }
                  required
                  aria-required="true"
                />
              </div>
              <div className="inventory-management-form-group">
                <label>Unit Price (₹) *</label>
                <input
                  type="number"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                  step="0.01"
                  required
                  aria-required="true"
                />
              </div>
              <div className="inventory-management-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false);
                    setEditItemId(null);
                    setNewItem({
                      name: '',
                      category: 'housekeeping',
                      unit: 'pieces',
                      currentStock: '',
                      unitPrice: '',
                    });
                  }}
                  className="inventory-management-cancel-btn"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inventory-management-submit-btn"
                  aria-label={editItemId ? 'Save Changes' : 'Add Item'}
                >
                  {editItemId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="inventory-management-modal">
          <div className="inventory-management-modal-content">
            <h3>Record Transaction</h3>
            <form onSubmit={handleAddTransaction} className="inventory-management-form">
              <div className="inventory-management-form-group">
                <label>Type *</label>
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                  required
                  aria-required="true"
                >
                  <option value="stock-in">Stock In</option>
                  <option value="stock-out">Stock Out</option>
                </select>
              </div>
              <div className="inventory-management-form-group">
                <label>Item *</label>
                <select
                  value={newTransaction.itemId}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, itemId: e.target.value })
                  }
                  required
                  aria-required="true"
                >
                  <option value="">Select Item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="inventory-management-form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  value={newTransaction.quantity}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, quantity: Number(e.target.value) })
                  }
                  min="1"
                  required
                  aria-required="true"
                />
              </div>
              <div className="inventory-management-form-group">
                <label>Reason *</label>
                <input
                  type="text"
                  value={newTransaction.reason}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, reason: e.target.value })
                  }
                  required
                  aria-required="true"
                />
              </div>
              <div className="inventory-management-form-group">
                <label>Staff Name *</label>
                <input
                  type="text"
                  value={newTransaction.staff}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, staff: e.target.value })
                  }
                  required
                  aria-required="true"
                />
              </div>
              <div className="inventory-management-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    setNewTransaction({
                      type: 'stock-in',
                      itemId: '',
                      quantity: 0,
                      reason: '',
                      staff: '',
                    });
                  }}
                  className="inventory-management-cancel-btn"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inventory-management-submit-btn"
                  aria-label="Record Transaction"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedItem && (
        <div className="inventory-management-modal">
          <div className="inventory-management-modal-content">
            <h3>Item Details</h3>
            <div className="inventory-management-form">
              <div className="inventory-management-form-group">
                <label>Name</label>
                <p>{selectedItem.name}</p>
              </div>
              <div className="inventory-management-form-group">
                <label>Category</label>
                <p>{selectedItem.category}</p>
              </div>
              <div className="inventory-management-form-group">
                <label>Unit</label>
                <p>{selectedItem.unit}</p>
              </div>
              <div className="inventory-management-form-group">
                <label>Current Stock</label>
                <p>{selectedItem.currentStock}</p>
              </div>
              <div className="inventory-management-form-group">
                <label>Unit Price</label>
                <p>{formatCurrency(selectedItem.unitPrice)}</p>
              </div>
              <div className="inventory-management-form-group">
                <label>Total Value</label>
                <p>{formatCurrency(selectedItem.currentStock * selectedItem.unitPrice)}</p>
              </div>
            </div>
            <div className="inventory-management-form-actions">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="inventory-management-cancel-btn"
                aria-label="Close"
              >
                Close
              </button>
              <button
                onClick={() => handleEditItem(selectedItem)}
                className="inventory-management-edit-btn"
                aria-label={`Edit ${selectedItem.name}`}
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteItem(selectedItem.id)}
                className="inventory-management-delete-btn"
                aria-label={`Delete ${selectedItem.name}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryManagement;