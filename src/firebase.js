// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCmXBLai-9A4I6QBQ1sBBbWfdbqxWj0YrA",
  authDomain: "real-time-chat-applicati-91215.firebaseapp.com",
  databaseURL: "https://real-time-chat-applicati-91215-default-rtdb.firebaseio.com",
  projectId: "real-time-chat-applicati-91215",
  storageBucket: "real-time-chat-applicati-91215.appspot.com",
  messagingSenderId: "942452813624",
  appId: "1:942452813624:web:10e9d2ddcad519a5d35bcd",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
