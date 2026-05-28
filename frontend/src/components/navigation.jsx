import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from "../ProjectLogo.png";
import './navigation.css';

export const Navigation = () => {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close nav on window resize to desktop width
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 992) setNavOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeNav = () => setNavOpen(false);

  return (
    <>
      {/* ── Bootstrap navbar-expand-lg ── */}
      <nav className="navbar navbar-expand-lg fixed-top fridgely-nav">
        <div className="container">

          {/* Brand */}
          <Link className="navbar-brand fridgely-brand" to="/">
            <img src={logo} className="nav-logo" alt="Fridgely" />
            Fridgely
          </Link>

          {/* Bootstrap hamburger toggler — React state controlled */}
          <button
            className="navbar-toggler fridgely-toggler"
            type="button"
            onClick={() => setNavOpen(o => !o)}
            aria-expanded={navOpen}
            aria-label="Toggle navigation"
          >
            <span className={`toggler-bar ${navOpen ? 'open' : ''}`} />
            <span className={`toggler-bar ${navOpen ? 'open' : ''}`} />
            <span className={`toggler-bar ${navOpen ? 'open' : ''}`} />
          </button>

          {/* Bootstrap navbar-collapse — show class toggled by React */}
          <div className={`navbar-collapse ${navOpen ? 'show' : 'collapse'}`} id="fridgelyNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
              <li className="nav-item">
                <Link className={`nav-link fridgely-link${pathname === '/inventory' ? ' fridgely-link--active' : ''}`} to="/inventory" onClick={closeNav}>
                  <i className="bi bi-box-seam me-2" />Inventory
                </Link>
              </li>
              <li className="nav-item">
                <Link className={`nav-link fridgely-link${pathname === '/recipes' ? ' fridgely-link--active' : ''}`} to="/recipes" onClick={closeNav}>
                  <i className="bi bi-egg-fried me-2" />Recipes
                </Link>
              </li>
              <li className="nav-item">
                <Link className={`nav-link fridgely-link${pathname === '/tips' ? ' fridgely-link--active' : ''}`} to="/tips" onClick={closeNav}>
                  <i className="bi bi-lightbulb me-2" />Tips
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </nav>

    </>
  );
};

export default Navigation;
