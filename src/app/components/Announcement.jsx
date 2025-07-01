import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../lib/firebaseConfig";  // adjust path accordingly

const Announcement = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid;

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true);
      try {
        const q = query(collection(db, "announcements"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const anns = [];
        querySnapshot.forEach((docSnap) => {
          anns.push({ id: docSnap.id, ...docSnap.data() });
        });
        setAnnouncements(anns);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      }
      setLoading(false);
    }

    fetchAnnouncements();
  }, []);

  // When user views announcement, mark it as seen if not already
  async function markAsSeen(announcementId, seenBy) {
    if (!userId) return;
    if (seenBy.includes(userId)) return; // already seen

    try {
      const announcementRef = doc(db, "announcements", announcementId);
      await updateDoc(announcementRef, {
        seenBy: arrayUnion(userId)
      });

      // Update local state to avoid refetch
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.id === announcementId ? { ...ann, seenBy: [...ann.seenBy, userId] } : ann
        )
      );
    } catch (error) {
      console.error("Error updating seenBy:", error);
    }
  }

  if (loading) return <p>Loading announcements...</p>;

  if (announcements.length === 0) return <p>No announcements found.</p>;

  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      <h2 style={{ color: "#fff", marginBottom: 20 }}>Announcements</h2>
      {announcements.map(({ id, title, content, date, from, seenBy }) => {
        const isSeen = seenBy?.includes(userId);
        const displayDate = date?.toDate ? date.toDate().toLocaleString() : "";

        return (
          <div
            key={id}
            onClick={() => markAsSeen(id, seenBy || [])}
            style={{
              cursor: "pointer",
              backgroundColor: isSeen ? "#2d3748" : "#4c51bf", // different bg if seen
              color: "#fff",
              padding: "15px 20px",
              borderRadius: 8,
              marginBottom: 15,
              boxShadow: isSeen ? "none" : "0 0 10px rgba(76,81,191,0.7)",
              transition: "background-color 0.3s ease",
            }}
            title={isSeen ? "Seen" : "Click to mark as seen"}
          >
            <h3 style={{ margin: 0, fontWeight: "700" }}>{title || "(No Title)"}</h3>
            <small style={{ color: "#cbd5e0" }}>
              From: {from || "Unknown"} | Date: {displayDate}
            </small>
            <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{content || "(No Content)"}</p>
          </div>
        );
      })}
    </div>
  );
};

export default Announcement;
