import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDhDuuYfgAKrS8ZhG2fXycY-27jLi-pJeg",
    authDomain: "fall-detection-9dda4.firebaseapp.com",
    projectId: "fall-detection-9dda4",
    storageBucket: "fall-detection-9dda4.firebasestorage.app",
    messagingSenderId: "930392736385",
    appId: "1:930392736385:web:2c2df2692b767fae4d4380",
    measurementId: "G-YR4WVD6FCH",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const realtime_db = getDatabase(app);


