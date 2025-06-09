import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

const PrivateRoute = ({ children }) => {
  const auth = getAuth();
  const user = auth.currentUser;

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user exists, render the protected component
  return children;
};

export default PrivateRoute;
