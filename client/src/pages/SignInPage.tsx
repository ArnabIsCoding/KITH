import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import {
  ACCENT, INK, INK_20, INK_60, PAPER,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
} from "../theme";
import Navbar from "../components/Navbar";
import KithLogo from "../assets/Kith.png";

const MANIFESTO_LINES = [
  "Community intelligence,",
  "not surveillance.",
  "Data that protects,",
  "never profiles.",
  "NGO-grade precision.",
  "Human-reviewed.",
  "Ethical AI.",
];

const SignInPage: React.FC = () => {
  const { user, loading, googleSignIn } = UserAuth();
  const navigate = useNavigate();

  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    setErrorMsg("");
    setSigningIn(true);
    try {
      await googleSignIn();
    } catch (error: any) {
      if (
        error?.code !== "auth/popup-closed-by-user" &&
        error?.code !== "auth/cancelled-popup-request"
      ) {
        setErrorMsg("Sign-in failed. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const sessionChecking = loading && !signingIn;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: PAPER }}>
      <Navbar />
      <div className="signin-left" style={{
        flex: "0 0 55%",
        background: INK,
        padding: "140px 64px 64px",
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(242,239,234,0.03) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(242,239,234,0.03) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />
        <div aria-hidden="true" style={{
          position: "absolute", bottom: -40, right: -20,
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: "clamp(10rem, 18vw, 18rem)",
          lineHeight: 0.85, letterSpacing: "-0.06em",
          color: "transparent",
          WebkitTextStroke: "1px rgba(242,239,234,0.04)",
          userSelect: "none", pointerEvents: "none",
        }}>
          KITH
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: ACCENT }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: "10px",
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: ACCENT, display: "block", marginBottom: 48,
          }}>
            Our Commitment
          </span>
          <div>
            {MANIFESTO_LINES.map((line, i) => (
              <motion.p key={i}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 700,
                  fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
                  lineHeight: 1.05, letterSpacing: "-0.035em",
                  margin: 0,
                  color: i % 2 === 0 ? PAPER : "rgba(242,239,234,0.22)",
                }}
              >
                {line}
              </motion.p>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ width: 32, height: 1, background: ACCENT, marginBottom: 20 }} />
          <p style={{
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(242,239,234,0.25)", margin: 0, lineHeight: 2,
          }}>
            Google Solution Challenge 2026<br />
            Early Detection — Substance Abuse Risks
          </p>
        </div>
      </div>
      <div className="signin-right" style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "140px 48px 64px",
        background: PAPER, position: "relative",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "100%", maxWidth: 360 }}
        >
          <div style={{ marginBottom: 48 }}>
            <img src={KithLogo} alt="Kith"
              onClick={() => navigate("/")}
              style={{ height: 40, width: "auto", cursor: "none" }}
            />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            letterSpacing: "-0.04em", lineHeight: 0.95,
            color: INK, margin: "0 0 16px",
          }}>
            Enter the<br />
            <span style={{ color: ACCENT }}>ops platform.</span>
          </h1>
          <p style={{
            fontFamily: FONT_BODY, fontSize: "0.95rem",
            color: INK_60, lineHeight: 1.7, margin: "0 0 48px",
          }}>
            Sign in with your Google account to access the Kith geospatial intelligence platform.
          </p>

          {sessionChecking ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 24px", border: `1px solid ${INK_20}`,
            }}>
              <div style={{
                width: 14, height: 14, flexShrink: 0,
                border: `1.5px solid ${INK_20}`,
                borderTop: `1.5px solid ${INK}`,
                borderRadius: "50%",
                animation: "kith-spin 0.8s linear infinite",
              }} />
              <span style={{
                fontFamily: FONT_MONO, fontSize: "10px",
                letterSpacing: "0.16em", textTransform: "uppercase", color: INK_60,
              }}>
                Checking session…
              </span>
            </div>
          ) : (
            <div>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 12,
                  padding: "14px 24px",
                  border: `1px solid ${INK}`,
                  background: signingIn ? "#222" : INK,
                  color: PAPER,
                  fontFamily: FONT_MONO, fontSize: "10px",
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  cursor: signingIn ? "not-allowed" : "none",
                  width: "100%", boxSizing: "border-box",
                  transition: "background 0.2s",
                  appearance: "none", outline: "none",
                  touchAction: "manipulation",
                }}
                onMouseEnter={e => { if (!signingIn) e.currentTarget.style.background = "#222"; }}
                onMouseLeave={e => { if (!signingIn) e.currentTarget.style.background = INK; }}
              >
                {signingIn ? (
                  <>
                    <div style={{
                      width: 16, height: 16, flexShrink: 0,
                      border: "2px solid rgba(242,239,234,0.2)",
                      borderTop: `2px solid ${PAPER}`,
                      borderRadius: "50%",
                      animation: "kith-spin 0.7s linear infinite",
                    }} />
                    Opening Google…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
              {errorMsg && (
                <p style={{
                  fontFamily: FONT_MONO, fontSize: "9px",
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "#FF3B2F", margin: "12px 0 0", textAlign: "center",
                }}>
                  {errorMsg}
                </p>
              )}

              <p style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: INK_60, margin: "20px 0 0", textAlign: "center",
                lineHeight: 1.8,
              }}>
                No passwords stored · OAuth only<br />
                Zero individual data collected
              </p>
            </div>
          )}
          <button onClick={() => navigate("/")} style={{
            background: "none", border: "none", padding: 0,
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: INK_60, cursor: "none", marginTop: 40,
            transition: "color 0.2s", display: "block",
            touchAction: "manipulation",
          }}
            onMouseEnter={e => e.currentTarget.style.color = INK}
            onMouseLeave={e => e.currentTarget.style.color = INK_60}
          >
            ← Back to landing
          </button>
        </motion.div>
      </div>

      <style>{`
        @keyframes kith-spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .signin-left  { display: none !important; }
          .signin-right {
            padding-top: 100px !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SignInPage;
