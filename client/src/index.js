import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AlertProvider } from './context/AlertContext';
import { CryptoProvider, AutoRefreshProvider } from './context/CryptoContext';
import { SelectedPairProvider } from './context/SelectedPairContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <CryptoProvider>
    <SelectedPairProvider>
      <AlertProvider>
        <AutoRefreshProvider>
          <App />
        </AutoRefreshProvider>
      </AlertProvider>
    </SelectedPairProvider>
  </CryptoProvider>
);
