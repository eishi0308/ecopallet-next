import React, { useState, useEffect, useRef } from 'react';
import Webcam from "react-webcam";
import logo from "../ProjectLogo.png"; // Import the image
import samimg2 from "./2.jpeg"; // Import the image

export const Navigation = (props) => {
  const [showScanProducePopup, setShowScanProducePopup] = useState(false);
  const [showUploadInfoPopup, setShowUploadInfoPopup] = useState(false);
  const [msg1, setMsg1] = useState('');
  const [file1, setFile1] = useState(null);
  const [imgSrc1, setImgSrc1] = useState('');
  const [extractedText1, setExtractedText1] = useState('');
  
  const togglePopup = (popupType) => {
    setShowScanProducePopup(false);

    switch (popupType) {
      case 'produce':
        setShowScanProducePopup(!showScanProducePopup);
        break;
      case 'uploadInfo':
        setShowUploadInfoPopup(!showUploadInfoPopup);
        break;  
      default:
        break;
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    
    // Convert data URI to Blob
    const byteString = atob(imageSrc.split(',')[1]);
    const mimeType = imageSrc.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeType });
    const file = new File([blob], 'photo.jpg', { type: mimeType });

    setFile1(file);
    setImgSrc1(imageSrc);
  };
  const webcamRef = useRef(null);


  const handleFileChange1 = (e) => {
    setFile1(e.target.files[0]);
  };

const handleUpload2 = async (e) => {
  e.preventDefault(); // Prevent default form submission behavior

  // Check if a file has been selected
  if (!file1) {
    alert('Please select a file.');
    return;
  }

  const formData = new FormData();
  formData.append('file1', file1);

  setShowScanProducePopup(false); // Close the popup

  try {
    const response = await fetch('https://rohan2101new.pythonanywhere.com/pred', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      // If response status is not OK, throw an error
      throw new Error('Error reading image data, try another image.');
    }

    const data = await response.json();
    console.log(data);

    // Handle response data as needed
    // Update state variables accordingly
    setImgSrc1(data.imgSrc1);
    setExtractedText1(data.extracted_text1);
    setMsg1(data.msg1);
    togglePopup('uploadInfo');
    const daysToAdd = parseInt(data.msg1, 10);
    const currentDate = new Date();

    currentDate.setDate(currentDate.getDate() + daysToAdd);
    const day = currentDate.getDate();
    const month = new Intl.DateTimeFormat('en', { month: 'long' }).format(currentDate);
    const year = currentDate.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;
    console.log(formattedDate); // Output: "13 May 2024"

  } catch (error) {
    console.error('Error uploading image:', error);
    alert('Error reading image data, try another image.');
    setMsg1('Failed to upload image');
  }
};
const msg1Int = parseInt(msg1);


  return (
    <nav id="menu" className="navbar navbar-default navbar-fixed-top">
      <div className="container">
        <div className="navbar-header">
          <button
            type="button"
            className="navbar-toggle collapsed"
            data-toggle="collapse"
            data-target="#bs-example-navbar-collapse-1"
          >
            {" "}
            <span className="sr-only">Toggle navigation</span>{" "}
            <span className="icon-bar"></span>{" "}
            <span className="icon-bar"></span>{" "}
            <span className="icon-bar"></span>{" "}
          </button>
          {/* Container for the logo and text */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
              <a href="/">
                <img src={logo} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
              </a>
              <a className="navbar-brand page-scroll" style={{ padding: '25px' }} href="/">
              Ecopalette
            </a>{" "}
          </div>
        </div>

        <div
          className="collapse navbar-collapse"
          id="bs-example-navbar-collapse-1"
        >
          <ul className="nav navbar-nav navbar-right">
            <li>
              <a href="/inventory" >
                Inventory
              </a>
            </li>
            <li>
              <a href="/recipes" className="page-scroll">
                Recipes
              </a>
            </li>


            <li>
              <a href="/tips" className="page-scroll"> 
                Tips
              </a>
            </li>


            {/* <li>
              <a href="/About" className="page-scroll">
                About
              </a>
            </li> */}
            <li>
              <button
                onClick={() => togglePopup('produce')}
                className="nav-produce-btn"
                title="AI-powered shelf life predictor — scan fresh produce to estimate how long it will last"
              >
                🌿 Fresh Produce Predictor
              </button>
            </li>
          {/* Scan Fresh Produce Popup */}
          {showScanProducePopup && (

<div className="popup">
<h2 style={{textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>Scan Your fresh Produce to get an estimated shelf life</h2>
<div className="scan-options">
  {/* <form id="uploadForm" onSubmit={handleUpload2} encType="multipart/form-data">
    <input type="file" name="file1" onChange={handleFileChange1} />
    <input type="submit" value="Upload" />
  </form> */}
  <h3 style={{textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>Capture a Picture</h3>
  <Webcam
    audio={false}
    ref={webcamRef}
    screenshotFormat="image/jpeg"
    width={320}
    height={240}
  />
  <h3> </h3>
  <button onClick={capturePhoto} style={{display: 'block', margin: '0 auto'}}>Capture Photo</button>
  <h3> </h3>
  {imgSrc1 && <img src={imgSrc1} alt="Uploaded" />}
  <form id="uploadForm" onSubmit={handleUpload2} encType="multipart/form-data">
  <input type="submit" value="Upload" />
  </form>
  <h3 style={{textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>Or Choose a Picture</h3>
  <form id="uploadForm" onSubmit={handleUpload2} encType="multipart/form-data">
    <input type="file" name="file1" onChange={handleFileChange1} />
    <input type="submit" value="Upload" />
    <img src={samimg2} alt="Sample Image" width="25" height="25" />
      <a href={samimg2} download>  Download Sample Image</a>
    </form>
  {/* populateItems(extractedText1, '', '', msg1, ''); */}
</div>
<button onClick={() => togglePopup('produce')} style={{display: 'block', margin: '0 auto'}}>Cancel</button>
</div>

)}
            {/* Upload Info Popup */}
            {showUploadInfoPopup && (
              <div className="popup">
                <h2 style={{textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>Estimated Shelf life(in days):</h2>
                {!isNaN(msg1Int) && msg1Int > 0 ? (
  <h2 style={{textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>{msg1Int}</h2>
) : (
  <h4 style={{textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>Rotten or incorrect image uploaded</h4>
)}
                <div>
                  {/* <p>Fruit Name: {extractedText1}</p> */}
                  {/* <p>Estimated Shelf life(in days): {msg1}</p> */}
                </div>
                <button onClick={() => togglePopup('uploadInfo')} style={{
        display: 'block',
        margin: '0 auto',
    }}>Close</button>
              </div>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
