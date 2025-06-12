import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebase/config";
import './DetailedReports.css';

function DetailedReport() {
  const { metric = '' } = useParams();
  const branchId = localStorage.getItem("branchId");
  const [detailedReportData, setDetailedReportData] = useState([]);
  const [detailedTopItems, setDetailedTopItems] = useState([]);
  const [detailedRelatedMetric, setDetailedRelatedMetric] = useState(0);
  const [isDetailedLoading, setIsDetailedLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    const billsRef = ref(db, `atithi-connect/Branches/${branchId}/Bills`);
    setIsDetailedLoading(true);

    onValue(billsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allBills = Object.values(data);
        const filteredBills = filterBillsByTimeRange(allBills, selectedFilter);
        processDetailedBills(filteredBills);
      }
      setIsDetailedLoading(false);
    });
  }, [metric, branchId, selectedFilter]);

  const filterBillsByTimeRange = (bills, filter) => {
    const now = new Date();
    return bills.filter((bill) => {
      const billDate = new Date(bill.createdAt);
      switch (filter) {
        case "today":
          return billDate.toDateString() === now.toDateString();
        case "yesterday":
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return billDate.toDateString() === yesterday.toDateString();
        case "thisWeek":
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return billDate >= startOfWeek;
        case "thisMonth":
          return billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
        case "lastMonth":
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return billDate.getMonth() === lastMonth.getMonth() && billDate.getFullYear() === lastMonth.getFullYear();
        case "last3Months":
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return billDate >= threeMonthsAgo;
        case "last6Months":
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return billDate >= sixMonthsAgo;
        case "lastYear":
          const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return billDate >= lastYear;
        default:
          return true;
      }
    });
  };

  const processDetailedBills = (bills) => {
    const groupedByDate = {};
    const itemSales = {};

    bills.forEach((bill) => {
      const date = new Date(bill.createdAt).toLocaleDateString("en-IN");
      groupedByDate[date] = groupedByDate[date] || { revenue: 0, orders: 0, customers: new Set() };

      groupedByDate[date].revenue += bill.total || 0;
      groupedByDate[date].orders += 1;
      if (bill.customer?.phone) groupedByDate[date].customers.add(bill.customer.phone);

      bill.items?.forEach((item) => {
        itemSales[item.itemName] = (itemSales[item.itemName] || 0) + item.quantity;
      });
    });

    const datewiseData = Object.entries(groupedByDate).map(([date, val]) => ({
      date,
      revenue: val.revenue,
      orders: val.orders,
      customers: val.customers.size,
    }));

    const topItems = Object.entries(itemSales)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    setDetailedReportData(datewiseData);
    setDetailedTopItems(topItems);

    const related =
      metric === "revenue"
        ? datewiseData.reduce((acc, d) => acc + d.orders, 0)
        : metric === "orders"
        ? datewiseData.reduce((acc, d) => acc + d.revenue, 0)
        : datewiseData.reduce((acc, d) => acc + d.customers, 0);

    setDetailedRelatedMetric(related);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  if (isDetailedLoading) {
    return <div className="detailed-loading">Loading detailed report...</div>;
  }

  return (
    <div className="detailed-container">
      <h2 className="detailed-header">
        {metric ? metric.charAt(0).toUpperCase() + metric.slice(1) : "Detailed"} Report
      </h2>

      <div className="detailed-filter-container">
        <label htmlFor="dateFilter">Filter by:</label>
        <select
          id="dateFilter"
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
        >
          <option value="all">Total</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="thisWeek">This Week</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="last3Months">Last 3 Months</option>
          <option value="last6Months">Last 6 Months</option>
          <option value="lastYear">Last Year</option>
        </select>
      </div>

      <div className="detailed-stats-container">
        <div className="detailed-stat-card">
          <p className="detailed-stat-label">Total {metric}</p>
          <h2 className="detailed-stat-value">
            {metric === "revenue"
              ? formatCurrency(detailedReportData.reduce((acc, d) => acc + d.revenue, 0))
              : detailedReportData.reduce((acc, d) => acc + d[metric], 0)}
          </h2>
        </div>

        <div className="detailed-stat-card">
          <p className="detailed-stat-label">Related Metric</p>
          <h2 className="detailed-stat-value">
            {metric === "revenue"
              ? detailedRelatedMetric
              : metric === "orders"
              ? formatCurrency(detailedRelatedMetric)
              : detailedRelatedMetric}
          </h2>
        </div>
      </div>

      <div className="detailed-data-card">
        <h3 className="detailed-data-title">Date-wise Breakdown</h3>
        <table className="detailed-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
              <th>Orders</th>
              <th>Customers</th>
            </tr>
          </thead>
          <tbody>
            {detailedReportData.map((entry) => (
              <tr key={entry.date}>
                <td>{entry.date}</td>
                <td>{formatCurrency(entry.revenue)}</td>
                <td>{entry.orders}</td>
                <td>{entry.customers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="detailed-items-card">
        <h3 className="detailed-items-title">Top Selling Items</h3>
        <ul className="detailed-items-list">
          {detailedTopItems.map((item, idx) => (
            <li key={item.name}>
              <span>#{idx + 1}</span> <span>{item.name}</span> <span>- {item.qty} sold</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}   

export default DetailedReport;
