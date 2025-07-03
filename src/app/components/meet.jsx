import React, { useEffect, useState } from "react";
import { db } from "../../../lib/firebaseConfig";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import styles from "./Meet.module.css";

const Meet = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let isMounted = true; // to prevent setting state if unmounted

    async function fetchMeetings() {
      setLoading(true);
      setError(null);
      try {
        const meetingsRef = collection(db, "meetings");
        const q = query(meetingsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const meetingsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (isMounted) {
          setMeetings(meetingsData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load meetings.");
          setLoading(false);
        }
      }
    }

    fetchMeetings();

    return () => {
      isMounted = false; // cleanup flag on unmount
    };
  }, []);

  if (loading)
    return (
      <p style={{ textAlign: "center", color: "#fff", marginTop: "40px" }}>
        Loading meetings...
      </p>
    );

  if (error)
    return (
      <p style={{ color: "red", textAlign: "center", marginTop: "40px" }}>
        {error}
      </p>
    );

  const now = new Date();

  // Filter meetings by scheduled time
  const upcomingMeetings = meetings.filter(
    (m) => m.createdAt && m.createdAt.toDate() > now
  );
  const pastMeetings = meetings.filter(
    (m) => m.createdAt && m.createdAt.toDate() <= now
  );

  // Render table rows with proper data-label for responsive design
  const renderTable = (meetingsList, title, isUpcoming) => (
    <>
      <h2
        style={{
          borderBottom: "2px solid #555",
          paddingBottom: "8px",
          color: isUpcoming ? "#fff" : "#ccc",
          fontSize: "1.5rem",
          fontWeight: "700",
          marginTop: "0",
          marginBottom: "20px",
        }}
      >
        {title}
      </h2>
      <table className={styles.meetTable}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Agenda</th>
            <th style={{ width: "190px" }}>Scheduled At</th>
            <th style={{ width: "130px" }}>{isUpcoming ? "Join" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {meetingsList.length === 0 ? (
            <tr>
              <td
                colSpan="4"
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#bbb",
                  fontStyle: "italic",
                  fontSize: "1rem",
                  backgroundColor: "#2c2c2c",
                }}
              >
                No {title.toLowerCase()}.
              </td>
            </tr>
          ) : (
            meetingsList.map((meeting) => (
              <tr key={meeting.id}>
                <td>{meeting.title || "Meeting"}</td>
                <td>{meeting.agenda || "N/A"}</td>
                <td>
                  {meeting.createdAt
                    ? meeting.createdAt.toDate().toLocaleString()
                    : "N/A"}
                </td>
                <td data-label={isUpcoming ? "Join" : "Status"}>
                  {isUpcoming ? (
                    meeting.meetLink ? (
                      <button
                        className={styles.joinButton}
                        onClick={() => window.open(meeting.meetLink, "_blank")}
                      >
                        Join Now
                      </button>
                    ) : (
                      <span className={styles.noLinkSpan}>No Link</span>
                    )
                  ) : (
                    <span className={styles.closedSpan}>Closed</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );

  return (
    <div className={styles.meetContainer}>
      <h1 className={styles.title}>Google Meet Links</h1>

      <button
        className={styles.toggleButton}
        onClick={() => setShowHistory((prev) => !prev)}
        aria-pressed={showHistory}
        aria-label="Toggle between upcoming and past meetings"
      >
        {showHistory ? "Show Upcoming" : "Show History"}
      </button>

      {showHistory
        ? renderTable(pastMeetings, "Past Meetings (History)", false)
        : renderTable(upcomingMeetings, "Upcoming Meetings", true)}
    </div>
  );
};

export default Meet;
