import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, UserPlus, Trash2, Check, X, Users, ArrowUpRight } from "lucide-react";
import { UserAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth as firebaseAuth } from "../firebase";
import {
  ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  pageDark, btnPrimary, CRISIS, CLEAR, WHITE
} from "../theme";
import { TeamMemberModel } from "../models/TeamMemberModel";
import { addTeamMember, fetchTeamMembers, removeTeamMember } from "../services/TeamService";

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

const TeamManagementPage: React.FC = () => {
  const auth     = UserAuth();
  const navigate = useNavigate();

  const [team,          setTeam]          = useState<TeamMemberModel[]>([]);
  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [role,          setRole]          = useState("");
  const [addError,      setAddError]      = useState("");
  const [file,          setFile]          = useState<File | null>(null);
  const [uploadStatus,  setUploadStatus]  = useState<"idle" | "loading" | "success" | "error">("idle");
  const [uploadError,   setUploadError]   = useState("");
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (auth?.user?.id) loadTeam();
  }, [auth?.user?.id]);

  const loadTeam = async () => {
    if (!auth?.user?.id) return;
    const members = await fetchTeamMembers(auth.user.id);
    setTeam(members);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.user?.id) return;
    if (!name.trim() || !email.trim()) { setAddError("Name and email are required."); return; }
    setAddError("");
    await addTeamMember(auth.user.id, { name: name.trim(), email: email.trim(), role: role.trim() || "Member" });
    setName(""); setEmail(""); setRole("");
    loadTeam();
  };

  const handleDelete = async (memberId: string) => {
    if (!auth?.user?.id) return;
    setDeletingId(memberId);
    await removeTeamMember(auth.user.id, memberId);
    setDeletingId(null);
    loadTeam();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setFile(e.target.files[0]); setUploadStatus("idle"); setUploadError(""); }
  };

  const handleBulkUpload = async () => {
    if (!file || !auth?.user?.id) return;
    setUploadStatus("loading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const authHeader = await getAuthHeader();

      const res  = await fetch(`${process.env.REACT_APP_BACKEND_URL}/bulkUploadTeam`, {
        method:  "POST",
        headers: authHeader,
        body:    formData,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.team)) {
        for (const m of data.team) {
          if (m.name && m.email)
            await addTeamMember(auth.user.id, { name: m.name, email: m.email, role: m.role || "Member" });
        }
        setUploadStatus("success");
        setFile(null);
        loadTeam();
      } else {
        setUploadStatus("error");
        setUploadError(data.error || "Failed to parse file.");
      }
    } catch {
      setUploadStatus("error");
      setUploadError("Failed to connect to backend.");
    }
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: PAPER_DARK,
    border: `1px solid ${INK_20}`,
    padding: "11px 14px",
    fontFamily: FONT_MONO, fontSize: "11px",
    letterSpacing: "0.08em", color: INK,
    outline: "none", transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT_MONO, fontSize: "9px",
    letterSpacing: "0.22em", textTransform: "uppercase",
    color: INK_60, display: "block", marginBottom: 6,
  };

  return (
    <div style={pageDark}>
      <Navbar />

      <main style={{ paddingTop: 68, minHeight: "100vh" }}>
        <div style={{
          borderBottom: "1px solid rgba(242,239,234,0.06)",
          padding: "52px 40px 44px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage:
              "linear-gradient(rgba(242,239,234,0.025) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(242,239,234,0.025) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }} />

          <div aria-hidden="true" style={{
            position: "absolute", right: -20, top: "50%",
            transform: "translateY(-50%)",
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: "clamp(8rem, 16vw, 16rem)",
            lineHeight: 0.85, letterSpacing: "-0.06em",
            color: "transparent",
            WebkitTextStroke: "1px rgba(242,239,234,0.03)",
            userSelect: "none", pointerEvents: "none",
          }}>
            TEAM
          </div>

          <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: 16 }}>
              Field Operations
            </span>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 4rem)",
              letterSpacing: "-0.04em", lineHeight: 0.95,
              color: PAPER, margin: "0 0 16px",
            }}>
              Team Management
            </h1>
            <p style={{ fontFamily: FONT_BODY, color: "rgba(242,239,234,0.38)", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: 400, margin: 0 }}>
              Add field team members manually or bulk-import from a spreadsheet. Members are available for zone assignment in the Ops Map.
            </p>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 40px" }}>
          <div className="team-layout">

            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ border: "1px solid rgba(242,239,234,0.07)", background: "#0A0A0A", padding: "36px 32px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                  <div style={{ width: 32, height: 32, border: "1px solid rgba(242,239,234,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UserPlus size={15} color={ACCENT} strokeWidth={1.5} />
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT }}>
                    Add Member
                  </span>
                </div>

                <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. Priya Sharma"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                      onBlur={e => e.currentTarget.style.borderColor = INK_20}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      style={inputStyle}
                      type="email"
                      placeholder="e.g. priya@ngo.org"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                      onBlur={e => e.currentTarget.style.borderColor = INK_20}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. Field Officer (default: Member)"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                      onBlur={e => e.currentTarget.style.borderColor = INK_20}
                    />
                  </div>

                  {addError && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.14em", color: CRISIS }}>
                      {addError}
                    </span>
                  )}

                  <button
                    type="submit"
                    style={{ ...btnPrimary, fontSize: "10px", justifyContent: "center", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <Check size={13} strokeWidth={2} /> Add to Team
                  </button>
                </form>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
                style={{ border: "1px solid rgba(242,239,234,0.07)", background: "#0A0A0A", padding: "36px 32px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, border: "1px solid rgba(242,239,234,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UploadCloud size={15} color={ACCENT} strokeWidth={1.5} />
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT }}>
                    Bulk Import
                  </span>
                </div>

                <p style={{ fontFamily: FONT_BODY, fontSize: "0.8rem", color: "rgba(242,239,234,0.3)", lineHeight: 1.65, margin: "0 0 20px" }}>
                  Upload an Excel, CSV, or JSON file. Gemini AI will extract names, emails, and roles automatically.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx,.xls,.csv,.json,.doc,.docx"
                  onChange={handleFileChange}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `1px dashed ${file ? ACCENT : "rgba(242,239,234,0.12)"}`,
                    padding: "24px 16px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    cursor: "pointer", transition: "border-color 0.2s",
                    background: file ? "rgba(200,255,0,0.04)" : "transparent",
                    marginBottom: 16,
                  }}
                  onMouseEnter={e => { if (!file) e.currentTarget.style.borderColor = "rgba(242,239,234,0.3)"; }}
                  onMouseLeave={e => { if (!file) e.currentTarget.style.borderColor = "rgba(242,239,234,0.12)"; }}
                >
                  <UploadCloud size={24} color={file ? ACCENT : WHITE} strokeWidth={1.5} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: file ? ACCENT : "rgba(242,239,234,0.3)" }}>
                    {file ? file.name : "Click to select file"}
                  </span>
                  {!file && (
                    <span style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(242,239,234,0.15)" }}>
                      xlsx · csv · json · doc
                    </span>
                  )}
                </div>

                {uploadStatus === "error" && (
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.14em", color: CRISIS, marginBottom: 12 }}>
                    {uploadError}
                  </div>
                )}
                {uploadStatus === "success" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.14em", color: CLEAR, marginBottom: 12 }}>
                    <Check size={11} strokeWidth={2} /> Team imported successfully
                  </div>
                )}

                <button
                  onClick={handleBulkUpload}
                  disabled={!file || uploadStatus === "loading"}
                  style={{
                    ...btnPrimary, width: "100%", justifyContent: "center",
                    fontSize: "10px", display: "flex", alignItems: "center", gap: 8,
                    opacity: (!file || uploadStatus === "loading") ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (file && uploadStatus !== "loading") e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={e => { if (file && uploadStatus !== "loading") e.currentTarget.style.opacity = "1"; }}
                >
                  {uploadStatus === "loading" ? (
                    <>
                      <div style={{ width: 11, height: 11, border: "1.5px solid #000", borderTop: "1.5px solid transparent", borderRadius: "50%", animation: "kith-spin 0.7s linear infinite" }} />
                      Processing…
                    </>
                  ) : (
                    <><UploadCloud size={13} strokeWidth={2} /> Process & Import</>
                  )}
                </button>
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{ border: "1px solid rgba(242,239,234,0.07)", background: "#0A0A0A" }}
            >
              <div style={{
                padding: "20px 28px",
                borderBottom: "1px solid rgba(242,239,234,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Users size={14} color={ACCENT} strokeWidth={1.5} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT }}>
                    Field Roster
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: CLEAR }} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: CLEAR }}>
                    {team.length} member{team.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {team.length === 0 ? (
                <div style={{ padding: "60px 28px", textAlign: "center" }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(242,239,234,0.15)", marginBottom: 12 }}>
                    No Members Yet
                  </div>
                  <p style={{ fontFamily: FONT_BODY, fontSize: "0.85rem", color: WHITE, margin: 0 }}>
                    Add members manually or import a file to populate your field roster.
                  </p>
                </div>
              ) : (
                <div>
                  <AnimatePresence>
                    {team.map((member, i) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.25, delay: i * 0.04 }}
                        style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center",
                          padding: "18px 28px",
                          borderBottom: "1px solid rgba(242,239,234,0.05)",
                          transition: "background 0.18s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#111")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{
                            width: 36, height: 36, flexShrink: 0,
                            border: "1px solid rgba(242,239,234,0.1)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: FONT_MONO, fontSize: "10px", fontWeight: 700,
                            color: ACCENT, letterSpacing: "0.04em",
                          }}>
                            {member.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em", color: PAPER, marginBottom: 3 }}>
                              {member.name}
                            </div>
                            <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.1em", color: "rgba(242,239,234,0.3)" }}>
                              {member.email}
                              {member.role && <span style={{ color: ACCENT, marginLeft: 10 }}>· {member.role}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => member.id && handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          style={{
                            background: "none", border: "1px solid rgba(242,239,234,0.08)",
                            padding: "6px", cursor: "none", color: WHITE,
                            display: "flex", transition: "border-color 0.2s, color 0.2s",
                            opacity: deletingId === member.id ? 0.4 : 1,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = CRISIS; e.currentTarget.style.color = CRISIS; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(242,239,234,0.08)"; e.currentTarget.style.color = WHITE; }}
                        >
                          {deletingId === member.id
                            ? <div style={{ width: 14, height: 14, border: `1.5px solid ${CRISIS}`, borderTop: "1.5px solid transparent", borderRadius: "50%", animation: "kith-spin 0.7s linear infinite" }} />
                            : <Trash2 size={14} strokeWidth={1.5} />
                          }
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {team.length > 0 && (
                <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(242,239,234,0.06)" }}>
                  <button
                    onClick={() => navigate("/explore")}
                    style={{
                      background: "none", border: "none", padding: 0,
                      display: "flex", alignItems: "center", gap: 6,
                      fontFamily: FONT_MONO, fontSize: "9px",
                      letterSpacing: "0.18em", textTransform: "uppercase",
                      color: WHITE, cursor: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = ACCENT}
                    onMouseLeave={e => e.currentTarget.style.color = WHITE}
                  >
                    Assign zones in Ops Map <ArrowUpRight size={11} strokeWidth={2} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px 48px" }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: "none", border: "none", padding: 0,
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: WHITE, cursor: "pointer",
            transition: "color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = CLEAR}
          onMouseLeave={e => e.currentTarget.style.color = WHITE}
        >
          ← Back to Dashboard
        </button>
      </div>

      <Footer />

      <style>{`
        .team-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 1px;
          background: rgba(242,239,234,0.06);
        }
        @media (max-width: 900px) {
          .team-layout { grid-template-columns: 1fr !important; }
        }
        @keyframes kith-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TeamManagementPage;
