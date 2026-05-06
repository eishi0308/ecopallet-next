import React, { useState, useEffect, useRef } from 'react';
import './tips.css';
import tipsdata from './tips-data.json';
import { Link } from 'react-router-dom';
import { calculateStatus } from './calculateStatus';
import Fuse from 'fuse.js';



// image resources
// front images
import cannedLogo from '../images/tips/canned-logo.png';
import dairyLogo from '../images/tips/dairy-logo.png';
import fruitLogo from '../images/tips/fruit-logo.png';
import grainsLogo from '../images/tips/grains-logo.png';
import meatLogo from '../images/tips/meat-logo.png';
import vegeLogo from '../images/tips/vegie-logo.png';
// back images
import vegeTip from '../images/tips/vegie-tip.png';
import meatTip from '../images/tips/meat-tip.png';
import dairyTip from '../images/tips/dairy-tip.png';
import grainsTip from '../images/tips/grains-tip.png';
import cannedTip from '../images/tips/canned-tip.png';
import fruitTip from '../images/tips/fruit-tip.png';
// images for tips results 
import additionalLogo from '../images/tips/additional-logo.png';
import pantryLogo from '../images/tips/pantry-logo.png';
import freezerLogo from '../images/tips/freezer-logo.png';
import refrigeratorLogo from '../images/tips/refrigerator-logo.png';
// footer image
import footer from '../images/tips/tips-footer.png';




const ErrorModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-body">
          <p>The keyword you searched for is not in our database, please search again.</p>
        </div>
        <div className="modal-footer">
          <button className="modal-button" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};


