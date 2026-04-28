import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, AlertTriangle, RefreshCw, MapPin, MapPinOff, Zap,
} from "lucide-react";

import { saveOnboardingDataIfHasLocation } from "../../services/SurveyService";
import { UserAuth } from "../../context/AuthContext";
import {
  ACCENT, INK, INK_20, INK_60, PAPER,
  FONT_MONO, FONT_BODY,
  CRISIS, CAUTION, CLEAR,
  btnPrimary, riskColor, riskLabel,
} from "../../theme";

interface AnalysisResultUIProps {
  status: "idle" | "loading" | "success" | "error";
  result: any | null;
  errorMsg?: string;
  onReset?: () => void;
  uploadType?: "bulk_upload" | "direct_upload" | "picture_upload";
  rawData?: any;
}

const AnalysisResultUI: React.FC<AnalysisResultUIProps> = ({
  status,
  result,
  errorMsg,
  onReset,
  uploadType = "direct_upload",
  rawData,
}) => {
  const [hasLocation, setHasLocation] = useState(false);
  const processedRef = useRef(false);

  let userId: string | null = null;
  try {
    const auth = UserAuth();
    userId = auth?.user?.id ?? null;
  } catch {
    userId = null;
  }

  useEffect(() => {
    if (status === "idle") {
      processedRef.current = false;
      setHasLocation(false);
      return;
    }

    if (status !== "success" || !result || !userId || processedRef.current) return;

    processedRef.current = true;

    const processAndSave = async () => {
      const locationString: string | null =
        result?.location ||
        rawData?.location ||
        rawData?.address ||
        rawData?.method?.address ||
        null;

      console.log(`[${uploadType}] 📍 Location string:`, locationString);

      if (!locationString) {
        console.warn(`[${uploadType}] ⚠️ No location found. Showing "Local Display Only".`);
        setHasLocation(false);
        return;
      }
      let lat: number | null = null;
      let lng: number | null = null;

      if ((window as any).google?.maps) {
        try {
          const geocoder = new (window as any).google.maps.Geocoder();
          const geoRes = await geocoder.geocode({ address: locationString });
          if (geoRes.results?.[0]?.geometry?.location) {
            lat = geoRes.results[0].geometry.location.lat();
            lng = geoRes.results[0].geometry.location.lng();
            console.log(`[${uploadType}] ✅ Geocoded:`, lat, lng);
          } else {
            console.warn(`[${uploadType}] ⚠️ No geocoder results for: "${locationString}"`);
          }
        } catch (e) {
          console.error(`[${uploadType}] ❌ Geocoder error:`, e);
        }
      } else {
        console.warn(`[${uploadType}] ⚠️ Google Maps not loaded yet.`);
      }

      if (lat === null || lng === null) {
        setHasLocation(false);
        return;
      }
      try {
        const dataToPush = {
          ...result,
          location: locationString,
          lat,
          lng,
        };

        const saved = await saveOnboardingDataIfHasLocation(
          dataToPush,
          uploadType,
          userId as string,
        );

        setHasLocation(saved);
        console.log(
          saved
            ? `[${uploadType}] 🚀 Saved to Firebase`
            : `[${uploadType}] ❌ Firebase save returned false`,
        );
      } catch (err) {
        console.error(`[${uploadType}] ❌ Firebase write threw:`, err);
        setHasLocation(false);
      }
    };

    processAndSave();
  }, [status, result, uploadType, rawData, userId]);

  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", padding: "80px 40px", gap: 24,
        }}
      >
        <div style={{ position: "relative", width: 52, height: 52 }}>
          <div style={{
            position: "absolute", inset: 0,
            border: `1px solid ${INK_20}`, borderRadius: "50%",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            border: "2px solid transparent", borderTopColor: ACCENT,
            borderRadius: "50%", animation: "kith-spin 0.9s linear infinite",
          }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: "10px",
            letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT,
          }}>
            Gemini Analysis Running
          </div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: "9px",
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: INK_60, marginTop: 8,
          }}>
            Processing demographic indicators…
          </div>
        </div>
        <style>{`@keyframes kith-spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    );
  }

  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ border: `1px solid ${CRISIS}`, padding: "48px 40px", maxWidth: 600 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <AlertTriangle size={20} color={CRISIS} strokeWidth={1.5} />
          <span style={{
            fontFamily: FONT_MONO, fontSize: "10px",
            letterSpacing: "0.22em", textTransform: "uppercase", color: CRISIS,
          }}>
            Analysis Failed
          </span>
        </div>
        <p style={{
          fontFamily: FONT_BODY, fontSize: "0.9rem",
          color: INK_60, lineHeight: 1.7, margin: "0 0 32px",
        }}>
          {errorMsg || "Unable to reach the analysis server. Check your connection and try again."}
        </p>
        {onReset && (
          <button onClick={onReset} style={{
            ...btnPrimary, background: "transparent", color: CRISIS,
            border: `1px solid ${CRISIS}`, fontSize: "10px",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <RefreshCw size={13} strokeWidth={2} /> Try Again
          </button>
        )}
      </motion.div>
    );
  }

  if (status === "success" && result) {
    const score      = result.risk_score ?? 0;
    const scoreColor = riskColor(score);
    const scoreTag   = riskLabel(score);
    const hotspot    = result.community_hotspot_level || "N/A";

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 700, width: "100%" }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 24px", background: INK, marginBottom: 1,
          flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle size={14} color={CLEAR} strokeWidth={1.5} />
            <span style={{
              fontFamily: FONT_MONO, fontSize: "10px",
              letterSpacing: "0.22em", textTransform: "uppercase", color: CLEAR,
            }}>
              Analysis Complete
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {hasLocation ? (
              <>
                <MapPin size={12} color={CLEAR} strokeWidth={1.5} />
                <span style={{
                  fontFamily: FONT_MONO, fontSize: "9px",
                  letterSpacing: "0.18em", textTransform: "uppercase", color: CLEAR,
                }}>
                  Saved to Ops Map
                </span>
              </>
            ) : (
              <>
                <MapPinOff size={12} color={CAUTION} strokeWidth={1.5} />
                <span style={{
                  fontFamily: FONT_MONO, fontSize: "9px",
                  letterSpacing: "0.18em", textTransform: "uppercase", color: CAUTION,
                }}>
                  Local Display Only
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 1, background: INK_20, marginBottom: 1,
        }}>
          <div style={{ background: PAPER, padding: "40px 36px" }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: INK_60, marginBottom: 16,
            }}>
              Risk Score
            </div>
            <div style={{
              fontFamily: FONT_MONO, fontWeight: 700, fontSize: "4rem",
              letterSpacing: "-0.04em", lineHeight: 0.9,
              color: scoreColor, marginBottom: 12,
            }}>
              {score}
              <span style={{ fontSize: "1.5rem", color: INK_20 }}>/10</span>
            </div>
            <div style={{ width: "100%", height: 4, background: INK_20, marginTop: 16 }}>
              <div style={{
                width: `${(score / 10) * 100}%`, height: "100%",
                background: scoreColor,
                transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
          </div>

          <div style={{ background: PAPER, padding: "40px 36px" }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: INK_60, marginBottom: 16,
            }}>
              Hotspot Level
            </div>
            <div style={{
              fontFamily: FONT_MONO, fontWeight: 700, fontSize: "2.5rem",
              letterSpacing: "-0.03em", lineHeight: 0.9,
              color: INK, textTransform: "uppercase", marginBottom: 16,
            }}>
              {hotspot}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", border: `1px solid ${scoreColor}`,
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.18em", textTransform: "uppercase", color: scoreColor,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: scoreColor }} />
              {scoreTag} RISK
            </div>
          </div>
        </div>

        <div style={{
          background: PAPER, border: `1px solid ${INK_20}`,
          padding: "36px", marginBottom: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 28, height: 28, border: `1px solid ${INK_20}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={13} color={ACCENT} strokeWidth={1.5} />
            </div>
            <span style={{
              fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.22em", textTransform: "uppercase", color: INK_60,
            }}>
              Gemini Intelligence Summary
            </span>
          </div>
          <p style={{
            fontFamily: FONT_BODY, fontSize: "0.9rem",
            color: INK, lineHeight: 1.8, margin: 0,
          }}>
            {result.explanation}
          </p>

          {result.key_factors?.length > 0 && (
            <div style={{
              marginTop: 24, paddingTop: 24, borderTop: `1px solid ${INK_20}`,
            }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: INK_60, marginBottom: 14,
              }}>
                Key Risk Factors
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.key_factors.map((factor: string, i: number) => (
                  <span key={i} style={{
                    padding: "5px 12px", border: `1px solid ${INK_20}`,
                    fontFamily: FONT_MONO, fontSize: "9px",
                    letterSpacing: "0.14em", textTransform: "uppercase", color: INK_60,
                  }}>
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasLocation && result.location && (
            <div style={{
              marginTop: 24, paddingTop: 24, borderTop: `1px solid ${INK_20}`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <MapPin size={12} color={CLEAR} strokeWidth={1.5} />
              <span style={{
                fontFamily: FONT_MONO, fontSize: "9px",
                letterSpacing: "0.14em", textTransform: "uppercase", color: CLEAR,
              }}>
                Mapped: {result.location}
              </span>
            </div>
          )}
        </div>

        {onReset && (
          <button
            onClick={onReset}
            style={{
              ...btnPrimary, width: "100%",
              justifyContent: "center", fontSize: "10px",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <RefreshCw size={13} strokeWidth={2} /> Upload New Data
          </button>
        )}
      </motion.div>
    );
  }

  return null;
};

export default AnalysisResultUI;
