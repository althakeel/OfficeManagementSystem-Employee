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
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import styles from "./AttendanceHistory.module.css";

const AttendanceHistory = () => {
  const [userId, setUserId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else {
        setUserId(null);
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("userId", "==", userId),
          orderBy("date", "desc")
        );

        const snapshot = await getDocs(attendanceQuery);
        const records = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(records);
        setError("");
      } catch (err) {
        console.error("Firestore error:", err);
        setError("Failed to load attendance history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "--:--";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const exportToExcel = async () => {
    if (history.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    // Set columns
    worksheet.columns = [
      { header: "Sl No", key: "slNo", width: 8 },
      { header: "Date", key: "date", width: 18 },
      { header: "Sign In", key: "signIn", width: 15 },
      { header: "Sign Out", key: "signOut", width: 15 },
      { header: "Total Hours Worked", key: "totalHoursWorked", width: 22 },
      { header: "Total Break Time (min)", key: "totalBreakDuration", width: 22 },
      { header: "Break In", key: "breakIn", width: 15 },
      { header: "Break Out", key: "breakOut", width: 15 },
      { header: "Location", key: "location", width: 35 },
      { header: "Work Mode", key: "workMode", width: 20 },
    ];

    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Style header row: Gradient green background & white bold text
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "gradient",
        gradient: "angle",
        degree: 45,
        stops: [
          { position: 0, color: { argb: "FF4CAF50" } }, // Green
          { position: 1, color: { argb: "FF81C784" } }, // Light green
        ],
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium" },
        left: { style: "medium" },
        bottom: { style: "medium" },
        right: { style: "medium" },
      };
    });

    // Add data rows with alternating row colors
    history.forEach((rec, index) => {
      worksheet.addRow({
          slNo: index + 1,
        date: rec.date || "",
        signIn: formatTime(rec.signIn),
        signOut: formatTime(rec.signOut),
        totalHoursWorked: rec.totalHoursWorked
          ? parseFloat(rec.totalHoursWorked.toFixed(2))
          : 0,
        totalBreakDuration: rec.totalBreakDuration
          ? Math.floor(rec.totalBreakDuration / 60000)
          : 0,
        breakIn: formatTime(rec.breakIn),
        breakOut: formatTime(rec.breakOut),
        location: rec.location || "",
        workMode: rec.workMode || "",
      });

      // Apply alternating row fill color
      const row = worksheet.getRow(index + 2);
      const fillColor = index % 2 === 0 ? "FFE8F5E9" : "FFFFFFFF"; // very light green or white
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.font = { size: 11 };
      });
    });

    // Add total row
 const totalRow = worksheet.addRow({
  date: "Total",
  totalHoursWorked: {
    formula: `SUM(E2:E${history.length + 1})`,
  },
  totalBreakDuration: {
    formula: `SUM(F2:F${history.length + 1})`,
  },
});

    // Style total row
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 12, color: { argb: "FF1B5E20" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC8E6C9" }, // light green fill
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "medium" },
        left: { style: "medium" },
        bottom: { style: "medium" },
        right: { style: "medium" },
      };
      // For first cell, align left
      if (colNumber === 1) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });

    // Set date column format (Column A)
    worksheet.getColumn("date").numFmt = "mm/dd/yyyy";

    // Generate file and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "AttendanceHistory_Styled.xlsx");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Attendance History</h2>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : history.length === 0 ? (
        <p>No attendance records found.</p>
      ) : (
        <>
          <button onClick={exportToExcel} className={styles.exportBtn}>
            Export to Styled Excel
          </button>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                   <th>Sl No</th>
                  <th>Date</th>
                  <th>Sign In</th>
                  <th>Sign Out</th>
                  <th>Total Hours</th>
                  <th>Break Time</th>
                  <th>Break In</th>
                  <th>Break Out</th>
                  <th>Location</th>
                  <th>Work Mode</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record,index) => (
                  <tr key={record.id}>
                 <td>{index + 1}</td>
                    <td>{record.date || "--"}</td>
                    <td>{formatTime(record.signIn)}</td>
                    <td>{formatTime(record.signOut)}</td>
                    <td>{(record.totalHoursWorked || 0).toFixed(2)}</td>
                    <td>{Math.floor((record.totalBreakDuration || 0) / 60000)} min</td>
                    <td>{formatTime(record.breakIn)}</td>
                    <td>{formatTime(record.breakOut)}</td>
                    <td>{record.location || "--"}</td>
                    <td>{record.workMode || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceHistory;