const TipsContent = ({ selectedResult }) => {
  if (!selectedResult) return null;

  const sections = selectedResult.Tips.split(/\n/);

  const getCardMeta = (title) => {
    const t = title.toLowerCase();
    if (t.includes('pantry'))      return { icon: '🏺', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', logo: pantryLogo };
    if (t.includes('freezer'))     return { icon: '❄️', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', logo: freezerLogo };
    if (t.includes('refrigerat'))  return { icon: '🧊', color: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', logo: refrigeratorLogo };
    return                                { icon: '💡', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', logo: additionalLogo };
  };

  return (
    <div className="tips-final-content">
      <div className="tips-result-header">
        <h3 className="tips-result-food-name">{selectedResult.Name}</h3>
        <span className="tips-result-food-category">{selectedResult.Category_Name}</span>
      </div>
      <div className="tips-cards-grid">
        {sections.map((section, index) => {
          const splitIndex = section.indexOf(':');
          if (splitIndex === -1) return null;
          const title = section.substring(0, splitIndex).trim();
          const content = section.substring(splitIndex + 1).trim();
          const { icon, color, bg, border, logo } = getCardMeta(title);

          return (
            <div key={index} className="tips-card" style={{ '--card-color': color, '--card-bg': bg, '--card-border': border }}>
              <div className="tips-card-header">
                <div className="tips-card-icon-wrap">
                  <img src={logo} alt={title} className="tips-card-logo" />
                </div>
                <div className="tips-card-title-row">
                  <span className="tips-card-emoji">{icon}</span>
                  <h4 className="tips-card-title">{title}</h4>
                </div>
              </div>
              <p className="tips-card-body">{content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};


export const Tips = () => {
  const [showInitialContent, setShowInitialContent] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const searchResultsRef = useRef(null);

  // get not-expiry items name 
  const [validInventoryNames, setValidInventoryNames] = useState([]);
  useEffect(() => {
    try {
      const storedInventory = localStorage.getItem('inventory');
      if (storedInventory) {
        const parsedInventory = JSON.parse(storedInventory);
        const validItems = parsedInventory.filter(item => {
          const status = calculateStatus(item.expiryDate);
          return status.color === 'green' || status.color === '#DAA520';
        });
        const uniqueNames = [...new Set(validItems.map(item => item.name.toLowerCase()))];
        setValidInventoryNames(uniqueNames);
      }
    } catch (error) {
      // silently ignore parse errors
    }
  }, []);

  //  search keywords
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);


  const [searchPerformed, setSearchPerformed] = useState(false);
  const handleSearch = (name) => {
    // Clear previous search results and selected result
    setSearchResults([]);
    setSelectedResult(null);

    // Preprocessing user input
    let processedName = name.trim();

    // If the search bar is empty, reset the search value and return
    if (processedName === '') {
      setSearchValue('');
      setShowInitialContent(true);
      return;
    }

    // Check if the input is a number
    if (/^\d+$/.test(processedName)) {
      setShowInitialContent(false);
      setShowErrorModal(true);
      setSearchValue(name);
      return;
    }

    // Convert to lowercase
    processedName = processedName.toLowerCase();

    // Segment user input keywords
    const inputKeywords = processedName.split(' ');

    // Generate all combinations of keywords
    const keywordCombinations = generateCombinations(inputKeywords);

    // Sort keyword combinations in descending order of length
    keywordCombinations.sort((a, b) => b.length - a.length);

    // Try to match keyword combinations one by one
    for (const combination of keywordCombinations) {
      const combinationString = combination.join(' ');
      const results = tipsdata.filter(item => {
        const itemKeywords = item.Keywords.toLowerCase().split(', ');
        return itemKeywords.includes(combinationString);
      });

      if (results.length > 0) {
        setSearchResults(results);
        setShowInitialContent(false);
        setShowErrorModal(false);
        setSearchValue(name);
        setSearchPerformed(true);



        // If there is only one search result, automatically select and display it
        if (results.length === 1) {
          setSelectedResult(results[0]);
        }
        return;
      }
    }

    // If there are no exact matches, try fuzzy matching
    const threshold = 0.3; // Set the matching threshold, e.g., 0.3
    const fuse = new Fuse(tipsdata, {
      keys: ['Keywords'],
      threshold: threshold,
      includeScore: true,
    });

    const fuzzyResults = fuse.search(processedName);

    if (fuzzyResults.length > 0) {
      // Extract the matched items and their scores
      const matchedItems = fuzzyResults.map(result => ({
        item: result.item,
        score: result.score,
      }));

      // Sort the matched items by their scores in ascending order
      matchedItems.sort((a, b) => a.score - b.score);

      // Choose the best match (the item with the lowest score)
      const bestMatch = matchedItems[0].item;

      setSearchResults([bestMatch]);
      setShowInitialContent(false);
      setShowErrorModal(false);
      setSearchValue(name);
      setSelectedResult(bestMatch);
      setSearchPerformed(true);

      return;
    }

    // If there are no matches, show the error modal
    setShowInitialContent(false);
    setShowErrorModal(true);
    setSearchValue(name);
  };
  useEffect(() => {
    if (searchPerformed && searchResultsRef.current) {
      searchResultsRef.current.scrollIntoView({ behavior: 'smooth' });
      setSearchPerformed(false);
    }
  }, [searchPerformed, searchResultsRef]);


  // Generate all combinations of keywords
  function generateCombinations(keywords) {
    const combinations = [];

    for (let i = 0; i < keywords.length; i++) {
      combinations.push([keywords[i]]);

      for (let j = i + 1; j < keywords.length; j++) {
        combinations.push([keywords[i], keywords[j]]);

        for (let k = j + 1; k < keywords.length; k++) {
          combinations.push([keywords[i], keywords[j], keywords[k]]);
        }
      }
    }

    return combinations;
  }



  // error popup close
  const handleCloseModal = () => {
    setShowErrorModal(false);
    if (searchResults.length === 0) {
      setShowInitialContent(true);
    }
  };


  // Pages in inventory container
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const itemsPerPage = 10;
    if (validInventoryNames.length > 0) {
      const totalPages = Math.ceil(validInventoryNames.length / itemsPerPage);
      setTotalPages(totalPages);
    }
  }, [validInventoryNames]);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];

    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(
        <button
          key={i}
          className={`page-number-button ${currentPage === i ? 'active' : ''}`}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };


  // Selected results processing logic
  const handleResultSelection = (result) => {
    setSelectedResult(result);
  };


  // quick tips
  const categoryTips = [
    { category: 'Meat', frontLogo: meatLogo, backLogo: meatTip },
    { category: 'Fruits', frontLogo: fruitLogo, backLogo: fruitTip },
    { category: 'Vegetables', frontLogo: vegeLogo, backLogo: vegeTip },
    { category: 'Dairy', frontLogo: dairyLogo, backLogo: dairyTip },
    { category: 'Grains', frontLogo: grainsLogo, backLogo: grainsTip },
    { category: 'Canned Foods', frontLogo: cannedLogo, backLogo: cannedTip },
  ];

  const CategoryTipItem = ({ frontLogo, backLogo }) => {
    const [showBackLogo, setShowBackLogo] = useState(false);

    const toggleLogo = () => {
      setShowBackLogo(!showBackLogo);
    };

    return (
      <div className="category-tip-item" onClick={toggleLogo}>
        <div className="category-logo-tip">
          <img src={frontLogo} alt="Category Front" className="logo-front" />
          <img src={backLogo} alt="Category Back" className="logo-back" />
        </div>
      </div>
    );
  };

  return (
    <div className="tips-whole-page">

      {/* ── Hero ── */}
      <div className="tips-hero">
        <span className="tips-eyebrow">🌿 Food Storage Guide</span>
        <h1 className="tips-hero-title">Store smarter, waste less</h1>
        <p className="tips-hero-sub">Discover the best ways to store your food and extend shelf life — organised by category and tailored to your pantry.</p>
      </div>

      {/* ── Quick Category Cards ── */}
      <section className="tips-panel">
        <div className="tips-panel-header">
          <div>
            <span className="tips-eyebrow">Quick Reference</span>
            <h2 className="tips-panel-title">Storage Tips by Category</h2>
          </div>
          <p className="tips-panel-sub">Hover (or tap) each card to reveal storage tips</p>
        </div>
        <div className="category-tips-container">
          {categoryTips.map((item, index) => (
            <div key={index} className="category-tip-wrap">
              <CategoryTipItem frontLogo={item.frontLogo} backLogo={item.backLogo} />
              <span className="category-tip-label">{item.category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Your Inventory ── */}
      <section className="tips-panel">
        <div className="tips-panel-header">
          <div>
            <span className="tips-eyebrow">From Your Pantry</span>
            <h2 className="tips-panel-title">Your Inventory</h2>
          </div>
          <p className="tips-panel-sub">Click any item to get personalised storage tips</p>
        </div>
        <div className="inventory-tips-container">
          {validInventoryNames.length > 0 ? (
            validInventoryNames
              .slice((currentPage - 1) * 10, currentPage * 10)
              .map((name, index) => (
                <button
                  key={index}
                  className={`inventory-item-button ${searchValue === name ? 'selected' : ''}`}
                  onClick={() => handleSearch(name)}
                >
                  <span className="item-text">{name}</span>
                </button>
              ))
          ) : (
            <p className="centered-message-inventory">
              No active items found.{' '}
              <Link to="/inventory" className="link-style">Add items to your pantry</Link>{' '}
              or use the search bar below.
            </p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="tips-pagination-controls">
            {renderPageNumbers()}
          </div>
        )}
      </section>

      {/* ── Search ── */}
      <section className="tips-panel tips-search-panel">
        <div className="tips-panel-header tips-panel-header--centered">
          <span className="tips-eyebrow">Deep Dive</span>
          <h2 className="tips-panel-title">Search for Storage Tips</h2>
          <p className="tips-panel-sub">Enter any ingredient or food name to find detailed storage guidance</p>
        </div>
        <div className="tips-search-area">
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(searchValue)}
            placeholder="e.g. milk, chicken, olive oil…"
          />
          <button className="tips-search-button" onClick={() => handleSearch(searchValue)}>
            Search
          </button>
        </div>
      </section>

      {searchResults.length === 0 && showInitialContent && (
        <div className="initial-content-footer">
          <img src={footer} alt="Footer" />
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="result-tips-container" ref={searchResultsRef}>
          <div className="tips-results-area">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className={`tips-result-item ${selectedResult === result ? 'selected' : ''}`}
                onClick={() => handleResultSelection(result)}
              >
                <span className="tips-result-category">{result.Category_Name}</span>
                <span className="tips-result-name">{result.Name}</span>
              </div>
            ))}
          </div>

          {!selectedResult && (
            <div className="tips-initial-placeholder">
              <span className="tips-placeholder-icon">👆</span>
              <p>Select a result to view storage tips</p>
            </div>
          )}

          {selectedResult && (
            <TipsContent selectedResult={selectedResult} />
          )}
        </div>
      )}

      <ErrorModal isOpen={showErrorModal} onClose={handleCloseModal} />
    </div>
  );
};
