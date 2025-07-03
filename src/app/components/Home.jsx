import React from "react";
import Graph from "./graph"; 
import LeaveGraph from "./leavegraph";
import styles from "./Home.module.css";

export default function DashboardHome() {
  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <LeaveGraph />
      </div>
      <div className={styles.box}>
        <Graph />
      </div>
    </div>
  );
}
