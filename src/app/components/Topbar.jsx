import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";
import { FaBell } from "react-icons/fa"; // Using react-icons for simplicity

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
    <header
      style={{
        height: 60,
        backgroundColor: "rgb(31, 41, 55)",
        backdropFilter: "blur(10px)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
      }}
    >
      <div>
        Welcome, <strong>{userName || "Guest"}</strong>{" "}
        <span
          style={{
            marginLeft: 15,
            padding: "4px 10px",
            borderRadius: 12,
            backgroundColor: isOnline ? "#22c55e" : "#ef4444",
            fontWeight: "600",
            fontSize: 14,
          }}
          title={isOnline ? "Online" : "Offline"}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <button
          onClick={onAnnouncementClick}
          aria-label="Show Announcements"
          title="Announcements"
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: 22,
            padding: 0,
          }}
        >
          <FaBell />
        </button>

        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#0ea5e9",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            color: "#fff",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
