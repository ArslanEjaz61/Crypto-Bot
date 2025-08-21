import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AlertProvider } from './context/AlertContext';
import { CryptoProvider, AutoRefreshProvider } from './context/CryptoContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CryptoProvider>
      <AlertProvider>
        <AutoRefreshProvider>
          <App />
        </AutoRefreshProvider>
      </AlertProvider>
    </CryptoProvider>
  </React.StrictMode>
);
