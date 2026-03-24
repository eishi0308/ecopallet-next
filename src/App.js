import React from "react";
import { Navigation } from "./components/navigation";
import { Contact } from "./components/contact";
import { Landing } from "./landing";
import { Maininventory } from "./Pages/Page/inventory";
import { Recipes } from "./Pages/Page/recipes";
import { Tips } from "./Pages/Page/tips";
import { Knowledge } from "./Pages/Page/knowledge";
import { Recycling } from "./Pages/Page/recycling";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/inventory"
          element={
            <div style={{ width: "100%", height: "100%" }}>
              <Maininventory />
            </div>
          }
        />

        <Route
          path="/recipes"
          element={
            <div style={{ width: "100%", height: "100%" }}>
              <Recipes />
            </div>
          }
        />

        <Route
          path="/tips"
          element={
            <div style={{ width: "100%", height: "100%" }}>
              <Tips />
            </div>
          }
        />

        <Route
          path="/knowledge"
          element={
            <div style={{ width: "100%", height: "100%" }}>
              <Knowledge />
            </div>
          }
        />

        <Route
          path="/recycling"
          element={
            <div style={{ width: "100%", height: "100%" }}>
              <Recycling />
            </div>
          }
        />
      </Routes>

      <Contact />
    </Router>
  );
}

export default App;
