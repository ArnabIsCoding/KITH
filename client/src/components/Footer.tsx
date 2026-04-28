import React from "react";
import { Link } from "react-router-dom";
import { ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK, FONT_MONO, FONT_DISPLAY } from "../theme";
import kithLogo from "../assets/Kith.png";

const Footer: React.FC = () => (
  <footer style={{
    background: INK,
    borderTop: `1px solid rgba(242,239,234,0.06)`,
  }}>
    <div style={{ height: 3, background: ACCENT }} />

    <div style={{
      maxWidth: 1280, margin: "0 auto",
      padding: "80px 40px 48px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 48,
        marginBottom: 80,
        paddingBottom: 64,
        borderBottom: "1px solid rgba(242,239,234,0.06)",
      }}>
        <div>
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              display: "flex", alignItems: "center",
              gap: 10, cursor: "none", marginBottom: 24,
            }}
          >
            <img src={kithLogo} alt="Kith" style={{ height: 28, width: "auto", filter: "brightness(0) invert(1)" }} />
            <span style={{
              fontFamily: FONT_MONO, fontWeight: 700,
              fontSize: "1.05rem", color: "rgba(242,239,234,0.9)",
              letterSpacing: "-0.01em",
            }}>
              KITH<span style={{ color: ACCENT }}>.</span>
            </span>
          </div>
          <p style={{
            fontFamily: FONT_MONO,
            fontSize: "10px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(242,239,234,0.25)",
            margin: 0,
            maxWidth: 260,
            lineHeight: 1.9,
          }}>
            Geospatial Intelligence Platform<br />
            Google Solution Challenge 2026
          </p>
        </div>
        <div style={{ display: "flex", gap: 80, flexWrap: "wrap" }}>
          <div>
            <p style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.24em", textTransform: "uppercase",
              color: ACCENT, margin: "0 0 24px",
            }}>
              Platform
            </p>
            {[
              { name: "Dashboard", path: "/" },
              { name: "Risk Explorer", path: "/explore" },
              { name: "Team Management", path: "/team" },
              { name: "Ingest Data", path: "/onboarding" },
              { name: "Active Deployments", path: "/active-deployments" },
              { name: "Impact Timeline", path: "/impact" },
            ].map(item => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => window.scrollTo(0, 0)}
                style={{
                  display: "block",
                  textDecoration: "none",
                  fontFamily: FONT_MONO, fontSize: "10px",
                  letterSpacing: "0.14em",
                  color: "rgba(242,239,234,0.3)",
                  margin: "0 0 14px",
                  cursor: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(242,239,234,0.8)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(242,239,234,0.3)")}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div>
            <p style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.24em", textTransform: "uppercase",
              color: ACCENT, margin: "0 0 24px",
            }}>
              Built With
            </p>
            {["Google Gemini - Vertex AI", "Maps API", "Firebase - hosting, functions", "React + TypeScript", "indexedDB"].map(item => (
              <p key={item} style={{
                fontFamily: FONT_MONO, fontSize: "10px",
                letterSpacing: "0.14em",
                color: "rgba(242,239,234,0.3)",
                margin: "0 0 14px",
              }}>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <p style={{
          fontFamily: FONT_MONO, fontSize: "9px",
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "rgba(242,239,234,0.2)", margin: 0,
        }}>
          © 2026 Kith — Ethical AI · Privacy First
        </p>
        <p style={{
          fontFamily: FONT_MONO, fontSize: "9px",
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "rgba(242,239,234,0.2)", margin: 0,
        }}>
          Early Detection of Substance Abuse Risks in Communities
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
