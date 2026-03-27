import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import RTLProvider from './components/ui/RTLProvider';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <RTLProvider>
        <App />
      </RTLProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
