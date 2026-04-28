
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  WifiOff, Wifi, RefreshCw, CheckCircle,
  XCircle, ChevronUp, ChevronDown, AlertTriangle,
} from "lucide-react";
import {
  ACCENT, INK, INK_20, INK_60, PAPER,
  FONT_MONO, CRISIS, CLEAR, CAUTION,
} from "../theme";
import {
  PendingSurvey,
  SyncItemStatus,
  getAll,
  syncPending,
  watchConnectivity,
  onQueueChange,
} from "../services/OfflineSyncService";

type ItemDisplayStatus = "pending" | SyncItemStatus;

const OfflineQueuePanel: React.FC = () => {
  const location = useLocation();

  const [online,      setOnline]      = useState(navigator.onLine);
  const [queue,       setQueue]       = useState<PendingSurvey[]>([]);
  const [expanded,    setExpanded]    = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [itemStatus,  setItemStatus]  = useState<Record<string, ItemDisplayStatus>>({});
  const [showDrained, setShowDrained] = useState(false);

  const syncingRef  = useRef(false);
  const drainTimer  = useRef<ReturnType<typeof setTimeout>>();
  const pollTimer   = useRef<ReturnType<typeof setInterval>>();
  const prevLen     = useRef(0);

  const refreshQueue = useCallback(async () => {
    try {
      const pending = await getAll();
      setQueue(pending);
      if (pending.length > 0) {
        clearTimeout(drainTimer.current);
        setShowDrained(false);
      }
    } catch (e) {
      console.error("[OfflineQueue] IndexedDB read error:", e);
    }
  }, []);
  useEffect(() => {
    refreshQueue();
    const unsub = onQueueChange(refreshQueue);
    pollTimer.current = setInterval(refreshQueue, 3000);
    return () => { unsub(); clearInterval(pollTimer.current); };
  }, [refreshQueue]);

  useEffect(() => { refreshQueue(); }, [location.pathname, refreshQueue]);

  useEffect(() => {
    if (queue.length > prevLen.current && !online) setExpanded(true);
    prevLen.current = queue.length;
  }, [queue.length, online]);

  const handleSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);

    await syncPending((id, status) => {
      setItemStatus(prev => ({ ...prev, [id]: status }));
    });

    await refreshQueue();
    syncingRef.current = false;
    setSyncing(false);

    const remaining = await getAll();
    if (remaining.length === 0) {
      setShowDrained(true);
      clearTimeout(drainTimer.current);
      drainTimer.current = setTimeout(() => {
        setShowDrained(false);
        setItemStatus({});
      }, 3000);
    } else {
      setTimeout(() => setItemStatus({}), 2000);
    }
  }, [refreshQueue]);

  const syncRef = useRef(handleSync);
  useEffect(() => { syncRef.current = handleSync; }, [handleSync]);

  useEffect(() => {
    const unsub = watchConnectivity((isOnlineNow) => {
      setOnline(isOnlineNow);
      if (isOnlineNow) setTimeout(() => syncRef.current(), 800);
    });
    return unsub;
  }, []);

  if (queue.length === 0 && online && !showDrained) return null;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div style={{
      position: "fixed", bottom: 24, left: 24, zIndex: 9000,
      width: expanded ? "min(380px, calc(100vw - 48px))" : "auto",
    }}>
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: "#0D0D0D", border: `1px solid ${online ? INK_20 : CRISIS}`, width: "100%" }}
          >
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px", borderBottom: "1px solid rgba(242,239,234,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {online
                  ? <Wifi    size={13} color={CLEAR}  strokeWidth={1.5} />
                  : <WifiOff size={13} color={CRISIS} strokeWidth={1.5} />
                }
                <span style={{
                  fontFamily: FONT_MONO, fontSize: "9px",
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  color: online ? CLEAR : CRISIS,
                }}>
                  {online ? "Online" : "Offline"} · {queue.length} Pending
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                style={{ background: "none", border: "none", cursor: "none", color: INK_60, display: "flex" }}
              >
                <ChevronDown size={14} strokeWidth={1.5} />
              </button>
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {showDrained && queue.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center" }}>
                  <CheckCircle size={22} color={CLEAR} strokeWidth={1.5} style={{ margin: "0 auto 10px", display: "block" }} />
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: CLEAR }}>
                    All surveys synced
                  </div>
                </div>
              ) : queue.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60 }}>
                    No pending surveys
                  </div>
                </div>
              ) : (
                queue.map((item, i) => {
                  const status = itemStatus[item.id] ?? "pending";
                  const isBulk = item.uploadType === "bulk_upload";
                  return (
                    <div key={item.id} style={{
                      padding: "12px 16px",
                      borderBottom: i < queue.length - 1 ? "1px solid rgba(242,239,234,0.05)" : "none",
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      background:
                        status === "syncing" ? "rgba(200,255,0,0.04)"
                        : status === "done"   ? "rgba(0,196,106,0.04)"
                        : status === "failed" ? "rgba(255,59,47,0.04)"
                        : "transparent",
                      transition: "background 0.3s",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: FONT_MONO, fontSize: "10px", color: PAPER,
                          letterSpacing: "0.06em", marginBottom: 3,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.label}
                        </div>
                        <div style={{ fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: INK_60 }}>
                          {fmtDate(item.timestamp)} · {fmtTime(item.timestamp)}
                          {item.retries > 0 && (
                            <span style={{ color: CRISIS, marginLeft: 8 }}>{item.retries} {item.retries === 1 ? "retry" : "retries"}</span>
                          )}
                        </div>
                        {isBulk && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, fontFamily: FONT_MONO, fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", color: CAUTION }}>
                            <AlertTriangle size={9} strokeWidth={2} />
                            Re-upload file manually when online
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: 12, paddingTop: 2 }}>
                        {status === "syncing"  && <div style={{ width: 14, height: 14, border: `1.5px solid ${ACCENT}`, borderTop: "1.5px solid transparent", borderRadius: "50%", animation: "kith-spin 0.7s linear infinite" }} />}
                        {status === "done"     && <CheckCircle   size={14} color={CLEAR}   strokeWidth={1.5} />}
                        {status === "failed"   && <XCircle       size={14} color={CRISIS}  strokeWidth={1.5} />}
                        {status === "skipped"  && <AlertTriangle size={14} color={CAUTION} strokeWidth={1.5} />}
                        {status === "pending"  && <div style={{ width: 6, height: 6, borderRadius: "50%", background: isBulk ? CAUTION : ACCENT, marginTop: 4 }} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {queue.length > 0 && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(242,239,234,0.06)" }}>
                <button
                  onClick={handleSync}
                  disabled={syncing || !online}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 8, padding: "10px",
                    background: (syncing || !online) ? "rgba(200,255,0,0.08)" : ACCENT,
                    border: "none", cursor: "none",
                    fontFamily: FONT_MONO, fontSize: "9px",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    color: (syncing || !online) ? ACCENT : INK,
                    opacity: !online ? 0.5 : 1,
                    transition: "background 0.2s",
                  }}
                >
                  <RefreshCw size={12} strokeWidth={2} style={{ animation: syncing ? "kith-spin 0.9s linear infinite" : "none" }} />
                  {syncing ? "Syncing…" : online ? "Sync Now" : "Waiting for connection"}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            onClick={() => setExpanded(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 14px", background: "#0D0D0D",
              border: `1px solid ${online ? INK_20 : CRISIS}`,
              cursor: "none", fontFamily: FONT_MONO, fontSize: "9px",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: online ? ACCENT : CRISIS,
            }}
          >
            {online ? <Wifi size={12} strokeWidth={1.5} /> : <WifiOff size={12} strokeWidth={1.5} />}
            {showDrained && queue.length === 0
              ? "Synced ✓"
              : `${queue.length} survey${queue.length !== 1 ? "s" : ""} pending`
            }
            <ChevronUp size={11} strokeWidth={1.5} />
          </motion.button>
        )}
      </AnimatePresence>
      <style>{`@keyframes kith-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OfflineQueuePanel;
