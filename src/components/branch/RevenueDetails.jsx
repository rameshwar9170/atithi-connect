import React, { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebase/config";
import * as XLSX from 'xlsx';
import "./RevenueDetails.css";

const RevenueDetails = () => {
    const branchId = localStorage.getItem("branchId");
    const [bills, setBills] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [analytics, setAnalytics] = useState({
        averageBill: 0,
        topPaymentMode: "N/A",
        mostFrequentTable: "N/A",
        topItem: "N/A",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        dateRange: "today",
        startDate: "",
        endDate: "",
        paymentMode: "",
    });
    const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setLoading(true);
        const billsRef = ref(db, `atithi-connect/Branches/${branchId}/Bills`);
        const unsubscribe = onValue(
            billsRef,
            (snapshot) => {
                try {
                    const data = snapshot.val();
                    if (data) {
                        const billList = Object.values(data);
                        setBills(billList);
                    } else {
                        setBills([]);
                        setTotalRevenue(0);
                        setAnalytics({
                            averageBill: 0,
                            topPaymentMode: "N/A",
                            mostFrequentTable: "N/A",
                            topItem: "N/A",
                        });
                    }
                } catch (err) {
                    setError("Failed to fetch data. Please try again.");
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                setError("Failed to connect to database.");
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [branchId]);

    const filteredAndSortedBills = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const sevenDaysAgo = today - 6 * 86400000;
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        let filteredBills = bills.filter((bill) => {
            const billDate = new Date(bill.createdAt).getTime();
            let matchesDate = true;
            if (filters.dateRange === "today") {
                matchesDate = billDate >= today;
            } else if (filters.dateRange === "yesterday") {
                matchesDate = billDate >= yesterday && billDate < today;
            } else if (filters.dateRange === "last7days") {
                matchesDate = billDate >= sevenDaysAgo;
            } else if (filters.dateRange === "thisMonth") {
                matchesDate = billDate >= thisMonthStart;
            } else if (filters.dateRange === "custom") {
                const start = filters.startDate ? new Date(filters.startDate).getTime() : null;
                const end = filters.endDate
                    ? new Date(filters.endDate).getTime() + 86400000
                    : null;
                matchesDate = (!start || billDate >= start) && (!end || billDate <= end);
            }
            const matchesPayment =
                !filters.paymentMode || bill.customer?.paymentMode === filters.paymentMode;
            return matchesDate && matchesPayment;
        });

        filteredBills = [...filteredBills].sort((a, b) => {
            const key = sortConfig.key;
            const direction = sortConfig.direction === "asc" ? 1 : -1;
            if (key === "total" || key === "createdAt") {
                return direction * (a[key] - b[key]);
            }
            if (key === "billId") {
                return direction * a[key].localeCompare(b[key]);
            }
            return 0;
        });

        const total = filteredBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
        setTotalRevenue(total);

        const totalBills = filteredBills.length;
        const averageBill = totalBills > 0 ? total / totalBills : 0;

        const paymentModes = filteredBills.reduce((acc, bill) => {
            const mode = bill.customer?.paymentMode || "Not Specified";
            acc[mode] = (acc[mode] || 0) + (bill.total || 0);
            return acc;
        }, {});
        const topPaymentMode = Object.entries(paymentModes)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";

        const tableCounts = filteredBills.reduce((acc, bill) => {
            const table = `Table ${bill.table}`;
            acc[table] = (acc[table] || 0) + 1;
            return acc;
        }, {});
        const mostFrequentTable = Object.entries(tableCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";

        const itemQuantities = filteredBills.reduce((acc, bill) => {
            bill.items?.forEach((item) => {
                acc[item.itemName] = (acc[item.itemName] || 0) + (item.quantity || 1);
            });
            return acc;
        }, {});
        const topItem = Object.entries(itemQuantities)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";

        setAnalytics({
            averageBill,
            topPaymentMode,
            mostFrequentTable,
            topItem,
        });

        return filteredBills;
    }, [bills, filters, sortConfig]);

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
        setCurrentPage(1); // Reset to first page on sort
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({
            ...prev,
            [name]: value,
            ...(name === "dateRange" && value !== "custom" ? { startDate: "", endDate: "" } : {}),
        }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const exportToCSV = () => {
        const headers = [
            "Bill ID",
            "Date & Time",
            "Customer",
            "Table",
            "Payment Mode",
            "Items",
            "Total",
        ];
        const rows = filteredAndSortedBills.map((bill) => [
            bill.billId,
            formatDate(bill.createdAt),
            `${bill.customer?.name || "Walk-in"} (${bill.customer?.phone || "N/A"})`,
            `Table ${bill.table}`,
            bill.customer?.paymentMode || "Not Specified",
            bill.items
                ?.map((item) => `${item.itemName} x ${item.quantity} - ${formatCurrency(item.subtotal)}`)
                .join("; "),
            formatCurrency(bill.total),
        ]);
        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "revenue_details.csv";
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const exportToExcel = () => {
        const headers = [
            "Bill ID",
            "Date & Time",
            "Customer",
            "Table",
            "Payment Mode",
            "Items",
            "Total",
        ];
        const rows = filteredAndSortedBills.map((bill) => [
            bill.billId,
            formatDate(bill.createdAt),
            `${bill.customer?.name || "Walk-in"} (${bill.customer?.phone || "N/A"})`,
            `Table ${bill.table}`,
            bill.customer?.paymentMode || "Not Specified",
            bill.items
                ?.map((item) => `${item.itemName} x ${item.quantity} - ${formatCurrency(item.subtotal)}`)
                .join("; "),
            formatCurrency(bill.total),
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Revenue Details");
        XLSX.write(wb, "revenue_details.xlsx");
    };

    const exportToPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFont("Inter", "normal");
        doc.setFontSize(16);
        doc.text("Revenue Details Report", 20, 20);
        doc.setFontSize(12);
        doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 20, 30);
        doc.text(`Total Bills: ${filteredAndSortedBills.length}`, 20, 40);
        doc.text(`Average Bill: ${formatCurrency(analytics.averageBill)}`, 20, 50);
        doc.text(`Top Payment Mode: ${analytics.topPaymentMode}`, 20, 60);
        doc.text(`Most Frequent Table: ${analytics.mostFrequentTable}`, 20, 70);
        doc.text(`Top Item: ${analytics.topItem}`, 20, 80);

        const headers = [
            ["Bill ID", "Date & Time", "Customer", "Table", "Payment Mode", "Items", "Total"],
        ];
        const rows = filteredAndSortedBills.map((bill) => [
            bill.billId,
            formatDate(bill.createdAt),
            `${bill.customer?.name || "Walk-in"} (${bill.customer?.phone || "N/A"})`,
            `Table ${bill.table}`,
            bill.customer?.paymentMode || "Not Specified",
            bill.items
                ?.map((item) => `${item.itemName} x ${item.quantity} - ${formatCurrency(item.subtotal)}`)
                .join("; "),
            formatCurrency(bill.total),
        ]);
        doc.autoTable({
            startY: 90,
            head: headers,
            body: rows,
            styles: { font: "Inter", fontSize: 10 },
            headStyles: { fillColor: [30, 58, 138] },
        });
        doc.save("revenue_details.pdf");
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredAndSortedBills.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBills = filteredAndSortedBills.slice(startIndex, endIndex);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    return (
        <div className="RevenueDetails-container">
            {/* <h2 className="RevenueDetails-title">Revenue Details</h2> */}
            {error && <div className="RevenueDetails-error">{error}</div>}
            <div className="RevenueDetails-filter-bar">
                <select
                    name="dateRange"
                    value={filters.dateRange}
                    onChange={handleFilterChange}
                    className="RevenueDetails-filter-input"
                    aria-label="Date Range Filter"
                >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7days">Last 7 Days</option>
                    <option value="thisMonth">This Month</option>
                    <option value="custom">Custom Range</option>
                </select>
                {filters.dateRange === "custom" && (
                    <>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="RevenueDetails-filter-input"
                            aria-label="Start Date"
                        />
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="RevenueDetails-filter-input"
                            aria-label="End Date"
                        />
                    </>
                )}
                <select
                    name="paymentMode"
                    value={filters.paymentMode}
                    onChange={handleFilterChange}
                    className="RevenueDetails-filter-input"
                    aria-label="Payment Mode Filter"
                >
                    <option value="">All Payment Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Not Specified">Not Specified</option>
                </select>
                <div className="RevenueDetails-export-buttons">
                    <button
                        onClick={exportToCSV}
                        className="RevenueDetails-export-button"
                        aria-label="Export to CSV"
                    >
                        CSV
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="RevenueDetails-export-button"
                        aria-label="Export to Excel"
                    >
                        Excel
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="RevenueDetails-export-button"
                        aria-label="Export to PDF"
                    >
                        PDF
                    </button>
                </div>
            </div>
          
            {loading ? (
                <div className="RevenueDetails-loading">
                    <div className="RevenueDetails-spinner"></div>
                    Loading...
                </div>
            ) : (
                <>
                    <table className="RevenueDetails-table">
                        <thead>
                            <tr>
                                <th
                                    onClick={() => handleSort("createdAt")}
                                    className={sortConfig.key === "createdAt" ? "RevenueDetails-sorted" : ""}
                                >
                                    Date & Time {sortConfig.key === "createdAt" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                </th>
                                <th>Customer</th>
                                <th>Table</th>
                                <th>Payment Mode</th>
                                <th>Items</th>
                                <th
                                    onClick={() => handleSort("total")}
                                    className={sortConfig.key === "total" ? "RevenueDetails-sorted" : ""}
                                >
                                    Total {sortConfig.key === "total" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedBills.map((bill) => (
                                <tr key={bill.billId} className="RevenueDetails-row">
                                    <td>{formatDate(bill.createdAt)}</td>
                                    <td>
                                        {bill.customer?.name || "Walk-in"} ({bill.customer?.phone || "N/A"})
                                    </td>
                                    <td>Table {bill.table}</td>
                                    <td>{bill.customer?.paymentMode || "Not Specified"}</td>
                                    <td className="RevenueDetails-items-cell">
                                        <div className="RevenueDetails-items-wrapper">
                                            <span>
                                                {bill.items && bill.items.length > 0
                                                    ? `${bill.items[0].itemName} x ${bill.items[0].quantity} - ${formatCurrency(bill.items[0].subtotal)}`
                                                    : "No Items"}
                                            </span>
                                            {bill.items && bill.items.length > 0 && (
                                                <div className="RevenueDetails-items-popup">
                                                    <ul className="RevenueDetails-items">
                                                        {bill.items.map((item, index) => (
                                                            <li key={index}>
                                                                {item.itemName} x {item.quantity} -{" "}
                                                                {formatCurrency(item.subtotal)}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>{formatCurrency(bill.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="RevenueDetails-pagination">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className="RevenueDetails-button"
                            aria-label="Previous Page"
                        >
                            Previous
                        </button>
                        <span className="RevenueDetails-page-info">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages}
                            className="RevenueDetails-button"
                            aria-label="Next Page"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
            <div className="RevenueDetails-summary" style={{ marginTop: "2rem" }}>
                <p>Total Revenue: <span>{formatCurrency(totalRevenue)}</span></p>
                <p>Total Bills: <span>{filteredAndSortedBills.length}</span></p>
                
                <p>Top Payment Mode: <span>{analytics.topPaymentMode}</span></p>
                <p>Top Item: <span>{analytics.topItem}</span></p>
            </div>
        </div>
    );
};

export default RevenueDetails;