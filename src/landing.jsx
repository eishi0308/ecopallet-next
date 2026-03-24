// landing.js
import React from "react";
import "./landing.css";

export const Landing = () => {
  return (
    <div className="app">
      <div className="full-width-card" style={{ backgroundImage: "url('/foodwaste_bin.jpeg')" }}>
        <div className="overlay">
          <div className="headline-container">
            <h1>Goodbye Waste. </h1>
            <h1>Hello Savings.</h1>
          </div>
          <div className="button-container">
            <a href="/inventory" className="get-started-button">Get Started</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
