import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext.jsx';
import { ServerStateProvider } from './context/ServerStateContext.jsx';
import { SyncProvider } from './context/SyncContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';
import { AppRouter } from './router/AppRouter.jsx';
import { EmergencyModal } from './components/EmergencyModal.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ServerStateProvider>
        <SyncProvider>
          <RealtimeProvider>
            <AppRouter />
            {/* G39: Global emergency broadcast overlay — mounted at root */}
            <EmergencyModal />
          </RealtimeProvider>
        </SyncProvider>
      </ServerStateProvider>
    </AuthProvider>
  </React.StrictMode>,
);
