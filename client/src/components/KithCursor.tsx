import React, { useEffect, useRef } from "react";
import { CRISIS, ACCENT, INK, PAPER, ACCENT_DIM } from "../theme";

const DARK_ROUTES = ["/dashboard", "/explore", "/active-deployments", "/team", "/onboarding"];

const KithCursor: React.FC = () => {
  const ref       = useRef<HTMLDivElement>(null);
  const isDark    = useRef(false);
  const isHovered = useRef(false);
	const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
	useEffect(() => {
		if (isTouchDevice) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top  = `${e.clientY}px`;
    };

    const detectSurface = () => {
      const bg = getComputedStyle(document.body).backgroundColor;
      const nums = bg.match(/[\d.]+/g);
      if (nums && nums.length >= 3) {
        const lum = (Number(nums[0]) * 299 + Number(nums[1]) * 587 + Number(nums[2]) * 114) / 1000;
        isDark.current = lum < 128;
      } else {
        isDark.current = DARK_ROUTES.some(r => window.location.pathname.startsWith(r));
      }
      if (!isHovered.current) applyIdle();
    };

    const applyIdle = () => {
      el.style.width       = "14px";
      el.style.height      = "14px";
      el.style.background  = "transparent";
      el.style.borderColor = CRISIS;
      el.style.boxShadow   = "none";
    };

    const applyHover = () => {
      el.style.width       = "36px";
			el.style.height = "36px";
      el.style.background  = ACCENT_DIM;
      el.style.borderColor = CRISIS;
      el.style.boxShadow   = "0 0 16px #FF3B2F";
    };
    const onEnter = () => { isHovered.current = true;  applyHover(); };
    const onLeave = () => { isHovered.current = false; applyIdle();  };

    const bindTargets = () => {
      const sel = "a, button, [role='button'], [data-cursor='hover'], input, textarea, select, label";
      document.querySelectorAll(sel).forEach(node => {
        const n = node as HTMLElement;
        n.removeEventListener("mouseenter", onEnter);
        n.removeEventListener("mouseleave", onLeave);
        n.addEventListener("mouseenter", onEnter);
        n.addEventListener("mouseleave", onLeave);
      });
    };

    bindTargets();
    detectSurface();

    const obs = new MutationObserver(() => { bindTargets(); detectSurface(); });
    obs.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ["style", "class"],
    });

    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      obs.disconnect();
    };
  }, [isTouchDevice]);
	if (isTouchDevice) return null;
  return (
    <div
      ref={ref}
      id="kith-cursor"
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: 14, height: 14,
        border: `1.5px solid ${INK}`,
        borderRadius: "50%",
        background: "transparent",
        pointerEvents: "none",
        zIndex: 999999,
        transform: "translate(-50%, -50%)",
        mixBlendMode: "normal",
        transition: [
          "width 0.16s cubic-bezier(0.4,0,0.2,1)",
          "height 0.16s cubic-bezier(0.4,0,0.2,1)",
          "background 0.14s",
          "border-color 0.14s",
          "box-shadow 0.18s",
        ].join(", "),
        willChange: "left, top",
      }}
    />
  );
};

export default KithCursor;
