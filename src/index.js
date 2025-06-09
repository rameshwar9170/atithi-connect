import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const root = ReactDOM.createRoot(document.getElementById('root'));
const auth = getAuth();

onAuthStateChanged(auth, () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

reportWebVitals();
