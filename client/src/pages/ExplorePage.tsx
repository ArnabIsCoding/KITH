import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { UserAuth } from "../context/AuthContext";
import { ref, push, get, remove } from "firebase/database";
import { database } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Select, MenuItem, Checkbox, ListItemText, InputLabel, FormControl, OutlinedInput } from "@mui/material";
import { Target, Plus, X, Check, Search, Square, Hand } from "lucide-react";
import { TeamMemberModel } from "../models/TeamMemberModel";
import { fetchTeamMembers } from "../services/TeamService";
import { fetchCrimeHeatmapData } from "../services/ExploreService";
import { filterActive } from "../services/PrivacyService";
import { ACCENT, INK, INK_20, INK_60, PAPER, FONT_MONO, FONT_DISPLAY, FONT_BODY, pageDark, btnPrimary, CRISIS, CAUTION, CLEAR, riskColor, riskLabel } from "../theme";
import Navbar from "../components/Navbar";
import { GoogleMap, useJsApiLoader, HeatmapLayer, DrawingManager, Rectangle, InfoWindow } from "@react-google-maps/api";

const mapLibraries: ("drawing" | "visualization" | "places")[] = ["drawing", "visualization", "places"];
interface RawHeatmapPoint { lat: number; lng: number; weight: number; }
interface SavedAssignment {
  id: string; northEast: { lat: number; lng: number }; southWest: { lat: number; lng: number };
  assignedTo: string; assignedAt: string; crimeScore?: number; crimeReasoning?: string;
}

