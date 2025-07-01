"use client";

import { useState } from "react";
import { auth } from "../../../lib/firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import styles from "./LoginForm.module.css";

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(userCredential.user); // Pass full user object here
    } catch (err) {
      let msg = "Login failed.";
      switch (err.code) {
        case "auth/user-not-found":
          msg = "User does not exist.";
          break;
        case "auth/wrong-password":
          msg = "Wrong password.";
          break;
        case "auth/invalid-email":
          msg = "Invalid email format.";
          break;
        case "auth/too-many-requests":
          msg = "Too many attempts, please try later.";
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
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Reset email sent!");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account with this email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email.");
      } else {
        setError("Failed to send reset email.");
      }
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
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <div
            className={styles.forgotPassword}
            onClick={() => {
              setResetMode(true);
              setError(null);
              setResetMessage(null);
              setResetEmail(email);
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
              type="email"
              placeholder="Enter your email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
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
