import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import "./landing.css";

/* ─────────────────────────────────────────────────────
   EASING + SHARED VARIANTS
───────────────────────────────────────────────────── */

const EASE = [0.25, 0.46, 0.45, 0.94];
const EASE_SPRING = { type: "spring", stiffness: 260, damping: 22 };

const fadeUp = {
  hidden:  { opacity: 0, y: 48, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0,  filter: "blur(0px)",
    transition: { duration: 0.75, ease: EASE } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};

const wordReveal = {
  hidden:  { opacity: 0, y: 80, rotateX: -30, filter: "blur(8px)" },
  visible: {
    opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)",
    transition: { duration: 0.78, ease: EASE },
  },
};

const cardReveal = {
  hidden:  { opacity: 0, y: 56, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.82, ease: EASE },
  },
};

/* ─────────────────────────────────────────────────────
   FLOATING ORB  ·  antigravity background blob
───────────────────────────────────────────────────── */

const FloatingOrb = ({ size, color, style, delay = 0, dur = 10 }) => (
  <motion.div
    className="lp-orb"
    style={{ width: size, height: size, background: color, ...style }}
    animate={{
      y:     [0, -55, -12, -48, 0],
      x:     [0,  18,   4, -14, 0],
      scale: [1, 1.07, 0.97, 1.05, 1],
    }}
    transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

/* ─────────────────────────────────────────────────────
   MAGNETIC BUTTON  ·  UI Pro Max cursor-follow
───────────────────────────────────────────────────── */

const MagneticButton = ({ children }) => {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 240, damping: 18 });
  const sy = useSpring(my, { stiffness: 240, damping: 18 });

  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width  / 2)) * 0.38);
    my.set((e.clientY - (r.top  + r.height / 2)) * 0.38);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.span
      ref={ref}
      style={{ x: sx, y: sy, display: "inline-block" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.span>
  );
};

/* ─────────────────────────────────────────────────────
   3-D TILT CARD  ·  UI Pro Max perspective tilt
───────────────────────────────────────────────────── */

const TiltCard = ({ children, className, intensity = 11 }) => {
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 170, damping: 24 });
  const sry = useSpring(ry, { stiffness: 170, damping: 24 });

  const onMove = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rx.set(((e.clientY - (r.top  + r.height / 2)) / r.height) * -intensity);
    ry.set(((e.clientX - (r.left + r.width  / 2)) / r.width)  *  intensity);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.025, y: -7 }}
      transition={{ scale: { duration: 0.3 }, y: EASE_SPRING }}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────
   COUNT-UP  ·  animated stat number
───────────────────────────────────────────────────── */

