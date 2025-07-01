// components/Sidebar.js
import React, { useState, useEffect } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Sidebar({ selected, onSelect }) {
const menuItems = [
  { id: "home", label: "Home", icon: "fa-solid fa-house" },
  // { id: "roles", label: "Roles", icon: "fa-solid fa-user-shield" },
  // { id: "users", label: "Users", icon: "fa-solid fa-users" },
  { id: "leaves", label: "Leaves", icon: "fa-solid fa-tree" },
  // { id: "assets", label: "Assets", icon: "fa-solid fa-box" },
{ id: "meet", label: "Meet", icon: "fa-solid fa-video" }  ,
// { id: "profile", label: "Profile", icon: "fa-regular fa-user" },
  { id: "settings", label: "Settings", icon: "fa-solid fa-gear" },
  { id: "projects", label: "Projects", icon: "fa-solid fa-folder" },
  // { id: "departments", label: "Departments", icon: "fa-solid fa-building" },
  // { id: "workFromHome", label: "Work From Home", icon: "fa-solid fa-house-laptop" },
  // { id: "announcements", label: "Announcements", icon: "fa-solid fa-bullhorn" },
  { id: "attendance", label: "Daily Attendance", icon: "fa-regular fa-calendar" },
  { id: "attendancehistory", label: "Attendance History", icon: "fa-regular fa-file-lines" },
];


  const isSmallScreen = useIsSmallScreen(600);

  return (
    <nav
      style={{
        width: isSmallScreen ? 70 : 220,
        backgroundColor: "#1f2937",
        color: "#fff",
        padding: "1rem 0",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
        overflow: "hidden",
        boxSizing: "border-box",
        height: "100vh",
      }}
    >
      <div
        style={{
          marginBottom: "2rem",
          textAlign: "center",
          fontWeight: "bold",
          overflow: "hidden",
          padding: "0 10px",
        }}
      >
        <img
          src="https://res.cloudinary.com/dm8z5zz5s/image/upload/v1748871708/Logo_1080_x_1080_White_en7zpv.png"
          alt="Logo"
          style={{
            maxWidth: isSmallScreen ? 40 : 100,
            margin: "auto",
            transition: "max-width 0.3s ease",
            display: "block",
          }}
        />
      </div>

      {menuItems.map(({ id, label, icon }) => {
        const isSelected = selected === id;

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={label}
            style={{
              backgroundColor: isSelected ? "rgba(14, 165, 233, 0.3)" : "transparent",
              border: "none",
              color: isSelected ? "#0ea5e9" : "#fff",
              padding: isSmallScreen ? "8px 0" : "12px 20px",
              textAlign: isSmallScreen ? "center" : "left",
              cursor: "pointer",
              marginBottom: 8,
              borderRadius: 8,
              fontWeight: isSelected ? "600" : "300",
              display: "flex",
              alignItems: "center",
              justifyContent: isSmallScreen ? "center" : "flex-start",
              gap: 12,
              fontSize: 14,
              userSelect: "none",
              transition: "background-color 0.2s ease, color 0.2s ease",
              marginLeft: 5,
              marginRight: 5,
            }}
            onMouseEnter={e => {
              if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={e => {
              if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <i
              className={icon}
              style={{
                fontSize: 20,
                color: isSelected ? "#0ea5e9" : "#ccc",
                transition: "color 0.2s ease",
                minWidth: 24,
                textAlign: "center",
              }}
              aria-hidden="true"
            />
            {!isSmallScreen && <span>{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

function useIsSmallScreen(breakpoint = 600) {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsSmall(window.innerWidth <= breakpoint);
    }
    // Run on mount
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isSmall;
}
