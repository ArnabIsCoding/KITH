import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { onValue, ref, push, remove } from "firebase/database";
import { database } from "../firebase";
import { Map, ArrowUpRight, Maximize2 } from "lucide-react";
import { TeamAssignmentModel } from "../models/TeamAssignmentModel";
import ActiveDeploymentsCard from "../components/ActiveDeploymentsCard";
import InterventionOutcomeModal from "../components/InterventionOutcomeModal";
import { UserAuth } from "../context/AuthContext";
import { useJsApiLoader, GoogleMap, Rectangle } from "@react-google-maps/api";
import KithLogo from "../assets/Kith.png";

import {
  ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  pageDark, btnPrimary, CLEAR,
} from "../theme";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const mapLibraries: ("drawing" | "visualization" | "places")[] = ["drawing", "visualization", "places"];

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#444444" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#222222" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f0f0f" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#222" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#666" }] },
];

const ActiveDeployments: React.FC = () => {
  const auth     = UserAuth();
  const navigate = useNavigate();
  const mapRef   = useRef<google.maps.Map | null>(null);

  const [assignments, setAssignments] = useState<TeamAssignmentModel[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [mapCenter, setMapCenter]     = useState({ lat: 27.0108, lng: 88.1411 });
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [outcomeTarget, setOutcomeTarget] = useState<(TeamAssignmentModel & { originalRiskScore?: number }) | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_googleMapsAPIKey || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: mapLibraries,
  });
  const fetchData = useCallback(() => {
    console.log("Firebase real-time sync active. No manual refresh needed.");
  }, []);
  useEffect(() => {
    if (!auth?.user?.id) return;

    const assignmentsRef = ref(database, `users/${auth.user.id}/teamAssignments`);
    const onboardingRef  = ref(database, `users/${auth.user.id}/onboardingData`);

    const unsubA = onValue(assignmentsRef, snap => {
      const data = snap.val();
      if (data) {
        const parsed = Object.keys(data).map(key => ({ id: key, ...data[key] })) as TeamAssignmentModel[];
        setAssignments(parsed);
        if (parsed.length > 0 && !expandedMember) {
          setExpandedMember(Array.from(new Set(parsed.map(a => a.assignedTo))).sort()[0]);
        }
      } else {
        setAssignments([]);
      }
    });

    const unsubP = onValue(onboardingRef, snap => {
      const data = snap.val();
      if (data) {
        setAllProfiles(Object.keys(data).map(key => ({
          id: key, ...data[key],
          lat: Number(data[key].lat), lng: Number(data[key].lng),
        })));
      } else {
        setAllProfiles([]);
      }
    });

    return () => { unsubA(); unsubP(); };
  }, [auth?.user?.id]);

  const getProfilesInZone = useCallback((assignment: TeamAssignmentModel) => {
    return allProfiles.filter(p => {
      const inLat = p.lat <= (assignment.northEast as any).lat && p.lat >= (assignment.southWest as any).lat;
      const inLng = p.lng <= (assignment.northEast as any).lng && p.lng >= (assignment.southWest as any).lng;
      return inLat && inLng;
    });
  }, [allProfiles]);
  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (assignments.length > 0 && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      assignments.forEach(a => { bounds.extend((a.northEast as any)); bounds.extend((a.southWest as any)); });
      map.fitBounds(bounds);
    }
  };

  const handleFocusZone = (assignment: TeamAssignmentModel) => {
    if (mapRef.current && window.google) {
      const bounds = new window.google.maps.LatLngBounds((assignment.southWest as any), (assignment.northEast as any));
      mapRef.current.fitBounds(bounds);
    }
  };

  const handleCenterGlobal = () => {
    if (mapRef.current && window.google && assignments.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      assignments.forEach(a => { bounds.extend((a.northEast as any)); bounds.extend((a.southWest as any)); });
      mapRef.current.fitBounds(bounds);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (auth?.user?.id && window.confirm("Delete this deployment zone permanently?"))
      await remove(ref(database, `users/${auth.user.id}/teamAssignments/${assignmentId}`));
  };
  const handleMarkAsDone = (assignment: TeamAssignmentModel) => {
    const profiles = getProfilesInZone(assignment);
    let originalRiskScore: number | undefined;
    if (profiles.length > 0) {
      let totalWeight = 0; let weightedSum = 0;
      profiles.forEach(p => { const w = p.demographicSize || 1; totalWeight += w; weightedSum += (p.risk_score * w); });
      originalRiskScore = Math.round((weightedSum / totalWeight) * 10) / 10;
    } else if (assignment.crimeScore) {
      originalRiskScore = Number(assignment.crimeScore);
    }
    setOutcomeTarget({ ...assignment, originalRiskScore });
  };

  const archiveZone = async (assignment: TeamAssignmentModel) => {
    if (auth?.user?.id) {
      await push(ref(database, `users/${auth.user.id}/assignmentHistory`), { ...assignment, completedAt: new Date().toISOString(), status: "done" });
      await remove(ref(database, `users/${auth.user.id}/teamAssignments/${assignment.id}`));
      setOutcomeTarget(null);
    }
  };

  const teamMembers = Array.from(new Set(assignments.map(a => a.assignedTo))).sort();

  return (
    <div style={pageDark}>
      <Navbar />

      <main style={{ paddingTop: 68, minHeight: "100vh" }}>
        <div style={{
          borderBottom: "1px solid rgba(242,239,234,0.06)",
          padding: "48px 40px 40px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `linear-gradient(rgba(242,239,234,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,234,0.02) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }} />

          <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
              <div>
                <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: 16 }}>
                  Ops Dashboard
                </span>
                <h1 style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 700,
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  letterSpacing: "-0.04em", lineHeight: 0.95,
                  color: PAPER, margin: 0,
                }}>
                  Active Deployments
                </h1>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                  border: "1px solid rgba(242,239,234,0.08)",
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: CLEAR, boxShadow: `0 0 6px ${CLEAR}` }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: CLEAR }}>
                    {assignments.length} Active Zone{assignments.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <button onClick={handleCenterGlobal}
                  style={{
                    padding: "10px 14px", background: "none",
                    border: "1px solid rgba(242,239,234,0.08)",
                    cursor: "none", display: "flex", alignItems: "center", gap: 6,
                    fontFamily: FONT_MONO, fontSize: "9px",
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    color: "rgba(242,239,234,0.4)",
                    transition: "border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(242,239,234,0.08)"; e.currentTarget.style.color = "rgba(242,239,234,0.4)"; }}
                >
                  <Maximize2 size={12} strokeWidth={1.5} /> Fit All
                </button>

                <button onClick={() => navigate("/explore")}
                  style={{ ...btnPrimary, fontSize: "10px", display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  Deploy New Zone <ArrowUpRight size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, alignItems: "start" }} className="nest-layout">

          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)", paddingRight: 24 }} className="nest-list">
            {assignments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  padding: "60px 40px",
                  border: "1px dashed rgba(242,239,234,0.1)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(242,239,234,0.2)", marginBottom: 20 }}>
                  No Active Deployments
                </div>
                <p style={{ fontFamily: FONT_BODY, fontSize: "0.9rem", color: "rgba(242,239,234,0.3)", lineHeight: 1.7, margin: "0 0 24px" }}>
                  Draw a zone on the Explore map to assign tasks to your field team.
                </p>
                <button onClick={() => navigate("/explore")}
                  style={{ ...btnPrimary, fontSize: "10px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Map size={13} strokeWidth={1.5} /> Open Explore Map
                </button>
              </motion.div>
            ) : (
              teamMembers.map((member, mi) => (
                <div key={member} style={{ marginBottom: 1 }}>
                  <button
                    onClick={() => setExpandedMember(expandedMember === member ? null : member)}
                    style={{
                      width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "16px 20px",
                      background: expandedMember === member ? "rgba(242,239,234,0.04)" : "rgba(242,239,234,0.02)",
                      border: "none",
                      borderBottom: expandedMember === member ? "none" : "1px solid rgba(242,239,234,0.06)",
                      cursor: "none",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(242,239,234,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = expandedMember === member ? "rgba(242,239,234,0.04)" : "rgba(242,239,234,0.02)"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: expandedMember === member ? ACCENT : "rgba(242,239,234,0.2)",
                        transition: "background 0.2s",
                      }} />
                      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em", color: expandedMember === member ? PAPER : "rgba(242,239,234,0.5)" }}>
                        {member}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(242,239,234,0.3)" }}>
                        {assignments.filter(a => a.assignedTo === member).length} zone{assignments.filter(a => a.assignedTo === member).length !== 1 ? "s" : ""}
                      </span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: "12px", color: expandedMember === member ? ACCENT : "rgba(242,239,234,0.2)", transition: "color 0.2s" }}>
                        {expandedMember === member ? "−" : "+"}
                      </span>
                    </div>
                  </button>

                  {expandedMember === member && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {assignments
                        .filter(a => a.assignedTo === member)
                        .map(assignment => (
                          <ActiveDeploymentsCard
                            key={assignment.id}
                            assignment={assignment}
                            intersectedProfiles={getProfilesInZone(assignment)}
                            onDelete={handleDelete}
                            onMarkDone={handleMarkAsDone}
                            onFocus={handleFocusZone}
                            onRefresh={fetchData}
                          />
                        ))}
                    </motion.div>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={{ position: "sticky", top: 88 }}>
            <div style={{ border: "1px solid rgba(242,239,234,0.06)", overflow: "hidden", height: "calc(100vh - 280px)" }}>
              <div style={{
                padding: "12px 20px",
                borderBottom: "1px solid rgba(242,239,234,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(242,239,234,0.02)",
              }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(242,239,234,0.3)" }}>
                  Deployment Map
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: CLEAR, boxShadow: `0 0 4px ${CLEAR}` }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: CLEAR }}>Live</span>
                </div>
              </div>

              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "calc(100% - 45px)" }}
                  center={mapCenter}
                  zoom={12}
                  options={{ styles: DARK_MAP_STYLE, disableDefaultUI: true, zoomControl: true }}
                  onLoad={handleMapLoad}
                >
                  {assignments.map(a => (
                    <Rectangle
                      key={a.id}
                      bounds={{ north: (a.northEast as any).lat, east: (a.northEast as any).lng, south: (a.southWest as any).lat, west: (a.southWest as any).lng }}
                      options={{ fillColor: ACCENT, fillOpacity: 0.12, strokeColor: ACCENT, strokeWeight: 1.5 }}
                    />
                  ))}
                </GoogleMap>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 32, height: 32, border: "1px solid rgba(242,239,234,0.1)", borderTop: `2px solid ${ACCENT}`, borderRadius: "50%", animation: "kith-spin 0.9s linear infinite" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {outcomeTarget && (
        <InterventionOutcomeModal
          assignment={outcomeTarget}
          onClose={() => setOutcomeTarget(null)}
          onSaved={() => archiveZone(outcomeTarget)}
        />
      )}

      <Footer />

      <style>{`
        @keyframes kith-spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .nest-layout { grid-template-columns: 1fr !important; }
          .nest-list { max-height: none !important; padding-right: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default ActiveDeployments;
