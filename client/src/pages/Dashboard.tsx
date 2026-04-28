import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Map, Users, UploadCloud, Target, TrendingDown } from "lucide-react";
import {
  pageDark, ACCENT, INK, FONT_MONO, FONT_DISPLAY, FONT_BODY,
  PAPER, CLEAR, btnPrimary, btnGhostDark,
} from "../theme";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { UserAuth } from "../context/AuthContext";
import { database } from "../firebase";
import { ref, set, update, get, onValue } from "firebase/database";
import { runRetentionPass } from "../services/PrivacyService";
import UserModel from "../models/UserModel";

const MODULES = [
  {
    icon: Users,
    label: "Team Management",
    desc: "Field team roster · Assignment board",
    tag: "OPS",
    path: "/team",
    status: "ACTIVE",
    statusColor: CLEAR,
    hoverBg: "#081408",
    hoverBorder: CLEAR,
  },
  {
    icon: Map,
    label: "Risk Explorer",
    desc: "Live heatmap · Zone drawing · Real-time sync",
    tag: "MAPS",
    path: "/explore",
    status: "LIVE",
    statusColor: ACCENT,
    hoverBg: "#131500",
    hoverBorder: ACCENT,
  },
  {
    icon: UploadCloud,
    label: "Ingest Data",
    desc: "Bulk CSV or manual field survey entry",
    tag: "PIPELINE",
    path: "/onboarding/bulkUpload",
    status: "READY",
    statusColor: "#1A3FFF",
    hoverBg: "#00071A",
    hoverBorder: "#1A3FFF",
  },
  {
    icon: Target,
    label: "Active Deployments",
    desc: "Browse zones · Deployment intelligence",
    tag: "INTEL",
    path: "/active-deployments",
    status: "SYNCED",
    statusColor: "#FF8C00",
    hoverBg: "#180A00",
    hoverBorder: "#FF8C00",
  },
  {
    icon: TrendingDown,
    label: "Impact Timeline",
    desc: "Risk reduction over time · Intervention outcomes",
    tag: "OUTCOMES",
    path: "/impact",
    status: "LIVE",
    statusColor: CLEAR,
    hoverBg: "#00140A",
    hoverBorder: CLEAR,
  },
];

