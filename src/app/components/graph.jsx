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

import styles from "./Graph.module.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Graph = () => {
  const now = new Date();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

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

  const getFirstDay = (year, month) => new Date(year, month, 1).toISOString().split("T")[0];
  const getLastDay = (year, month) => new Date(year, month + 1, 0).toISOString().split("T")[0];

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

        const dailyMap = {};
        snapshot.forEach((doc) => {
          const record = doc.data();
          const date = record.date;
          if (!dailyMap[date]) dailyMap[date] = { workHours: 0, breakHours: 0 };
          dailyMap[date].workHours += record.totalHoursWorked || 0;
          dailyMap[date].breakHours += record.breakHours || 0;
        });

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  const renderMonthYearSelector = () => {
    const years = [];
    const currentYear = now.getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y);
    }

    return (
      <div className={styles.selectorContainer}>
        <label className={styles.selectorLabel}>
          <span>Year</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={styles.selectorSelect}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectorLabel}>
          <span>Month</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className={`${styles.selectorSelect} ${styles.monthSelect}`}
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
    <div className={styles.graphContainer}>
      <h2 className={styles.title}>
        Attendance for {MONTH_NAMES[selectedMonth]} {selectedYear}
      </h2>

      {renderMonthYearSelector()}

      {loading ? (
        <p className={styles.loadingText}>Loading...</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 15, left: 10, bottom: 10 }}
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
              interval="preserveEnd"
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
