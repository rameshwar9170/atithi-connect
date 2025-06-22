import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebase/config';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import './ReportsPage.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function ReportsPage() {
  const branchId = localStorage.getItem('branchId');
  const [activeTab, setActiveTab] = useState('sales');
  const [bills, setBills] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date()); // Corrected: Initializing useState with new Date()
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Pagination states
  const [currentPageSales, setCurrentPageSales] = useState(1);
  const [currentPageBookings, setCurrentPageBookings] = useState(1);
  const [currentPageInventoryItems, setCurrentPageInventoryItems] = useState(1);
  const [currentPageInventoryTransactions, setCurrentPageInventoryTransactions] = useState(1);
  const [currentPageStaff, setCurrentPageStaff] = useState(1);
  const itemsPerPage = 10; // Number of items to display per page

  useEffect(() => {
    if (!branchId) {
      setError('No branch selected. Please log in.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const refs = [
      { ref: ref(db, `atithi-connect/Branches/${branchId}/Bills`), setter: setBills },
      { ref: ref(db, `atithi-connect/Branches/${branchId}/Bookings`), setter: setBookings },
      { ref: ref(db, `atithi-connect/Branches/${branchId}/Inventory/Items`), setter: (data) => setInventoryItems(data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : []) },
      { ref: ref(db, `atithi-connect/Branches/${branchId}/Inventory/Transactions`), setter: setInventoryTransactions },
      { ref: ref(db, `atithi-connect/Branches/${branchId}/Staff`), setter: setStaff },
    ];

    const unsubscribes = refs.map(({ ref, setter }) =>
      onValue(ref, (snapshot) => {
        const data = snapshot.val();
        setter(data ? Object.values(data) : []);
      })
    );

    setLoading(false);
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [branchId]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString('en-IN', { dateStyle: 'medium' });

  const filterByDate = (data, dateField) =>
    data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });

  const filterBySearch = (data, fields) =>
    data.filter((item) => fields.some((field) => String(item[field] || '').toLowerCase().includes(searchQuery.toLowerCase())));

  const sortData = (data, key, direction) => {
    return [...data].sort((a, b) => {
      // Handle nested properties for sorting (e.g., 'customer.name', 'guests[0].name')
      const getValue = (obj, path) => {
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let value = obj;
        for (const part of parts) {
          if (value === null || value === undefined) return undefined;
          value = value[part];
        }
        return value;
      };

      const aValue = getValue(a, key);
      const bValue = getValue(b, key);

      // Convert to lowercase for string comparison if they are strings
      const aCmp = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
      const bCmp = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

      if (aCmp < bCmp) return direction === 'asc' ? -1 : 1;
      if (aCmp > bCmp) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key, setCurrentPage) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page on sort
  };

  const exportToPDF = (title, headers, rows) => {
    const doc = new jsPDF();
    doc.setFont('Inter', 'normal');
    doc.text(title, 14, 20);
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 30,
      styles: { font: 'Inter', fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const renderPaginationControls = (currentPage, totalItems, setCurrentPage) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    return (
      <div className="reports-page-pagination">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="reports-page-pagination-btn"
          aria-label="Previous Page"
        >
          Previous
        </button>
        <span className='reports-page-pagination-text'>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages || totalItems === 0}
          className="reports-page-pagination-btn"
          aria-label="Next Page"
        >
          Next
        </button>
      </div>
    );
  };

  const salesReport = () => {
    const filteredBills = sortConfig.key
      ? sortData(filterBySearch(filterByDate(bills, 'createdAt'), ['customer.name', 'table', 'items[0].itemName']), sortConfig.key, sortConfig.direction)
      : filterBySearch(filterByDate(bills, 'createdAt'), ['customer.name', 'table', 'items[0].itemName']);

    const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    const paymentModes = filteredBills.reduce((acc, bill) => {
      const mode = bill.customer?.paymentMode || 'NA';
      acc[mode] = (acc[mode] || 0) + bill.total;
      return acc;
    }, {});
    const itemSales = filteredBills.flatMap((bill) =>
      bill.items.map((item) => ({ name: item.itemName, quantity: item.quantity, subtotal: item.subtotal }))
    ).reduce((acc, item) => {
      acc[item.name] = { quantity: (acc[item.name]?.quantity || 0) + item.quantity, subtotal: (acc[item.name]?.subtotal || 0) + item.subtotal };
      return acc;
    }, {});
    // Table sales not used in display, but kept for context if needed for export
    // const tableSales = filteredBills.reduce((acc, bill) => {
    //   acc[bill.table] = (acc[bill.table] || 0) + bill.total;
    //   return acc;
    // }, {});

    const startIndex = (currentPageSales - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBills = filteredBills.slice(startIndex, endIndex);

    const headers = ['Date', 'Customer', 'Table', 'Items', 'Total'];
    const rows = paginatedBills.map((bill) => [
      formatDate(bill.createdAt),
      bill.customer?.name || 'NA',
      bill.table,
      bill.items.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
      formatCurrency(bill.total),
    ]);

    const paymentModeData = {
      labels: Object.keys(paymentModes),
      datasets: [{
        data: Object.values(paymentModes),
        backgroundColor: ['#1e3a8a', '#2dd4bf', '#6b7280', '#f59e0b'],
        hoverOffset: 20,
      }],
    };

    return (
      <div className="reports-page-report-section">
        <h3>Sales Report</h3>
        <div className="reports-page-summary">
          <div className="reports-page-card">
            <h4>Total Revenue</h4>
            <p>{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="reports-page-card">
            <h4>Payment Modes</h4>
            <div className="reports-page-chart">
              <Pie data={paymentModeData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
          <div className="reports-page-card">
            <h4>Top 5 Item Sales</h4>
            <ul>
              {Object.entries(itemSales).sort(([, a], [, b]) => b.subtotal - a.subtotal).slice(0, 5).map(([name, { quantity, subtotal }]) => (
                <li key={name}>{name}: {quantity} units, {formatCurrency(subtotal)}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="reports-page-actions">
          <button onClick={() => exportToPDF('Sales Report', headers, filteredBills.map((bill) => [
            formatDate(bill.createdAt),
            bill.customer?.name || 'NA',
            bill.table,
            bill.items.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
            formatCurrency(bill.total),
          ]))} className="reports-page-export-btn" aria-label="Export Sales to PDF">Export to PDF</button>
          <button
            onClick={() => exportToExcel(filteredBills.map((bill) => ({
              Date: formatDate(bill.createdAt),
              Customer: bill.customer?.name || 'NA',
              Table: bill.table,
              Items: bill.items.map((item) => `${item.itemName} x${item.quantity}`).join(', '),
              Total: bill.total,
            })), 'Sales_Report')}
            className="reports-page-export-btn"
            aria-label="Export Sales to Excel"
          >
            Export to Excel
          </button>
        </div>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {headers.map((header) => (
              <div key={header} onClick={() => handleSort(header.toLowerCase() === 'customer' ? 'customer.name' : header.toLowerCase() === 'items' ? 'items[0].itemName' : header.toLowerCase() === 'total' ? 'total' : header.toLowerCase(), setCurrentPageSales)} className="reports-page-table-header-cell" role="button" tabIndex={0} aria-label={`Sort by ${header}`}>
                {header} {sortConfig.key === (header.toLowerCase() === 'customer' ? 'customer.name' : header.toLowerCase() === 'items' ? 'items[0].itemName' : header.toLowerCase() === 'total' ? 'total' : header.toLowerCase()) && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
            ))}
          </div>
          {rows.length ? rows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i} className="reports-page-table-cell">{cell}</div>)}
            </div>
          )) : <div className="reports-page-no-data">No data available</div>}
        </div>
        {renderPaginationControls(currentPageSales, filteredBills.length, setCurrentPageSales)}
      </div>
    );
  };

  const bookingsReport = () => {
    const filteredBookings = sortConfig.key
      ? sortData(filterBySearch(filterByDate(bookings, 'createdAt'), ['guests[0].name', 'roomNumber']), sortConfig.key, sortConfig.direction)
      : filterBySearch(filterByDate(bookings, 'createdAt'), ['guests[0].name', 'roomNumber']);

    const totalRevenue = filteredBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const roomTypes = filteredBookings.reduce((acc, booking) => {
      acc[booking.roomType] = (acc[booking.roomType] || 0) + booking.totalAmount;
      return acc;
    }, {});
    const occupancy = filteredBookings.length;

    const startIndex = (currentPageBookings - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

    const headers = ['Check-In', 'Check-Out', 'Room', 'Guest', 'Total'];
    const rows = paginatedBookings.map((booking) => [
      booking.checkIn,
      booking.checkOut,
      booking.roomNumber,
      booking.guests[0]?.name || 'NA',
      formatCurrency(booking.totalAmount),
    ]);

    const roomTypeData = {
      labels: Object.keys(roomTypes),
      datasets: [{
        label: 'Revenue by Room Type',
        data: Object.values(roomTypes),
        backgroundColor: '#2dd4bf',
        borderColor: '#1e3a8a',
        borderWidth: 1,
      }],
    };

    return (
      <div className="reports-page-report-section">
        <h3>Bookings Report</h3>
        <div className="reports-page-summary">
          <div className="reports-page-card">
            <h4>Total Revenue</h4>
            <p>{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="reports-page-card">
            <h4>Total Bookings</h4>
            <p>{occupancy}</p>
          </div>
          <div className="reports-page-card">
            <h4>Revenue by Room Type</h4>
            <div className="reports-page-chart">
              <Bar data={roomTypeData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>
        <div className="reports-page-actions">
          <button onClick={() => exportToPDF('Bookings Report', headers, filteredBookings.map((booking) => [
            booking.checkIn,
            booking.checkOut,
            booking.roomNumber,
            booking.guests[0]?.name || 'NA',
            formatCurrency(booking.totalAmount),
          ]))} className="reports-page-export-btn" aria-label="Export Bookings to PDF">Export to PDF</button>
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
        </div>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {headers.map((header) => (
              <div key={header} onClick={() => handleSort(header.toLowerCase() === 'guest' ? 'guests[0].name' : header.toLowerCase() === 'room' ? 'roomNumber' : header.toLowerCase() === 'total' ? 'totalAmount' : header.toLowerCase(), setCurrentPageBookings)} className="reports-page-table-header-cell" role="button" tabIndex={0} aria-label={`Sort by ${header}`}>
                {header} {sortConfig.key === (header.toLowerCase() === 'guest' ? 'guests[0].name' : header.toLowerCase() === 'room' ? 'roomNumber' : header.toLowerCase() === 'total' ? 'totalAmount' : header.toLowerCase()) && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
            ))}
          </div>
          {rows.length ? rows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i} className="reports-page-table-cell">{cell}</div>)}
            </div>
          )) : <div className="reports-page-no-data">No data available</div>}
        </div>
        {renderPaginationControls(currentPageBookings, filteredBookings.length, setCurrentPageBookings)}
      </div>
    );
  };

  const inventoryReport = () => {
    const filteredItems = sortConfig.key
      ? sortData(filterBySearch(inventoryItems, ['name', 'category']), sortConfig.key, sortConfig.direction)
      : filterBySearch(inventoryItems, ['name', 'category']);
    const filteredTransactions = sortConfig.key
      ? sortData(filterBySearch(filterByDate(inventoryTransactions, 'date'), ['itemName', 'type', 'reason', 'staff']), sortConfig.key, sortConfig.direction)
      : filterBySearch(filterByDate(inventoryTransactions, 'date'), ['itemName', 'type', 'reason', 'staff']);
    const lowStock = filteredItems.filter((item) => item.currentStock <= item.minStock);

    const startIndexItems = (currentPageInventoryItems - 1) * itemsPerPage;
    const endIndexItems = startIndexItems + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndexItems, endIndexItems);

    const startIndexTransactions = (currentPageInventoryTransactions - 1) * itemsPerPage;
    const endIndexTransactions = startIndexTransactions + itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndexTransactions, endIndexTransactions);

    const itemHeaders = ['Name', 'Category', 'Stock', 'Min Stock', 'Unit Price', 'Value'];
    const itemRows = paginatedItems.map((item) => [
      item.name,
      item.category,
      item.currentStock,
      item.minStock,
      formatCurrency(item.unitPrice),
      formatCurrency(item.currentStock * item.unitPrice),
    ]);

    const transactionHeaders = ['Date', 'Item', 'Type', 'Quantity', 'Reason', 'Staff'];
    const transactionRows = paginatedTransactions.map((transaction) => [
      formatDate(transaction.date),
      transaction.itemName,
      transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out',
      transaction.quantity,
      transaction.reason,
      transaction.staff,
    ]);

    const lowStockData = {
      labels: lowStock.map((item) => item.name),
      datasets: [{
        label: 'Stock Level',
        data: lowStock.map((item) => item.currentStock),
        backgroundColor: '#b91c1c',
        borderColor: '#1e3a8a',
        borderWidth: 1,
      }],
    };

    return (
      <div className="reports-page-report-section">
        <h3>Inventory Report</h3>
        <div className="reports-page-summary">
          <div className="reports-page-card">
            <h4>Low Stock Alerts</h4>
            <p>{lowStock.length} items below minimum stock</p>
          </div>
          <div className="reports-page-card">
            <h4>Low Stock Items</h4>
            <div className="reports-page-chart">
              <Bar data={lowStockData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>
        <div className="reports-page-actions">
          <button onClick={() => exportToPDF('Inventory Items Report', itemHeaders, filteredItems.map((item) => [
            item.name,
            item.category,
            item.currentStock,
            item.minStock,
            formatCurrency(item.unitPrice),
            formatCurrency(item.currentStock * item.unitPrice),
          ]))} className="reports-page-export-btn" aria-label="Export Inventory Items to PDF">Export Items to PDF</button>
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
        </div>
        <h4>Current Stock</h4>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {itemHeaders.map((header) => (
              <div key={header} onClick={() => handleSort(header.toLowerCase() === 'min stock' ? 'minStock' : header.toLowerCase() === 'unit price' ? 'unitPrice' : header.toLowerCase() === 'value' ? 'currentStock' : header.toLowerCase(), setCurrentPageInventoryItems)} className="reports-page-table-header-cell" role="button" tabIndex={0} aria-label={`Sort by ${header}`}>
                {header} {sortConfig.key === (header.toLowerCase() === 'min stock' ? 'minStock' : header.toLowerCase() === 'unit price' ? 'unitPrice' : header.toLowerCase() === 'value' ? 'currentStock' : header.toLowerCase()) && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
            ))}
          </div>
          {itemRows.length ? itemRows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i} className="reports-page-table-cell">{cell}</div>)}
            </div>
          )) : <div className="reports-page-no-data">No data available</div>}
        </div>
        {renderPaginationControls(currentPageInventoryItems, filteredItems.length, setCurrentPageInventoryItems)}

        <h4>Transaction History</h4>
        <div className="reports-page-actions">
          <button onClick={() => exportToPDF('Inventory Transactions Report', transactionHeaders, filteredTransactions.map((transaction) => [
            formatDate(transaction.date),
            transaction.itemName,
            transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out',
            transaction.quantity,
            transaction.reason,
            transaction.staff,
          ]))} className="reports-page-export-btn" aria-label="Export Inventory Transactions to PDF">Export Transactions to PDF</button>
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
        </div>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {transactionHeaders.map((header) => (
              <div key={header} onClick={() => handleSort(header.toLowerCase() === 'item' ? 'itemName' : header.toLowerCase() === 'type' ? 'type' : header.toLowerCase() === 'quantity' ? 'quantity' : header.toLowerCase() === 'reason' ? 'reason' : header.toLowerCase() === 'staff' ? 'staff' : header.toLowerCase(), setCurrentPageInventoryTransactions)} className="reports-page-table-header-cell" role="button" tabIndex={0} aria-label={`Sort by ${header}`}>
                {header} {sortConfig.key === (header.toLowerCase() === 'item' ? 'itemName' : header.toLowerCase() === 'type' ? 'type' : header.toLowerCase() === 'quantity' ? 'quantity' : header.toLowerCase() === 'reason' ? 'reason' : header.toLowerCase() === 'staff' ? 'staff' : header.toLowerCase()) && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
            ))}
          </div>
          {transactionRows.length ? transactionRows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i} className="reports-page-table-cell">{cell}</div>)}
            </div>
          )) : <div className="reports-page-no-data">No data available</div>}
        </div>
        {renderPaginationControls(currentPageInventoryTransactions, filteredTransactions.length, setCurrentPageInventoryTransactions)}
      </div>
    );
  };

  const staffReport = () => {
    const filteredTransactions = sortConfig.key
      ? sortData(filterBySearch(filterByDate(inventoryTransactions, 'date'), ['staff']), sortConfig.key, sortConfig.direction)
      : filterBySearch(filterByDate(inventoryTransactions, 'date'), ['staff']);
    const staffActivity = filteredTransactions.reduce((acc, transaction) => {
      acc[transaction.staff] = (acc[transaction.staff] || 0) + 1;
      return acc;
    }, {});

    // Create a temporary array of staff data including transaction count for sorting
    const staffWithActivity = staff.map(s => ({
      ...s,
      transactionsHandled: staffActivity[s.name] || 0
    }));

    const sortedStaff = sortConfig.key
      ? sortData(staffWithActivity, sortConfig.key, sortConfig.direction)
      : staffWithActivity;


    const startIndex = (currentPageStaff - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStaff = sortedStaff.slice(startIndex, endIndex);

    const headers = ['Name', 'Designation', 'Salary', 'Transactions Handled'];
    const rows = paginatedStaff.map((s) => [
      s.name,
      s.designation,
      formatCurrency(Number(s.salary)),
      s.transactionsHandled, // Use the calculated transactionsHandled
    ]);

    const staffActivityData = {
      labels: Object.keys(staffActivity),
      datasets: [{
        label: 'Transactions Handled',
        data: Object.values(staffActivity),
        backgroundColor: '#2dd4bf',
        borderColor: '#1e3a8a',
        borderWidth: 1,
      }],
    };

    return (
      <div className="reports-page-report-section">
        <h3>Staff Report</h3>
        <div className="reports-page-summary">
          <div className="reports-page-card">
            <h4>Total Staff</h4>
            <p>{staff.length}</p>
          </div>
          <div className="reports-page-card">
            <h4>Staff Activity</h4>
            <div className="reports-page-chart">
              <Bar data={staffActivityData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>
        <div className="reports-page-actions">
          <button onClick={() => exportToPDF('Staff Report', headers, staffWithActivity.map((s) => [
            s.name,
            s.designation,
            formatCurrency(Number(s.salary)),
            s.transactionsHandled,
          ]))} className="reports-page-export-btn" aria-label="Export Staff to PDF">Export to PDF</button>
          <button
            onClick={() => exportToExcel(staffWithActivity.map((s) => ({
              Name: s.name,
              Designation: s.designation,
              Salary: Number(s.salary),
              'Transactions Handled': s.transactionsHandled,
            })), 'Staff_Report')}
            className="reports-page-export-btn"
            aria-label="Export Staff to Excel"
          >
            Export to Excel
          </button>
        </div>
        <div className="reports-page-table">
          <div className="reports-page-table-header">
            {headers.map((header) => (
              <div key={header} onClick={() => handleSort(header.toLowerCase() === 'transactions handled' ? 'transactionsHandled' : header.toLowerCase() === 'salary' ? 'salary' : header.toLowerCase(), setCurrentPageStaff)} className="reports-page-table-header-cell" role="button" tabIndex={0} aria-label={`Sort by ${header}`}>
                {header} {sortConfig.key === (header.toLowerCase() === 'transactions handled' ? 'transactionsHandled' : header.toLowerCase() === 'salary' ? 'salary' : header.toLowerCase()) && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
            ))}
          </div>
          {rows.length ? rows.map((row, index) => (
            <div key={index} className="reports-page-table-row">
              {row.map((cell, i) => <div key={i} className="reports-page-table-cell">{cell}</div>)}
            </div>
          )) : <div className="reports-page-no-data">No data available</div>}
        </div>
        {renderPaginationControls(currentPageStaff, staff.length, setCurrentPageStaff)}
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
      {/* <h2 className="reports-page-title">Reports Dashboard</h2> */}
      <div className="reports-page-tabs">
        {['sales', 'bookings', 'inventory', 'staff'].map((tab) => (
          <button
            key={tab}
            className={`reports-page-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setSortConfig({ key: null, direction: 'asc' });
              // Reset all pagination when changing tabs
              setCurrentPageSales(1);
              setCurrentPageBookings(1);
              setCurrentPageInventoryItems(1);
              setCurrentPageInventoryTransactions(1);
              setCurrentPageStaff(1);
            }}
            aria-label={`View ${tab.charAt(0).toUpperCase() + tab.slice(1)} Report`}
            aria-current={activeTab === tab ? 'true' : 'false'}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="reports-page-filters">
        <div className="reports-page-date-picker">
          <label htmlFor="start-date">Start Date</label>
          <DatePicker
            id="start-date"
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            className="reports-page-date-input"
            aria-label="Select Start Date"
          />
        </div>
        <div className="reports-page-date-picker">
          <label htmlFor="end-date">End Date</label>
          <DatePicker
            id="end-date"
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            className="reports-page-date-input"
            aria-label="Select End Date"
          />
        </div>
      
      </div>
      {activeTab === 'sales' && salesReport()}
      {activeTab === 'bookings' && bookingsReport()}
      {activeTab === 'inventory' && inventoryReport()}
      {activeTab === 'staff' && staffReport()}
    </div>
  );
}

export default ReportsPage;