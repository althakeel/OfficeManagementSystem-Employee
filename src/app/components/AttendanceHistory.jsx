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

  // Filters & sort states
  const [selectedWorkMode, setSelectedWorkMode] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [exportRange, setExportRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Export options modal state
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [includeBreakTime, setIncludeBreakTime] = useState(true);

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

  const filterByExportRange = () => {
    const today = new Date();
    return history.filter((record) => {
      if (!record.date) return false;
      const recDate = new Date(record.date);
      if (exportRange === "thisMonth") {
        return (
          recDate.getMonth() === today.getMonth() &&
          recDate.getFullYear() === today.getFullYear()
        );
      }
      if (exportRange === "lastMonth") {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return (
          recDate.getMonth() === lastMonth.getMonth() &&
          recDate.getFullYear() === lastMonth.getFullYear()
        );
      }
      if (exportRange === "custom") {
        if (!customStart || !customEnd) return false;
        const start = new Date(customStart);
        const end = new Date(customEnd);
        return recDate >= start && recDate <= end;
      }
      return true; // "all" or default
    });
  };

  const getWorkingDays = (start, end) => {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++; // Mon-Fri
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const exportToExcel = async (includeBreakTimeParam = true) => {
    const filteredSorted = filterByExportRange()
      .filter((rec) => selectedWorkMode === "" || rec.workMode === selectedWorkMode)
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });

    if (filteredSorted.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    // Define columns dynamically based on includeBreakTimeParam
    const columns = [
      { header: "Sl No", key: "slNo", width: 8 },
      { header: "Date", key: "date", width: 18 },
      { header: "Sign In", key: "signIn", width: 15 },
      { header: "Sign Out", key: "signOut", width: 15 },
      { header: "Total Hours Worked", key: "totalHoursWorked", width: 22 },
    ];

    if (includeBreakTimeParam) {
      columns.push(
        { header: "Total Break Time (min)", key: "totalBreakDuration", width: 22 },
        { header: "Break In", key: "breakIn", width: 15 },
        { header: "Break Out", key: "breakOut", width: 15 }
      );
    }

    columns.push(
      { header: "Location", key: "location", width: 35 },
      { header: "Work Mode", key: "workMode", width: 20 }
    );

    worksheet.columns = columns;
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // Header style: blue gradient with white bold text
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "gradient",
        gradient: "angle",
        degree: 45,
        stops: [
          { position: 0, color: { argb: "FF1565C0" } }, // dark blue
          { position: 1, color: { argb: "FF64B5F6" } }, // light blue
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

    // Add data rows with alternating fill colors
    filteredSorted.forEach((rec, index) => {
      const rowData = {
        slNo: index + 1,
        date: rec.date || "",
        signIn: formatTime(rec.signIn),
        signOut: formatTime(rec.signOut),
        totalHoursWorked: rec.totalHoursWorked
          ? parseFloat(rec.totalHoursWorked.toFixed(2))
          : 0,
        location: rec.location || "",
        workMode: rec.workMode || "",
      };

      if (includeBreakTimeParam) {
        rowData.totalBreakDuration = rec.totalBreakDuration
          ? Math.floor(rec.totalBreakDuration / 60000)
          : 0;
        rowData.breakIn = formatTime(rec.breakIn);
        rowData.breakOut = formatTime(rec.breakOut);
      }

      worksheet.addRow(rowData);

      const row = worksheet.getRow(index + 2);
      const fillColor = index % 2 === 0 ? "FFF1F8E9" : "FFFFFFFF"; // light green or white
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

    // Calculate summary info
    const startDate = new Date(filteredSorted[0].date);
    const endDate = new Date(filteredSorted[filteredSorted.length - 1].date);
    const totalDays = getWorkingDays(startDate, endDate);
    const attendedDays = new Set(filteredSorted.map((r) => r.date)).size;
    const leaveDays = totalDays - attendedDays;

    // Empty row before summary
    worksheet.addRow({});

    // Summary title row (amber background)
    const summaryTitleRow = worksheet.addRow({ date: "Summary" });
    summaryTitleRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF3E0" }, // amber light
      };
      cell.font = { bold: true, size: 13, color: { argb: "FF6D4C41" } }; // brown text
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border = {
        top: { style: "medium" },
        left: { style: "medium" },
        bottom: { style: "medium" },
        right: { style: "medium" },
      };
    });

    // Summary data rows with lighter amber background
    const summaryData = [
      `Total Working Days: ${totalDays}`,
      `Days Attended: ${attendedDays}`,
      `Leaves Taken: ${leaveDays}`,
    ];
    summaryData.forEach((text) => {
      const row = worksheet.addRow({ date: "", totalHoursWorked: text });
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF8E1" }, // lighter amber
        };
        cell.font = { size: 12, color: { argb: "FF8D6E63" } }; // medium brown
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = {
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    worksheet.getColumn("date").numFmt = "mm/dd/yyyy";

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "AttendanceHistory_Styled.xlsx");
  };

  const filteredSortedHistory = filterByExportRange()
    .filter((rec) => selectedWorkMode === "" || rec.workMode === selectedWorkMode)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <label>Work Mode:</label>
          <select
            value={selectedWorkMode}
            onChange={(e) => setSelectedWorkMode(e.target.value)}
          >
            <option value="">All</option>
            <option value="Remote">Remote</option>
            <option value="Office">Office</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Sort:</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">Oldest First</option>
            <option value="desc">Newest First</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Export Range:</label>
          <select value={exportRange} onChange={(e) => setExportRange(e.target.value)}>
            <option value="all">Full History</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {exportRange === "custom" && (
          <div className={styles.filterGroup}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      <h2 className={styles.heading}>Attendance History</h2>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : filteredSortedHistory.length === 0 ? (
        <p>No attendance records found.</p>
      ) : (
        <>
          <button
            onClick={() => setShowExportOptions(true)}
            className={styles.exportBtn}
          >
            Export to Styled Excel
          </button>

          {/* Export options popup */}
          {showExportOptions && (
            <div className={styles.exportModalBackdrop}>
              <div className={styles.exportModal}>
                <h3>Export Options</h3>

                <label>
                  <input
                    type="checkbox"
                    checked={includeBreakTime}
                    onChange={(e) => setIncludeBreakTime(e.target.checked)}
                  />
                  Include Break Time
                </label>

                <div className={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setShowExportOptions(false);
                      exportToExcel(includeBreakTime);
                    }}
                  >
                    Export
                  </button>
                  <button onClick={() => setShowExportOptions(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

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
                {filteredSortedHistory.map((record, index) => (
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
