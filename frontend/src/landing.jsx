import React from "react";
import "./landing.css";

const steps = [
  { num: "01", icon: "🧾", label: "Scan Receipt", active: true },
  { num: "02", icon: "⏰", label: "Track Expiry",  active: false },
  { num: "03", icon: "🍽",  label: "Cook & Save",  active: false },
];

export const Landing = () => {
  return (
    <div className="landing-root">
      <div className="landing-bg">

        <div className="landing-content">

          {/* Brand */}
          <div className="landing-brand">Welcome to Fridgely</div>

          {/* Headline */}
          <div className="landing-headline">
            <h1 className="landing-h1-white">Know what's expiring.</h1>
            <h1 className="landing-h1-green">Cook it. Save money.</h1>
          </div>

          {/* Subtitle */}
          <p className="landing-sub">
            It starts with one scan.
          </p>

          {/* Step journey */}
          <div className="landing-steps">
            {steps.map((s, i) => (
              <React.Fragment key={s.label}>
                <div className={`landing-step ${s.active ? "landing-step--active" : "landing-step--dim"}`}>
                  {s.active && <span className="landing-step-pulse" />}
                  <div className="landing-step-icon-wrap">
                    {s.active && (
                      <span className="landing-scan-line" />
                    )}
                    <span className="landing-step-icon">{s.icon}</span>
                  </div>
                  <span className="landing-step-num">{s.num}</span>
                  <span className="landing-step-label">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`landing-step-arrow ${i === 0 ? "landing-step-arrow--lit" : ""}`}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* CTA */}
          <a href="/inventory" className="landing-cta">
            Scan Your First Receipt →
          </a>

        </div>
      </div>
    </div>
  );
};

export default Landing;
