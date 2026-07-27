import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { startThemeSync } from './theme.js';
import './index.css';

startThemeSync();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
