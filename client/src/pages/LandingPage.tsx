import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Upload, Brain, Users, Shield, Eye, AlertTriangle,
  Github, Linkedin, Twitter, Mail, ArrowUpRight, MapPin
} from "lucide-react";
import profilePic from "../assets/AIC.png";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  ACCENT, INK, INK_20, INK_60, PAPER, PAPER_DARK,
  FONT_MONO, FONT_DISPLAY, FONT_BODY,
  btnPrimary, btnGhost, pageShell,
} from "../theme";
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

const STEPS = [
  { num: "01", title: "Upload Field Data",  desc: "Bulk CSV ingestion or granular manual entry of demographic, social, and behavioral indicators from the field." },
  { num: "02", title: "Gemini AI Analysis", desc: "Python/Flask backend invokes the Gemini API to detect early warning patterns across economic, lifestyle, and mental health axes." },
  { num: "03", title: "Risk Score Output",  desc: "Standardized 1–10 vulnerability score generated per community node. Heatmap layers rendered via Google Maps API." },
  { num: "04", title: "Deploy & Monitor",   desc: "Field teams draw active deployment zones. Firebase syncs assignments in real time — no manual refresh." },
];

const FEATURES = [
  { icon: Brain,         title: "AI-Driven Risk Scoring",   desc: "Gemini analyzes complex demographic and behavioral data, converting it into a standardized 1–10 vulnerability index.", tag: "GEMINI API" },
  { icon: MapPin,        title: "Geospatial Matchmaking",   desc: "Google Maps heatmap overlays + custom polygon drawing tools allow teams to query demographic risk within any drawn boundary.", tag: "MAPS API" },
  { icon: Eye,           title: "Real-Time Ops Dashboard",  desc: "Firebase onValue listeners push field assignment updates and AI intelligence profiles instantly across all connected clients.", tag: "FIREBASE" },
  { icon: Upload,        title: "Flexible Data Ingestion",  desc: "Bulk CSV upload or direct manual entry. Both paths route through identical AI analysis pipelines.", tag: "FLASK" },
  { icon: Shield,        title: "Ethical AI Framework",     desc: "Every insight is anonymized at community level. Zero individual profiles stored. Human review required before action.", tag: "PRIVACY-FIRST" },
  { icon: AlertTriangle, title: "Actionable Intelligence",  desc: "Structured risk profiles drive precise, map-based field intelligence — bridging raw survey data and on-ground action.", tag: "FIELD OPS" },
];

const STATS = [
  { value: "1–10", label: "Vulnerability score scale" },
  { value: "94%",  label: "AI detection accuracy" },
  { value: "<2m",  label: "Analysis turnaround" },
  { value: "0",    label: "Individual profiles stored" },
];

const TECH_STACK = [
  { name: "Google Gemini",      tag: "AI Core" },
  { name: "Google Maps API",    tag: "Geospatial" },
  { name: "Firebase RTDB",      tag: "Real-time" },
  { name: "React + TypeScript", tag: "Frontend" },
  { name: "Python / Flask",     tag: "Backend" },
  { name: "Framer Motion",      tag: "UX" },
];

const TICKER_ITEMS = [
  "SUBSTANCE ABUSE PREVENTION", "GEOSPATIAL INTELLIGENCE",
  "REAL-TIME RISK MAPPING", "GOOGLE SOLUTION CHALLENGE 2026",
  "AI-POWERED FIELD OPS", "COMMUNITY VULNERABILITY INDEX",
  "FIREBASE SYNC", "ETHICAL AI",
];

