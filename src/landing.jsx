import React from "react";
import "./landing.css";

const features = [
  { icon: "📷", label: "Receipt Scanning" },
  { icon: "📊", label: "Spending Analytics" },
  { icon: "🍽", label: "Recipe Suggestions" },
];

export const Landing = () => {
  return (
    <div className="landing-root">
      <div className="landing-bg">

        <div className="landing-content">

          {/* Brand */}
          <div className="landing-brand"> Welcome to Fridgely</div>

          {/* Headline */}
          <div className="landing-headline">
            <h1 className="landing-h1-white">Know what's expiring.</h1>
            <h1 className="landing-h1-green">Cook it. Save money.</h1>
          </div>

          {/* Subtitle */}
          <p className="landing-sub">
            Smart pantry tracking that turns your fridge into zero waste.
          </p>

          {/* Feature chips */}
          <div className="landing-chips">
            {features.map((f) => (
              <span key={f.label} className="landing-chip">
                {f.icon} {f.label}
              </span>
            ))}
          </div>

          {/* CTA */}
          <a href="/inventory" className="landing-cta">
            Get Started →
          </a>

        </div>
      </div>
    </div>
  );
};

export default Landing;
