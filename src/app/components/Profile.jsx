import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";

export default function Profile({ employeeId }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchEmployee() {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, "employees", employeeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEmployee(docSnap.data());
        } else {
          setError("Employee not found");
        }
      } catch (err) {
        setError("Failed to fetch employee data");
      } finally {
        setLoading(false);
      }
    }

    fetchEmployee();
  }, [employeeId]);

  if (loading) return <p>Loading profile...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Employee Profile</h2>
      <p><strong>Name:</strong> {employee.name}</p>
      <p><strong>Email:</strong> {employee.email}</p>
      <p><strong>Role:</strong> {employee.role}</p>
      <p><strong>Department:</strong> {employee.department}</p>
      <p><strong>Joined Date:</strong> {employee.joinedDate}</p>

      {/* Add more profile details and features here */}
    </div>
  );
}
