
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import { UserAuth } from "../context/AuthContext";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, Cell,
} from "recharts";
import { TrendingDown, TrendingUp, Target, CheckCircle, ArrowUpRight } from "lucide-react";
import {
  pageDark, ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  CRISIS, CAUTION, CLEAR, btnPrimary, riskColor,
} from "../theme";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface InterventionRecord {
  id:                string;
  assignedTo:        string;
  originalRiskScore: number | null;
  followUpRiskScore: number | null;
  wasIntervened:     boolean;
  interventionType:  string | null;
  notes:             string;
  completedAt:       string;
  scoreBefore:       number | null;
  scoreAfter:        number | null;
}

const KithTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0D0D0D", border: `1px solid ${INK_20}`,
      padding: "12px 16px", fontFamily: FONT_MONO,
    }}>
      <div style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60, marginBottom: 8 }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: "10px", color: PAPER }}>{p.name}: <strong>{p.value}/10</strong></span>
        </div>
      ))}
    </div>
  );
};
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string; delay?: number }> = ({
  label, value, sub, color = PAPER, delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    style={{ background: "#0A0A0A", border: "1px solid rgba(242,239,234,0.07)", padding: "28px 28px" }}
  >
    <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, marginBottom: 12 }}>
      {label}
    </div>
    <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: "2.4rem", letterSpacing: "-0.04em", lineHeight: 1, color, marginBottom: sub ? 8 : 0 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.14em", color: ACCENT }}>
        {sub}
      </div>
    )}
  </motion.div>
);
const ImpactPage: React.FC = () => {
  const auth     = UserAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<InterventionRecord[]>([]);

  useEffect(() => {
    if (!auth?.user?.id) return;
    const histRef = ref(database, `users/${auth.user.id}/interventionHistory`);
    const unsub = onValue(histRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const parsed = Object.keys(data).map(k => ({ id: k, ...data[k] })) as InterventionRecord[];
        parsed.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
        setRecords(parsed);
      } else {
        setRecords([]);
      }
    });
    return () => unsub();
  }, [auth?.user?.id]);

  const totalZones        = records.length;
  const intervened        = records.filter(r => r.wasIntervened);
  const withReduction     = intervened.filter(r => r.scoreBefore !== null && r.scoreAfter !== null && r.scoreAfter < r.scoreBefore);
  const avgReduction      = withReduction.length > 0
    ? (withReduction.reduce((sum, r) => sum + (r.scoreBefore! - r.scoreAfter!), 0) / withReduction.length).toFixed(1)
    : "—";
  const interventionRate  = totalZones > 0 ? Math.round((intervened.length / totalZones) * 100) : 0;

  const chartData = records.map((r, i) => ({
    name:   new Date(r.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    index:  i + 1,
    before: r.scoreBefore ?? 0,
    after:  r.scoreAfter  ?? r.scoreBefore ?? 0,
    intervened: r.wasIntervened,
    zone:   r.assignedTo,
  }));

  const typeBreakdown = (() => {
    const counts: Record<string, number> = {};
    intervened.forEach(r => {
      const t = r.interventionType || "Other";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  })();

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
            IMPACT
          </div>

          <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: 16 }}>
              Measurable Outcomes
            </span>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 4rem)",
              letterSpacing: "-0.04em", lineHeight: 0.95,
              color: PAPER, margin: "0 0 16px",
            }}>
              Intervention Impact
            </h1>
            <p style={{ fontFamily: FONT_BODY, color: "rgba(242,239,234,0.38)", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: 460, margin: 0 }}>
              Tracking vulnerability score changes before and after field interventions — demonstrating measurable community impact over time.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 40px" }}>

          {records.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                border: "1px dashed rgba(242,239,234,0.1)",
                padding: "80px 40px", textAlign: "center",
              }}
            >
              <Target size={40} color={ACCENT} strokeWidth={1.5} style={{ margin: "0 auto 20px" }} />
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.03em", color: PAPER, marginBottom: 12 }}>
                No outcomes recorded yet
              </div>
              <p style={{ fontFamily: FONT_BODY, color: "rgba(242,239,234,0.3)", maxWidth: 400, margin: "0 auto 32px" }}>
                Mark deployment zones as complete from the Active Deployments page to begin tracking intervention outcomes.
              </p>
              <button onClick={() => navigate("/active-deployments")} style={{ ...btnPrimary, fontSize: "10px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                Go to Active Deployments <ArrowUpRight size={13} strokeWidth={2} />
              </button>
            </motion.div>
          ) : (
            <>
              <div className="impact-stats-grid" style={{ marginBottom: 48 }}>
                <StatCard label="Zones Completed"    value={totalZones}          color={PAPER}   delay={0} />
                <StatCard label="Interventions Made" value={intervened.length}   color={ACCENT}  delay={0.06}
                  sub={`${interventionRate}% intervention rate`} />
                <StatCard label="Avg Risk Reduction" value={avgReduction !== "—" ? `↓ ${avgReduction}` : "—"}
                  color={avgReduction !== "—" ? CLEAR : INK_60} delay={0.12}
                  sub={avgReduction !== "—" ? "points per zone" : "No reductions yet"} />
                <StatCard label="Zones Improved"     value={withReduction.length}
                  color={withReduction.length > 0 ? CLEAR : INK_60} delay={0.18}
                  sub={`of ${intervened.length} intervened`} />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: "#0A0A0A", border: "1px solid rgba(242,239,234,0.07)", padding: "32px 28px", marginBottom: 1 }}
              >
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, marginBottom: 6 }}>
                    Risk Score Timeline
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.025em", color: PAPER }}>
                    Vulnerability Before vs After Intervention
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,239,234,0.05)" />
                    <XAxis dataKey="name" tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: "rgba(242,239,234,0.35)", letterSpacing: "0.1em" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} ticks={[0,2,4,6,8,10]} tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: "rgba(242,239,234,0.35)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<KithTooltip />} />
                    <Legend wrapperStyle={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(242,239,234,0.5)", paddingTop: 16 }} />
                    <ReferenceLine y={7} stroke={CRISIS}  strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: "HIGH", position: "right", fontFamily: FONT_MONO, fontSize: 8, fill: CRISIS }} />
                    <ReferenceLine y={4} stroke={CAUTION} strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: "MED",  position: "right", fontFamily: FONT_MONO, fontSize: 8, fill: CAUTION }} />
                    <Line
                      type="monotone" dataKey="before" name="Risk Before"
                      stroke={CRISIS} strokeWidth={2} dot={{ fill: CRISIS, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: CRISIS }}
                    />
                    <Line
                      type="monotone" dataKey="after" name="Risk After"
                      stroke={CLEAR} strokeWidth={2} dot={{ fill: CLEAR, r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: CLEAR }}
                      strokeDasharray="6 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {typeBreakdown.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: "#0A0A0A", border: "1px solid rgba(242,239,234,0.07)", padding: "32px 28px", marginBottom: 1 }}
                >
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, marginBottom: 6 }}>
                      Intervention Types
                    </div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.025em", color: PAPER }}>
                      How Teams Are Responding
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={typeBreakdown} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,239,234,0.05)" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: "rgba(242,239,234,0.35)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontFamily: FONT_MONO, fontSize: 9, fill: "rgba(242,239,234,0.5)", letterSpacing: "0.06em" }} axisLine={false} tickLine={false} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div style={{ background: "#0D0D0D", border: `1px solid ${INK_20}`, padding: "10px 14px", fontFamily: FONT_MONO, fontSize: "10px", color: PAPER }}>
                            {payload[0].payload.name}: <strong>{payload[0].value}</strong>
                          </div>
                        );
                      }} />
                      <Bar dataKey="count" name="Count" radius={0}>
                        {typeBreakdown.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? ACCENT : `rgba(200,255,0,${0.7 - i * 0.1})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: "#0A0A0A", border: "1px solid rgba(242,239,234,0.07)" }}
              >
                <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(242,239,234,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT }}>
                    All Records
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(242,239,234,0.25)" }}>
                    {records.length} entries
                  </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(242,239,234,0.06)" }}>
                        {["Date", "Assigned To", "Intervened", "Type", "Before", "After", "Δ Score"].map(h => (
                          <th key={h} style={{
                            padding: "12px 20px", textAlign: "left",
                            fontFamily: FONT_MONO, fontSize: "8px",
                            letterSpacing: "0.18em", textTransform: "uppercase",
                            color: "rgba(242,239,234,0.3)", fontWeight: 400,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...records].reverse().map((r, i) => {
                        const delta = r.scoreBefore !== null && r.scoreAfter !== null
                          ? r.scoreAfter - r.scoreBefore : null;
                        return (
                          <tr key={r.id} style={{
                            borderBottom: i < records.length - 1 ? "1px solid rgba(242,239,234,0.04)" : "none",
                            transition: "background 0.18s",
                          }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#111")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            <td style={{ padding: "14px 20px", fontFamily: FONT_MONO, fontSize: "10px", color: "rgba(242,239,234,0.4)" }}>{fmtDate(r.completedAt)}</td>
                            <td style={{ padding: "14px 20px", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "0.9rem", color: PAPER }}>{r.assignedTo}</td>
                            <td style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: r.wasIntervened ? CLEAR : "rgba(242,239,234,0.25)" }}>
                                {r.wasIntervened ? <><CheckCircle size={11} strokeWidth={2} /> Yes</> : "No"}
                              </div>
                            </td>
                            <td style={{ padding: "14px 20px", fontFamily: FONT_MONO, fontSize: "9px", color: "rgba(242,239,234,0.4)" }}>{r.interventionType || "—"}</td>
                            <td style={{ padding: "14px 20px", fontFamily: FONT_MONO, fontWeight: 700, fontSize: "11px", color: r.scoreBefore !== null ? riskColor(r.scoreBefore) : "rgba(242,239,234,0.25)" }}>
                              {r.scoreBefore !== null ? `${r.scoreBefore}/10` : "—"}
                            </td>
                            <td style={{ padding: "14px 20px", fontFamily: FONT_MONO, fontWeight: 700, fontSize: "11px", color: r.scoreAfter !== null ? riskColor(r.scoreAfter) : "rgba(242,239,234,0.25)" }}>
                              {r.scoreAfter !== null ? `${r.scoreAfter}/10` : "—"}
                            </td>
                            <td style={{ padding: "14px 20px", fontFamily: FONT_MONO, fontWeight: 700, fontSize: "11px", color: delta === null ? "rgba(242,239,234,0.25)" : delta < 0 ? CLEAR : delta > 0 ? CRISIS : "rgba(242,239,234,0.4)" }}>
                              {delta === null ? "—" : delta < 0 ? `↓ ${Math.abs(delta)}` : delta > 0 ? `↑ ${delta}` : "±0"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>

      <Footer />

      <style>{`
        .impact-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: rgba(242,239,234,0.06);
        }
        @media (max-width: 1024px) { .impact-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px)  { .impact-stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default ImpactPage;
