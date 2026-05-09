import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Set global base URL for axios
if (process.env.REACT_APP_API_URL) {
  axios.defaults.baseURL = process.env.REACT_APP_API_URL;
}

const isNumberInput = (el) => el instanceof HTMLInputElement && el.type === 'number';

document.addEventListener(
  'wheel',
  (e) => {
    const target = e.target;
    if (!isNumberInput(target)) return;
    if (document.activeElement !== target) return;
    e.preventDefault();
    target.blur();
  },
  { passive: false, capture: true }
);

document.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const target = e.target;
    if (!isNumberInput(target)) return;
    e.preventDefault();
  },
  true
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
