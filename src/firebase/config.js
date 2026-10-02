import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// config ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyAdyyYWhazmoRHUXzDdj872i1fYxEUaOJ4",
  authDomain: "expense-tracker-a0a64.firebaseapp.com",
  projectId: "expense-tracker-a0a64",
  storageBucket: "expense-tracker-a0a64.firebasestorage.app",
  messagingSenderId: "284060609819",
  appId: "1:284060609819:web:50d5e5f32d274301f8f7be",
};

// init
const app = initializeApp(firebaseConfig);

// App Check: ยืนยันว่า request มาจากเว็บเราจริง กันบอท/สคริปต์ยิง API ตรงๆ (สมัครรัวๆ เขียนข้อมูลขยะ)
// ตั้ง REACT_APP_RECAPTCHA_SITE_KEY ใน Vercel แล้วไปเปิด Enforce ใน Firebase Console > App Check
const recaptchaKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
if (recaptchaKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
    isTokenAutoRefreshEnabled: true,
  });
}

// export ใช้งาน
export const auth = getAuth(app);
// เก็บข้อมูลไว้ในเครื่อง (IndexedDB) -> เปิดดู/จดได้แม้ออฟไลน์ แล้ว sync เองเมื่อกลับมาออนไลน์
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
