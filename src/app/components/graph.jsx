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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Graph = () => {
  const now = new Date();

  // State for user and loading
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  // State for selected year and month (default current)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-based

  // Helper to generate empty month data
  const generateEmptyMonthData = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const emptyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      emptyData.push({
        date: day.toString().padStart(2, "0"),
        workHours: 0,
        breakHours: 0,
      });
    }
    return emptyData;
  };

  // Format first and last day ISO strings for Firestore query
  const getFirstDay = (year, month) => new Date(year, month, 1).toISOString().split("T")[0];
  const getLastDay = (year, month) => new Date(year, month + 1, 0).toISOString().split("T")[0];

  // Fetch data from Firestore based on selected year/month and userId
  useEffect(() => {
    if (!userId) {
      setData(generateEmptyMonthData(selectedYear, selectedMonth));
      setLoading(false);
      return;
    }

    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const attendanceRef = collection(db, "attendance");

        const q = query(
          attendanceRef,
          where("userId", "==", userId),
          where("date", ">=", getFirstDay(selectedYear, selectedMonth)),
          where("date", "<=", getLastDay(selectedYear, selectedMonth)),
          orderBy("date", "asc")
        );

        const snapshot = await getDocs(q);

        // Aggregate workHours and breakHours by date
        const dailyMap = {};
        snapshot.forEach((doc) => {
          const record = doc.data();
          const date = record.date; // expected format: YYYY-MM-DD
          if (!dailyMap[date]) {
            dailyMap[date] = { workHours: 0, breakHours: 0 };
          }
          dailyMap[date].workHours += record.totalHoursWorked || 0;
          dailyMap[date].breakHours += record.breakHours || 0;
        });

        // Build data array for the chart
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const chartData = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const dayStr = day.toString().padStart(2, "0");
          const fullDate = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, "0")}-${dayStr}`;
          chartData.push({
            date: dayStr,
            workHours: Number(dailyMap[fullDate]?.workHours.toFixed(2)) || 0,
            breakHours: Number(dailyMap[fullDate]?.breakHours.toFixed(2)) || 0,
          });
        }

        setData(chartData);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setData(generateEmptyMonthData(selectedYear, selectedMonth));
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [userId, selectedYear, selectedMonth]);

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Render month and year selectors with better styling & layout
  const renderMonthYearSelector = () => {
    // Year options: last 5 years + current year + next year for flexibility
    const years = [];
    const currentYear = now.getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y);
    }

    return (
      <div
        style={{
          marginBottom: 20,
          color: "#fff",
          display: "flex",
          gap: "1.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", fontSize: 14 }}>
          <span style={{ marginBottom: 4, fontWeight: "600" }}>Year</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #555",
              backgroundColor: "#222",
              color: "#fff",
              minWidth: 100,
              cursor: "pointer",
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", fontSize: 14 }}>
          <span style={{ marginBottom: 4, fontWeight: "600" }}>Month</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #555",
              backgroundColor: "#222",
              color: "#fff",
              minWidth: 120,
              cursor: "pointer",
            }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: 480,
        padding: "1.2rem 1rem 1rem 1rem",
        borderRadius: 16,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        color: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2
        style={{
          marginBottom: 10,
          fontWeight: "700",
          fontSize: 22,
          textAlign: "center",
          userSelect: "none",
        }}
      >
        Attendance for {MONTH_NAMES[selectedMonth]} {selectedYear}
      </h2>

      {renderMonthYearSelector()}

      {loading ? (
        <p style={{ textAlign: "center", marginTop: 60 }}>Loading...</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barGap={6}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="date"
              label={{
                value: "Day",
                position: "insideBottomRight",
                offset: -8,
                fill: "#ddd",
                fontWeight: 600,
              }}
              tick={{ fill: "#ddd", fontSize: 12 }}
              axisLine={{ stroke: "#666" }}
            />
            <YAxis
              label={{
                value: "Hours",
                angle: -90,
                position: "insideLeft",
                fill: "#ddd",
                fontWeight: 600,
                offset: 10,
              }}
              tick={{ fill: "#ddd", fontSize: 12 }}
              axisLine={{ stroke: "#666" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
              formatter={(value, name) => [`${value} hrs`, name === "workHours" ? "Worked" : "Break"]}
            />
            <Legend
              wrapperStyle={{ color: "#fff", fontWeight: "700", fontSize: 14 }}
              formatter={(value) => (value === "workHours" ? "Work Hours" : "Break Hours")}
            />
            <Bar
              dataKey="workHours"
              stackId="a"
              fill="#4caf50"
              radius={[8, 8, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="breakHours"
              stackId="a"
              fill="#f44336"
              radius={[8, 8, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default Graph;