const CountUp = ({ to, suffix = "", prefix = "" }) => {
  const ref  = useRef(null);
  const inV  = useInView(ref, { once: true, margin: "-80px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inV) return;
    const t0  = Date.now();
    const dur = 2300;
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(e * to));
      if (p < 1) requestAnimationFrame(tick); else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [inV, to]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
};

/* ─────────────────────────────────────────────────────
   APP MOCKUP  ·  antigravity floating phone UI
───────────────────────────────────────────────────── */

const PANTRY = [
  { icon: "🍓", name: "Strawberries", days: 1,  status: "danger"  },
  { icon: "🥛", name: "Whole Milk",   days: 2,  status: "danger"  },
  { icon: "🧀", name: "Cheddar",      days: 6,  status: "warning" },
  { icon: "🥦", name: "Broccoli",     days: 9,  status: "safe"    },
];

const AppMockup = () => (
  <motion.div
    className="mock-wrap"
    initial={{ opacity: 0, y: 90, scale: 0.86 }}
    animate={{ opacity: 1, y: 0,  scale: 1 }}
    transition={{ duration: 1.15, delay: 0.5, ease: EASE }}
  >
    {/* Pulsing glow blob behind phone — antigravity aura */}
    <motion.div
      className="mock-aura"
      animate={{ opacity: [0.45, 0.85, 0.45], scale: [1, 1.13, 1] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Phone body — slow antigravity float + gentle sway */}
    <motion.div
      className="mock-phone"
      animate={{ y: [0, -16, 0], rotate: [-1.2, 1.2, -1.2] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="mock-notchbar">
        <span className="mock-camera" />
      </div>

      <div className="mock-screen">
        {/* Header */}
        <div className="mock-screen-header">
          <span className="mock-screen-title">My Pantry</span>
          <motion.span
            className="mock-screen-count"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            4 items
          </motion.span>
        </div>

        {/* Alert bar */}
        <motion.div
          className="mock-alert-bar"
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <span className="mock-alert-dot" />
          2 items expiring soon
        </motion.div>

        {/* Pantry list */}
        <div className="mock-pantry-list">
          {PANTRY.map((item, i) => (
            <motion.div
              key={item.name}
              className={`mock-row mock-row--${item.status}`}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.95 + i * 0.13, duration: 0.52, ease: EASE }}
            >
              <span className="mock-row-icon">{item.icon}</span>
              <div className="mock-row-body">
                <span className="mock-row-name">{item.name}</span>
                <div className="mock-bar-track">
                  <motion.div
                    className={`mock-bar-fill mock-bar--${item.status}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    style={{
                      transformOrigin: "left",
                      width: `${Math.min(100, (item.days / 10) * 100)}%`,
                    }}
                    transition={{
                      delay: 1.25 + i * 0.13,
                      duration: 0.85,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </div>
              <span className={`mock-row-days mock-days--${item.status}`}>
                {item.days}d
              </span>
            </motion.div>
          ))}
        </div>

        {/* Scan CTA inside phone */}
        <motion.div
          className="mock-scan-btn"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
        >
          <span>📷</span>
          <span>Scan new receipt</span>
        </motion.div>
      </div>
    </motion.div>

    {/* ── Floating badge: Expiry Alert ── escapes the phone frame → antigravity */}
    <motion.div
      className="mock-float-badge mock-float-badge--alert"
      initial={{ opacity: 0, scale: 0, x: -20, y: 10 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      transition={{ delay: 1.9, ...EASE_SPRING }}
    >
      <span className="mock-badge-icon">🔔</span>
      <div>
        <div className="mock-badge-title">Expiry Alert</div>
        <div className="mock-badge-sub">Milk expires in 2 days</div>
      </div>
    </motion.div>

    {/* ── Floating badge: Recipes found ── */}
    <motion.div
      className="mock-float-badge mock-float-badge--recipe"
      initial={{ opacity: 0, scale: 0, x: 20, y: 10 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      transition={{ delay: 2.45, ...EASE_SPRING }}
    >
      <span className="mock-badge-icon">🍽</span>
      <span className="mock-badge-text">3 recipes found!</span>
    </motion.div>

    {/* ── Floating badge: Savings ── */}
    <motion.div
      className="mock-float-badge mock-float-badge--savings"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 3.0, ...EASE_SPRING }}
    >
      <span className="mock-badge-icon">✅</span>
      <span className="mock-badge-text">Nothing expired!</span>
    </motion.div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────
   HOW IT WORKS SECTION
───────────────────────────────────────────────────── */

const HOW_STEPS = [
  {
    num: "01",
    icon: "🧾",
    title: "Scan Your Receipt",
    desc: "Point your camera at any grocery receipt. OCR reads every item in seconds — no typing required.",
    accentColor: "#16A34A",
    tag: "30 seconds flat",
    extra: "scan", // scan line animation
  },
  {
    num: "02",
    icon: "⏰",
    title: "Track Expiry Dates",
    desc: "Every item gets a smart expiry estimate. Get alerts before things go bad so nothing is forgotten.",
    accentColor: "#D97706",
    tag: "Zero surprises",
    extra: "pulse",
  },
  {
    num: "03",
    icon: "🍽",
    title: "Cook & Save Money",
    desc: "Recipes matched to your soonest-expiring items. Cook it before it expires — make better use of what you already buy.",
    accentColor: "#7C3AED",
    tag: "Reduce food waste",
    extra: "spin",
  },
];

const HowItWorksSection = () => {
  const ref   = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="lp-section lp-hiw" ref={ref}>
      <div className="lp-container">

        <motion.div className="lp-section-eyebrow"
          variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"}
        >
          How it works
        </motion.div>

        <motion.h2 className="lp-section-h2"
          variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"}
          transition={{ delay: 0.1 }}
        >
          3 steps to a smarter pantry
        </motion.h2>

        <motion.div
          className="lp-steps-grid"
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {HOW_STEPS.map((s, i) => (
            <motion.div key={s.num} variants={cardReveal} transition={{ delay: i * 0.13 }}>
              <TiltCard className={`lp-step-card lp-step-card--${s.extra}`}>
                {/* Step number */}
                <span
                  className="lp-step-num"
                  style={{ color: s.accentColor }}
                >
                  {s.num}
                </span>

                {/* Icon wrapper — antigravity float */}
                <motion.div
                  className="lp-step-icon-wrap"
                  style={{
                    background: `${s.accentColor}18`,
                    borderColor: `${s.accentColor}40`,
                  }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 3 + i * 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.5,
                  }}
                >
                  <span className="lp-step-icon">{s.icon}</span>

                  {/* Scan line for step 1 */}
                  {s.extra === "scan" && (
                    <motion.div
                      className="lp-scan-line"
                      animate={{ top: ["8%", "88%", "8%"], opacity: [0, 1, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}

                  {/* Pulse ring for step 2 */}
                  {s.extra === "pulse" && (
                    <motion.div
                      className="lp-step-ring"
                      style={{ borderColor: s.accentColor }}
                      animate={{ scale: [1, 1.7, 1], opacity: [0.9, 0, 0.9] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                  )}
                </motion.div>

                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>

                <span
                  className="lp-step-tag"
                  style={{
                    color: s.accentColor,
                    background: `${s.accentColor}16`,
                    borderColor: `${s.accentColor}30`,
                  }}
                >
                  ✓ {s.tag}
                </span>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────
   FEATURES BENTO GRID  ·  21st.dev asymmetric layout
───────────────────────────────────────────────────── */

const FeaturesSection = () => {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="lp-section lp-features" ref={ref}>
      <div className="lp-container">

        <motion.div className="lp-section-eyebrow"
          variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"}
        >
          Features
        </motion.div>

        <motion.h2 className="lp-section-h2"
          variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"}
          transition={{ delay: 0.1 }}
        >
          Everything you need. Nothing you don't.
        </motion.h2>

        <motion.div
          className="lp-bento"
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* ── A · Expiry Tracking (large, 2×2) ── */}
          <motion.div className="bento-slot bento-slot--large" variants={cardReveal}>
            <TiltCard className="bento-card bento-card--green">
              <div className="bento-text-block">
                <span className="bento-eyebrow">Core Feature</span>
                <h3 className="bento-title">Smart Expiry Tracking</h3>
                <p className="bento-body">
                  Intelligent shelf-life estimates based on food category, storage
                  method, and your personal usage patterns.
                </p>
              </div>
              {/* ── Urgency summary pills ── */}
              <div className="bento-urgency-wrap">
                <div className="bento-urgency-pills">
                  {[
                    { label: "Fresh",         count: 8, mod: "safe"   },
                    { label: "Expiring Soon", count: 3, mod: "warn"   },
                    { label: "Expired",       count: 1, mod: "danger" },
                  ].map((p, i) => (
                    <motion.div
                      key={p.label}
                      className={`bento-urgency-pill bento-urgency-pill--${p.mod}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={inView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.4 + i * 0.1 }}
                    >
                      <span className="bento-urgency-count">{p.count}</span>
                      <span className="bento-urgency-label">{p.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bento-expiry-list">
                {[
                  { icon: "🥩", label: "Beef Steak",      days: 2,  pct: 20 },
                  { icon: "🧃", label: "Apple Juice",      days: 14, pct: 70 },
                  { icon: "🥚", label: "Free-range Eggs",  days: 21, pct: 90 },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="bento-exp-row"
                    initial={{ opacity: 0, x: -18 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.65 + i * 0.14 }}
                  >
                    <span className="bento-exp-icon">{item.icon}</span>
                    <span className="bento-exp-label">{item.label}</span>
                    <div className="bento-mini-track">
                      <motion.div
                        className={`bento-mini-fill bento-mini--${
                          item.pct < 30 ? "danger" : item.pct < 60 ? "warn" : "safe"
                        }`}
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${item.pct}%` } : {}}
                        transition={{ delay: 1.0 + i * 0.14, duration: 0.9, ease: "easeOut" }}
                      />
                    </div>
                    <span
                      className={`bento-exp-days ${
                        item.pct < 30 ? "bento-exp--danger" : item.pct < 60 ? "bento-exp--warn" : "bento-exp--safe"
                      }`}
                    >
                      {item.days}d
                    </span>
                  </motion.div>
                ))}
              </div>
            </TiltCard>
          </motion.div>

          {/* ── B · Proactive Alerts ── */}
          <motion.div className="bento-slot bento-slot--alerts" variants={cardReveal} transition={{ delay: 0.1 }}>
            <TiltCard className="bento-card">
              <span className="bento-eyebrow">Notifications</span>
              <h3 className="bento-title">Proactive Alerts</h3>
              <p className="bento-body">
                Get notified 3 days before anything expires.
              </p>
              <motion.div
                className="bento-bell"
                animate={{ rotate: [-6, 6, -6, 6, 0], scale: [1, 1.12, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3.5 }}
              >
                🔔
              </motion.div>
              <div className="bento-notif-stack">
                {["Milk — 2 days", "Berries — 1 day"].map((n, i) => (
                  <motion.div
                    key={n}
                    className="bento-notif-row"
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 1.1 }}
                  >
                    <span className="bento-notif-dot" />
                    {n}
                  </motion.div>
                ))}
              </div>
            </TiltCard>
          </motion.div>

          {/* ── C · Recipe Engine ── */}
          <motion.div className="bento-slot bento-slot--recipes" variants={cardReveal} transition={{ delay: 0.2 }}>
            <TiltCard className="bento-card">
              <span className="bento-eyebrow">Cook Smarter</span>
              <h3 className="bento-title">Recipe Engine</h3>
              <p className="bento-body">
                Matched to items expiring soonest. Waste nothing, eat everything.
              </p>
              <div className="bento-recipe-float-grid">
                {["🥗", "🍜", "🫕", "🥘"].map((icon, i) => (
                  <motion.span
                    key={i}
                    className="bento-recipe-emoji"
                    animate={{ y: [0, -12, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      delay: i * 0.38,
                      ease: "easeInOut",
                    }}
                  >
                    {icon}
                  </motion.span>
                ))}
              </div>
            </TiltCard>
          </motion.div>

          {/* ── D · Analytics (wide) ── */}
          <motion.div className="bento-slot bento-slot--analytics" variants={cardReveal} transition={{ delay: 0.3 }}>
            <TiltCard className="bento-card bento-card--dark">
              <span className="bento-eyebrow">Insights</span>
              <h3 className="bento-title">Waste Analytics</h3>
              <p className="bento-body">
                Know what's in your pantry at a glance. See what's expiring soon and plan ahead.
              </p>
              <div className="bento-chart">
                {[42, 56, 35, 68, 52, 80, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    className={`bento-bar ${i === 6 ? "bento-bar--accent" : ""}`}
                    initial={{ scaleY: 0 }}
                    animate={inView ? { scaleY: 1 } : {}}
                    style={{
                      height: `${h}%`,
                      transformOrigin: "bottom",
                    }}
                    transition={{
                      delay: 0.6 + i * 0.09,
                      duration: 0.7,
                      ease: "easeOut",
                    }}
                  />
                ))}
                <span className="bento-chart-label">This week ↑ 19%</span>
              </div>
            </TiltCard>
          </motion.div>

          {/* ── E · Savings ── */}
          <motion.div className="bento-slot bento-slot--savings" variants={cardReveal} transition={{ delay: 0.4 }}>
            <TiltCard className="bento-card bento-card--savings">
              <span className="bento-eyebrow">Storage Know-How</span>
              <h3 className="bento-title">Preservation Tips</h3>
              <p className="bento-body">
                Learn the best way to store every ingredient so it lasts longer and stays fresh.
              </p>
              <div className="bento-tips-list">
                {[
                  { icon: "🥬", tip: "Wrap leafy greens in a damp paper towel" },
                  { icon: "🍋", tip: "Store citrus at room temp, not the fridge" },
                  { icon: "🧄", tip: "Keep garlic in a cool, dry, dark place" },
                ].map((t, i) => (
                  <motion.div
                    key={i}
                    className="bento-tip-row"
                    initial={{ opacity: 0, x: -14 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.15 }}
                  >
                    <span className="bento-tip-icon">{t.icon}</span>
                    <span className="bento-tip-text">{t.tip}</span>
                  </motion.div>
                ))}
              </div>
            </TiltCard>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────
   IMPACT COUNTERS SECTION
───────────────────────────────────────────────────── */

const STATS = [
  {
    to: 2500, prefix: "$", suffix: "",
    label: "Wasted per household/yr",
    sub: "up to — End Food Waste Australia",
    solution: "Fridgely helps you use food before it expires",
  },
  {
    to: 2100, prefix: "$", suffix: "",
    label: "NSW household waste/yr",
    sub: "on average — NSW Govt Love Food Hate Waste",
    solution: "Track what's in your kitchen so nothing is forgotten",
  },
  {
    to: 33, prefix: "", suffix: "%",
    label: "Of all food wasted",
    sub: "globally, still edible — FAO",
    solution: "Discover recipes from ingredients already in your pantry",
  },
];

const ImpactSection = () => {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="lp-impact" ref={ref}>
      {/* Large centre glow — antigravity radiance */}
      <motion.div
        className="lp-impact-glow"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="lp-container">
        <motion.h2
          className="lp-impact-heading"
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          The problem <span className="lp-impact-heading--accent">we solve.</span>
        </motion.h2>

        <motion.div
          className="lp-impact-grid"
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {STATS.map((s, i) => (
            <motion.div key={i} className="lp-impact-item" variants={fadeUp} transition={{ delay: i * 0.14 }}>
              <div className="lp-impact-num lp-impact-num--amber">
                {inView
                  ? <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} />
                  : `${s.prefix}0${s.suffix}`}
              </div>
              <div className="lp-impact-label">{s.label}</div>
              <div className="lp-impact-sub">{s.sub}</div>
              <div className="lp-impact-divider" />
              <div className="lp-impact-solution">
                <span className="lp-impact-solution-icon">✓</span>
                <span>{s.solution}</span>
              </div>
              {i < STATS.length - 1 && <div className="lp-impact-sep" />}
            </motion.div>
          ))}
        </motion.div>
        <motion.p
          className="lp-impact-cite"
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          transition={{ delay: 0.5 }}
        >
          Sources: End Food Waste Australia · NSW Government Love Food Hate Waste · FAO
        </motion.p>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────
   FINAL CTA SECTION
───────────────────────────────────────────────────── */

const FinalCTASection = ({ isReturning, itemCount }) => {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="lp-finalcta" ref={ref}>
      {/* Antigravity orb cluster */}
      <FloatingOrb
        size={600}
        color="radial-gradient(circle, rgba(22,163,74,0.18) 0%, transparent 70%)"
        style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
        dur={9}
      />
      <FloatingOrb
        size={350}
        color="radial-gradient(circle, rgba(134,239,172,0.1) 0%, transparent 70%)"
        style={{ left: "10%", top: "20%" }}
        delay={2}
        dur={11}
      />
      <FloatingOrb
        size={280}
        color="radial-gradient(circle, rgba(22,163,74,0.1) 0%, transparent 70%)"
        style={{ right: "8%", bottom: "15%" }}
        delay={1}
        dur={8}
      />

      <div className="lp-container">
        <motion.div
          className="lp-finalcta-inner"
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* Headline */}
          <motion.h2 className="lp-finalcta-h2" variants={fadeUp} transition={{ delay: 0.1 }}>
            Your pantry is waiting.<br />
            <span className="lp-gradient-text">Start saving today.</span>
          </motion.h2>

          {/* Sub copy */}
          <motion.p className="lp-finalcta-sub" variants={fadeUp} transition={{ delay: 0.2 }}>
            {isReturning
              ? `Welcome back — you have ${itemCount} item${itemCount !== 1 ? "s" : ""} already tracked.`
              : "No credit card. No account. Just scan and save."}
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} transition={{ delay: 0.3 }}>
            <MagneticButton>
              <Link
                to="/inventory"
                className="lp-btn lp-btn--primary lp-btn--xl"
              >
                <span>
                  {isReturning ? "Back to My Pantry" : "Get Started Free"}
                </span>
                <motion.span
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  →
                </motion.span>
                <span className="lp-btn-glow" />
              </Link>
            </MagneticButton>
          </motion.div>

          {/* Trust line */}
          <motion.p className="lp-finalcta-trust" variants={fadeUp} transition={{ delay: 0.4 }}>
            Built with ♻️ sustainability in mind
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────────────── */

export const Landing = () => {
  const [itemCount, setItemCount] = useState(0);
  const { scrollY } = useScroll();

  // Parallax layers
  const orbY1   = useTransform(scrollY, [0, 700], [0, -150]);
  const orbY2   = useTransform(scrollY, [0, 700], [0,  -90]);
  const heroY   = useTransform(scrollY, [0, 500], [0,  -70]);
  const heroOpa = useTransform(scrollY, [0, 350], [1,    0]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("inventory");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItemCount(parsed.length);
      }
    } catch (_) {}
  }, []);

  const isReturning = itemCount > 0;

  return (
    <div className="lp-root">

      {/* Grain noise overlay — 21st.dev depth texture */}
      <div className="lp-noise" aria-hidden="true" />

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="lp-hero">

        {/* Parallax orb layer 1 */}
        <motion.div className="lp-orb-layer" style={{ y: orbY1 }}>
          <FloatingOrb
            size={720}
            color="radial-gradient(circle, rgba(22,163,74,0.17) 0%, transparent 68%)"
            style={{ left: "-18%", top: "-15%" }}
            delay={0} dur={9}
          />
          <FloatingOrb
            size={420}
            color="radial-gradient(circle, rgba(134,239,172,0.09) 0%, transparent 68%)"
            style={{ right: "3%", bottom: "10%" }}
            delay={2.5} dur={11}
          />
        </motion.div>

        {/* Parallax orb layer 2 */}
        <motion.div className="lp-orb-layer" style={{ y: orbY2 }}>
          <FloatingOrb
            size={340}
            color="radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 68%)"
            style={{ right: "22%", top: "4%" }}
            delay={1} dur={13}
          />
          <FloatingOrb
            size={260}
            color="radial-gradient(circle, rgba(134,239,172,0.07) 0%, transparent 68%)"
            style={{ left: "22%", bottom: "8%" }}
            delay={3} dur={8}
          />
        </motion.div>

        {/* Dot-grid background — 21st.dev */}
        <div className="lp-dot-grid" aria-hidden="true" />

        <div className="lp-hero-inner">

          {/* ── LEFT: Text ── */}
          <motion.div className="lp-hero-left" style={{ y: heroY, opacity: heroOpa }}>

            {/* Pill / eyebrow */}
            <motion.div
              className="lp-hero-pill"
              initial={{ opacity: 0, y: 24, scale: 0.82 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.68, ease: EASE }}
            >
              <motion.span
                className="lp-pill-dot"
                animate={{ scale: [1, 1.7, 1], opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              🌱 Smart Pantry Tracker for Australian Households
            </motion.div>

            {/* Headline — per-word staggered reveal with perspective */}
            <motion.h1
              className="lp-hero-h1"
              variants={stagger}
              initial="hidden"
              animate="visible"
              style={{ perspective: 1400 }}
            >
              {["Stop", "Wasting"].map((w, i) => (
                <motion.span key={`r1-${i}`} className="lp-hw lp-hw--white" variants={wordReveal}>
                  {w}{" "}
                </motion.span>
              ))}
              <br />
              {["Food,", "Start"].map((w, i) => (
                <motion.span
                  key={`r2-${i}`}
                  className={`lp-hw ${i === 0 ? "lp-hw--accent" : "lp-hw--white"}`}
                  variants={wordReveal}
                >
                  {w}{" "}
                </motion.span>
              ))}
              <br />
              <motion.span className="lp-hw lp-hw--accent" variants={wordReveal}>
                Saving.
              </motion.span>
            </motion.h1>

            {/* Sub copy */}
            <motion.p
              className="lp-hero-sub"
              initial={{ opacity: 0, y: 28, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.76, duration: 0.82, ease: EASE }}
            >
              Scan grocery receipts, track expiry dates automatically, and
              discover recipes from what's already in your kitchen — so less
              food ends up in the bin.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.96, duration: 0.78, ease: EASE }}
            >
              <AnimatePresence mode="wait">
                {isReturning ? (
                  <motion.div key="ret" className="lp-btn-row"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <MagneticButton>
                      <Link to="/inventory" className="lp-btn lp-btn--primary">
                        Go to Pantry
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >→</motion.span>
                        <span className="lp-btn-glow" />
                      </Link>
                    </MagneticButton>
                    <MagneticButton>
                      <Link to="/inventory" className="lp-btn lp-btn--ghost">
                        + Scan Receipt
                      </Link>
                    </MagneticButton>
                  </motion.div>
                ) : (
                  <motion.div key="new" className="lp-btn-row"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <MagneticButton>
                      <Link to="/inventory" className="lp-btn lp-btn--primary">
                        Start Tracking Free
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >→</motion.span>
                        <span className="lp-btn-glow" />
                      </Link>
                    </MagneticButton>
                    <MagneticButton>
                      <Link to="/recipes" className="lp-btn lp-btn--ghost">
                        Browse Recipes
                      </Link>
                    </MagneticButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Social proof */}
            <motion.div
              className="lp-social"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.15, duration: 0.8 }}
            >
              <div className="lp-avatars">
                {["🙂", "😊", "🙃", "😄", "🤩"].map((e, i) => (
                  <motion.div
                    key={i}
                    className="lp-avatar"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1.2 + i * 0.07 }}
                  >
                    {e}
                  </motion.div>
                ))}
              </div>
              <span className="lp-social-text">
                Track ingredients, expiry dates &amp; recipes in one place
              </span>
            </motion.div>

          </motion.div>

          {/* ── RIGHT: App Mockup ── */}
          <div className="lp-hero-right">
            <AppMockup />
          </div>

        </div>

        {/* Scroll indicator */}
        <motion.div
          className="lp-scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
        >
          <motion.div
            className="lp-scroll-mouse"
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="lp-scroll-dot"
              animate={{ y: [0, 8, 0], opacity: [1, 0.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
          <motion.span
            animate={{ opacity: [0.35, 0.85, 0.35] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            scroll
          </motion.span>
        </motion.div>

      </section>

      {/* ══════════════════════════════════════════
          TICKER / MARQUEE STRIP
      ══════════════════════════════════════════ */}
      <section className="lp-ticker-section" aria-hidden="true">
        <div className="lp-ticker-track">
          <motion.div
            className="lp-ticker-inner"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          >
            {[...Array(2)].map((_, set) =>
              [
                { icon: "🧾", text: "Scan a receipt in seconds" },
                { icon: "⏰", text: "Get alerts before anything expires" },
                { icon: "🍽", text: "Cook from what's already in your kitchen" },
                { icon: "♻️", text: "Less food in the bin" },
                { icon: "🌿", text: "Free forever · No account needed" },
                { icon: "📦", text: "Know exactly what's in your pantry" },
              ].map((item, i) => (
                <span key={`${set}-${i}`} className="lp-tick-item">
                  <span className="lp-tick-icon">{item.icon}</span>
                  {item.text}
                  <span className="lp-tick-sep" aria-hidden="true">✦</span>
                </span>
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <HowItWorksSection />

      {/* ══════════════════════════════════════════
          FEATURES BENTO
      ══════════════════════════════════════════ */}
      <FeaturesSection />

      {/* ══════════════════════════════════════════
          IMPACT NUMBERS
      ══════════════════════════════════════════ */}
      <ImpactSection />

      {/* ══════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════ */}
      <FinalCTASection isReturning={isReturning} itemCount={itemCount} />

    </div>
  );
};

export default Landing;
