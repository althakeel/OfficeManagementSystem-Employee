"use client";

import { useState } from "react";
import { auth, db } from "../../../lib/firebaseConfig";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import styles from "./LoginForm.module.css";

export default function LoginForm({ onLoginSuccess }) {
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetMessage, setResetMessage] = useState(null);

  const resolveEmail = async (identifier) => {
    const usersRef = collection(db, "users");
    const input = identifier.trim().toLowerCase();

    // Try employeeid (as number)
    const numericId = parseInt(input);
    if (!isNaN(numericId)) {
      const q = query(usersRef, where("employeeid", "==", numericId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) return snapshot.docs[0].data().email;
    }

    // Try username (case-insensitive)
    const q = query(usersRef, where("username", "==", input));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return snapshot.docs[0].data().email;

    // Fallback: assume it’s a valid email
    return identifier;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const resolvedEmail = await resolveEmail(loginIdentifier);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        resolvedEmail,
        password
      );
      onLoginSuccess(userCredential.user);
    } catch (err) {
      let msg = "Login failed.";
      switch (err.code) {
        case "auth/user-not-found":
          msg = "User not found.";
          break;
        case "auth/wrong-password":
          msg = "Wrong password.";
          break;
        case "auth/invalid-email":
          msg = "Invalid input.";
          break;
        case "auth/too-many-requests":
          msg = "Too many attempts. Try again later.";
          break;
        default:
          msg = "Error: " + err.message;
      }
      setError(msg);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);

    try {
      const resolvedEmail = await resolveEmail(resetIdentifier);
      await sendPasswordResetEmail(auth, resolvedEmail);
      setResetMessage("Reset email sent!");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account with this input.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid input.");
      } else {
        setError("Failed to send reset email.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore 'users' collection
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user.email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Not registered: sign out and show error
        await auth.signOut();
        setError("Access denied. Your email is not registered.");
        return;
      }

      // Check user role (only allow 'staff' here — customize as needed)
      const userData = snapshot.docs[0].data();
      if (userData.role !== "staff") {
        await auth.signOut();
        setError("Only staff members can log in.");
        return;
      }

      // All good — proceed
      onLoginSuccess(user);
    } catch (err) {
      setError("Google sign-in failed: " + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <img
          src="https://res.cloudinary.com/dm8z5zz5s/image/upload/v1748871708/Logo_1080_x_1080_White_en7zpv.png"
          alt="Company Logo"
          className={styles.logo}
        />
      </div>

      {!resetMode ? (
        <>
          <h2 className={styles.title}>Employee Login</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="text"
              placeholder="Email / Employee ID / Username"
              required
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              className={styles.input}
            />

            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.passwordInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.toggleButton}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button type="submit" className={styles.submitButton}>
              Login
            </button>
          </form>

          <div className={styles.separator}>or</div>

     <button onClick={handleGoogleSignIn} className={styles.googleButton}>
 <svg
  xmlns="http://www.w3.org/2000/svg"
  width="18"
  height="18"
  viewBox="0 0 48 48"
>
  <path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.21 9.11 3.6l6.8-6.8C34.62 2.9 29.62 1 24 1 14.73 1 6.89 6.7 3.15 14.95l7.96 6.2C12.84 15.06 18.89 9.5 24 9.5z"/>
  <path fill="#34A853" d="M46.5 24c0-1.56-.14-3.06-.4-4.5H24v9h12.7c-.55 2.96-2.34 5.46-5.01 7.07l7.96 6.2C43.6 35.95 46.5 30.4 46.5 24z"/>
  <path fill="#FBBC05" d="M10.1 28.1c-.4-1.2-.6-2.48-.6-3.8s.2-2.6.6-3.8l-7.96-6.2C.9 19.55 0 21.68 0 24s.9 4.45 2.14 6.7l7.96-6.2z"/>
  <path fill="#EA4335" d="M24 46.5c6.3 0 11.6-2.08 15.47-5.63l-7.96-6.2c-2.18 1.46-4.96 2.3-7.51 2.3-5.11 0-10.16-5.56-11.89-13.1l-7.96 6.2C6.89 41.3 14.73 46.5 24 46.5z"/>
</svg>
  Sign in with Google
</button>


          <div
            className={styles.forgotPassword}
            onClick={() => {
              setResetMode(true);
              setError(null);
              setResetMessage(null);
              setResetIdentifier(loginIdentifier);
            }}
          >
            Forgot password?
          </div>

          {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
        </>
      ) : (
        <>
          <h2 className={styles.title}>Reset Password</h2>

          <form onSubmit={handlePasswordReset} className={styles.form}>
            <input
              type="text"
              placeholder="Email / Employee ID / Username"
              required
              value={resetIdentifier}
              onChange={(e) => setResetIdentifier(e.target.value)}
              className={styles.input}
            />
            <button type="submit" className={styles.submitButton}>
              Send Reset Link
            </button>
          </form>

          <div
            className={styles.resetBack}
            onClick={() => {
              setResetMode(false);
              setError(null);
              setResetMessage(null);
            }}
          >
            Back to Login
          </div>

          {resetMessage && (
            <p className={`${styles.message} ${styles.success}`}>{resetMessage}</p>
          )}
          {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}
        </>
      )}
    </div>
  );
}
