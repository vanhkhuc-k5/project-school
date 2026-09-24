import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext.jsx';
import { ServerStateProvider } from './context/ServerStateContext.jsx';
import { SyncProvider } from './context/SyncContext.jsx';
import { AppRouter } from './router/AppRouter.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ServerStateProvider>
        <SyncProvider>
          <AppRouter />
        </SyncProvider>
      </ServerStateProvider>
    </AuthProvider>
  </React.StrictMode>,
);
