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
      if (user) setUserId(user.uid);
      else setUserId(null);
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
    <div
      style={{
        maxWidth: 400,
        margin: "30px auto",
        padding: 20,
        background: "#1e1e2f",
        borderRadius: 12,
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 15 }}>
        Leave Overview - {year}-{pad(month)}
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginBottom: 15,
        }}
      >
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[2023, 2024, 2025].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "short" })}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ textAlign: "center" }}>Loading...</p>
      ) : error ? (
        <p style={{ textAlign: "center", color: "#f66" }}>{error}</p>
      ) : leaveData.length === 0 ? (
        <p style={{ textAlign: "center", color: "#ccc" }}>
          No leave data available.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
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
            >
              {leaveData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default LeaveGraph;
