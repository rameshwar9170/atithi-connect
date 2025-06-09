import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();
  const database = getDatabase(); // Realtime Database

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Convert email to valid key format
      const emailKey = email.replace(/\./g, '_');

      // Reference to user node in Realtime DB
      const userRef = ref(database, `users/${emailKey}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        setError('❌ You are not registered in the system.');
        return;
      }

      const userData = snapshot.val();
      const role = userData.role;

      if (role === 'Super Admin') {
        navigate('/');
      } else if (role === 'Org') {
        navigate('/organizations-dashboard/org');
      } else if (role === 'Branch') {
        navigate('/branch-dashboard');
      } else {
        setError('❌ Invalid role assigned.');
      }

    } catch (err) {
      console.error('Login error:', err);
      setError('❌ Invalid credentials or network error.');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h2>Login</h2>
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
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
