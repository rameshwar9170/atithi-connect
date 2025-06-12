import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
// import 'bootstrap/dist/css/bootstrap.min.css'; // for styles
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // for dropdowns, modals, tooltips, etc.


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
