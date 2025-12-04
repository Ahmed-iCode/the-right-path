// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";       // استيراد أداة الدخول
import { getFirestore } from "firebase/firestore"; // استيراد قاعدة البيانات

// إعدادات مشروعك (زي ما جبتها من الموقع)
const firebaseConfig = {
  apiKey: "AIzaSyBzVgJXDV4HzdkgqwkQA2tgAnO7vB0GcJQ",
  authDomain: "the-right-pass.firebaseapp.com",
  projectId: "the-right-pass",
  storageBucket: "the-right-pass.firebasestorage.app",
  messagingSenderId: "1077634899652",
  appId: "1:1077634899652:web:ed2f6b4955768538def391",
  measurementId: "G-NCXWX9BMSF"
};

// 1. تشغيل فايربيس
const app = initializeApp(firebaseConfig);

// 2. تصدير الأدوات عشان نستخدمها في باقي الصفحات
export const auth = getAuth(app);
export const db = getFirestore(app);

