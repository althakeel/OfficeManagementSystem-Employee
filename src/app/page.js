"use client";

import { useEffect, useState } from "react";
import { auth } from "../../lib/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";
import styles from "./page.module.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
<div className={styles.page}>
  <div className={styles.background}></div>
  <main className={styles.main}>
    {user ? (
      <Dashboard user={user} onLogout={handleLogout} />
    ) : (
      <LoginForm onLoginSuccess={setUser} />
    )}
  </main>
</div>
  );
}
