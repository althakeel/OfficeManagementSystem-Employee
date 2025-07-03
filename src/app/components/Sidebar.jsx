import React, { useState, useEffect } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import styles from "./Sidebar.module.css";

export default function Sidebar({ selected, onSelect }) {
  const menuItems = [
    { id: "home", label: "Home", icon: "fa-solid fa-house" },
    // { id: "roles", label: "Roles", icon: "fa-solid fa-user-shield" },
    // { id: "users", label: "Users", icon: "fa-solid fa-users" },
    { id: "leaves", label: "Leaves", icon: "fa-solid fa-tree" },
    // { id: "assets", label: "Assets", icon: "fa-solid fa-box" },
    { id: "meet", label: "Meet", icon: "fa-solid fa-video" },
    // { id: "profile", label: "Profile", icon: "fa-regular fa-user" },
    { id: "settings", label: "Settings", icon: "fa-solid fa-gear" },
    { id: "projects", label: "Projects", icon: "fa-solid fa-folder" },
    // { id: "departments", label: "Departments", icon: "fa-solid fa-building" },
    // { id: "workFromHome", label: "Work From Home", icon: "fa-solid fa-house-laptop" },
    // { id: "announcements", label: "Announcements", icon: "fa-solid fa-bullhorn" },
    { id: "attendance", label: "Daily Attendance", icon: "fa-regular fa-calendar" },
    { id: "attendancehistory", label: "Attendance History", icon: "fa-regular fa-file-lines" },
  ];
 // Track window width for responsiveness (optional if CSS handles it)
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 600);

  useEffect(() => {
    function handleResize() {
      setIsSmallScreen(window.innerWidth <= 600);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav className={`${styles.sidebar} ${isSmallScreen ? styles.sidebarSmall : ""}`}>
      <div className={styles.logoContainer}>
        <img
          src="https://res.cloudinary.com/dm8z5zz5s/image/upload/v1748871708/Logo_1080_x_1080_White_en7zpv.png"
          alt="Logo"
          className={styles.logo}
        />
      </div>

      <div className={styles.menuItems}>
        {menuItems.map(({ id, label, icon }) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              title={label}
              className={`${styles.menuButton} ${isSelected ? styles.selected : ""}`}
              aria-pressed={isSelected}
            >
              <i className={`${icon} ${styles.icon}`} aria-hidden="true" />
              <span className={styles.label}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}