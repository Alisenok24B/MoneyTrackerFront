// components/FullScreenSpinner.tsx
import React from "react";

export function FullScreenSpinner() {
  return (
    <div style={{
      position: "fixed",
      zIndex: 9999,
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(12, 20, 30, 0.92)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: 50,
        height: 50,
        border: "6px solid #ddd",
        borderTop: "6px solid #1e40af",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <style>
        {`@keyframes spin {
            0% { transform: rotate(0deg);}
            100% { transform: rotate(360deg);}
        }`}
      </style>
    </div>
  );
}