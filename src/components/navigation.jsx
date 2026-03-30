import React, { useState, useRef, useEffect } from 'react';
import Webcam from "react-webcam";
import logo from "../ProjectLogo.png";
import samimg2 from "./2.jpeg";
import './navigation.css';

export const Navigation = () => {
  const [showScanProducePopup, setShowScanProducePopup] = useState(false);
  const [showUploadInfoPopup, setShowUploadInfoPopup] = useState(false);
  const [msg1, setMsg1] = useState('');
  const [file1, setFile1] = useState(null);
  const [imgSrc1, setImgSrc1] = useState('');

  const webcamRef = useRef(null);
  const produceTooltipRef = useRef(null);

  // Bootstrap 5 tooltip init
  useEffect(() => {
    if (produceTooltipRef.current && window.bootstrap) {
      new window.bootstrap.Tooltip(produceTooltipRef.current);
    }
  }, []);

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
        method: 'POST',
        body: formData,
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
      {/* ── Main Navbar ── */}
      <nav className="navbar fixed-top fridgely-nav">
        <div className="container">

          {/* Brand */}
          <a className="navbar-brand" href="/">
            <img src={logo} className="nav-logo" alt="Fridgely logo" />
            Fridgely
          </a>

          {/* Desktop links — hidden on mobile */}
          <div className="d-none d-lg-flex align-items-center gap-1">
            <a className="nav-link" href="/inventory">Inventory</a>
            <a className="nav-link" href="/recipes">Recipes</a>
            <a className="nav-link" href="/tips">Tips</a>
            <button
              ref={produceTooltipRef}
              className="nav-produce-btn"
              onClick={() => setShowScanProducePopup(true)}
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              title="AI-powered shelf life predictor — scan fresh produce"
            >
              🌿 Fresh Produce
            </button>
          </div>

          {/* Mobile: offcanvas trigger */}
          <button
            className="navbar-toggler d-lg-none"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#fridgelyOffcanvas"
            aria-controls="fridgelyOffcanvas"
            aria-label="Open menu"
          >
            <span className="navbar-toggler-icon" />
          </button>

        </div>
      </nav>

      {/* ── Offcanvas drawer (mobile) ── */}
      <div
        className="offcanvas offcanvas-end fridgely-offcanvas"
        tabIndex="-1"
        id="fridgelyOffcanvas"
        aria-labelledby="fridgelyOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <span className="offcanvas-title" id="fridgelyOffcanvasLabel">
            <img src={logo} className="nav-logo" alt="" style={{ marginRight: 8 }} />
            Fridgely
          </span>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div className="offcanvas-body">
          <a className="nav-link" href="/inventory">📦 Inventory</a>
          <a className="nav-link" href="/recipes">🍽 Recipes</a>
          <a className="nav-link" href="/tips">💡 Tips</a>
          <button
            className="nav-produce-btn"
            onClick={() => {
              setShowScanProducePopup(true);
              // close offcanvas
              const el = document.getElementById('fridgelyOffcanvas');
              if (el && window.bootstrap) window.bootstrap.Offcanvas.getInstance(el)?.hide();
            }}
          >
            🌿 Fresh Produce Predictor
          </button>
        </div>
      </div>

      {/* ── Scan Fresh Produce Popup ── */}
      {showScanProducePopup && (
        <div className="nav-popup-overlay" onClick={() => setShowScanProducePopup(false)}>
          <div className="nav-popup" onClick={e => e.stopPropagation()}>
            <h2>🌿 Fresh Produce Predictor</h2>
            <h3>Scan or upload a photo to estimate shelf life</h3>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="100%"
              style={{ borderRadius: '10px' }}
            />
            <button className="nav-popup-btn" onClick={capturePhoto}>📷 Capture Photo</button>
            {imgSrc1 && <img src={imgSrc1} alt="Captured" />}
            <form onSubmit={handleUpload} encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3>Or choose a file</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="file" name="file1" onChange={handleFileChange} />
                <a href={samimg2} download style={{ fontSize: 12, color: '#86efac' }}>Sample ↓</a>
              </div>
              <button type="submit" className="nav-popup-btn">Upload &amp; Predict</button>
            </form>
            <button className="nav-popup-btn secondary" onClick={() => setShowScanProducePopup(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Result Popup ── */}
      {showUploadInfoPopup && (
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
            <button className="nav-popup-btn" onClick={() => setShowUploadInfoPopup(false)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
