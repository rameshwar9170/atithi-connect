import React, { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    XAxis,
    YAxis
} from "recharts";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebase/config";
import "./PaymentReports.css";
import { useNavigate } from 'react-router-dom';

function PaymentReports() {
    const navigate = useNavigate();
    const branchId = localStorage.getItem("branchId");
    const [dailyData, setDailyData] = useState([]);
    const [revenueByTable, setRevenueByTable] = useState([]);
    const [paymentModeData, setPaymentModeData] = useState([]);
    const [topCustomers, setTopCustomers] = useState([]);
    const [totalStats, setTotalStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        averageBillValue: 0,
        totalCustomers: 0,
        topItem: { name: "N/A", quantity: 0 },
        mostOrderedTable: { name: "N/A", orderCount: 0 }
    });

    useEffect(() => {
        const billsRef = ref(db, `atithi-connect/Branches/${branchId}/Bills`);
        onValue(billsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                processData(data);
            }
        });
    }, [branchId]);

const processData = (data) => {
    const bills = Object.values(data);
    const daily = {};
    const tableRevenue = {};
    const paymentModes = { Cash: 0, Online: 0, "Not Specified": 0 };
    const customerSpending = {};
    const itemQuantities = {};
    const tableOrders = {};
    let totalRevenue = 0;
    let totalOrders = 0;

    // Get current date in local timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfToday = today.getTime();
    const endOfToday = startOfToday + 86400000; // 24 hours later
    const startOf7DaysAgo = startOfToday - (6 * 86400000);

    // Process all bills for 7-day trend (last 7 days including today)
    const last7DaysBills = bills.filter(bill => 
        bill.createdAt >= startOf7DaysAgo && bill.createdAt < endOfToday
    );
    
    // Process only today's bills for other stats
    const todaysBills = bills.filter(bill => 
        bill.createdAt >= startOfToday && bill.createdAt < endOfToday
    );

    // Build 7-day trend data (ensure all 7 days exist even if empty)
    for (let i = 0; i < 7; i++) {
        const dayStart = startOf7DaysAgo + i * 86400000;
        const dayEnd = dayStart + 86400000;
        const dateKey = new Date(dayStart).toLocaleDateString("en-IN", { 
            weekday: "short"
        });
        
        // Initialize with zero values
        daily[dateKey] = { total: 0, orders: 0, bills: 0 };
        
        // Aggregate data for each day
        last7DaysBills.forEach(bill => {
            if (bill.createdAt >= dayStart && bill.createdAt < dayEnd) {
                daily[dateKey].total += bill.total || 0;
                daily[dateKey].orders += bill.items?.length || 0;
                daily[dateKey].bills += 1;
            }
        });
    }

    // Convert to array for chart (ensure correct order)
    const daysOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const graphData = daysOrder
        .filter(day => daily[day] !== undefined)
        .map(day => ({
            date: day,
            total: daily[day].total,
            orders: daily[day].orders,
            bills: daily[day].bills,
        }));
    setDailyData(graphData);

    // Process today's bills for other statistics
    todaysBills.forEach((bill) => {
        // Table revenue
        const table = `Table ${bill.table}`;
        tableRevenue[table] = (tableRevenue[table] || 0) + (bill.total || 0);

        // Table order count
        tableOrders[table] = (tableOrders[table] || 0) + 1;

        // Payment mode (handle missing paymentMode)
        const paymentMode = bill.customer?.paymentMode || "Not Specified";
        paymentModes[paymentMode] = (paymentModes[paymentMode] || 0) + (bill.total || 0);

        // Customer spending
        const customerName = bill.customer?.name || "Walk-in";
        const customerPhone = bill.customer?.phone || "NA";
        const customerKey = customerName !== "NA" 
            ? `${customerName} (${customerPhone})` 
            : "Walk-in";
        customerSpending[customerKey] = (customerSpending[customerKey] || 0) + (bill.total || 0);

        // Item quantities
        bill.items?.forEach((item) => {
            itemQuantities[item.itemName] = (itemQuantities[item.itemName] || 0) + (item.quantity || 1);
        });

        totalRevenue += bill.total || 0;
        totalOrders += 1;
    });

    // Set table revenue data
    const tableData = Object.entries(tableRevenue)
        .map(([table, revenue]) => ({ table, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    setRevenueByTable(tableData);

    // Set payment mode data
    const paymentData = Object.entries(paymentModes)
        .filter(([, value]) => value > 0)
        .map(([mode, amount]) => ({ mode, amount }));
    setPaymentModeData(paymentData);

    // Set top customers
    const topCustomerData = Object.entries(customerSpending)
        .map(([customer, spending]) => ({ customer, spending }))
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 5);
    setTopCustomers(topCustomerData);

    // Set top selling item
    const topItem = Object.entries(itemQuantities)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)[0] || { name: "N/A", quantity: 0 };

    // Set most ordered table
    const mostOrderedTable = Object.entries(tableOrders)
        .map(([name, orderCount]) => ({ name, orderCount }))
        .sort((a, b) => b.orderCount - a.orderCount)[0] || { name: "N/A", orderCount: 0 };

    // Set total stats
    const averageBillValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const uniqueCustomers = new Set(
        todaysBills
            .filter(bill => bill.customer?.phone && bill.customer.phone !== "NA")
            .map(bill => bill.customer?.phone)
    ).size;

    setTotalStats({
        totalRevenue,
        totalOrders,
        averageBillValue,
        totalCustomers: uniqueCustomers,
        topItem,
        mostOrderedTable
    });
};

    // Helper to calculate % change
    const getTrend = (key) => {
        if (dailyData.length < 2) return 0;
        const today = dailyData[dailyData.length - 1][key] || 0;
        const yesterday = dailyData[dailyData.length - 2][key] || 0;
        if (yesterday === 0) return 0;
        return (((today - yesterday) / yesterday) * 100).toFixed(1);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];

    return (
        <div className="report-wrapper">
            {/* Main Stats Row */}
            <div className="stats-row">
                {/* Total Revenue */}
                <div className="stat-card card-total-revenue" onClick={() => navigate('/branch-dashboard/detailed-report/revenue')}>
                    <div className="stat-header">
                        <div className="stat-info">
                            <p className="stat-label">Total Revenue</p>
                            <h2 className="stat-value">{formatCurrency(totalStats.totalRevenue)}</h2>
                            <span className={`trend ${getTrend("total") >= 0 ? "positive" : "negative"}`}>
                                {getTrend("total") >= 0 ? "↑" : "↓"} {Math.abs(getTrend("total"))}% from yesterday
                            </span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={60}>
                            <LineChart data={dailyData}>
                                <Tooltip
                                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                                    labelStyle={{ color: '#1e293b' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeOpacity={0.8}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="stat-card card-total-orders" onClick={() => navigate('/branch-dashboard/detailed-report/orders')}>
                    <div className="stat-header">
                        <div className="stat-info">
                            <p className="stat-label">Total Orders</p>
                            <h2 className="stat-value">{totalStats.totalOrders}</h2>
                            <span className={`trend ${getTrend("bills") >= 0 ? "positive" : "negative"}`}>
                                {getTrend("bills") >= 0 ? "↑" : "↓"} {Math.abs(getTrend("bills"))}% from yesterday
                            </span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={60}>
                            <LineChart data={dailyData}>
                                <Tooltip
                                    formatter={(value) => [value, "Orders"]}
                                    labelStyle={{ color: '#1e293b' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="bills"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeOpacity={0.8}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Average Bill Value */}
                <div className="stat-card card-avg-bill">
                    <div className="stat-header">
                        <div className="stat-info">
                            <p className="stat-label">Avg Bill Value</p>
                            <h2 className="stat-value">{formatCurrency(totalStats.averageBillValue)}</h2>
                            <span className="trend positive">
                                ↑ Higher engagement
                            </span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={60}>
                            <LineChart data={dailyData}>
                                <Tooltip
                                    formatter={(value, name) => [
                                        value > 0 ? formatCurrency(value / dailyData.find(d => d.total === value)?.bills || 1) : '₹0',
                                        "Avg Bill"
                                    ]}
                                    labelStyle={{ color: '#1e293b' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#14b8a6"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeOpacity={0.8}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Total Customers */}
                <div className="stat-card card-unique-customers" onClick={() => navigate('/branch-dashboard/detailed-report/customers')}>
                    <div className="stat-header">
                        <div className="stat-info">
                            <p className="stat-label">Unique Customers</p>
                            <h2 className="stat-value">{totalStats.totalCustomers}+</h2>
                            <span className="trend positive">
                                ↑ Growing customer base
                            </span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={60}>
                            <LineChart data={dailyData}>
                                <Tooltip
                                    formatter={(value) => [value, "Items"]}
                                    labelStyle={{ color: '#1e293b' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeOpacity={0.8}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Selling Item — now uses "Total Revenue" style */}
                <div className="stat-card card-total-revenue">
                    <div className="stat-header">
                        <div className="stat-info">
                            <p className="stat-label">Top Selling Item</p>
                            <h2 className="stat-value">{totalStats.topItem.name}</h2>
                            <span className="trend positive">
                                🔥 {totalStats.topItem.quantity} units sold
                            </span>
                        </div>
                    </div>
                    {/* <div className="chart-container">
                        <ResponsiveContainer width="100%" height={60}>
                            <LineChart data={dailyData}>
                                <Tooltip
                                    formatter={(value) => [value, "Orders"]}
                                    labelStyle={{ color: '#1e293b' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="topItemOrders"
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeOpacity={0.8}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div> */}
                </div>

                {/* Most Ordered Table — now uses "Total Orders" style */}
                <div className="stat-card card-total-orders">
                    <div className="stat-header">
                        <div className="stat-info">
                            <p className="stat-label">Most Ordered Table</p>
                            <h2 className="stat-value">{totalStats.mostOrderedTable.name}</h2>
                            <span className="trend positive">
                                ↑ {totalStats.mostOrderedTable.orderCount} orders
                            </span>
                        </div>
                    </div>
                    {/* <div className="chart-container">
                        <ResponsiveContainer width="100%" height={60}>
                            <LineChart data={dailyData}>
                                <Tooltip
                                    formatter={(value) => [value, "Orders"]}
                                    labelStyle={{ color: '#1e293b' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="bills"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeOpacity={0.8}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div> */}
                </div>

            </div>

            {/* Revenue by Table and Payment Methods */}
            <div className="charts-grid">
                {/* Revenue by Table */}
                <div className="chart-card">
                    <h3 className="chart-title">Revenue by Table</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueByTable}>
                            <XAxis dataKey="table" />
                            <YAxis />
                            <Tooltip
                                formatter={(value) => [formatCurrency(value), "Revenue"]}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            />
                            <Bar
                                dataKey="revenue"
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Mode Distribution */}
                <div className="chart-card">
                    <h3 className="chart-title">Payment Methods</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={paymentModeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="amount"
                                label={({ mode, percent }) => `${mode} ${(percent * 100).toFixed(0)}%`}
                            >
                                {paymentModeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => [formatCurrency(value), "Amount"]}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Customers and 7-Day Revenue Trend */}
            <div className="charts-grid">
                {/* Top Customers */}
                <div className="chart-card">
                    <h3 className="chart-title">Top Customers</h3>
                    <div className="customer-list">
                        {topCustomers.map((customer, index) => (
                            <div key={customer.customer} className="customer-item">
                                <div className="customer-rank">#{index + 1}</div>
                                <div className="customer-info">
                                    <p className="customer-name">{customer.customer}</p>
                                    <p className="customer-spending">{formatCurrency(customer.spending)}</p>
                                </div>
                                <div className="customer-bar">
                                    <div
                                        className="customer-bar-fill"
                                        style={{
                                            width: `${(customer.spending / topCustomers[0]?.spending) * 100}%`,
                                            backgroundColor: COLORS[index % COLORS.length]
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 7-Day Revenue Trend */}
                <div className="chart-card">
                    <h3 className="chart-title">7-Day Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dailyData}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip
                                formatter={(value, name) => [
                                    name === 'total' ? formatCurrency(value) : value,
                                    name === 'total' ? 'Revenue' : 'Orders'
                                ]}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                                name="Revenue"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default PaymentReports;