import React, { useState } from "react";
import { TeamAssignmentModel } from "../models/TeamAssignmentModel";
import { Rating } from "@mui/material";
import { Crosshair, CheckCircle, Trash2, Zap, Users, FileText } from "lucide-react";
import { ref, update } from "firebase/database";
import { database, auth as firebaseAuth } from "../firebase";
import { UserAuth } from "../context/AuthContext";
import { meetsAggregationThreshold } from "../services/PrivacyService";
import {
  ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  CRISIS, CAUTION, CLEAR, riskColor, riskLabel,
} from "../theme";

interface ActiveDeploymentsCardProps {
  assignment: TeamAssignmentModel;
  intersectedProfiles?: any[];
  onDelete: (id: string) => void;
  onMarkDone: (assignment: TeamAssignmentModel) => void;
  onFocus: (assignment: TeamAssignmentModel) => void;
  onRefresh: () => void | Promise<void>;
}
async function getAuthHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  } catch {
    return { "Content-Type": "application/json" };
  }
}

const ActiveDeploymentsCard: React.FC<ActiveDeploymentsCardProps> = ({
  assignment, intersectedProfiles = [],
  onDelete, onMarkDone, onFocus, onRefresh,
}) => {
  const auth = UserAuth();
  const [isPredicting, setIsPredicting] = useState(false);
  const [notesVal, setNotesVal] = useState(assignment.fieldNotes || "");

  const formattedDate = new Date(assignment.assignedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const zoneAggregate = (() => {
    if (!intersectedProfiles.length) return null;

    let totalPop     = 0;
    let weightedRisk = 0;
    const allFactors = new Set<string>();

    intersectedProfiles.forEach(p => {
      const pop   = Number(p.demographicSize) || 1;
      const score = Number(p.risk_score)      || 0;
      totalPop     += pop;
      weightedRisk += score * pop;
      (p.key_factors || []).forEach((f: string) => allFactors.add(f));
    });

    const avgScore = totalPop > 0 ? weightedRisk / totalPop : 0;

    const worst = intersectedProfiles.reduce(
      (prev, curr) => (Number(curr.risk_score) > Number(prev.risk_score) ? curr : prev),
      intersectedProfiles[0]
    );

    return {
      risk_score:              Math.round(avgScore * 10) / 10,
      explanation:             worst.explanation || "",
      community_hotspot_level: worst.community_hotspot_level || "N/A",
      key_factors:             Array.from(allFactors),
      totalPopulation:         totalPop,
      profileCount:            intersectedProfiles.length,
      location:                worst.location || "",
    };
  })();

  const thresholdMet = zoneAggregate
    ? meetsAggregationThreshold(zoneAggregate.profileCount)
    : false;

  const primaryOnboardingProfile = (zoneAggregate && thresholdMet) ? zoneAggregate : null;

  const handleUpdateNotes = (val: string) => {
    if (auth?.user?.id)
      update(ref(database, `users/${auth.user.id}/teamAssignments/${assignment.id}`), { fieldNotes: val });
  };

  const handleUpdateDemographic = (val: string) => {
    if (auth?.user?.id) {
      const num = val === "" ? 0 : parseInt(val);
      update(ref(database, `users/${auth.user.id}/teamAssignments/${assignment.id}`), { totalPeople: num });
    }
  };

  const handleAIPredict = async () => {
    if (!auth?.user?.id) return;
    if (
    assignment.economicStrength &&
    assignment.economicStrength !== "" &&
    assignment.crimeScore !== undefined &&
    assignment.crimeScore !== null &&
    assignment.initialSummary &&
    assignment.initialSummary !== ""
    ) {
    return;
    }
    setIsPredicting(true);
    try {
      const locationStr = `${(
        ((assignment.northEast as any).lat + (assignment.southWest as any).lat) / 2
      ).toFixed(4)}, ${(
        ((assignment.northEast as any).lng + (assignment.southWest as any).lng) / 2
      ).toFixed(4)}`;

      const authHeader = await getAuthHeader();

      const ecoRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/analyzeEconomy`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ location: locationStr }),
      });
      const ecoData = await ecoRes.json();

      const crimeRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/analyzeMapCrime`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          locations: [{
            id: assignment.id,
            lat: (assignment.northEast as any).lat,
            lng: (assignment.northEast as any).lng,
          }],
        }),
      });
      const crimeData = await crimeRes.json();

      await update(ref(database, `users/${auth.user.id}/teamAssignments/${assignment.id}`), {
        economicStrength: ecoData.data?.economic_strength || "Medium",
        avgSalary:        ecoData.data?.estimated_salary  || "N/A",
        crimeScore:       crimeData.data?.[0]?.weight ?? 1,
        crimeReasoning:   crimeData.data?.[0]?.reasoning ?? "No data.",
        initialSummary:   ecoData.data?.explanation || "Analysis complete.",
      });

      await onRefresh();
    } catch (e) {
      console.error("AI Prediction failed", e);
    } finally {
      setIsPredicting(false);
    }
  };
  const riskScore = primaryOnboardingProfile?.risk_score;
  const crimeScore = assignment.crimeScore;

  let displayScore: number | undefined;
  if (riskScore !== undefined && crimeScore !== undefined) {
    displayScore = Math.round(((riskScore + crimeScore) / 2) * 10) / 10;
  } else {
    displayScore = riskScore ?? crimeScore;
  }

  const scoreColor   = displayScore !== undefined ? riskColor(displayScore) : INK_20;
  const scoreTag     = displayScore !== undefined ? riskLabel(displayScore) : "—";

  const IntelRow = ({
    label, value, color = INK,
  }: { label: string; value?: string | number; color?: string }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: `1px solid ${INK_20}`,
    }}>
      <span style={{
        fontFamily: FONT_MONO, fontSize: "9px",
        letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60,
      }}>
        {label}
      </span>
      {value !== null && value !== undefined && value !== "" ? (
        <span style={{
          fontFamily: FONT_MONO, fontSize: "11px",
          fontWeight: 700, color, letterSpacing: "0.04em",
        }}>
          {value}
        </span>
      ) : (
        <button
          onClick={handleAIPredict}
          disabled={isPredicting}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "none", border: `1px solid ${INK_20}`,
            padding: "3px 8px", cursor: "none",
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: CLEAR, transition: "border-color 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = CLEAR}
          onMouseLeave={e => e.currentTarget.style.borderColor = INK_20}
        >
          {isPredicting
            ? <><div style={{ width: 8, height: 8, border: `1px solid ${CLEAR}`, borderTop: "1px solid transparent", borderRadius: "50%", animation: "kith-spin 0.7s linear infinite" }} /> Fetching...</>
            : <><Zap size={10} strokeWidth={1.5} /> Run AI</>}
        </button>
      )}
    </div>
  );

  return (
    <div style={{
      background: PAPER,
      border: `1px solid ${INK_20}`,
      borderLeft: `3px solid ${scoreColor}`,
      marginBottom: 1,
      position: "relative",
    }}>
      <div style={{
        padding: "20px 24px",
        borderBottom: `1px solid ${INK_20}`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: INK_60, marginBottom: 6,
          }}>
            Active Deployment · {formattedDate}
          </div>
          <div style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: "1.15rem", letterSpacing: "-0.025em", color: INK,
          }}>
            {assignment.assignedTo}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{
            fontFamily: FONT_MONO, fontWeight: 700, fontSize: "1.6rem",
            letterSpacing: "-0.04em", lineHeight: 1, color: scoreColor,
          }}>
            {displayScore !== undefined ? displayScore : "—"}
            {displayScore !== undefined && (
              <span style={{ fontSize: "0.7rem", color: INK_20, fontWeight: 400 }}>/10</span>
            )}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "2px 8px", border: `1px solid ${scoreColor}`,
            fontFamily: FONT_MONO, fontSize: "8px",
            letterSpacing: "0.18em", textTransform: "uppercase", color: scoreColor,
          }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: scoreColor }} />
            {scoreTag}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${INK_20}` }}>
        {[
          { label: "Focus",  icon: Crosshair,   action: () => onFocus(assignment),        color: INK_60 },
          { label: "Done",   icon: CheckCircle,  action: () => onMarkDone(assignment),     color: CLEAR  },
          { label: "Delete", icon: Trash2,       action: () => onDelete(assignment.id),    color: CRISIS },
        ].map(({ label, icon: Icon, action, color }, i) => (
          <button key={label} onClick={action}
            style={{
              flex: 1, padding: "10px 0",
              background: "none", border: "none",
              borderRight: i < 2 ? `1px solid ${INK_20}` : "none",
              cursor: "none", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 6,
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.16em", textTransform: "uppercase",
              color, transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = PAPER_DARK}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Icon size={12} strokeWidth={1.5} /> {label}
          </button>
        ))}
      </div>
      {primaryOnboardingProfile && (
        <div style={{
          margin: "16px 24px", padding: "16px",
          background: PAPER_DARK,
          border: `1px solid ${riskColor(primaryOnboardingProfile.risk_score)}`,
          borderLeft: `3px solid ${riskColor(primaryOnboardingProfile.risk_score)}`,
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 4,
          }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: INK_60, display: "flex", alignItems: "center", gap: 6,
            }}>
              <Users size={11} strokeWidth={1.5} />
              {zoneAggregate && zoneAggregate.profileCount > 1
                ? `${zoneAggregate.profileCount} Surveys · Weighted Avg`
                : "Uploaded Demographic Risk"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.14em",
                color: riskColor(primaryOnboardingProfile.risk_score),
              }}>
                {primaryOnboardingProfile.risk_score}/10
              </div>
              {zoneAggregate && zoneAggregate.profileCount > 1 && (
                <div style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.12em", color: INK_20 }}>
                  pop. {zoneAggregate.totalPopulation}
                </div>
              )}
            </div>
          </div>
          {primaryOnboardingProfile.key_factors?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {primaryOnboardingProfile.key_factors.map((f: string, i: number) => (
                <span key={i} style={{
                  padding: "3px 8px", border: `1px solid ${INK_20}`,
                  fontFamily: FONT_MONO, fontSize: "8px",
                  letterSpacing: "0.14em", textTransform: "uppercase", color: INK_60,
                }}>
                  {f}
                </span>
              ))}
            </div>
          )}
          {primaryOnboardingProfile.explanation && (
            <div style={{
              marginTop: 12, padding: "10px 12px",
              borderLeft: `2px solid ${ACCENT}`,
              background: PAPER,
            }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: INK_60, marginBottom: 6,
              }}>
                Community Risk Summary
              </div>
              <p style={{
                fontFamily: FONT_BODY, fontSize: "0.8rem",
                color: INK_60, lineHeight: 1.65, margin: 0,
              }}>
                {primaryOnboardingProfile.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {!primaryOnboardingProfile && (
        <div style={{ margin: "16px 24px", padding: "12px 16px", border: `1px dashed ${INK_20}` }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.18em", textTransform: "uppercase", color: INK_20,
          }}>
            No uploaded demographic profiles found inside this zone boundary
          </span>
        </div>
      )}
      <div style={{ padding: "0 24px 16px" }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: "9px",
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: CLEAR, marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8, paddingTop: 4,
        }}>
          <Zap size={11} strokeWidth={1.5} /> Area Intelligence
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 0", borderBottom: `1px solid ${INK_20}`,
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60,
          }}>
            Target Demographic
          </span>
          <input
            type="number"
            defaultValue={assignment.totalPeople || ""}
            onBlur={e => handleUpdateDemographic(e.target.value)}
            placeholder="Count"
            style={{
              background: "transparent", border: "none",
              borderBottom: `1px solid ${INK_20}`,
              fontFamily: FONT_MONO, fontSize: "11px",
              fontWeight: 700, color: INK,
              textAlign: "right", width: 80, outline: "none", padding: "2px 0",
            }}
          />
        </div>

        <IntelRow label="Econ Strength" value={assignment.economicStrength} color={CLEAR} />

        {assignment.initialSummary && (
          <div style={{
            marginTop: 16, padding: "12px 14px",
            borderLeft: `2px solid ${CLEAR}`,
            background: PAPER_DARK,
          }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: INK_60, marginBottom: 8,
            }}>
              Economics Summary
            </div>
            <p style={{
              fontFamily: FONT_BODY, fontSize: "0.8rem",
              color: INK_60, lineHeight: 1.65, margin: 0,
            }}>
              {assignment.initialSummary || primaryOnboardingProfile?.explanation}
            </p>
          </div>
        )}

        <IntelRow label="Crime/Risk Score" value={assignment.crimeScore ?? primaryOnboardingProfile?.risk_score} color={CRISIS} />

        {assignment.crimeReasoning && (
          <div style={{
            marginTop: 16, padding: "12px 14px",
            borderLeft: `2px solid ${riskColor(assignment.crimeScore ?? 1)}`,
            background: PAPER_DARK,
          }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: INK_60, marginBottom: 8,
            }}>
              Historical Crime Context · Score: {assignment.crimeScore}/10
            </div>
            <p style={{
              fontFamily: FONT_BODY, fontSize: "0.8rem",
              color: INK_60, lineHeight: 1.65, margin: 0,
            }}>
              {assignment.crimeReasoning}
            </p>
          </div>
        )}
      </div>
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${INK_20}` }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60,
          }}>
            Zone Risk Level
          </span>
          <Rating
            value={assignment.riskLevel || 0}
            onChange={(_, v) => v && update(
              ref(database, `users/${auth?.user?.id}/teamAssignments/${assignment.id}`),
              { riskLevel: v }
            )}
            sx={{ color: CRISIS, "& .MuiRating-iconEmpty": { color: INK_20 } }}
            size="small"
          />
        </div>

        <div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: INK_60, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <FileText size={10} strokeWidth={1.5} /> Field Notes
          </div>
          <textarea
            value={notesVal}
            onChange={e => setNotesVal(e.target.value)}
            onBlur={e => handleUpdateNotes(e.target.value)}
            placeholder="Enter observations from the ground..."
            rows={3}
            style={{
              width: "100%", background: PAPER_DARK,
              border: `1px solid ${INK_20}`, outline: "none",
              padding: "10px 12px", resize: "vertical",
              fontFamily: FONT_BODY, fontSize: "0.85rem",
              color: INK, lineHeight: 1.6,
              boxSizing: "border-box", transition: "border-color 0.2s",
            }}
            onFocus={e => e.currentTarget.style.borderColor = CLEAR}
          />
        </div>
      </div>

      <style>{`@keyframes kith-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ActiveDeploymentsCard;
