import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../lib/firebaseConfig";
import styles from "./Leaves.module.css";

const Leaves = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [admins, setAdmins] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("Sick Leave");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    async function fetchAdmins() {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "in", ["admin", "manager"])
        );
        const snapshot = await getDocs(q);
        const adminList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAdmins(adminList);
      } catch (err) {
        console.error("Failed to fetch admins:", err);
      }
    }

    fetchAdmins();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchLeaves() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "leaves"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const leaveList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaves(leaveList);
      } catch (err) {
        console.error("Failed to fetch leaves:", err);
      }
      setLoading(false);
    }

    fetchLeaves();
  }, [currentUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!startDate || !endDate || !reason || !type || !assignedTo) {
      return alert("All fields are required.");
    }

    if (new Date(endDate) < new Date(startDate)) {
      return alert("End date cannot be before start date.");
    }

    try {
      await addDoc(collection(db, "leaves"), {
        userId: currentUser.uid,
        startDate,
        endDate,
        reason,
        type,
        status: "Pending",
        assignedTo,
        createdAt: serverTimestamp(),
      });

      setStartDate("");
      setEndDate("");
      setReason("");
      setType("Sick Leave");
      setAssignedTo("");
      setModalOpen(false);
      alert("Leave request submitted!");
    } catch (err) {
      console.error("Failed to submit leave request:", err);
    }
  }

  return (
    <div className={styles.container}>
      <button className={styles.requestBtn} onClick={() => setModalOpen(true)}>
        + Request Leave
      </button>

      <h1 className={styles.title}>Your Leave History</h1>
      {loading ? (
        <p className={styles.message}>Loading...</p>
      ) : leaves.length === 0 ? (
        <p className={styles.message}>No leave requests found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map(({ id, startDate, endDate, reason, status, type }) => (
              <tr key={id}>
                <td>{type}</td>
                <td>{startDate}</td>
                <td>{endDate}</td>
                <td>{reason}</td>
                <td>{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Request Leave</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label>Type</label>
                <select value={type} onChange={e => setType(e.target.value)} required>
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Annual Leave</option>
                  <option>Work From Home</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Reason</label>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label>Assign To</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} required>
                  <option value="">-- Select Admin/Manager --</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.displayName || admin.name || admin.email}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={styles.submitBtn}>Submit</button>
              <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
