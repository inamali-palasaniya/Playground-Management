import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyD41KsSpMQnL7gdvXCWNxnepBdh1G0UOes",
    authDomain: "playground-8e93f.firebaseapp.com",
    projectId: "playground-8e93f",
    storageBucket: "playground-8e93f.firebasestorage.app",
    messagingSenderId: "140596436100",
    appId: "1:140596436100:android:bb64c506be36f90dd836d1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth, firebaseConfig };
