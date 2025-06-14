import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase/config';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './ReportsPage.css';

function ReportsPage() {
  const branchId = localStorage.getItem('branchId');
  const [activeTab, setActiveTab] = useState('sales');
  const [bills, setBills] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!branchId) {
      setError('No branch selected. Please log in.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const billsRef = ref(db, `atithi-connect/Branches/${branchId}/Bills`);
    const bookingsRef = ref(db, `atithi-connect/Branches/${branchId}/Bookings`);
    const inventoryItemsRef = ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items`);
    const inventoryTransactionsRef = ref(db, `atithi-connect/Branches/${branchId}/Inventory/Transactions`);
    const staffRef = ref(db, `atithi-connect/Branches/${branchId}/Staff`);

    const unsubscribeBills = onValue(billsRef, (snapshot) => {
      const data = snapshot.val();
      setBills(data ? Object.values(data) : []);
    });

    const unsubscribeBookings = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      setBookings(data ? Object.values(data) : []);
    });

    const unsubscribeInventoryItems = onValue(inventoryItemsRef, (snapshot) => {
      const data = snapshot.val();
      setInventoryItems(data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []);
    });

    const unsubscribeInventoryTransactions = onValue(inventoryTransactionsRef, (snapshot) => {
      const data = snapshot.val();
      setInventoryTransactions(data ? Object.values(data) : []);
    });

    const unsubscribeStaff = onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      setStaff(data ? Object.values(data) : []);
      setLoading(false);
    });

    return () => {
      unsubscribeBills();
      unsubscribeBookings();
      unsubscribeInventoryItems();
      unsubscribeInventoryTransactions();
      unsubscribeStaff();
    };
  }, [branchId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  };

  const filterByDate = (data, dateField) => {
    return data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filterBySearch = (data, fields) => {
    return data.filter((item) =>
      fields.some((field) =>
        String(item[field] || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };

  const exportToPDF = (title, headers, rows) => {
    const doc = new jsPDF();
    doc.text(title, 14, 20);
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 30,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.write(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const salesReport = () => {
    const filteredBills = filterBySearch(filterByDate(bills, 'createdAt'), ['customer.name']);
    const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const paymentModes = filteredBills.reduce((acc, bill) => {
      const mode = bill.customer.paymentMode || 'NA';
      acc[mode] = (acc[mode] || 0) + bill.total;
      return acc;
    }, {});
    const itemSales = filteredBills.flatMap((bill) =>
      bill.items.map((item) => ({ name: item.itemName, quantity: item.quantity, subtotal: item.subtotal }))
    ).reduce((acc, item) => {
      acc[item.name] = {
        quantity: (acc[item.name]?.quantity || 0) + item.quantity,
        subtotal: (acc[item.name]?.subtotal || 0) + item.subtotal,
      };
      return acc;
    }, {});
    const tableSales = filteredBills.reduce((acc, bill) => {
      acc[bill.table] = (acc[bill.table] || 0) + bill.total;
      return acc;
    }, {});

    const headers = ['Date', 'Customer', 'Table', 'Items', 'Total'];
    const rows = filteredBills.map((bill) => [
      formatDate(bill.createdAt),
      bill.customer.name,
      bill.table,
      bill.items.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
      formatCurrency(bill.total),
    ]);

    return (
      <div className="reports-page-report-section">
        <h3>Sales Report</h3>
        <p>Total Revenue: {formatCurrency(totalRevenue)}</p>
        <h4>Payment Modes</h4>
        <ul>
          {Object.entries(paymentModes).map(([mode, amount]) => (
            <li key={mode}>{mode}: {formatCurrency(amount)}</li>
          ))}
        </ul>
        <h4>Item Sales</h4>
        <ul>
          {Object.entries(itemSales).map(([name, { quantity, subtotal }]) => (
            <li key={name}>{name}: {quantity} units, {formatCurrency(subtotal)}</li>
          ))}
        </ul>
        <h4>Table Sales</h4>
        <ul>
          {Object.entries(tableSales).map(([table, amount]) => (
            <li key={table}>Table {table}: {formatCurrency(amount)}</li>
          ))}
        </ul>
        <button
          onClick={() => exportToPDF('Sales Report', headers, rows)}
          className="reports-page-export-btn"
          aria-label="Export Sales to PDF"
        >
          Export to PDF
        </button>
        <button
          onClick={() => exportToExcel(filteredBills.map((bill) => ({
            Date: formatDate(bill.createdAt),
            Customer: bill.customer.name,
            Table: bill.table,
            Items: bill.items.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
            Total: bill.total,
          })), 'Sales_Report')}
          className="reports-page-export-btn"
          aria-label="Export Sales to Excel"
        >
          Export to Excel
        </button>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {headers.map((header) => <div key={header}>{header}</div>)}
          </div>
          {rows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i}>{cell}</div>)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const bookingsReport = () => {
    const filteredBookings = filterBySearch(filterByDate(bookings, 'createdAt'), ['guests[0].name']);
    const totalRevenue = filteredBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const roomTypes = filteredBookings.reduce((acc, booking) => {
      acc[booking.roomType] = (acc[booking.roomType] || 0) + booking.totalAmount;
      return acc;
    }, {});
    const occupancy = filteredBookings.length;

    const headers = ['Check-In', 'Check-Out', 'Room', 'Guest', 'Total'];
    const rows = filteredBookings.map((booking) => [
      booking.checkIn,
      booking.checkOut,
      booking.roomNumber,
      booking.guests[0]?.name || 'NA',
      formatCurrency(booking.totalAmount),
    ]);

    return (
      <div className="reports-page-report-section">
        <h3>Bookings Report</h3>
        <p>Total Revenue: {formatCurrency(totalRevenue)}</p>
        <p>Total Bookings: {occupancy}</p>
        <h4>Revenue by Room Type</h4>
        <ul>
          {Object.entries(roomTypes).map(([type, amount]) => (
            <li key={type}>{type}: {formatCurrency(amount)}</li>
          ))}
        </ul>
        <button
          onClick={() => exportToPDF('Bookings Report', headers, rows)}
          className="reports-page-export-btn"
          aria-label="Export Bookings to PDF"
        >
          Export to PDF
        </button>
        <button
          onClick={() => exportToExcel(filteredBookings.map((booking) => ({
            'Check-In': booking.checkIn,
            'Check-Out': booking.checkOut,
            Room: booking.roomNumber,
            Guest: booking.guests[0]?.name || 'NA',
            Total: booking.totalAmount,
          })), 'Bookings_Report')}
          className="reports-page-export-btn"
          aria-label="Export Bookings to Excel"
        >
          Export to Excel
        </button>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {headers.map((header) => <div key={header}>{header}</div>)}
          </div>
          {rows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i}>{cell}</div>)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const inventoryReport = () => {
    const filteredItems = filterBySearch(inventoryItems, ['name']);
    const filteredTransactions = filterBySearch(filterByDate(inventoryTransactions, 'date'), ['itemName']);
    const lowStock = filteredItems.filter((item) => item.currentStock <= item.minStock);

    const itemHeaders = ['Name', 'Category', 'Stock', 'Min Stock', 'Unit Price', 'Value'];
    const itemRows = filteredItems.map((item) => [
      item.name,
      item.category,
      item.currentStock,
      item.minStock,
      formatCurrency(item.unitPrice),
      formatCurrency(item.currentStock * item.unitPrice),
    ]);

    const transactionHeaders = ['Date', 'Item', 'Type', 'Quantity', 'Reason', 'Staff'];
    const transactionRows = filteredTransactions.map((transaction) => [
      formatDate(transaction.date),
      transaction.itemName,
      transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out',
      transaction.quantity,
      transaction.reason,
      transaction.staff,
    ]);

    return (
      <div className="reports-page-report-section">
        <h3>Inventory Report</h3>
        <h4>Low Stock Alerts</h4>
        <ul>
          {lowStock.map((item) => (
            <li key={item.id}>{item.name}: {item.currentStock} (Min: {item.minStock})</li>
          ))}
        </ul>
        <h4>Current Stock</h4>
        <button
          onClick={() => exportToPDF('Inventory Items Report', itemHeaders, itemRows)}
          className="reports-page-export-btn"
          aria-label="Export Inventory Items to PDF"
        >
          Export Items to PDF
        </button>
        <button
          onClick={() => exportToExcel(filteredItems.map((item) => ({
            Name: item.name,
            Category: item.category,
            Stock: item.currentStock,
            'Min Stock': item.minStock,
            'Unit Price': item.unitPrice,
            Value: item.currentStock * item.unitPrice,
          })), 'Inventory_Items_Report')}
          className="reports-page-export-btn"
          aria-label="Export Inventory Items to Excel"
        >
          Export Items to Excel
        </button>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {itemHeaders.map((header) => <div key={header}>{header}</div>)}
          </div>
          {itemRows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i}>{cell}</div>)}
            </div>
          ))}
        </div>
        <h4>Transaction History</h4>
        <button
          onClick={() => exportToPDF('Inventory Transactions Report', transactionHeaders, transactionRows)}
          className="reports-page-export-btn"
          aria-label="Export Inventory Transactions to PDF"
        >
          Export Transactions to PDF
        </button>
        <button
          onClick={() => exportToExcel(filteredTransactions.map((transaction) => ({
            Date: formatDate(transaction.date),
            Item: transaction.itemName,
            Type: transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out',
            Quantity: transaction.quantity,
            Reason: transaction.reason,
            Staff: transaction.staff,
          })), 'Inventory_Transactions_Report')}
          className="reports-page-export-btn"
          aria-label="Export Inventory Transactions to Excel"
        >
          Export Transactions to Excel
        </button>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {transactionHeaders.map((header) => <div key={header}>{header}</div>)}
          </div>
          {transactionRows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i}>{cell}</div>)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const staffReport = () => {
    const filteredTransactions = filterBySearch(filterByDate(inventoryTransactions, 'date'), ['staff']);
    const staffActivity = filteredTransactions.reduce((acc, transaction) => {
      acc[transaction.staff] = (acc[transaction.staff] || 0) + 1;
      return acc;
    }, {});

    const headers = ['Name', 'Designation', 'Salary', 'Transactions Handled'];
    const rows = staff.map((s) => [
      s.name,
      s.designation,
      formatCurrency(Number(s.salary)),
      staffActivity[s.name] || 0,
    ]);

    return (
      <div className="reports-page-report-section">
        <h3>Staff Report</h3>
        <button
          onClick={() => exportToPDF('Staff Report', headers, rows)}
          className="reports-page-export-btn"
          aria-label="Export Staff to PDF"
        >
          Export to PDF
        </button>
        <button
          onClick={() => exportToExcel(staff.map((s) => ({
            Name: s.name,
            Designation: s.designation,
            Salary: Number(s.salary),
            'Transactions Handled': staffActivity[s.name] || 0,
          })), 'Staff_Report')}
          className="reports-page-export-btn"
          aria-label="Export Staff to Excel"
        >
          Export to Excel
        </button>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {headers.map((header) => <div key={header}>{header}</div>)}
          </div>
          {rows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i}>{cell}</div>)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="reports-page-container">
      {loading && (
        <div className="reports-page-loading">
          <div className="reports-page-spinner"></div>
          Loading...
        </div>
      )}
      {error && <div className="reports-page-error">{error}</div>}

      <h2 className="reports-page-title">Reports</h2>

      <div className="reports-page-tabs">
        <button
          className={`reports-page-tab ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
          aria-label="View Sales Report"
        >
          Sales
        </button>
        <button
          className={`reports-page-tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
          aria-label="View Bookings Report"
        >
          Bookings
        </button>
        <button
          className={`reports-page-tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
          aria-label="View Inventory Report"
        >
          Inventory
        </button>
        <button
          className={`reports-page-tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
          aria-label="View Staff Report"
        >
          Staff
        </button>
      </div>

      <div className="reports-page-filters">
        <div className="reports-page-date-picker">
          <label>Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            className="reports-page-date-input"
            aria-label="Select Start Date"
          />
        </div>
        <div className="reports-page-date-picker">
          <label>End Date</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            className="reports-page-date-input"
            aria-label="Select End Date"
          />
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="reports-page-search"
          aria-label="Search reports"
        />
      </div>

      {activeTab === 'sales' && salesReport()}
      {activeTab === 'bookings' && bookingsReport()}
      {activeTab === 'inventory' && inventoryReport()}
      {activeTab === 'staff' && staffReport()}
    </div>
  );
}

export default ReportsPage;