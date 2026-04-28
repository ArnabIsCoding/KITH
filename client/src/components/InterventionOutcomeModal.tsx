
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, ChevronDown } from "lucide-react";
import { ref, push } from "firebase/database";
import { database } from "../firebase";
import { UserAuth } from "../context/AuthContext";
import { TeamAssignmentModel } from "../models/TeamAssignmentModel";
import {
  ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  CRISIS, CAUTION, CLEAR, btnPrimary, riskColor,
} from "../theme";

const INTERVENTION_TYPES = [
  "Counselling Referral",
  "Peer Support Session",
  "Awareness / Education",
  "Medical Referral",
  "Crisis Intervention",
  "Family Engagement",
  "Employment Support",
  "Other",
];

interface Props {
  assignment: TeamAssignmentModel & { originalRiskScore?: number };
  onClose:   () => void;
  onSaved:   () => void;
}

const InterventionOutcomeModal: React.FC<Props> = ({ assignment, onClose, onSaved }) => {
  const auth = UserAuth();

  const [wasIntervened,      setWasIntervened]      = useState<boolean | null>(null);
  const [interventionType,   setInterventionType]   = useState("");
  const [followUpScore,      setFollowUpScore]      = useState(5);
  const [notes,              setNotes]              = useState("");
  const [saving,             setSaving]             = useState(false);
  const [saved,              setSaved]              = useState(false);

  const originalScore = assignment.originalRiskScore
    ?? (assignment.crimeScore ? Number(assignment.crimeScore) : null);

  const reduction = originalScore !== null ? originalScore - followUpScore : null;

  const handleSave = async () => {
    const userId = auth?.user?.id;
    if (!userId) return;
    setSaving(true);

    const record = {
      assignmentId:      assignment.id,
      assignedTo:        assignment.assignedTo,
      zoneNE:            assignment.northEast,
      zoneSW:            assignment.southWest,
      originalRiskScore: originalScore,
      followUpRiskScore: wasIntervened ? followUpScore : null,
      wasIntervened,
      interventionType:  wasIntervened ? interventionType : null,
      notes,
      completedAt:       new Date().toISOString(),
      scoreBefore:       originalScore,
      scoreAfter:        wasIntervened ? followUpScore : originalScore,
    };

    try {
      await push(ref(database, `users/${userId}/interventionHistory`), record);
      setSaved(true);
      setTimeout(() => { onSaved(); }, 1200);
    } catch (e) {
      console.error("Failed to save outcome:", e);
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: PAPER_DARK, border: `1px solid ${INK_20}`,
    padding: "10px 14px",
    fontFamily: FONT_MONO, fontSize: "11px",
    letterSpacing: "0.06em", color: INK, outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT_MONO, fontSize: "9px",
    letterSpacing: "0.22em", textTransform: "uppercase",
    color: INK_60, display: "block", marginBottom: 6,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(10,10,10,0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: PAPER,
            width: "min(520px, 100%)",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative",
          }}
        >
          <div style={{ height: 3, background: ACCENT }} />

          {saved ? (
            <div style={{ padding: "60px 40px", textAlign: "center" }}>
              <CheckCircle size={40} color={CLEAR} strokeWidth={1.5} style={{ margin: "0 auto 16px" }} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.03em", color: INK, marginBottom: 8 }}>
                Outcome Recorded
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60 }}>
                Zone archived · Impact timeline updated
              </div>
            </div>
          ) : (
            <div style={{ padding: "36px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: 8 }}>
                    Zone Complete
                  </span>
                  <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.03em", color: INK, margin: 0 }}>
                    Record Outcome
                  </h2>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.1em", color: INK_60, marginTop: 6 }}>
                    Assigned to {assignment.assignedTo}
                  </div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: `1px solid ${INK_20}`, padding: 6, cursor: "none", color: INK_60, display: "flex" }}>
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
              {originalScore !== null && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", marginBottom: 24,
                  border: `1px solid ${riskColor(originalScore)}`,
                  background: `${riskColor(originalScore)}10`,
                }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60 }}>
                    Original risk
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: "1.1rem", color: riskColor(originalScore) }}>
                    {originalScore}/10
                  </span>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Was an intervention made?</label>
                <div style={{ display: "flex", gap: 1 }}>
                  {([true, false] as const).map(val => (
                    <button key={String(val)} onClick={() => setWasIntervened(val)} style={{
                      flex: 1, padding: "12px",
                      background: wasIntervened === val ? INK : PAPER_DARK,
                      border: `1px solid ${wasIntervened === val ? INK : INK_20}`,
                      fontFamily: FONT_MONO, fontSize: "10px",
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: wasIntervened === val ? PAPER : INK_60,
                      cursor: "none", transition: "all 0.18s",
                    }}>
                      {val ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>

              {wasIntervened === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  style={{ marginBottom: 24, overflow: "hidden" }}
                >
                  <label style={labelStyle}>Intervention type</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={interventionType}
                      onChange={e => setInterventionType(e.target.value)}
                      style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}
                      onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                      onBlur={e => e.currentTarget.style.borderColor = INK_20}
                    >
                      <option value="">Select type…</option>
                      {INTERVENTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={13} strokeWidth={1.5} color={INK_60} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  </div>
                </motion.div>
              )}

              {wasIntervened !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  style={{ marginBottom: 24, overflow: "hidden" }}
                >
                  <label style={labelStyle}>
                    Follow-up risk assessment
                    <span style={{ color: riskColor(followUpScore), marginLeft: 8 }}>
                      {followUpScore}/10
                    </span>
                    {reduction !== null && reduction > 0 && (
                      <span style={{ color: CLEAR, marginLeft: 8 }}>↓ {reduction.toFixed(1)} reduction</span>
                    )}
                    {reduction !== null && reduction < 0 && (
                      <span style={{ color: CRISIS, marginLeft: 8 }}>↑ {Math.abs(reduction).toFixed(1)} increase</span>
                    )}
                  </label>
                  <input
                    type="range" min={1} max={10} step={1}
                    value={followUpScore}
                    onChange={e => setFollowUpScore(Number(e.target.value))}
                    style={{ width: "100%", accentColor: riskColor(followUpScore) }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: "8px", color: INK_20, marginTop: 4 }}>
                    <span>1 · Low</span><span>5 · Medium</span><span>10 · High</span>
                  </div>
                </motion.div>
              )}

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Field notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe what happened, community response, next steps…"
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: FONT_BODY, fontSize: "0.85rem" }}
                  onFocus={e => e.currentTarget.style.borderColor = ACCENT}
                  onBlur={e => e.currentTarget.style.borderColor = INK_20}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving || wasIntervened === null}
                  style={{
                    ...btnPrimary, flex: 1, justifyContent: "center",
                    fontSize: "10px", display: "flex", alignItems: "center", gap: 8,
                    opacity: (saving || wasIntervened === null) ? 0.45 : 1,
                  }}
                >
                  {saving
                    ? <><div style={{ width: 11, height: 11, border: "1.5px solid #000", borderTop: "1.5px solid transparent", borderRadius: "50%", animation: "kith-spin 0.7s linear infinite" }} /> Saving…</>
                    : <><CheckCircle size={13} strokeWidth={2} /> Save & Archive Zone</>
                  }
                </button>
                <button onClick={onClose} style={{
                  padding: "12px 20px", background: "transparent",
                  border: `1px solid ${INK_20}`, color: INK_60,
                  fontFamily: FONT_MONO, fontSize: "10px",
                  letterSpacing: "0.14em", textTransform: "uppercase", cursor: "none",
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
      <style>{`@keyframes kith-spin { to { transform: rotate(360deg); } }`}</style>
    </AnimatePresence>
  );
};

export default InterventionOutcomeModal;
