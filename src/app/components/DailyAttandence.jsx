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

const MAX_HOURS_BEFORE_AUTO_SIGNOUT = 15; // hours

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

  // Auto sign out if total worked hours exceed 15 hrs or at midnight
  useEffect(() => {
    const interval = setInterval(() => {
      if (!attendanceRef || !attendance?.signIn || attendance?.signOut) return;

      const signInTime = toDate(attendance.signIn);
      const now = new Date();
      const hoursWorked = (now - signInTime) / 3600000;

      const isPastLimit = hoursWorked >= MAX_HOURS_BEFORE_AUTO_SIGNOUT;
      const isMidnight = now.getHours() === 0 && now.getMinutes() < 2;

      if (isPastLimit || isMidnight) {
        handleAutoSignOut();
      }
    }, 60000); // check every 1 min

    return () => clearInterval(interval);
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

  const canSignIn = () => {
    if (!attendance?.signOut) return true;
    const lastSignOut = toDate(attendance.signOut);
    const now = new Date();
    return now - lastSignOut >= 12 * 3600000;
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

  const handleAutoSignOut = async () => {
    if (!attendanceRef || !attendance?.signIn) return;

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

  const getTextClass = (value) => (value ? styles.success : styles.muted);

  if (!userId || !attendanceRef)
    return <div className={styles.card}>Loading attendance...</div>;

  const isSignInDisabled = isSignedIn || !canSignIn() || !workMode;

  return (
    <>
      <div className={styles.card}>
        <h2 className={styles.heading}>Daily Attendance</h2>

        <div className={styles.infoGroup}>
          <label>Sign In:</label>
          <span className={getTextClass(attendance?.signIn)}>
            {formatTime(toDate(attendance?.signIn))}
          </span>
        </div>

        <div className={styles.infoGroup}>
          <label>Sign Out:</label>
          <span className={getTextClass(attendance?.signOut)}>
            {formatTime(toDate(attendance?.signOut))}
          </span>
        </div>

        <div className={styles.infoGroup}>
          <label>Location:</label>
          <span className={getTextClass(attendance?.location || location)}>
            {attendance?.location || location || "Not available"}
          </span>
        </div>

        <div className={styles.infoGroup}>
          <label>Work Mode:</label>
          {isSignedIn ? (
            <span className={getTextClass(workMode)}>{workMode || "N/A"}</span>
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
          <span className={getTextClass(isOnBreak)}>
            {isOnBreak ? "On Break" : "Not on Break"}
          </span>
        </div>

        <div className={styles.infoGroup}>
          <label>Total Break Duration:</label>
          <span className={getTextClass(attendance?.totalBreakDuration)}>
            {Math.floor((attendance?.totalBreakDuration || 0) / 60000)} min
          </span>
        </div>

        <div className={styles.infoGroup}>
          <label>Total Hours Worked:</label>
          <span className={getTextClass(attendance?.totalHoursWorked)}>
            {(attendance?.totalHoursWorked || 0).toFixed(2)} hrs
          </span>
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
            disabled={!isSignedIn || isOnBreak || attendance?.signOut}
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