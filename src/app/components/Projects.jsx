import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../../../lib/firebaseConfig";
import "./projects.css";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal visibility
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Pending");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          alert("You must be logged in to view projects.");
          setProjects([]);
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "projects"),
          where("assignedTo", "array-contains", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const projList = [];
        querySnapshot.forEach((doc) => {
          projList.push({ id: doc.id, ...doc.data() });
        });
        setProjects(projList);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
      setLoading(false);
    }

    fetchProjects();
  }, []);

  async function getUIDsByEmails(emails) {
    const uids = [];
    for (const email of emails) {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        uids.push(doc.id);
      });
    }
    return uids;
  }

  async function handleAddProject(e) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Project name is required");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to add a project");
      return;
    }

    const emailArray = assignedTo
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (emailArray.length === 0) {
      alert("At least one assigned user email is required");
      return;
    }

    try {
      const assignedToArray = await getUIDsByEmails(emailArray);

      if (assignedToArray.length === 0) {
        alert("No valid assigned user emails found");
        return;
      }

      await addDoc(collection(db, "projects"), {
        name,
        description,
        status,
        assignedTo: assignedToArray,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      // Reset form
      setName("");
      setDescription("");
      setStatus("Pending");
      setAssignedTo("");

      // Close modal & refresh list
      setModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Failed to add project. See console for details.");
    }
  }

  return (
    <div className="projects-container">
      <h1 className="title">Project Management</h1>

      {/* New Project Button top-right */}
      <button
        className="new-project-btn"
        onClick={() => setModalOpen(true)}
        aria-label="Open new project form"
      >
        + New Project
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.classList.contains("modal-overlay")) {
              setModalOpen(false);
            }
          }}
        >
          <div className="modal-content" role="dialog" aria-modal="true">
            <button
              className="modal-close-btn"
              onClick={() => setModalOpen(false)}
              aria-label="Close form"
            >
              &times;
            </button>

            <h2 className="modal-title">Add New Project</h2>
            <form onSubmit={handleAddProject} className="project-form">
              <div className="form-group">
                <label htmlFor="project-name">Project Name *</label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter project name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-desc">Description</label>
                <textarea
                  id="project-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the project"
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-status">Status</label>
                <select
                  id="project-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="assigned-to">
                  Assigned To (comma separated emails) *
                </label>
                <input
                  id="assigned-to"
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g. john@company.com, jane@company.com"
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Add Project
              </button>
            </form>
          </div>
        </div>
      )}

      <h2 className="subtitle">My Projects</h2>
      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p>No projects assigned to you found.</p>
      ) : (
        <ul className="project-list">
          {projects.map(({ id, name, description, status, assignedTo }) => (
            <li key={id} className="project-item">
              <h3>{name}</h3>
              <p>
                <strong>Status:</strong> {status}
              </p>
              <p>
                <strong>Description:</strong> {description || "N/A"}
              </p>
              <p>
                <strong>Assigned To UIDs:</strong>{" "}
                {assignedTo?.join(", ") || "None"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Projects;
