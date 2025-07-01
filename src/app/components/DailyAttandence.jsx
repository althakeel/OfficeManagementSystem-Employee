"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db, auth } from "../../../lib/firebaseConfig";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import styles from "./DailyAttendance.module.css";

const AUTO_SIGN_OUT_HOURS = 12;
const MIN_SIGN_OUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MIN_SIGN_IN_GAP_MS = 12 * 60 * 60 * 1000; // 12 hours

export default function DailyAttendance() {
  const [userId, setUserId] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [showBreakPopup, setShowBreakPopup] = useState(false);
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const attendanceRef = useMemo(
    () => (userId ? doc(db, "attendance", `${userId}_${today}`) : null),
    [userId, today]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) =>
      setUserId(user ? user.uid : null)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!attendanceRef) return;
    const unsubscribe = onSnapshot(attendanceRef, (docSnap) => {
      const data = docSnap.exists() ? docSnap.data() : null;
      setAttendance(data);
      if (data?.workMode) setWorkMode(data.workMode);
      else setWorkMode("");
    });
    return () => unsubscribe();
  }, [attendanceRef]);

  useEffect(() => {
    setShowBreakPopup(!!attendance?.breakIn && !attendance?.breakOut);
  }, [attendance]);

  const toDate = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatTime = (date) =>
    date
      ? date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "--:-- --";

  const isSignedIn = !!attendance?.signIn && !attendance?.signOut;
  const isOnBreak = !!attendance?.breakIn && !attendance?.breakOut;

  const canSignOut = () => {
    if (!attendance?.signIn) return false;
    const signInTime = toDate(attendance.signIn);
    return new Date() - signInTime >= MIN_SIGN_OUT_DURATION_MS;
  };

  const canSignIn = () => {
    if (!attendance?.signOut) return true;
    const lastSignOut = toDate(attendance.signOut);
    return new Date() - lastSignOut >= MIN_SIGN_IN_GAP_MS;
  };

  const getCurrentLocation = async () => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
            );
            const data = await res.json();
            resolve(data.display_name || "Unknown location");
          } catch {
            resolve("Location fetch failed");
          }
        },
        () => resolve("Location permission denied"),
        { enableHighAccuracy: true }
      );
    });
  };

  const handleSignIn = async () => {
    if (!attendanceRef || !userId) return;

    if (attendance?.signIn && !attendance?.signOut) {
      alert("Already signed in. Please sign out first.");
      return;
    }

    if (!canSignIn()) {
      alert("You can only sign in 12 hours after your last sign out.");
      return;
    }

    if (!workMode) {
      alert("Please select your work mode before signing in.");
      return;
    }

    const now = new Date();
    const currentLocation = await getCurrentLocation();
    setLocation(currentLocation);

    await setDoc(
      attendanceRef,
      {
        userId,
        date: today,
        signIn: now,
        location: currentLocation,
        workMode,
        signOut: null,
        breakIn: null,
        breakOut: null,
        totalHoursWorked: 0,
        totalBreakDuration: 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleSignOut = async () => {
    if (!attendanceRef || !attendance?.signIn) return;

    if (!canSignOut()) {
      alert("You can only sign out after 15 minutes from signing in.");
      return;
    }

    const now = new Date();
    const signInTime = toDate(attendance.signIn);
    const breakDuration = attendance.totalBreakDuration || 0;
    const workedMs = now - signInTime - breakDuration;
    const totalHoursWorked = workedMs > 0 ? workedMs / 3600000 : 0;

    await updateDoc(attendanceRef, {
      signOut: now,
      totalHoursWorked,
      updatedAt: serverTimestamp(),
      breakIn: null,
      breakOut: null,
    });
  };

  const handleBreakIn = async () => {
    if (!attendanceRef) return;
    await updateDoc(attendanceRef, {
      breakIn: new Date(),
      breakOut: null,
      updatedAt: serverTimestamp(),
    });
  };

  const handleBreakOut = async () => {
    if (!attendanceRef || !attendance?.breakIn) return;

    const now = new Date();
    const breakInTime = toDate(attendance.breakIn);
    const prevDuration = attendance.totalBreakDuration || 0;
    const thisDuration = now - breakInTime;
    const totalBreak = prevDuration + thisDuration;

    await updateDoc(attendanceRef, {
      breakOut: now,
      totalBreakDuration: totalBreak,
      breakIn: null,
      updatedAt: serverTimestamp(),
    });
  };

  if (!userId || !attendanceRef)
    return <div className={styles.card}>Loading attendance...</div>;

  const isSignInDisabled = isSignedIn || !canSignIn() || !workMode;

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.heading}>Daily Attendance</h2>

        <div className={styles.infoGroup}>
          <label>Sign In:</label>
          <span>{formatTime(toDate(attendance?.signIn))}</span>
        </div>

        <div className={styles.infoGroup}>
          <label>Sign Out:</label>
          <span>{formatTime(toDate(attendance?.signOut))}</span>
        </div>

        <div className={styles.infoGroup}>
          <label>Location:</label>
          <span>{attendance?.location || location || "Not available"}</span>
        </div>

        <div className={styles.infoGroup}>
  <label>Work Mode:</label>
  {isSignedIn ? (
    <span>{workMode || "N/A"}</span>
  ) : (
    <select
      value={workMode}
      onChange={(e) => setWorkMode(e.target.value)}
      style={{ width: "180px", padding: "6px", fontSize: "1rem" }}
    >
      <option value="">Select work mode</option>
      <option value="Office">Office</option>
      <option value="Work From Home">Work From Home</option>
      <option value="Hybrid">Hybrid</option>
    </select>
  )}
</div>


        <div className={styles.infoGroup}>
          <label>Break Status:</label>
          <span>{isOnBreak ? "On Break" : "Not on Break"}</span>
        </div>

        <div className={styles.infoGroup}>
          <label>Total Break Duration:</label>
          <span>{Math.floor((attendance?.totalBreakDuration || 0) / 60000)} min</span>
        </div>

        <div className={styles.infoGroup}>
          <label>Total Hours Worked:</label>
          <span>{(attendance?.totalHoursWorked || 0).toFixed(2)} hrs</span>
        </div>

        <div className={styles.buttonsContainer}>
          <button
            onClick={handleSignIn}
            disabled={isSignInDisabled}
            className={`${styles.btn} ${styles.signIn}`}
          >
            Sign In
          </button>
          <button
            onClick={handleSignOut}
            disabled={!isSignedIn || isOnBreak || attendance?.signOut || !canSignOut()}
            className={`${styles.btn} ${styles.signOut}`}
          >
            Sign Out
          </button>
          <button
            onClick={handleBreakIn}
            disabled={!isSignedIn || isOnBreak}
            className={`${styles.btn} ${styles.breakIn}`}
          >
            Break In
          </button>
          <button
            onClick={handleBreakOut}
            disabled={!isOnBreak}
            className={`${styles.btn} ${styles.breakOut}`}
          >
            Break Out
          </button>
        </div>
      </div>

      {showBreakPopup && (
        <div className={styles.breakPopup}>
          <p>You are currently on a break. Please don&apos;t forget to break out!</p>
          <button
            className={styles.closePopup}
            onClick={() => setShowBreakPopup(false)}
          >
            OK
          </button>
        </div>
      )}
    </>
  );
}