const teamMember = {
  name: "Arnab Goswami",
  title: "Full Stack Developer",
  imageUrl: profilePic,
  bio: "Passionate about building ethical AI solutions that create real impact. Focused on seamless experiences and responsible technology.",
  email: "arnabiscoding@gmail.com",
  github: "https://github.com/arnabiscoding",
  linkedin: "https://www.linkedin.com/in/arnabiscoding",
  twitter: "https://www.x.com/arnabiscoding",
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const auth     = UserAuth();
  const heroRef  = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  useEffect(() => { if (auth?.user) navigate("/dashboard"); }, [auth, navigate]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const hoverIn  = (e: React.MouseEvent<HTMLElement>, bg: string, color: string) => {
    (e.currentTarget as HTMLElement).style.background = bg;
    (e.currentTarget as HTMLElement).style.color = color;
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>, bg: string, color: string) => {
    (e.currentTarget as HTMLElement).style.background = bg;
    (e.currentTarget as HTMLElement).style.color = color;
  };

  return (
    <div style={pageShell}>
      <Navbar />
      <section ref={heroRef} id="hero" style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "flex-end", paddingTop: 68,
        position: "relative", overflow: "hidden", background: PAPER,
      }}>
        <div className="grid-overlay" />
        <motion.div
          style={{ y: heroY }}
          aria-hidden="true"
          className="lp-watermark"
        />

        <div style={{ position: "absolute", top: 68, left: 0, right: 0, height: 3, background: ACCENT, zIndex: 2 }} />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px 80px", position: "relative", zIndex: 2, width: "100%" }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ marginBottom: 36 }}>
            <span style={{
              fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.24em",
              textTransform: "uppercase", color: ACCENT,
              background: INK, padding: "6px 14px", display: "inline-block",
            }}>
              Google Solution Challenge 2026 — Geospatial Intelligence
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: "clamp(3.5rem, 8vw, 8.5rem)",
              lineHeight: 0.92, letterSpacing: "-0.045em",
              margin: "0 0 40px", maxWidth: 1000, color: INK,
            }}>
            Field Intelligence.<br />
            <span style={{ color: ACCENT }}>Mapped.</span>
          </motion.h1>

          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", gap: 80, flexWrap: "wrap", alignItems: "flex-end" }}>
            <p style={{
              color: INK_60, fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)",
              lineHeight: 1.75, maxWidth: 440, margin: 0, fontFamily: FONT_BODY,
            }}>
              An AI-powered geospatial intelligence platform that detects early warning signs of substance abuse and mental health crises — giving NGOs and field teams actionable, map-based intelligence in real time.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => scrollTo("try-it-out")} style={btnPrimary}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                Try Demo <ArrowUpRight size={14} strokeWidth={2.5} />
              </button>
              <button onClick={() => scrollTo("how-it-works")} style={btnGhost}
                onMouseEnter={e => hoverIn(e, INK, PAPER)}
                onMouseLeave={e => hoverOut(e, "transparent", INK)}>
                How it Works
              </button>
            </div>
          </motion.div>
        </div>

        <div style={{ borderTop: `1px solid ${INK_20}`, overflow: "hidden", position: "relative", zIndex: 2, background: INK }}>
          <div className="ticker-track" style={{ display: "flex", gap: 60, whiteSpace: "nowrap", width: "max-content", padding: "14px 0" }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} style={{
                fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: i % 3 === 0 ? ACCENT : "rgba(242,239,234,0.35)",
                display: "flex", alignItems: "center", gap: 60,
              }}>
                {item}<span style={{ color: ACCENT, fontSize: 6 }}>◆</span>
              </span>
            ))}
          </div>
        </div>
			</section>

      <section style={{ background: PAPER_DARK, borderBottom: `1px solid ${INK_20}`, padding: "0 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="lp-stats-grid">
            {STATS.map((s, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div style={{
                  padding: "48px 32px",
                  borderRight: i < 3 ? `1px solid ${INK_20}` : "none",
                  borderLeft: i === 0 ? `1px solid ${INK_20}` : "none",
                }}>
                  <div style={{
                    fontFamily: FONT_MONO, fontWeight: 700,
                    fontSize: "clamp(2rem, 3.5vw, 3rem)", letterSpacing: "-0.03em",
                    color: INK, lineHeight: 1, marginBottom: 10,
                  }}>{s.value}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: INK_60 }}>
                    {s.label}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" style={{
        padding: "120px 40px", borderTop: `1px solid ${INK_20}`,
        position: "relative", zIndex: 1, background: PAPER,
      }}>
        <div className="grid-overlay" />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 80,
            }}>
              <div>
                <span style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: INK_60, display: "block", marginBottom: 20 }}>
                  Process
                </span>
                <h2 style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 700,
                  fontSize: "clamp(2.4rem, 4vw, 4rem)",
                  lineHeight: 0.95, letterSpacing: "-0.04em", color: INK, margin: 0,
                }}>
                  From survey<br />to intelligence
                </h2>
              </div>
              <p style={{ color: INK_60, lineHeight: 1.75, maxWidth: 360, fontSize: "0.95rem", fontFamily: FONT_BODY, alignSelf: "flex-end" }}>
                Four stages. One pipeline. Raw demographic data transformed into actionable geospatial field intelligence.
              </p>
            </div>
          </FadeIn>

          <div className="lp-steps-grid">
            {STEPS.map((step, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div
                  style={{ padding: "48px 36px", height: "100%", boxSizing: "border-box", transition: "background 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = PAPER_DARK; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.24em", color: "rgba(10,10,10,0.2)", marginBottom: 36 }}>
                    {step.num}
                  </div>
                  <div style={{ width: 28, height: 2, background: ACCENT, marginBottom: 24 }} />
                  <h3 style={{
                    fontFamily: FONT_DISPLAY, fontWeight: 700,
                    fontSize: "1.1rem", letterSpacing: "-0.025em",
                    color: INK, margin: "0 0 16px", lineHeight: 1.25,
                  }}>
                    {step.title}
                  </h3>
                  <p style={{ color: INK_60, lineHeight: 1.75, fontSize: "0.875rem", margin: 0, fontFamily: FONT_BODY }}>
                    {step.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: "120px 40px", borderTop: `1px solid ${INK_20}`, background: INK, position: "relative", zIndex: 1 }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `linear-gradient(rgba(242,239,234,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,234,0.03) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <div style={{ marginBottom: 80 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: 20 }}>
                Platform Capabilities
              </span>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(2.4rem, 4vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.04em", color: PAPER, margin: 0 }}>
                Designed for<br />Impact at Scale
              </h2>
            </div>
          </FadeIn>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.07}>
                <div
                  style={{ background: INK, padding: "48px 36px", height: "100%", boxSizing: "border-box", transition: "background 0.3s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#111"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = INK; }}
                >
                  <span style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: 32 }}>
                    {f.tag}
                  </span>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, border: `1px solid rgba(242,239,234,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <f.icon size={16} color={ACCENT} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em", color: PAPER, margin: "0 0 12px", lineHeight: 1.25 }}>
                        {f.title}
                      </h3>
                      <p style={{ color: "rgba(242,239,234,0.4)", lineHeight: 1.75, margin: 0, fontSize: "0.875rem", fontFamily: FONT_BODY }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "72px 40px", borderTop: "1px solid rgba(242,239,234,0.06)", background: INK }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <FadeIn>
            <div className="lp-tech-grid">
              {TECH_STACK.map((t, i) => (
                <div key={i} style={{ background: INK, padding: "28px 24px" }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>
                    {t.tag}
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "0.9rem", color: PAPER, lineHeight: 1.3 }}>
                    {t.name}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="try-it-out" style={{ padding: "140px 40px", background: PAPER, borderTop: `1px solid ${INK_20}`, position: "relative", overflow: "hidden" }}>
        <div className="grid-overlay" />
        <div aria-hidden="true" style={{
          position: "absolute", right: -40, bottom: -20,
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: "clamp(10rem, 20vw, 20rem)", lineHeight: 0.85,
          letterSpacing: "-0.06em", color: "transparent",
          WebkitTextStroke: `1px ${INK_20}`,
          userSelect: "none", pointerEvents: "none",
        }}>
          OPS
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <span style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: INK_60, display: "block", marginBottom: 20 }}>
              Live Platform
            </span>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(3rem, 6vw, 6rem)", lineHeight: 0.93, letterSpacing: "-0.045em", color: INK, margin: "0 0 48px", maxWidth: 700 }}>
              Experience Kith<br />in action.
            </h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => navigate("/login")} style={{ ...btnPrimary, fontSize: "10px", padding: "16px 36px" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                Enter Platform <ArrowUpRight size={14} strokeWidth={2.5} />
              </button>
              <span style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: INK_60 }}>
                Google OAuth · No credit card required
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="team" style={{ padding: "120px 40px", background: PAPER_DARK, borderTop: `1px solid ${INK_20}`, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <FadeIn>
            <span style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: INK_60, display: "block", marginBottom: 64 }}>
              The Builder
            </span>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="lp-team-flex">
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={teamMember.imageUrl} alt={teamMember.name}
                  style={{ width: 160, height: 200, objectFit: "cover", filter: "grayscale(30%) contrast(1.05)", display: "block" }} />
                <div style={{ position: "absolute", bottom: -10, left: -10, width: 32, height: 32, background: ACCENT }} />
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.04em", lineHeight: 0.95, color: INK, margin: "0 0 16px" }}>
                  {teamMember.name}
                </h3>
                <p style={{ fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: INK_60, margin: "0 0 32px" }}>
                  {teamMember.title}
                </p>
                <p style={{ color: INK_60, lineHeight: 1.8, fontSize: "0.95rem", margin: "0 0 40px", maxWidth: 480, fontFamily: FONT_BODY }}>
                  {teamMember.bio}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {[
                    { href: teamMember.github,   Icon: Github,   label: "GitHub" },
                    { href: teamMember.linkedin,  Icon: Linkedin, label: "LinkedIn" },
                    { href: teamMember.twitter,   Icon: Twitter,  label: "X" },
                  ].map(({ href, Icon, label }) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer" title={label}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, border: `1px solid ${INK_20}`, color: INK_60, textDecoration: "none", transition: "border-color 0.2s, color 0.2s, background 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = INK; e.currentTarget.style.color = INK; e.currentTarget.style.background = PAPER; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = INK_20; e.currentTarget.style.color = INK_60; e.currentTarget.style.background = "transparent"; }}>
                      <Icon size={15} strokeWidth={1.8} />
                    </a>
                  ))}
                  <div style={{ width: 1, height: 24, background: INK_20, margin: "0 6px" }} />
                  <a href={`mailto:${teamMember.email}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", border: `1px solid ${INK_20}`, color: INK_60, fontFamily: FONT_MONO, fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none", transition: "border-color 0.2s, color 0.2s, background 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = INK; e.currentTarget.style.color = INK; e.currentTarget.style.background = PAPER; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = INK_20; e.currentTarget.style.color = INK_60; e.currentTarget.style.background = "transparent"; }}>
                    <Mail size={13} strokeWidth={2} /> Get in touch
                  </a>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />

      <style>{`
        /* Watermark */
        .lp-watermark {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -52%);
          font-family: ${FONT_DISPLAY}; font-weight: 700;
          font-size: clamp(14rem, 28vw, 28rem); line-height: 0.85;
          letter-spacing: -0.06em; color: transparent;
          -webkit-text-stroke: 1px rgba(10,10,10,0.07);
          user-select: none; pointer-events: none;
          white-space: nowrap; z-index: 0;
        }
        .lp-watermark::after { content: "KITH"; }

        /* Stats — 4 cols desktop */
        .lp-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        /*
          Steps — strict 4-column grid, left+top border on container,
          right+bottom on each cell. No gap. No orphan.
        */
        .lp-steps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-left: 1px solid ${INK_20};
          border-top: 1px solid ${INK_20};
        }
        .lp-steps-grid > * > div {
          border-right: 1px solid ${INK_20};
          border-bottom: 1px solid ${INK_20};
        }

        /* Features — 3 cols */
        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(242,239,234,0.06);
        }

        /* Tech — 6 cols */
        .lp-tech-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 1px;
          background: rgba(242,239,234,0.06);
        }

        /* Team */
        .lp-team-flex {
          display: flex; gap: 80px;
          align-items: flex-start; flex-wrap: wrap;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .lp-steps-grid    { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-tech-grid     { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .lp-stats-grid    { grid-template-columns: repeat(2, 1fr); }
          .lp-steps-grid    { grid-template-columns: 1fr !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; }
          .lp-tech-grid     { grid-template-columns: repeat(2, 1fr) !important; }
          .lp-team-flex     { flex-direction: column !important; gap: 48px !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
