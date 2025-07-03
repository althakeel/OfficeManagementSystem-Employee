// Topbar.jsx
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";
import { FaBell } from "react-icons/fa";
import styles from "./Topbar.module.css";

export default function Topbar({ onAnnouncementClick }) {
  const [userName, setUserName] = useState(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsOnline(true);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserName(
              userData.displayName?.trim() ||
              userData.username?.trim() ||
              userData.name?.trim() ||
              user.email
            );
          } else {
            const q = query(collection(db, "users"), where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data();
              setUserName(
                userData.displayName?.trim() ||
                userData.username?.trim() ||
                userData.name?.trim() ||
                user.email
              );
            } else {
              setUserName(user.email);
            }
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUserName(user.email);
        }
      } else {
        setUserName(null);
        setIsOnline(false);
      }
    });

    return () => unsubscribe();
  }, []);

  function handleLogout() {
    const auth = getAuth();
    signOut(auth).catch((error) => {
      console.error("Logout error:", error);
    });
  }

  return (
    <header className={styles.header}>
  <div className={styles.leftGroup}>
    <span className={styles.welcome}>Hi, <strong>{userName || "Guest"}</strong></span>
    <span
      className={`${styles.status} ${isOnline ? styles.online : styles.offline}`}
      title={isOnline ? "Online" : "Offline"}
    >
      <span className={styles.dot}></span>
      <span className={styles.statusText}>{isOnline ? "Online" : "Offline"}</span>
    </span>
  </div>

  <div className={styles.rightGroup}>
    <button
      onClick={onAnnouncementClick}
      aria-label="Show Announcements"
      title="Announcements"
      className={styles.announcementBtn}
    >
      <FaBell />
    </button>

    <button onClick={handleLogout} className={styles.logoutBtn}>
      Logout
    </button>
  </div>
</header>

  );
}