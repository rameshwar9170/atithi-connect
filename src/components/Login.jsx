import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const auth = getAuth();
  const database = getDatabase();

  const convertEmailToKey = (email) => email.replace(/\./g, '_');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const emailKey = convertEmailToKey(email);
    const userRef = ref(database, `users/${emailKey}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      setError('❌ This email is not registered in the system.');
      return;
    }

    const userData = snapshot.val();

    try {
      // Try logging in
      await signInWithEmailAndPassword(auth, email, password);
      handlePostLogin(userData.role, userData);
    } catch (loginErr) {
      try {
        // Try creating an account just to authenticate
        await createUserWithEmailAndPassword(auth, email, password);
        // ✅ Do NOT write to the database again
        handlePostLogin(userData.role, userData);
      } catch (registerErr) {
        console.error('Auth failed:', registerErr);
        setError('❌ Login or registration failed. Please check credentials.');
      }
    }
  };

  const handlePostLogin = (role, userData) => {
    if (role === 'Org') {
      localStorage.setItem('orgId', userData.orgId || '');
      navigate('/organizations-dashboard/org');
    } else if (role === 'Branch') {
      localStorage.setItem('branchId', userData.branchId || '');
      navigate('/branch-dashboard');
    } else if (role === 'Super Admin') {
      navigate('/');
    } else {
      setError('❌ Invalid role assigned.');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h2>Login or Register</h2>
        {error && <p className="error">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Continue</button>
      </form>
    </div>
  );
}

export default Login;
