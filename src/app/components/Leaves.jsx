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
import "./Leaves.css";

const Leaves = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [admins, setAdmins] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
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
        const querySnapshot = await getDocs(q);
        const adminList = [];
        querySnapshot.forEach((doc) => {
          adminList.push({ id: doc.id, ...doc.data() });
        });
        setAdmins(adminList);
      } catch (err) {
        console.error("Error fetching admins/managers:", err);
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
        const querySnapshot = await getDocs(q);
        const leavesList = [];
        querySnapshot.forEach((doc) => {
          leavesList.push({ id: doc.id, ...doc.data() });
        });
        setLeaves(leavesList);
      } catch (err) {
        console.error("Error fetching leaves:", err);
      }
      setLoading(false);
    }

    fetchLeaves();
  }, [currentUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!startDate || !endDate || !reason || !type || !assignedTo) {
      alert("Please fill all required fields");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert("End date cannot be before start date");
      return;
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

      alert("Leave request submitted!");
      setStartDate("");
      setEndDate("");
      setReason("");
      setType("Sick Leave");
      setAssignedTo("");
      setModalOpen(false);

      // Refresh leaves after submit
      const q = query(
        collection(db, "leaves"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const leavesList = [];
      querySnapshot.forEach((doc) => {
        leavesList.push({ id: doc.id, ...doc.data() });
      });
      setLeaves(leavesList);
    } catch (err) {
      console.error("Error submitting leave request:", err);
      alert("Failed to submit leave request");
    }
  }

  return (
    <div className="leaves-page">
      <button
        className="open-modal-btn"
        onClick={() => setModalOpen(true)}
        aria-label="Request Leave"
      >
        Request Leave
      </button>

      <h1>Your Leave History</h1>
      {loading ? (
        <p>Loading leaves...</p>
      ) : leaves.length === 0 ? (
        <p>No leave requests found.</p>
      ) : (
        <table className="leaves-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Start Date</th>
              <th>End Date</th>
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
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
          >
            <h2 id="modalTitle" className="modal-title">
              Request Leave
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  className="form-control"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input
                  className="form-control"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Leave Type *</label>
                <select
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                  <option>Annual Leave</option>
                  <option>Work From Home</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reason *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Assign To (Admin/Manager) *</label>
                <select
                  className="form-control"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  required
                >
                  <option value="">-- Select Admin/Manager --</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.displayName || admin.username || admin.name || admin.email}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="submit-btn">
                Submit Leave Request
              </button>
              <button
                type="button"
                className="close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close form"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
