import React, { useState, Suspense, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, UploadCloud } from "lucide-react";
import KithLogo from "../assets/Kith.png";

import BulkUpload from "../components/onboarding/BulkUpload";
import DirectUpload from "../components/onboarding/DirectUpload";
import PhotoUpload from "../components/onboarding/PhotoUpload";

import {
  ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  pageShell, btnPrimary, btnGhost,
} from "../theme";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const UPLOAD_MODES = [
  { id: "bulk-upload",    label: "Bulk CSV",      desc: "Upload many survey records at once via spreadsheet." },
  { id: "direct-upload",  label: "Manual Entry",  desc: "Enter individual community data point by point." },
  { id: "picture-upload", label: "Photo Upload",  desc: "Upload field photos for AI-assisted extraction." },
];

const OnboardingPage: React.FC = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [activeMode, setActiveMode] = useState(UPLOAD_MODES[0].id);
  const saveDataRef = useRef<(() => void) | null>(null);

  const registerSave = useCallback((fn: () => void) => {
    saveDataRef.current = fn;
  }, []);

  const handleContinue = () => {
    if (saveDataRef.current) saveDataRef.current();
    navigate("/explore");
  };

  useEffect(() => {
    const seg = location.pathname.split("/").pop();
    const found = UPLOAD_MODES.find(m => m.id === seg);
    if (found) setActiveMode(found.id);
    else navigate(`/onboarding/${UPLOAD_MODES[0].id}`);
  }, [location, navigate]);

  const getContent = (mode: string) => {
    switch (mode) {
      case "bulk-upload":    return <BulkUpload    registerSave={registerSave} />;
      case "direct-upload":  return <DirectUpload  registerSave={registerSave} />;
      case "picture-upload": return <PhotoUpload registerSave={registerSave} />;
      default: return null;
    }
  };

  const activeIdx = UPLOAD_MODES.findIndex(m => m.id === activeMode);

  return (
    <div style={pageShell}>
      <Navbar />

      <main style={{ paddingTop: 68, minHeight: "100vh" }}>

        <div style={{
          borderBottom: `1px solid ${INK_20}`,
          padding: "48px 40px 0",
          background: PAPER,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `linear-gradient(${INK_20} 1px, transparent 1px), linear-gradient(90deg, ${INK_20} 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
            opacity: 0.5,
          }} />

          <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
              <img src={KithLogo} alt="Kith" style={{ height: 28, width: "auto" }} />
              <span style={{
                fontFamily: FONT_MONO, fontSize: "10px",
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60,
              }}>
                Data Ingestion Pipeline
              </span>
            </div>

            <h1 style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.04em", lineHeight: 0.95,
              color: INK, margin: "0 0 48px",
            }}>
              Choose ingestion<br />method.
            </h1>

            <div style={{
              display: "flex", gap: 0,
              borderTop: `1px solid ${INK_20}`,
            }}>
              {UPLOAD_MODES.map((mode, i) => {
                const isActive = activeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => navigate(`/onboarding/${mode.id}`)}
                    style={{
                      flex: 1,
                      padding: "20px 24px",
                      background: isActive ? INK : "transparent",
                      border: "none",
                      borderRight: i < UPLOAD_MODES.length - 1 ? `1px solid ${INK_20}` : "none",
                      cursor: "none",
                      textAlign: "left",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = PAPER_DARK; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{
                      fontFamily: FONT_MONO, fontWeight: 700,
                      fontSize: "11px", letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: isActive ? ACCENT : INK_60,
                      marginBottom: 6,
                    }}>
                      {String(i + 1).padStart(2, "0")}. {mode.label}
                    </div>
                    <div style={{
                      fontFamily: FONT_BODY,
                      fontSize: "0.8rem",
                      color: isActive ? "rgba(242,239,234,0.5)" : INK_60,
                      display: "none",
                    }} className="tab-desc">
                      {mode.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "64px 40px",
          minHeight: "50vh",
        }}>
          <Suspense fallback={
            <div style={{
              fontFamily: FONT_MONO, fontSize: "10px",
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: ACCENT,
            }}>
              Loading module...
            </div>
          }>
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {getContent(activeMode)}
            </motion.div>
          </Suspense>
        </div>

        <div style={{
          borderTop: `1px solid ${INK_20}`,
          padding: "32px 40px",
          background: PAPER_DARK,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                ...btnGhost,
                fontSize: "10px",
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = INK; e.currentTarget.style.color = PAPER; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = INK; }}
            >
              <ArrowLeft size={13} strokeWidth={2} /> Back
            </button>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {UPLOAD_MODES.map((_, i) => (
                  <div key={i} style={{
                    width: i === activeIdx ? 20 : 6,
                    height: 6,
                    background: i === activeIdx ? ACCENT : INK_20,
                    transition: "width 0.3s, background 0.3s",
                  }} />
                ))}
              </div>

              <button
                onClick={handleContinue}
                style={{
                  ...btnPrimary,
                  fontSize: "10px",
                  display: "flex", alignItems: "center", gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                Continue to Explore <ArrowRight size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OnboardingPage;
