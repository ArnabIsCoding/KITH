import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import {
  ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  pageShell, btnPrimary,
} from "../theme";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={pageShell}>
      <Navbar />

      <main style={{
        minHeight: "100vh",
        paddingTop: 68,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="grid-overlay" />

        <div aria-hidden="true" style={{
          position: "absolute",
          left: "50%", top: "50%",
          transform: "translate(-50%, -52%)",
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: "clamp(16rem, 32vw, 32rem)",
          lineHeight: 0.85, letterSpacing: "-0.06em",
          color: "transparent",
          WebkitTextStroke: `1px ${INK_20}`,
          userSelect: "none", pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          404
        </div>

        <div style={{
          flex: 1,
          maxWidth: 1280, margin: "0 auto", width: "100%",
          padding: "0 40px",
          display: "flex", flexDirection: "column",
          justifyContent: "center",
          position: "relative", zIndex: 1,
        }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span style={{
              fontFamily: FONT_MONO, fontSize: "10px",
              letterSpacing: "0.24em", textTransform: "uppercase",
              color: INK_60, display: "block", marginBottom: 24,
            }}>
              Error · Page Not Found
            </span>

            <h1 style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: "clamp(2.4rem, 5vw, 5rem)",
              letterSpacing: "-0.045em", lineHeight: 0.93,
              color: INK, margin: "0 0 24px",
            }}>
              Lost in the field.<br />
              <span style={{ color: ACCENT }}>No intel here.</span>
            </h1>

            <p style={{
              fontFamily: FONT_BODY,
              color: INK_60, fontSize: "0.95rem",
              lineHeight: 1.75, maxWidth: 380,
              margin: "0 0 40px",
            }}>
              The page you are looking for does not exist or has been moved. Return to the ops centre.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/", { replace: true })}
                style={{ ...btnPrimary, fontSize: "10px", display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Back to Landing <ArrowUpRight size={13} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => navigate("/dashboard", { replace: true })}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 24px",
                  background: "transparent", color: INK,
                  fontFamily: FONT_MONO, fontWeight: 400,
                  fontSize: "10px", letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  border: `1px solid ${INK}`,
                  cursor: "none", transition: "background 0.18s, color 0.18s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = INK; }}
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
