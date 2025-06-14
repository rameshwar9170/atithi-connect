import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ViewOrganizations from './components/ViewOrganizations';
import AddOrganization from './components/AddOrganization';
import Branches from './components/ViewBranches';
import AddBranch from './components/AddBranch';
import HomePage from './components/HomePage';
import OrganizationDashboard from './components/OrganizationDashboard';
import OrgHomePage from './components/OrgHomePage';
import Login from './components/Login';
import BranchDashboard from './components/BranchDashboard';
import PrivateRoute from './components/PrivateRoute';
import AddMyBranch from './components/AddMyBranch';

// ✅ Import new branch pages
import BranchHome from './components/branch/BranchHome';
import OrdersPage from './components/branch/OrdersPage';
import StaffPage from './components/branch/StaffPage';
import MenuPage from './components/branch/MenuPage';
import PaymentsPage from './components/branch/PaymentsPage';
import ReportsPage from './components/branch/ReportsPage';
import BillingPage from './components/branch/BillingPage';
import NotificationsPage from './components/branch/NotificationsPage';
import SettingsPage from './components/branch/SettingsPage';
import DetailedReport from './components/branch/DetailedReport';
import RevenueDetails from './components/branch/RevenueDetails';
import RoomsPage from './components/branch/RoomsPage';
import InventoryManagement from './components/branch/InventoryManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ✅ Public Route */}
        <Route path="/login" element={<Login />} />

        {/* ✅ Admin Dashboard Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="organizations" element={<ViewOrganizations />} />
          <Route path="organizations/add" element={<AddOrganization />} />
          <Route path="organizations/:orgId/branches" element={<Branches />} />
          <Route path="organizations/:orgId/add-branch" element={<AddBranch />} />
        </Route>

        {/* ✅ Organization Dashboard Routes */}
        <Route
          path="organizations-dashboard"
          element={
            <PrivateRoute>
              <OrganizationDashboard />
            </PrivateRoute>
          }
        >
          <Route path="org" element={<OrgHomePage />} />
          <Route path="org/branches/add" element={<AddMyBranch />} />
        </Route>

        {/* ✅ Branch Dashboard Routes */}
        <Route
          path="/branch-dashboard"
          element={
            <PrivateRoute>
              <BranchDashboard />
            </PrivateRoute>
          }
        >
          <Route index element={<BranchHome />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* ✅ Moved Detailed Report Routes inside branch-dashboard */}
          <Route path="detailed-report">
            <Route path="revenue" element={<RevenueDetails metric="revenue" />} />
            <Route path="orders" element={<DetailedReport metric="orders" />} />
            <Route path="customers" element={<DetailedReport metric="customers" />} />
          </Route>

        </Route>



        {/* ✅ Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;
