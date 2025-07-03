"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "../../../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import styles from "./Graph.module.css";

const COLORS = {
  working: "#4caf50",
  medical: "#2196f3",
  casual: "#ff9800",
  extra: "#f44336",
};

const LeaveGraph = () => {
  const [userId, setUserId] = useState(null);
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const pad = (n) => (n < 10 ? "0" + n : n);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const firstDay = `${year}-${pad(month)}-01`;
        const lastDay = `${year}-${pad(month)}-${pad(
          new Date(year, month, 0).getDate()
        )}`;

        const leaveRef = collection(db, "leaves");
        const q = query(
          leaveRef,
          where("userId", "==", userId),
          where("startDate", ">=", firstDay),
          where("startDate", "<=", lastDay),
          orderBy("startDate", "asc")
        );

        const snapshot = await getDocs(q);

        const leaveHours = {
          medical: 0,
          casual: 0,
          extra: 0,
        };

        snapshot.forEach((doc) => {
          const data = doc.data();
          const type = (data.leaveType || "extra").toLowerCase();
          if (leaveHours.hasOwnProperty(type)) {
            leaveHours[type] += data.hoursTaken || 0;
          }
        });

        const daysInMonth = new Date(year, month, 0).getDate();
        const totalWorkingHours = daysInMonth * 8;
        const totalLeaveHours =
          leaveHours.medical + leaveHours.casual + leaveHours.extra;

        const workingHours = Math.max(totalWorkingHours - totalLeaveHours, 0);

        const chartData = [
          { name: "Working Hours", value: workingHours, color: COLORS.working },
          ...Object.entries(leaveHours)
            .filter(([_, hours]) => hours > 0)
            .map(([type, hours]) => ({
              name: `${type.charAt(0).toUpperCase() + type.slice(1)} Leave`,
              value: hours,
              color: COLORS[type],
            })),
        ];

        setLeaveData(chartData);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch leave data");
        setLeaveData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, year, month]);

  return (
    <div style={{ width: "100%", height: 450 }}>
  <ResponsiveContainer width="100%" height="100%">

    <div className={styles.leaveGraphContainer}>
      <h2 className={styles.leaveTitle}>
        Leave Overview - {year}-{pad(month)}
      </h2>

      <div className={styles.leaveSelectorContainer}>
        <select
          className={styles.leaveSelect}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Select year"
        >
          {[2023, 2024, 2025].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          className={styles.leaveSelect}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          aria-label="Select month"
        >
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "short" })}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className={styles.leaveLoadingText}>Loading...</p>
      ) : error ? (
        <p className={styles.leaveErrorText}>{error}</p>
      ) : leaveData.length === 0 ? (
        <p className={styles.leaveNoDataText}>No leave data available.</p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={leaveData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={14}
                fill="#fff"
              >
                {leaveData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${value} hrs`}
                contentStyle={{
                  backgroundColor: "#222",
                  borderRadius: "8px",
                  border: "none",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ color: "#eee", fontWeight: "600", fontSize: "14px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
     </ResponsiveContainer>
</div>
  );
};

export default LeaveGraph;
