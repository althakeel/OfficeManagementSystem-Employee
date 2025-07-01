import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import DashboardHome from "./Home";
import Profile from "./Profile";
import Settings from "./Settings";
import DailyAttendance from "./DailyAttandence";
import AttendanceHistory from "./AttendanceHistory";
import Projects from "./Projects"; 
import Leaves from "./Leaves";
import Announcement from "./Announcement";
import Meet from "./meet";

export default function Dashboard({ userEmail, onLogout }) {
  const [selectedPage, setSelectedPage] = useState("attendance");

  const renderContent = () => {
    switch (selectedPage) {
      case "attendance":
        return <DailyAttendance userId={userEmail} />;
      case "home":
        return <DashboardHome />;
      case "profile":
        return <Profile />;
      case "attendancehistory":
        return <AttendanceHistory userId={userEmail} />;
      case "settings":
        return <Settings />;
      case "projects":
        return <Projects />;
      case "leaves":
        return <Leaves />;
      case "announcements":
        return <Announcement />;
          case "meet":
        return <Meet />;
      default:
        return <DashboardHome />;
    }
  };

  const handleAnnouncementClick = () => {
    setSelectedPage("announcements");
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        backgroundColor: "#111827",
        color: "#fff",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <Sidebar selected={selectedPage} onSelect={setSelectedPage} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", minWidth: 0 }}>
  <Topbar userEmail={userEmail} onLogout={onLogout} onAnnouncementClick={handleAnnouncementClick} />
  <main style={{ padding: 20, flexGrow: 1, overflowY: "auto", overflowX: "auto", minWidth: 0 }}>
    {renderContent()}
  </main>
</div>

    </div>
  );
}