const Dashboard: React.FC = () => {
  const auth     = UserAuth();
  const navigate = useNavigate();
  const [time,        setTime]        = useState(new Date());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const [teamCount,        setTeamCount]        = useState<number | null>(null);
  const [zoneCount,        setZoneCount]        = useState<number | null>(null);
  const [evalReadyCount,   setEvalReadyCount]   = useState<number | null>(null);
  const [impactCount,      setImpactCount]      = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const updateUserInfo = useCallback(() => {
    if (!auth?.user) return;
    const userRef = ref(database, `users/${auth.user.id}`);
    get(userRef).then(snap => {
      if (snap.exists()) {
        const updates: Partial<UserModel> = { lastLogin: new Date() };
        const d = snap.val();
        if (!d.name  && auth.user?.name)  updates.name  = auth.user.name;
        if (!d.email && auth.user?.email) updates.email = auth.user.email;
        updates.photoURL = auth.user?.photoURL;
        update(userRef, updates);
      } else {
        set(userRef, {
          name:      auth.user?.name,
          email:     auth.user?.email,
          photoURL:  auth.user?.photoURL,
          createdAt: auth.user?.createdAt ? new Date(auth.user.createdAt.toISOString()) : new Date(),
          lastLogin: new Date(),
        });
      }
    });
  }, [auth]);

  useEffect(() => {
    if (!auth?.user) { navigate("/login"); return; }
    updateUserInfo();
    runRetentionPass(auth.user.id).catch(console.error);

    const uid = auth.user.id;

      const unsubTeam = onValue(ref(database, `users/${uid}/teamMembers`), snap => {
        setTeamCount(snap.exists() ? Object.keys(snap.val()).length : 0);
      });

      const unsubZones = onValue(ref(database, `users/${uid}/teamAssignments`), snap => {
        if (!snap.exists()) { setZoneCount(0); setEvalReadyCount(0); return; }
        const zones = Object.values(snap.val()) as any[];
        setZoneCount(zones.length);
        setEvalReadyCount(zones.filter((z: any) => z.crimeScore !== undefined).length);
      });

      const unsubImpact = onValue(ref(database, `users/${uid}/interventionHistory`), snap => {
        setImpactCount(snap.exists() ? Object.keys(snap.val()).length : 0);
      });

      return () => { unsubTeam(); unsubZones(); unsubImpact(); };
  }, [auth, navigate, updateUserInfo]);

  const firstName = auth?.user?.name?.split(" ")[0] ?? "Operator";

  const signOut = async () => {
    try { auth?.logOut && await auth.logOut(); } catch (e) { console.error(e); }
  };

  const fmt24 = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase();

  return (
    <div style={{ ...pageDark, fontFamily: FONT_BODY }}>
      <Navbar />

      <main style={{ minHeight: "100vh", paddingTop: 68 }}>

        <section style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "calc(100vh - 68px)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            backgroundImage:
              "linear-gradient(rgba(242,239,234,0.025) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(242,239,234,0.025) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }} />

          <div aria-hidden="true" style={{
            position: "absolute", right: "-3%", bottom: "-5%",
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: "clamp(10rem, 22vw, 24rem)",
            lineHeight: 0.85, letterSpacing: "-0.06em",
            color: "transparent",
            WebkitTextStroke: "1px rgba(242,239,234,0.03)",
            userSelect: "none", pointerEvents: "none", zIndex: 0,
          }}>
            OPS
          </div>

          <div style={{
            borderBottom: "1px solid rgba(242,239,234,0.05)",
            padding: "9px 40px",
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: 8,
            background: "rgba(0,0,0,0.25)",
            position: "relative", zIndex: 1,
          }}>
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "rgba(242,239,234,0.2)",
              }}>
                from ArnabIsCoding
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: CLEAR, boxShadow: `0 0 6px ${CLEAR}`,
                }} />
                <span style={{
                  fontFamily: FONT_MONO, fontSize: "9px",
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: CLEAR,
                }}>
                  KITH OPS CENTER
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <span className="db-hide-sm" style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.1em", color: "rgba(242,239,234,0.2)",
              }}>
                {fmtDate(time)}
              </span>
              <span style={{
                fontFamily: FONT_MONO, fontSize: "11px",
                letterSpacing: "0.06em", color: "rgba(242,239,234,0.5)",
                minWidth: 72,
              }}>
                {fmt24(time)}
              </span>
            </div>
          </div>

          <div style={{
            flex: 1,
            maxWidth: 1280, margin: "0 auto", width: "100%",
            padding: "52px 40px 56px",
            position: "relative", zIndex: 1,
            display: "flex", flexDirection: "column", gap: 52,
          }}>
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <span style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.24em", textTransform: "uppercase",
                color: ACCENT, display: "block", marginBottom: 16,
              }}>
                Operator Session
              </span>
              <h1 style={{
                fontFamily: FONT_DISPLAY, fontWeight: 700,
                fontSize: "clamp(2.4rem, 5vw, 5rem)",
                letterSpacing: "-0.04em", lineHeight: 0.93,
                color: PAPER, margin: "0 0 16px",
              }}>
                Welcome,{" "}
                <span style={{ color: ACCENT }}>{firstName}.</span>
              </h1>
              <p style={{
                color: "rgba(242,239,234,0.38)",
                fontSize: "clamp(0.85rem, 1.2vw, 0.92rem)",
                lineHeight: 1.75, maxWidth: 380,
                margin: "0 0 28px",
                fontFamily: FONT_BODY,
              }}>
                Your geospatial intelligence platform is operational. Select a module below.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => navigate("/explore")}
                  style={{ ...btnPrimary, fontSize: "10px", display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  Open Ops Map <ArrowUpRight size={13} strokeWidth={2.5} />
                </button>
                <button
                  onClick={signOut}
                  style={{ ...btnGhostDark, fontSize: "10px" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(242,239,234,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Logout
                </button>
              </div>
            </motion.div>

            <div>
              <span style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "rgba(242,239,234,0.18)",
                display: "block", marginBottom: 12,
              }}>
                Modules
              </span>

              <div className="db-grid">
                {MODULES.map((mod, i) => {
                  const isHovered = hoveredCard === i;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.12 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => navigate(mod.path)}
                      onMouseEnter={() => setHoveredCard(i)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background:   isHovered ? mod.hoverBg     : "#0A0A0A",
                        border:       isHovered
                          ? `1px solid ${mod.hoverBorder}`
                          : "1px solid rgba(242,239,234,0.06)",
                        padding: "28px 24px",
                        cursor: "none",
                        transition: "background 0.2s, border-color 0.2s",
                        display: "flex", flexDirection: "column",
                      }}
                    >
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 22,
                      }}>
                        <span style={{
                          fontFamily: FONT_MONO, fontSize: "8px",
                          letterSpacing: "0.22em", textTransform: "uppercase",
                          color: isHovered ? mod.hoverBorder : ACCENT,
                          transition: "color 0.2s",
                        }}>
                          {mod.tag}
                        </span>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 5,
                          fontFamily: FONT_MONO, fontSize: "8px",
                          letterSpacing: "0.16em", textTransform: "uppercase",
                          color: mod.statusColor,
                        }}>
                          <span style={{
                            width: 4, height: 4, borderRadius: "50%",
                            background: mod.statusColor,
                            display: "inline-block",
                            boxShadow: isHovered ? `0 0 5px ${mod.statusColor}` : "none",
                            transition: "box-shadow 0.2s",
                          }} />
                          {i === 0 && (teamCount        !== null ? `${teamCount} MEMBERS`        : mod.status)}
                          {i === 1 && mod.status}
                          {i === 2 && mod.status}
                          {i === 3 && (zoneCount        !== null ? `${zoneCount} ZONE${zoneCount !== 1 ? "S" : ""} · ${evalReadyCount ?? 0} READY` : mod.status)}
                          {i === 4 && (impactCount      !== null ? `${impactCount} COMPLETED`     : mod.status)}
                        </div>
                      </div>

                      <div style={{
                        width: 36, height: 36,
                        border: isHovered
                          ? `1px solid ${mod.hoverBorder}`
                          : "1px solid rgba(242,239,234,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 16,
                        transition: "border-color 0.2s",
                      }}>
                        <mod.icon
                          size={16}
                          color={isHovered ? mod.hoverBorder : ACCENT}
                          strokeWidth={1.5}
                        />
                      </div>

                      <h3 style={{
                        fontFamily: FONT_DISPLAY, fontWeight: 700,
                        fontSize: "1.05rem", letterSpacing: "-0.02em",
                        color: PAPER, margin: "0 0 8px", lineHeight: 1.2,
                        transition: "color 0.2s",
                      }}>
                        {mod.label}
                      </h3>

                      <p style={{
                        fontFamily: FONT_BODY,
                        color: isHovered ? "rgba(242,239,234,0.45)" : "rgba(242,239,234,0.28)",
                        fontSize: "0.8rem", lineHeight: 1.65,
                        margin: "0 0 20px", flex: 1,
                        transition: "color 0.2s",
                      }}>
                        {mod.desc}
                      </p>

                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontFamily: FONT_MONO, fontSize: "8px",
                        letterSpacing: "0.16em", textTransform: "uppercase",
                        color: isHovered ? mod.hoverBorder : "rgba(242,239,234,0.2)",
                        transition: "color 0.2s",
                      }}>
                        OPEN MODULE <ArrowUpRight size={10} strokeWidth={2} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        /* 4-col → 2-col → 1-col */
        .db-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1px;
          background: rgba(242,239,234,0.06);
        }
        @media (max-width: 1024px) {
          .db-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .db-grid { grid-template-columns: 1fr !important; }
          .db-hide-sm { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
