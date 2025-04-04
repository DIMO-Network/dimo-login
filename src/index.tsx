import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext';
import { DevCredentialsProvider } from './context/DevCredentialsContext';
import { sendMessageToReferrer } from './utils/messageHandler';
import { UIManagerProvider } from './context/UIManagerContext';
import { GlobalOraclesProvider } from './context/OraclesContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <UIManagerProvider>
      <DevCredentialsProvider>
        <AuthProvider>
          <GlobalOraclesProvider>
            <App />
          </GlobalOraclesProvider>
        </AuthProvider>
      </DevCredentialsProvider>
    </UIManagerProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

//Send a READY event to the developer's app, ready to receive credentials
window.onload = () => {
  setTimeout(() => {
    sendMessageToReferrer({ eventType: 'READY' });
  }, 500);
};
