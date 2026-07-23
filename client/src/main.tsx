import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// FLOW-48: initialise i18next before any component renders (side-effect import).
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