const OPS_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",            stylers: [{ color: "#141414" }] },
  { elementType: "labels.text.stroke",  stylers: [{ color: "#141414" }] },
  { elementType: "labels.text.fill",    stylers: [{ color: "#888888" }] },
  { featureType: "road",                elementType: "geometry",           stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road",                elementType: "geometry.stroke",    stylers: [{ color: "#1e1e1e" }] },
  { featureType: "road",                elementType: "labels.text.fill",   stylers: [{ color: "#777777" }] },
  { featureType: "road.highway",        elementType: "geometry",           stylers: [{ color: "#333333" }] },
  { featureType: "road.highway",        elementType: "labels.text.fill",   stylers: [{ color: "#aaaaaa" }] },
  { featureType: "water",               elementType: "geometry",           stylers: [{ color: "#0a1628" }] },
  { featureType: "water",               elementType: "labels.text.fill",   stylers: [{ color: "#1A3FFF" }] },
  { featureType: "poi",                 stylers: [{ visibility: "off" }] },
  { featureType: "transit",             stylers: [{ visibility: "off" }] },
  { featureType: "administrative",      elementType: "geometry",           stylers: [{ color: "#222222" }] },
  { featureType: "administrative",      elementType: "labels.text.fill",   stylers: [{ color: "#777777" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#999999" }] },
];
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
const INITIAL_ZOOM = isMobile ? 13 : 5;
const GEOLOCATED_ZOOM = isMobile ? 15 : 16;

const ExplorePage: React.FC = () => {
  const authVal  = UserAuth();
  const navigate = useNavigate();
  const [mapCenter, setMapCenter]               = useState({ lat: 27.0108, lng: 88.1411 });
  const [mapZoom, setMapZoom]                   = useState<number>(INITIAL_ZOOM);
  const [riskHeatmapData, setRiskHeatmapData]   = useState<RawHeatmapPoint[]>([]);
  const [selectedBounds, setSelectedBounds]     = useState<google.maps.LatLngBounds | null>(null);
  const [showAssignModal, setShowAssignModal]   = useState(false);
  const [isAssigning, setIsAssigning]           = useState(false);
  const [assignStep, setAssignStep]             = useState<"idle" | "geocoding" | "analyzing" | "saving">("idle");
  const [teamMembers, setTeamMembers]           = useState<TeamMemberModel[]>([]);
  const [selectedMembers, setSelectedMembers]   = useState<string[]>([]);
  const [savedAssignments, setSavedAssignments] = useState<SavedAssignment[]>([]);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const [drawingMode, setDrawingMode]           = useState<"rect" | "pan">("rect");
  const [addressSearch, setAddressSearch]       = useState("");

  const mapRef            = useRef<google.maps.Map | null>(null);
  const inputRef          = useRef<HTMLInputElement | null>(null);
  const autocompleteRef   = useRef<google.maps.places.Autocomplete | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_googleMapsAPIKey || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "",
    libraries: mapLibraries,
  });

  useEffect(() => {
    if (authVal?.user?.id) fetchTeamMembers(authVal.user.id).then(setTeamMembers);
  }, [authVal?.user?.id]);

  const fetchSavedAssignments = useCallback(async () => {
    if (!authVal?.user?.id) return;
    const snap = await get(ref(database, `users/${authVal.user.id}/teamAssignments`));
    if (snap.exists()) { const d = snap.val(); setSavedAssignments(Object.keys(d).map(k => ({ id: k, ...d[k] }))); }
    else setSavedAssignments([]);
  }, [authVal?.user?.id]);

  const fetchRiskData = useCallback(async () => {
    if (!authVal?.user?.id || !window.google) return;
    const snap = await get(ref(database, `users/${authVal.user.id}/onboardingData`));
    if (snap.exists()) {
      const d = snap.val();
      const pts: RawHeatmapPoint[] = [];
      const active = filterActive(Object.values(d) as any[]);
      for (const p of active) { if (p.lat && p.lng) pts.push({ lat: p.lat, lng: p.lng, weight: p.risk_score || 5 }); }
      setRiskHeatmapData(pts);
    }
  }, [authVal?.user?.id]);

  useEffect(() => { if (isLoaded) { fetchSavedAssignments(); fetchRiskData(); } }, [isLoaded, fetchSavedAssignments, fetchRiskData]);
  useEffect(() => {
    if (!isLoaded) return;
    const attach = () => {
      if (!inputRef.current || autocompleteRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["geometry", "formatted_address"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current!.getPlace();
        if (place?.geometry?.location) {
          const pos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
          setMapCenter(pos);
          setAddressSearch(place.formatted_address || "");
          setMapZoom(GEOLOCATED_ZOOM);
          mapRef.current?.panTo(pos);
          mapRef.current?.setZoom(GEOLOCATED_ZOOM);
        }
      });
    };
    attach();
    const t = setTimeout(attach, 250);
    return () => clearTimeout(t);
  }, [isLoaded]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const pos = { lat: coords.latitude, lng: coords.longitude };
          setMapZoom(GEOLOCATED_ZOOM);
          map.panTo(pos);
          map.setZoom(GEOLOCATED_ZOOM);
          setMapCenter(pos);
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: pos }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              setAddressSearch(results[0].formatted_address);
            }
          });
          setRiskHeatmapData(prev => [...prev]);
        },
        () => { }
      );
    }
  }, []);

  const handleZoomChanged = useCallback(() => {
    if (mapRef.current) {
      const z = mapRef.current.getZoom();
      if (z !== undefined) setMapZoom(z);
    }
  }, []);

  useEffect(() => {
    if (!drawingManagerRef.current || !window.google) return;
    drawingManagerRef.current.setDrawingMode(
      drawingMode === "rect" ? ("rectangle" as unknown as google.maps.drawing.OverlayType) : null
    );
  }, [drawingMode]);

  const onDrawingManagerLoad = useCallback((dm: google.maps.drawing.DrawingManager) => {
    drawingManagerRef.current = dm;
    if (window.google) dm.setDrawingMode("rectangle" as unknown as google.maps.drawing.OverlayType);
  }, []);

  const onRectangleComplete = useCallback((rectangle: google.maps.Rectangle) => {
    const bounds = rectangle.getBounds();
    if (bounds) { setSelectedBounds(bounds); setShowAssignModal(true); }
    rectangle.setMap(null);
    if (drawingManagerRef.current && window.google)
      drawingManagerRef.current.setDrawingMode("rectangle" as unknown as google.maps.drawing.OverlayType);
  }, []);

  const handleAssignTeam = async () => {
    const userId = authVal?.user?.id;
    if (!selectedBounds || !selectedMembers.length || !userId) return;
    setIsAssigning(true);
    setAssignStep("geocoding");
    try {
      const cLat = (selectedBounds.getNorthEast().lat() + selectedBounds.getSouthWest().lat()) / 2;
      const cLng = (selectedBounds.getNorthEast().lng() + selectedBounds.getSouthWest().lng()) / 2;

      let centerAddress = `${cLat.toFixed(5)}, ${cLng.toFixed(5)}`;
      if (window.google?.maps) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const geoRes = await geocoder.geocode({ location: { lat: cLat, lng: cLng } });
          if (geoRes.results?.[0]?.formatted_address) {
            centerAddress = geoRes.results[0].formatted_address;
          }
        } catch { }
      }
      setAssignStep("analyzing");
      const results = await fetchCrimeHeatmapData([{ id: "zone_center", lat: cLat, lng: cLng, address: centerAddress }]);
      const cScore = results?.[0]?.weight ?? 1;
      const cReasoning = results?.[0]?.reasoning ?? "No historical records found.";

      setAssignStep("saving");
      await push(ref(database, `users/${userId}/teamAssignments`), {
        northEast: { lat: selectedBounds.getNorthEast().lat(), lng: selectedBounds.getNorthEast().lng() },
        southWest: { lat: selectedBounds.getSouthWest().lat(), lng: selectedBounds.getSouthWest().lng() },
        assignedTo: selectedMembers.join(", "), assignedAt: new Date().toISOString(),
        crimeScore: cScore, crimeReasoning: cReasoning,
        zoneAddress: centerAddress,
      });
      fetchSavedAssignments(); setShowAssignModal(false); setSelectedMembers([]); setSelectedBounds(null);
    } catch (e) { console.error(e); } finally { setIsAssigning(false); setAssignStep("idle"); }
  };

  const handleMarkAsDone = async (a: SavedAssignment) => {
    if (!authVal?.user?.id) return;
    await push(ref(database, `users/${authVal.user.id}/assignmentHistory`), { ...a, completedAt: new Date().toISOString(), status: "done" });
    await remove(ref(database, `users/${authVal.user.id}/teamAssignments/${a.id}`));
    fetchSavedAssignments(); setActiveInfoWindow(null);
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!authVal?.user?.id || !window.confirm("Permanently delete this assignment?")) return;
    await remove(ref(database, `users/${authVal.user.id}/teamAssignments/${id}`));
    fetchSavedAssignments(); setActiveInfoWindow(null);
  };

  const riskHeatmapLayerData = useMemo(() => {
    if (!isLoaded || !window.google) return [];
    return riskHeatmapData.map(p => ({ location: new window.google.maps.LatLng(p.lat, p.lng), weight: p.weight }));
  }, [isLoaded, riskHeatmapData]);

  const riskHeatmapOptions = useMemo(() => ({
    radius: isMobile ? 60 : 45,
    opacity: 0.75,
    dissipating: true,
    maxIntensity: 10,
    gradient: ["rgba(200,255,0,0)", "rgba(255,140,0,0.85)", "rgba(255,59,47,1)", "rgba(139,0,0,1)"],
  }), []);

  const isDrawingReady = isLoaded && window.google?.maps?.drawing;

  const panel: React.CSSProperties = {
    background: "rgba(10,10,10,0.92)",
    border: "1px solid rgba(242,239,234,0.08)",
    backdropFilter: "blur(14px)",
  };

  return (
    <div style={{ ...pageDark, position: "relative" }}>
      <Navbar />
      <div style={{ position: "fixed", inset: 0, top: 68, zIndex: 0 }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={mapCenter}
            zoom={mapZoom}
            onZoomChanged={handleZoomChanged}
            options={{ styles: OPS_MAP_STYLE, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
            onLoad={handleMapLoad}
          >
            {mapRef.current && riskHeatmapLayerData.length > 0 && (
              <HeatmapLayer key="risk-heatmap" data={riskHeatmapLayerData} options={riskHeatmapOptions} />
            )}
            {savedAssignments.map(a => (
              <React.Fragment key={a.id}>
                <Rectangle
                  bounds={{ north: a.northEast.lat, east: a.northEast.lng, south: a.southWest.lat, west: a.southWest.lng }}
                  options={{ fillColor: ACCENT, fillOpacity: 0.12, strokeColor: ACCENT, strokeWeight: 1.5, clickable: true }}
                  onClick={() => setActiveInfoWindow(a.id)}
                />
                {activeInfoWindow === a.id && (
                  <InfoWindow
                    position={{ lat: (a.northEast.lat + a.southWest.lat) / 2, lng: (a.northEast.lng + a.southWest.lng) / 2 }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div style={{ padding: "12px 8px", minWidth: 220, fontFamily: FONT_BODY }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 8 }}>Active Deployment</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", marginBottom: 8 }}>{a.assignedTo}</div>
                      {a.crimeScore !== undefined && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", border: `1px solid ${riskColor(a.crimeScore)}`, fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.12em", color: riskColor(a.crimeScore), marginBottom: 12 }}>
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: riskColor(a.crimeScore), display: "inline-block" }} />
                          Crime Risk {a.crimeScore}/10 · {riskLabel(a.crimeScore)}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={() => handleMarkAsDone(a)} style={{ flex: 1, padding: "7px", background: "#0A0A0A", color: "#C8FF00", border: "none", fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}>✓ Done</button>
                        <button onClick={() => handleDeleteAssignment(a.id)} style={{ padding: "7px 10px", background: "transparent", color: "#FF3B2F", border: "1px solid #FF3B2F", fontFamily: FONT_MONO, fontSize: "9px", cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </React.Fragment>
            ))}
            {isDrawingReady && (
              <DrawingManager
                onLoad={onDrawingManagerLoad}
                onRectangleComplete={onRectangleComplete}
                options={{
                  drawingControl: false,
                  rectangleOptions: { fillColor: ACCENT, fillOpacity: 0.18, strokeWeight: 1.5, strokeColor: ACCENT, clickable: false, editable: false, zIndex: 1 },
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 36, height: 36, border: "1px solid rgba(242,239,234,0.1)", borderTop: `2px solid ${ACCENT}`, borderRadius: "50%", animation: "kith-spin 0.9s linear infinite" }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(242,239,234,0.3)" }}>Loading map...</span>
          </div>
        )}
      </div>
      <div style={{ position: "fixed", top: 88, left: 20, right: 20, zIndex: 100, display: "flex", gap: 10, alignItems: "flex-start", pointerEvents: "none" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, pointerEvents: "all", flex: "0 0 auto" }}>

          <div style={{ ...panel, display: "flex", alignItems: "center", gap: 0, width: "min(380px, calc(100vw - 180px))" }}>
            <div style={{ padding: "0 14px", display: "flex", alignItems: "center" }}>
              <Search size={13} color="rgba(242,239,234,0.35)" strokeWidth={1.5} />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search location..."
              value={addressSearch}
              onChange={e => setAddressSearch(e.target.value)}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontFamily: FONT_MONO, fontSize: "11px", letterSpacing: "0.1em",
                color: PAPER, padding: "13px 0",
              }}
            />
          </div>
          <div style={{ ...panel, display: "flex", overflow: "hidden" }}>
            {[
              { mode: "rect" as const, icon: Square, label: "Draw Zone" },
              { mode: "pan"  as const, icon: Hand,   label: "Pan Map"  },
            ].map(({ mode, icon: Icon, label }, i) => {
              const active = drawingMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setDrawingMode(mode)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 16px",
                    background: active ? ACCENT : "transparent",
                    border: "none",
                    borderRight: i === 0 ? "1px solid rgba(242,239,234,0.08)" : "none",
                    cursor: "none",
                    transition: "background 0.18s",
                  }}
                >
                  <Icon size={13} color={active ? "#000" : "rgba(242,239,234,0.45)"} strokeWidth={1.5} />
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: "9px",
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    color: active ? "#000" : "rgba(242,239,234,0.45)",
                    transition: "color 0.18s",
                  }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(242,239,234,0.2)", paddingLeft: 4 }}>
            {drawingMode === "rect" ? "Click & drag on map to define a deployment zone" : "Click & drag to pan the map"}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ ...panel, display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", pointerEvents: "all", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: CLEAR, boxShadow: `0 0 6px ${CLEAR}` }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: CLEAR }}>Live</span>
          </div>
          <div style={{ width: 1, height: 12, background: "rgba(242,239,234,0.1)" }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.14em", color: "rgba(242,239,234,0.35)" }}>
            {savedAssignments.length} zone{savedAssignments.length !== 1 ? "s" : ""} · {riskHeatmapData.length} nodes
          </span>
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 32, right: 20, zIndex: 100, display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => navigate("/active-deployments")} style={{
          ...panel, display: "flex", alignItems: "center", gap: 8, padding: "11px 18px",
          fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase",
          color: PAPER, cursor: "none", border: "1px solid rgba(242,239,234,0.08)",
          transition: "border-color 0.2s", background: "rgba(10,10,10,0.92)",
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(242,239,234,0.08)"}
        >
          <Target size={13} strokeWidth={1.5} color={ACCENT} /> Active Deployments
        </button>
        <button onClick={() => navigate("/onboarding/bulkUpload")} style={{ ...btnPrimary, fontSize: "10px", display: "flex", alignItems: "center", gap: 8 }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <Plus size={13} strokeWidth={2} /> Add Data
        </button>
      </div>

      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.75)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: "#0D0D0D", border: "1px solid rgba(242,239,234,0.08)", width: "min(420px, calc(100vw - 40px))", padding: "40px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, marginBottom: 8 }}>New Deployment Zone</div>
                  <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.03em", color: PAPER, margin: 0 }}>Assign Team</h2>
                </div>
                <button onClick={() => { setShowAssignModal(false); setSelectedBounds(null); }}
                  style={{ background: "none", border: "1px solid rgba(242,239,234,0.1)", padding: "6px", cursor: "none", color: "rgba(242,239,234,0.4)", display: "flex", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = CRISIS}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(242,239,234,0.1)"}
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>

              {teamMembers.length === 0 ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: CRISIS, marginBottom: 16 }}>
                    No team members found. Add members first.
                  </div>
                  <button
                    onClick={() => { setShowAssignModal(false); setSelectedBounds(null); navigate("/team"); }}
                    style={{
                      ...btnPrimary,
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      opacity: 1,
                      visibility: "visible",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <Plus size={13} strokeWidth={2} /> Go to Team Page
                  </button>
                </div>
              ) : (
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="team-label" sx={{ fontFamily: FONT_MONO, fontSize: "11px", color: "rgba(242,239,234,0.4) !important" }}>Select Members</InputLabel>
                  <Select
                    labelId="team-label" multiple value={selectedMembers}
                    onChange={e => setSelectedMembers(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
                    input={<OutlinedInput label="Select Members" />}
                    renderValue={s => s.join(", ")}
                    sx={{
                      fontFamily: FONT_MONO, fontSize: "11px", color: PAPER,
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(242,239,234,0.1)", borderRadius: 0 },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: ACCENT },
                      "& .MuiSvgIcon-root": { color: "rgba(242,239,234,0.4)" },
                    }}
                  >
                    {teamMembers.map(m => (
                      <MenuItem key={m.id} value={m.name}>
                        <Checkbox checked={selectedMembers.includes(m.name)} sx={{ color: "rgba(242,239,234,0.2)", "&.Mui-checked": { color: ACCENT } }} />
                        <ListItemText primary={m.name} secondary={m.role} primaryTypographyProps={{ fontFamily: FONT_MONO, fontSize: "12px" }} secondaryTypographyProps={{ fontFamily: FONT_MONO, fontSize: "10px" }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {isAssigning && (
                <div style={{ marginBottom: 16, display: "flex", gap: 4 }}>
                  {(["geocoding", "analyzing", "saving"] as const).map(step => {
                    const order = ["geocoding", "analyzing", "saving"];
                    const done   = order.indexOf(step) < order.indexOf(assignStep);
                    const active = step === assignStep;
                    return (
                      <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ height: 2, background: done || active ? ACCENT : "rgba(242,239,234,0.08)", transition: "background 0.3s" }} />
                        <span style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: active ? ACCENT : done ? "rgba(242,239,234,0.4)" : "rgba(242,239,234,0.15)" }}>
                          {step === "geocoding" ? "1. Locate" : step === "analyzing" ? "2. Analyse" : "3. Save"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleAssignTeam} disabled={!selectedMembers.length || isAssigning}
                  style={{ ...btnPrimary, flex: 1, justifyContent: "center", fontSize: "10px", opacity: (!selectedMembers.length || isAssigning) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  {isAssigning ? (
                    <>
                      <div style={{ width: 12, height: 12, border: "1.5px solid #000", borderTop: "1.5px solid transparent", borderRadius: "50%", animation: "kith-spin 0.7s linear infinite" }} />
                      {assignStep === "geocoding" && "Locating zone..."}
                      {assignStep === "analyzing" && "Gemini scoring area..."}
                      {assignStep === "saving"    && "Saving to Firebase..."}
                    </>
                  ) : <><Check size={13} strokeWidth={2} /> Save Zone</>}
                </button>
                <button onClick={() => { setShowAssignModal(false); setSelectedBounds(null); }}
                  style={{ padding: "12px 16px", background: "transparent", border: "1px solid rgba(242,239,234,0.1)", color: "rgba(242,239,234,0.4)", fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", cursor: "none" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = PAPER; e.currentTarget.style.color = PAPER; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(242,239,234,0.1)"; e.currentTarget.style.color = "rgba(242,239,234,0.4)"; }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes kith-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ExplorePage;
