import React from 'react';
import ReactDOM from 'react-dom/client';
import "bootstrap/dist/css/bootstrap.min.css";
import './index.css';
import App from './App';
import { applyTheme } from './utils/theme';

applyTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ลงทะเบียน service worker เฉพาะตอน build จริง (ตอน npm start จะไม่ใช้ กันแคชค้าง)
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL}/service-worker.js`)
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}
