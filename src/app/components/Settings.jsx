import React, { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import "./Settings.css";

const Settings = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [docId, setDocId] = useState(null);

  // Editable fields state
  const [displayName, setDisplayName] = useState("");
  const [workFromHome, setWorkFromHome] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");

  const user = auth.currentUser;

  useEffect(() => {
    async function fetchUserData() {
      if (!user) {
        setError("User is not logged in.");
        setLoading(false);
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // No user doc found, set empty fields so user can add info
          setDocId(null);
          setUserData(null);
          setDisplayName("");
          setWorkFromHome(false);
          setPhone("");
          setEmail(user.email || "");
          setDepartment("");
          setError(null);
        } else {
          const userDoc = querySnapshot.docs[0];
          setDocId(userDoc.id);
          const data = userDoc.data();

          setUserData(data);
          setDisplayName(data.displayName || "");
          setWorkFromHome(data.workFromHome || false);
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setDepartment(data.department || "");
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      alert("User is not logged in.");
      return;
    }

    try {
      if (docId) {
        // Update existing document
        const userRef = doc(db, "users", docId);
        await updateDoc(userRef, {
          displayName,
          workFromHome,
          phone,
          email,
          department,
        });
      } else {
        // Create new document
        const usersRef = collection(db, "users");
        const newDoc = await addDoc(usersRef, {
          displayName,
          workFromHome,
          phone,
          email,
          department,
          userId: user.uid,
          role: "staff", // default role, adjust if needed
        });
        setDocId(newDoc.id);
      }

      alert("Profile saved successfully!");
      setUserData({
        displayName,
        workFromHome,
        phone,
        email,
        department,
      });
      setIsEditing(false);
      setError(null);
    } catch (error) {
      console.error("Error saving user data:", error);
      alert("Failed to save profile.");
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      alert("Email is required to reset password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Failed to send password reset email.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red", textAlign: "center" }}>{error}</p>;

  return (
    <div className="settings-wrapper">
      <div className="settings-card glass-blur">
        <h1>User Settings</h1>

        {!isEditing ? (
          <>
            <div className="info-row">
              <strong>Display Name:</strong>{" "}
              <span>{userData?.displayName || "(not set)"}</span>
            </div>
            <div className="info-row">
              <strong>Work From Home:</strong>{" "}
              <span>{userData?.workFromHome ? "Yes" : "No"}</span>
            </div>
            <div className="info-row">
              <strong>Phone Number:</strong>{" "}
              <span>{userData?.phone || "(not set)"}</span>
            </div>
            <div className="info-row">
              <strong>Email:</strong> <span>{userData?.email || email}</span>
            </div>
            <div className="info-row">
              <strong>Department:</strong>{" "}
              <span>{userData?.department || "(not set)"}</span>
            </div>

            <div className="buttons-row">
              <button onClick={() => setIsEditing(true)} className="btn primary">
                Edit Profile
              </button>
              <button onClick={handleResetPassword} className="btn danger">
                Reset Password
              </button>
            </div>
          </>
        ) : (
          <>
            <label>
              Display Name:
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>

            <label>
              Work From Home:
              <select
                value={workFromHome ? "yes" : "no"}
                onChange={(e) => setWorkFromHome(e.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>

            <label>
              Phone Number:
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label>
              Email:
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Department:
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </label>

            <div className="buttons-row">
              <button onClick={handleSave} className="btn primary">
                Save Changes
              </button>
              <button onClick={() => setIsEditing(false)} className="btn cancel">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
