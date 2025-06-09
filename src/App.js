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
import OrgMyBranches from './components/OrgMyBranches';
import Login from './components/Login';
import BranchDashboard from './components/BranchDashboard';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ✅ Public Route */}
        <Route path="/login" element={<Login />} />

        {/* ✅ Protected Routes */}
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

        <Route
          path="organizations-dashboard"
          element={
            <PrivateRoute>
              <OrganizationDashboard />
            </PrivateRoute>
          }
        >
          <Route path="org" element={<OrgHomePage />} />
          <Route path="org/my-branches" element={<OrgMyBranches />} />
          <Route path="org/branches/add" element={<AddBranch />} />
        </Route>

        <Route
          path="/branch-dashboard"
          element={
            <PrivateRoute>
              <BranchDashboard />
            </PrivateRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
