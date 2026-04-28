import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ACCENT, INK, INK_20, PAPER, FONT_MONO, btnPrimary } from "../theme";
import { UserAuth } from "../context/AuthContext";
import kithLogo from "../assets/Kith.png";

const NAV_LINKS = [
  { label: "How it Works", id: "how-it-works" },
  { label: "Features",     id: "features" },
  { label: "Demo",         id: "try-it-out" },
  { label: "Team",         id: "team" },
];

const DARK_ROUTES = ["/dashboard", "/explore", "/active-deployments", "/team", "/onboarding"];

const Navbar: React.FC = () => {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { user, logOut} = UserAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const dark = DARK_ROUTES.some(r => location.pathname.startsWith(r));

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    h();
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const firstName = (n: string) => (n ? n.split(" ")[0] : "User");

  const fg         = dark ? PAPER        : INK;
  const fgMuted    = dark ? "rgba(242,239,234,0.4)" : "rgba(10,10,10,0.45)";
  const borderCol  = dark ? "rgba(242,239,234,0.12)" : INK_20;
  const navBg      = dark
    ? (scrolled ? "rgba(10,10,10,0.95)"      : "transparent")
    : (scrolled ? "rgba(242,239,234,0.97)"  : "transparent");
  const navBorder  = dark
    ? (scrolled ? "1px solid rgba(242,239,234,0.06)" : "1px solid transparent")
    : (scrolled ? `1px solid ${INK_20}`               : "1px solid transparent");

  const logoFilter = dark ? "brightness(0) invert(1)" : "none";

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, width: "100%", zIndex: 1000,
        background: navBg,
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: navBorder,
        transition: "background 0.35s, border-color 0.35s",
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 40px",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", height: 68,
        }}>

          <div
            onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setMenuOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "none" }}
          >
            <img
              src={kithLogo} alt="Kith"
              style={{ height: 28, width: "auto", filter: logoFilter, transition: "filter 0.3s" }}
            />
            <span style={{
              fontFamily: FONT_MONO, fontWeight: 700,
              fontSize: "1.1rem", color: fg, letterSpacing: "-0.01em",
              transition: "color 0.3s",
            }}>
              KITH<span style={{ color: ACCENT }}>.</span>
            </span>
          </div>

          <div className="kith-nav-desktop" style={{ display: "flex", gap: 40, alignItems: "center" }}>

            {!user && NAV_LINKS.map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: "none", border: "none", padding: 0,
                fontFamily: FONT_MONO, fontSize: "10px",
                letterSpacing: "0.2em", textTransform: "uppercase",
                color: fgMuted, cursor: "none", transition: "color 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = fg)}
                onMouseLeave={e => (e.currentTarget.style.color = fgMuted)}
              >
                {label}
              </button>
            ))}

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <button onClick={() => navigate("/dashboard")} style={{
                  background: "none", border: "none", padding: "0 0 2px",
                  fontFamily: FONT_MONO, fontSize: "10px",
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: fg, cursor: "none",
                  borderBottom: `1px solid ${ACCENT}`,
                  transition: "color 0.3s",
                }}>
                  {firstName(user.name)}
                </button>
                <button onClick={logOut} style={{
                  fontFamily: FONT_MONO, fontSize: "10px",
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  background: "none", border: `1px solid ${borderCol}`,
                  color: fgMuted, padding: "8px 16px", cursor: "none",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = fg; e.currentTarget.style.color = fg; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = borderCol; e.currentTarget.style.color = fgMuted; }}
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              <button onClick={() => navigate("/login")} style={{
                ...btnPrimary, padding: "10px 20px", fontSize: "10px",
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                ENTER PLATFORM
              </button>
            )}
          </div>

          <button
            className="kith-burger"
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: "none", border: "none", padding: 8, cursor: "none", display: "flex", flexDirection: "column", gap: 5 }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: "block", width: 24, height: 1.5,
                background: fg, transition: "transform 0.3s, opacity 0.3s, background 0.3s",
                transform: menuOpen
                  ? i === 0 ? "rotate(45deg) translate(4.5px, 4.5px)"
                  : i === 2 ? "rotate(-45deg) translate(4.5px, -4.5px)" : "none"
                  : "none",
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>

        <div style={{
          position: "absolute", top: 68, left: 0, right: 0,
          background: dark ? "#0A0A0A" : PAPER,
          borderBottom: `1px solid ${borderCol}`,
          padding: menuOpen ? "32px 40px" : "0 40px",
          maxHeight: menuOpen ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), padding 0.4s",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {!user && NAV_LINKS.map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: "none", border: "none", textAlign: "left",
                fontFamily: FONT_MONO, fontSize: "13px",
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: fg, cursor: "none",
              }}>
                {label}
              </button>
            ))}
            {user ? (
              <>
                <button onClick={() => { navigate("/dashboard"); setMenuOpen(false); }} style={{
                  background: "none", border: "none", textAlign: "left",
                  fontFamily: FONT_MONO, fontSize: "13px",
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: ACCENT, cursor: "none",
                }}>
                  → DASHBOARD
                </button>
                <button onClick={logOut} style={{
                  ...btnPrimary, width: "100%", justifyContent: "center",
                  background: dark ? PAPER : INK,
                  borderColor: dark ? PAPER : INK,
                  color: dark ? INK : PAPER,
                }}>
                  LOGOUT
                </button>
              </>
            ) : (
              <button onClick={() => { navigate("/login"); setMenuOpen(false); }} style={{
                ...btnPrimary, width: "100%", justifyContent: "center",
              }}>
                ENTER PLATFORM
              </button>
            )}
          </div>
        </div>
      </nav>

      <style>{`
        @media (min-width: 769px) { .kith-burger { display: none !important; } }
        @media (max-width: 768px) { .kith-nav-desktop { display: none !important; } }
      `}</style>
    </>
  );
};

export default Navbar;
