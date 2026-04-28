
import React from "react";
import { Navigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import { ACCENT, INK, PAPER, FONT_MONO } from "../theme";

interface ProtectedProps {
  children: React.ReactNode;
}

const Protected: React.FC<ProtectedProps> = ({ children }) => {
  const auth = UserAuth();

  if (auth.loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0A0A0A",
        gap: 20,
      }}>
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <div style={{
            position: "absolute", inset: 0,
            border: "1px solid rgba(242,239,234,0.08)",
            borderRadius: "50%",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            border: "2px solid transparent",
            borderTopColor: ACCENT,
            borderRadius: "50%",
            animation: "kith-spin 0.9s linear infinite",
          }} />
        </div>

        <span style={{
          fontFamily: FONT_MONO,
          fontSize: "9px",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(242,239,234,0.25)",
        }}>
          Verifying session…
        </span>

        <style>{`@keyframes kith-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default Protected;
