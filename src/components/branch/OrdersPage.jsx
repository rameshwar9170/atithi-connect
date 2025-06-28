import React, { useState, useEffect } from 'react';
import { ref, onValue, set, push, update } from 'firebase/database';
import { db } from '../../firebase/config';
import './OrdersPage.css';


function OrdersPage() {
  const branchId = localStorage.getItem('branchId');
  const [tables, setTables] = useState([]);
  const [tempTables, setTempTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [tableOrders, setTableOrders] = useState({});
  const [total, setTotal] = useState(0);
  const [showBillForm, setShowBillForm] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [tableQuery, setTableQuery] = useState('');


  useEffect(() => {
    if (!branchId) return;

    const branchRef = ref(db, `atithi-connect/Branches/${branchId}`);
    const unsubscribe = onValue(branchRef, snapshot => {
      const data = snapshot.val();
      if (!data) return;

      let tablesData = [];
      if (data.tables) {
        if (Array.isArray(data.tables)) {
          tablesData = data.tables.map((table, index) => {
            if (table && table.tableId) {
              return {
                ...table,
                firebaseIndex: index,
                status: table.status || 'available'
              };
            }
            return null;
          }).filter(Boolean);
        } else {
          tablesData = Object.entries(data.tables).map(([key, table]) => ({
            ...table,
            firebaseKey: key,
            status: table.status || 'available'
          }));
        }
      }

      setTables(tablesData);
      const allMenu = data.Menu ? Object.values(data.Menu).filter(item => item.isAvailable) : [];
      setMenuItems(allMenu);

      setTableOrders(prev => {
        const newOrders = { ...prev };
        tablesData.forEach(table => {
          const tableId = table.tableId;
          if (!newOrders[tableId]) {
            const saved = localStorage.getItem(`orders-${tableId}`);
            newOrders[tableId] = saved ? JSON.parse(saved) : [];
          }
        });
        return newOrders;
      });
    });

    return () => unsubscribe();
  }, [branchId]);

  useEffect(() => {
    const savedTempTables = localStorage.getItem('tempTables');
    if (savedTempTables) {
      const parsedTempTables = JSON.parse(savedTempTables);
      setTempTables(parsedTempTables);
      
      setTableOrders(prev => {
        const newOrders = { ...prev };
        parsedTempTables.forEach(table => {
          const tableId = table.tableId;
          if (!newOrders[tableId]) {
            const saved = localStorage.getItem(`orders-${tableId}`);
            newOrders[tableId] = saved ? JSON.parse(saved) : [];
          }
        });
        return newOrders;
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tempTables', JSON.stringify(tempTables));
  }, [tempTables]);

  useEffect(() => {
    setResults(
      query
        ? menuItems.filter(item =>
          item.itemName.toLowerCase().includes(query.toLowerCase())
        )
        : []
    );
  }, [query, menuItems]);

  useEffect(() => {
    if (selectedTable && tableOrders[selectedTable.tableId]) {
      const tableTotal = tableOrders[selectedTable.tableId].reduce((sum, item) => sum + item.subtotal, 0);
      setTotal(tableTotal);
    } else {
      setTotal(0);
    }
  }, [selectedTable, tableOrders]);

  useEffect(() => {
    if (selectedTable) {
      const tableId = selectedTable.tableId;
      localStorage.setItem(`orders-${tableId}`, JSON.stringify(tableOrders[tableId] || []));
    }
  }, [tableOrders, selectedTable]);

  const createTempTable = (parentTable) => {
    if (!parentTable || parentTable.status !== 'booked') {
      alert('Can only create subtables for booked tables');
      return;
    }

    const baseTableNumber = parentTable.tableNumber;
    const existingSubtables = tempTables.filter(table => 
      table.parentTableNumber === baseTableNumber
    );
    
    const nextLetter = String.fromCharCode(65 + existingSubtables.length);
    const newTableNumber = `${baseTableNumber}${nextLetter}`;
    
    const newTempTable = {
      tableId: `temp-${baseTableNumber}-${nextLetter}`,
      tableNumber: newTableNumber,
      parentTableNumber: baseTableNumber,
      status: 'booked',
      isTemporary: true,
      createdAt: Date.now()
    };

    setTempTables(prev => [...prev, newTempTable]);
    
    setTableOrders(prev => ({
      ...prev,
      [newTempTable.tableId]: []
    }));
  };

  const deleteTempTable = (tempTableId) => {
    const tempTable = tempTables.find(table => table.tableId === tempTableId);
    if (!tempTable) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete temporary table ${tempTable.tableNumber}?` +
      (tableOrders[tempTableId]?.length > 0 ? `\nThis table has orders.` : '')
    );
    if (!confirmDelete) return; // Abort if user clicks Cancel

    setTempTables(prev => prev.filter(table => table.tableId !== tempTableId));

    setTableOrders(prev => {
      const newOrders = { ...prev };
      delete newOrders[tempTableId];
      return newOrders;
    });

    localStorage.removeItem(`orders-${tempTableId}`);

    if (selectedTable?.tableId === tempTableId) {
      setSelectedTable(null);
    }

    
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setQuery('');
    setResults([]);

    const saved = localStorage.getItem(`orders-${table.tableId}`);
    if (saved) {
      setTableOrders(prev => ({
        ...prev,
        [table.tableId]: JSON.parse(saved)
      }));
    }
  };

  const handleAdd = async (item) => {
    if (!selectedTable) {
      alert('Please select a table first');
      return;
    }

    const tableId = selectedTable.tableId;
    const currentOrders = tableOrders[tableId] || [];

    setTableOrders(prev => {
      const updatedOrders = { ...prev };
      const existingItem = currentOrders.find(i => i.menuId === item.menuId);

      if (existingItem) {
        updatedOrders[tableId] = currentOrders.map(i =>
          i.menuId === item.menuId
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.itemPrice }
            : i
        );
      } else {
        updatedOrders[tableId] = [...currentOrders, {
          ...item,
          quantity: 1,
          subtotal: item.itemPrice
        }];
      }

      return updatedOrders;
    });

    if (!selectedTable.isTemporary && selectedTable.status === 'available') {
      await updateTableStatus(selectedTable, 'booked');
    }

    setQuery('');
    setResults([]);
  };

  const updateTableStatus = async (table, status) => {
    try {
      if (!table || !table.tableId || table.isTemporary) return;

      let updatePath = '';
      if (table.firebaseIndex !== undefined) {
        updatePath = `atithi-connect/Branches/${branchId}/tables/${table.firebaseIndex}/status`;
      } else if (table.firebaseKey) {
        updatePath = `atithi-connect/Branches/${branchId}/tables/${table.firebaseKey}/status`;
      }

      const updates = {};
      updates[updatePath] = status;
      await update(ref(db), updates);

      setTables(prev => prev.map(t =>
        t.tableId === table.tableId ? { ...t, status } : t
      ));

      if (selectedTable?.tableId === table.tableId) {
        setSelectedTable(prev => ({ ...prev, status }));
      }
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Failed to update table status');
    }
  };

  const removeItem = async (menuId) => {
    if (!selectedTable) return;
    const tableId = selectedTable.tableId;
    const currentOrders = tableOrders[tableId] || [];
    const remainingItems = currentOrders.filter(item => item.menuId !== menuId);

    setTableOrders(prev => {
      const updatedOrders = { ...prev };
      updatedOrders[tableId] = remainingItems;
      return updatedOrders;
    });

    if (!selectedTable.isTemporary && remainingItems.length === 0 && selectedTable.status === 'booked') {
      await updateTableStatus(selectedTable, 'available');
    }
  };

  const updateQuantity = (menuId, newQuantity) => {
    if (newQuantity < 1 || !selectedTable) return;
    const tableId = selectedTable.tableId;

    setTableOrders(prev => {
      const updatedOrders = { ...prev };
      updatedOrders[tableId] = prev[tableId].map(item =>
        item.menuId === menuId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.itemPrice }
          : item
      );
      return updatedOrders;
    });
  };

  const handleGenerate = () => {
    if (!selectedTable || !tableOrders[selectedTable.tableId]?.length) {
      alert('No items to generate bill for');
      return;
    }
    setShowBillForm(true);
  };

  const handleBillSubmit = async (e) => {
    e.preventDefault();

    if (!customer.name.trim() || !customer.phone.trim()) {
      alert('Please fill in all customer details');
      return;
    }

    try {
      const billRef = ref(db, `atithi-connect/Branches/${branchId}/Bills`);
      const newBill = push(billRef);

      await set(newBill, {
        billId: newBill.key,
        table: selectedTable.tableNumber,
        customer,
        items: tableOrders[selectedTable.tableId],
        total,
        createdAt: Date.now(),
      });

      setTableOrders(prev => ({
        ...prev,
        [selectedTable.tableId]: []
      }));
      localStorage.removeItem(`orders-${selectedTable.tableId}`);

      if (selectedTable.isTemporary) {
        deleteTempTable(selectedTable.tableId);
      } else {
        await updateTableStatus(selectedTable, 'available');
      }

      setCustomer({ name: '', phone: '' });
      setShowBillForm(false);
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Error saving bill. Please try again.');
    }
  };

  const getCurrentOrders = () => {
    return selectedTable ? (tableOrders[selectedTable.tableId] || []) : [];
  };

  const clearTableOrders = async () => {
    if (!selectedTable || !window.confirm('Are you sure you want to clear all orders for this table?')) {
      return;
    }

    setTableOrders(prev => ({
      ...prev,
      [selectedTable.tableId]: []
    }));
    localStorage.removeItem(`orders-${selectedTable.tableId}`);

    if (!selectedTable.isTemporary && selectedTable.status === 'booked') {
      await updateTableStatus(selectedTable, 'available');
    }
  };

  const getAllTables = () => {
    return [...tables, ...tempTables];
  };

  return (
    <div className="orders-page-container">
      <div className="restaurant-tables-section">
        <div className="table-search-container">
  <input
    type="text"
    placeholder="🔍 Search table..."
    value={tableQuery}
    onChange={(e) => setTableQuery(e.target.value)}
    className="table-search-input"
  />
</div>
        <div className="restaurant-tables-grid">
      {getAllTables()
  .filter(table =>
    table.tableNumber?.toLowerCase().includes(tableQuery.toLowerCase())
  )
  .map(table => (
    <div key={table.tableId} className="table-container">
      <div
        className={`restaurant-table-card ${table.status === 'available' ? 'table-available' : 'table-booked'} ${selectedTable?.tableId === table.tableId ? 'table-selected' : ''} ${table.isTemporary ? 'table-temporary' : ''}`}
        onClick={() => handleTableSelect(table)}
      >
        <div className="restaurant-table-number">
          Table {table.tableNumber}
          {table.isTemporary && <span className="temp-indicator"> (Temp)</span>}
        </div>
        <div className="restaurant-table-status">
          {table.status === 'available' ? 'Available' : 'Booked'}
        </div>
      </div>

      {!table.isTemporary && table.status === 'booked' && (
        <button
          className="add-subtable-btn"
          onClick={(e) => {
            e.stopPropagation();
            createTempTable(table);
          }}
          title={`Add subtable for Table ${table.tableNumber}`}
        >
          +
        </button>
      )}

      {table.isTemporary && (
        <button
          className="delete-temp-table-btn"
          onClick={(e) => {
            e.stopPropagation();
            deleteTempTable(table.tableId);
          }}
          title={`Delete temporary table ${table.tableNumber}`}
        >
          ×
        </button>
      )}
    </div>
))}
        </div>
      </div>

      <div className="orders-main-content">
        <div className="selected-table-section">
          <h3 className="selected-table-title">
            {selectedTable ? `Table ${selectedTable.tableNumber}${selectedTable.isTemporary ? ' (Temporary)' : ''}` : 'Select a Table'}
          </h3>
          {selectedTable && (
            <div className="menu-search-container">
              <input
                type="text"
                placeholder="Search menu items..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="menu-search-input"
              />
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="menu-search-results">
            {results.map(item => (
              <div
                key={item.menuId}
                className="menu-search-item"
                onClick={() => handleAdd(item)}
              >
                <span className="menu-search-item-name">{item.itemName}</span>
                <span className="menu-search-item-price">₹{item.itemPrice}</span>
              </div>
            ))}
          </div>
        )}

        <div className="order-items-section">
          {selectedTable ? (
            getCurrentOrders().length > 0 ? (
              <div className="order-items-table">
                <div className="order-table-header">
                  <div className="order-header-item">Item</div>
                  <div className="order Aubrey-header-price">Price</div>
                  <div className="order-header-quantity">Quantity</div>
                  <div className="order-header-total">Total</div>
                  
                  <div className="order-header-action">Action</div>
                </div>
                {getCurrentOrders().map(item => (
                  <div key={item.menuId} className="order-table-row">
                    <div className="order-row-item">{item.itemName}</div>
                    <div className="order-row-price">₹{item.itemPrice}</div>
                    <div className="order-row-quantity">
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn quantity-decrease"
                          onClick={() => updateQuantity(item.menuId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          className="quantity-btn quantity-increase"
                          onClick={() => updateQuantity(item.menuId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="order-row-total">₹{item.subtotal}</div>
                    <div className="order-row-action">
                      <button
                        onClick={() => removeItem(item.menuId)}
                        className="remove-item-btn"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-order-state">
                <div className="empty-order-icon">🍽️</div>
                <p className="empty-order-message">No items added yet. Search and add items from the menu.</p>
              </div>
            )
          ) : (
            <div className="no-table-selected-state">
              <div className="no-table-icon">🏪</div>
              <h3 className="no-table-title">Select a Table</h3>
              <p className="no-table-message">Choose a table from above to start taking orders</p>
            </div>
          )}
        </div>

        {selectedTable && getCurrentOrders().length > 0 && (
          <div className="clear-orders-section">
            <button
              onClick={clearTableOrders}
              className="clear-all-orders-btn"
            >
              Clear All Orders
            </button>
          </div>
        )}
      </div>

      <div className="orders-page-footer">
        <div className="total-amount-display">
          <span className="total-label-text">Total: </span>
          <span className="total-amount-value">₹{total}</span>
        </div>
        <button
          className={`generate-bill-btn ${getCurrentOrders().length === 0 ? 'generate-bill-disabled' : ''}`}
          onClick={handleGenerate}
          disabled={getCurrentOrders().length === 0}
        >
          Generate Bill
        </button>
      </div>

      {showBillForm && (
        <div className="bill-generation-modal">
          <div className="bill-modal-content">
            <h3 className="bill-modal-title">Customer Details</h3>
            <form onSubmit={handleBillSubmit} className="bill-customer-form">
              <div className="bill-form-group">
                <label className="bill-form-label">Customer Name *</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={e => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Enter customer name"
                  className="bill-form-input"
                  required
                />
              </div>
              <div className="bill-form-group">
                <label className="bill-form-label">Phone Number *</label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="bill-form-input-phone"
                  required
                />
              </div>
              <div className="bill-form-group">
                <label className="bill-form-label">Payment Mode *</label>
                <div className="payment-mode-options">
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="Online"
                      checked={customer.paymentMode === 'Online'}
                      onChange={e => setCustomer({ ...customer, paymentMode: e.target.value })}
                      required
                    />
                    Online
                  </label>
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="Offline"
                      checked={customer.paymentMode === 'Offline'}
                      onChange={e => setCustomer({ ...customer, paymentMode: e.target.value })}
                      required
                    />
                    Offline
                  </label>
                </div>
              </div>

              <div className="bill-form-actions">
                <button
                  style={{ marginRight: '150px', float: 'left' }}
                  type="button"
                  className="bill-cancel-btn"
                  onClick={() => setShowBillForm(false)}
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  className="bill-skip-btn"
                  onClick={async () => {
                    try {
                      const billRef = ref(db, `atithi-connect/Branches/${branchId}/Bills`);
                      const newBill = push(billRef);

                      await set(newBill, {
                        billId: newBill.key,
                        table: selectedTable.tableNumber,
                        customer: { name: "NA", phone: "NA", paymentMode: "NA" },
                        items: tableOrders[selectedTable.tableId],
                        total,
                        createdAt: Date.now(),
                      });

                      setTableOrders(prev => ({
                        ...prev,
                        [selectedTable.tableId]: []
                      }));

                      if (selectedTable.isTemporary) {
                        deleteTempTable(selectedTable.tableId);
                      } else {
                        await updateTableStatus(selectedTable, 'available');
                      }

                      setCustomer({ name: '', phone: '' });
                      setShowBillForm(false);
                    } catch (error) {
                      console.error('Error saving bill:', error);
                      alert('Error saving bill. Please try again.');
                    }
                  }}
                >
                  Skip
                </button>
                <button type="submit" className="bill-submit-btn">
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
    </div>
  );
}

export default OrdersPage;