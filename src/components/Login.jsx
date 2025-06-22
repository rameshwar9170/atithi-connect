import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  inMemoryPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // New state for checkbox

  const navigate = useNavigate();
  const auth = getAuth();
  const database = getDatabase();

  const convertEmailToKey = (email) => email.replace(/\./g, '_');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const emailKey = convertEmailToKey(email);
    const userRef = ref(database, `users/${emailKey}`);
    try {
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        setError('❌ This email is not registered in the system.');
        setIsLoading(false);
        return;
      }

      const userData = snapshot.val();

      // Set persistence based on checkbox
      await setPersistence(auth, rememberMe ? browserSessionPersistence : inMemoryPersistence);

      try {
        await signInWithEmailAndPassword(auth, email, password);
        handlePostLogin(userData.role, userData);
      } catch (loginErr) {
        try {
          await setPersistence(auth, rememberMe ? browserSessionPersistence : inMemoryPersistence);
          await createUserWithEmailAndPassword(auth, email, password);
          handlePostLogin(userData.role, userData);
        } catch (registerErr) {
          console.error('Auth failed:', registerErr);
          setError('❌ Login or registration failed. Please check credentials.');
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Database error:', err);
      setError('❌ An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePostLogin = (role, userData) => {
    setIsLoading(false);
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
      {isLoading && (
        <div className="loading-popup">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      )}
      <form onSubmit={handleLogin} className="login-form" aria-busy={isLoading}>
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
        
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            aria-label="Remember me"
          />
          <span className="checkbox-label">Remember me</span>
        </label>

        <button type="submit" disabled={isLoading}>
          Continue
        </button>
      </form>
    </div>
  );
}

export default Login;