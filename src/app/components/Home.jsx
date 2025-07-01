// DashboardHome.jsx
import React from "react";
import Graph from "./graph"; 
import LeaveGraph from "./leavegraph";

export default function DashboardHome() {
  const containerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    padding: "20px",
  };

  const boxStyle = {
     background: "rgba(255, 255, 255, 0.15)",  // semi-transparent white
  borderRadius: "8px",
  padding: "20px",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(10px)",              // blur effect
  WebkitBackdropFilter: "blur(10px)",       // Safari support
  border: "1px solid rgba(255, 255, 255, 0.3)", // subtle border for glass effect
  display: "flex",
  flexDirection: "column",
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
     <LeaveGraph/>
      </div>

      <div style={boxStyle}>
      
        <Graph />
      </div>
    </div>
  );
}
