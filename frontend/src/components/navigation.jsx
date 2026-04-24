import React, { useState, useRef, useEffect } from 'react';
import Webcam from "react-webcam";
import logo from "../ProjectLogo.png";
import samimg2 from "./2.jpeg";
import './navigation.css';

export const Navigation = () => {
  const [navOpen, setNavOpen] = useState(false);
  const [showScanProducePopup, setShowScanProducePopup] = useState(false);
  const [showUploadInfoPopup, setShowUploadInfoPopup] = useState(false);
  const [msg1, setMsg1] = useState('');
  const [file1, setFile1] = useState(null);
  const [imgSrc1, setImgSrc1] = useState('');

  const webcamRef = useRef(null);

  // Close nav on window resize to desktop width
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 992) setNavOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeNav = () => setNavOpen(false);

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const byteString = atob(imageSrc.split(',')[1]);
    const mimeType = imageSrc.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeType });
    setFile1(new File([blob], 'photo.jpg', { type: mimeType }));
    setImgSrc1(imageSrc);
  };

  const handleFileChange = (e) => setFile1(e.target.files[0]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file1) { alert('Please select a file.'); return; }
    const formData = new FormData();
    formData.append('file1', file1);
    setShowScanProducePopup(false);
    try {
      const response = await fetch('https://rohan2101new.pythonanywhere.com/pred', {
        method: 'POST', body: formData,
      });
      if (!response.ok) throw new Error('Error reading image data.');
      const data = await response.json();
      setImgSrc1(data.imgSrc1);
      setMsg1(data.msg1);
      setShowUploadInfoPopup(true);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error reading image data, try another image.');
    }
  };

  const msg1Int = parseInt(msg1);

  return (
    <>
      {/* ── Bootstrap navbar-expand-lg ── */}
      <nav className="navbar navbar-expand-lg fixed-top fridgely-nav">
        <div className="container">

          {/* Brand */}
          <a className="navbar-brand fridgely-brand" href="/">
            <img src={logo} className="nav-logo" alt="Fridgely" />
            Fridgely
          </a>

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
                <a className="nav-link fridgely-link" href="/inventory" onClick={closeNav}>
                  <i className="bi bi-box-seam me-2" />Inventory
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link fridgely-link" href="/recipes" onClick={closeNav}>
                  <i className="bi bi-egg-fried me-2" />Recipes
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link fridgely-link" href="/tips" onClick={closeNav}>
                  <i className="bi bi-lightbulb me-2" />Tips
                </a>
              </li>
              {/* Fresh Produce hidden — feature temporarily disabled
              <li className="nav-item mt-2 mt-lg-0 ms-lg-2">
                <button
                  className="nav-produce-btn"
                  onClick={() => { closeNav(); setShowScanProducePopup(true); }}
                >
                  🌿 Fresh Produce
                </button>
              </li>
              */}
            </ul>
          </div>

        </div>
      </nav>

      {/* ── Scan Fresh Produce Popup — hidden, feature temporarily disabled ── */}
      {false && showScanProducePopup && (
        <div className="nav-popup-overlay" onClick={() => setShowScanProducePopup(false)}>
          <div className="nav-popup" onClick={e => e.stopPropagation()}>
            <h2>🌿 Fresh Produce Predictor</h2>
            <h3>Scan or upload a photo to estimate shelf life</h3>
            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg"
              width="100%" style={{ borderRadius: '10px' }} />
            <button className="nav-popup-btn" onClick={capturePhoto}>📷 Capture Photo</button>
            {imgSrc1 && <img src={imgSrc1} alt="Captured" />}
            <form onSubmit={handleUpload} encType="multipart/form-data"
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3>Or choose a file</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="file" name="file1" onChange={handleFileChange} />
              </div>
              <button type="submit" className="nav-popup-btn">Upload &amp; Predict</button>
            </form>
            <button className="nav-popup-btn secondary"
              onClick={() => setShowScanProducePopup(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Result Popup — hidden, feature temporarily disabled ── */}
      {false && showUploadInfoPopup && (
        <div className="nav-popup-overlay" onClick={() => setShowUploadInfoPopup(false)}>
          <div className="nav-popup" onClick={e => e.stopPropagation()}>
            <h2>Estimated Shelf Life</h2>
            {!isNaN(msg1Int) && msg1Int > 0 ? (
              <>
                <div className="nav-popup-result">{msg1Int}</div>
                <div className="nav-popup-result-label">days remaining</div>
              </>
            ) : (
              <h3 style={{ color: '#f87171' }}>Rotten or unrecognised image — try another photo</h3>
            )}
            <button className="nav-popup-btn"
              onClick={() => setShowUploadInfoPopup(false)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
