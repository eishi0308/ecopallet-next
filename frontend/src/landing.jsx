import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

const steps = [
  { num: "01", icon: "🧾", label: "Scan Receipt", active: true,  scan: true },
  { num: "02", icon: "⏰", label: "Track Expiry",  active: true,  scan: false },
  { num: "03", icon: "🍽",  label: "Cook & Save",  active: true,  scan: false },
];

export const Landing = () => {
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('inventory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setItemCount(parsed.length);
      }
    } catch (_) {}
  }, []);

  const isReturning = itemCount > 0;

  return (
    <div className="landing-root">
      <div className="landing-bg">

        <div className="landing-content">

          {/* Headline */}
          <div className="landing-headline">
            <h1 className="landing-h1-white">Know what's expiring.</h1>
            <h1 className="landing-h1-green">Cook it. Save money.</h1>
          </div>

          {/* Subtitle */}
          <p className="landing-sub">
            {isReturning ? `Welcome back — your pantry is waiting.` : `It starts with one scan.`}
          </p>

          {/* Step journey */}
          <div className="landing-steps">
            {steps.map((s, i) => (
              <React.Fragment key={s.label}>
                <div className={`landing-step ${s.active ? "landing-step--active" : "landing-step--dim"}`}>
                  {s.scan && <span className="landing-step-pulse" />}
                  <div className="landing-step-icon-wrap">
                    {s.scan && (
                      <span className="landing-scan-line" />
                    )}
                    <span className="landing-step-icon">{s.icon}</span>
                  </div>
                  <span className="landing-step-num">{s.num}</span>
                  <span className="landing-step-label">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="landing-step-arrow landing-step-arrow--lit">→</div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* CTA */}
          {isReturning ? (
            <div className="landing-cta-group">
              <Link to="/inventory" className="landing-cta">
                You have {itemCount} item{itemCount !== 1 ? 's' : ''} tracked → Go to Pantry
              </Link>
              <Link to="/inventory" className="landing-cta landing-cta--secondary">
                + Scan New Receipt
              </Link>
            </div>
          ) : (
            <Link to="/inventory" className="landing-cta">
              Scan Your First Receipt →
            </Link>
          )}

        </div>
      </div>
    </div>
  );
};

export default Landing;
