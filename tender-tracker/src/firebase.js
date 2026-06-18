import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getAuth }       from "firebase/auth";
import { getStorage }    from "firebase/storage";

const cfg = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
};

export const firebaseReady = !!cfg.apiKey;

let db, auth, storage;
if (firebaseReady) {
  const app = initializeApp(cfg);
  db      = getFirestore(app);
  auth    = getAuth(app);
  storage = getStorage(app);
}

export { db, auth, storage };
