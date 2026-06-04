import React, { useState, useEffect, useRef } from 'react';
import './tips.css';
import tipsdata from './tips-data.json';
import { Link, useLocation } from 'react-router-dom';
import { calculateStatus } from './calculateStatus';
import Fuse from 'fuse.js';

// framer-motion
import { motion, AnimatePresence } from 'framer-motion';

// lucide-react
import { Search, X, Refrigerator, Snowflake, Archive, Lightbulb } from 'lucide-react';

// sonner toast
import { toast, Toaster } from 'sonner';



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



// ── Animation variants ──────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardFadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
};

const pillVariant = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } },
};



const TipsContent = ({ selectedResult }) => {
  if (!selectedResult) return null;

  const sections = selectedResult.Tips.split(/\n/);

  const getCardMeta = (title) => {
    const t = title.toLowerCase();
    if (t.includes('pantry'))      return { LucideIcon: Archive,      color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', logo: pantryLogo };
    if (t.includes('freezer'))     return { LucideIcon: Snowflake,    color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', logo: freezerLogo };
    if (t.includes('refrigerat'))  return { LucideIcon: Refrigerator, color: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', logo: refrigeratorLogo };
    return                                { LucideIcon: Lightbulb,    color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', logo: additionalLogo };
  };

  return (
    <div className="tips-final-content">
      <div className="tips-result-header">
        <h3 className="tips-result-food-name">{selectedResult.Name}</h3>
        <span className="tips-result-food-category">{selectedResult.Category_Name}</span>
      </div>
      <motion.div
        className="tips-cards-grid"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {sections.map((section, index) => {
          const splitIndex = section.indexOf(':');
          if (splitIndex === -1) return null;
          const title = section.substring(0, splitIndex).trim();
          const content = section.substring(splitIndex + 1).trim();
          const { LucideIcon, color, bg, border, logo } = getCardMeta(title);

          return (
            <motion.div
              key={index}
              variants={cardFadeUp}
              className="tips-card"
              style={{ '--card-color': color, '--card-bg': bg, '--card-border': border }}
            >
              <div className="tips-card-header">
                <div className="tips-card-icon-wrap">
                  <img src={logo} alt={title} className="tips-card-logo" />
                </div>
                <div className="tips-card-title-row">
                  <LucideIcon className="tips-card-lucide-icon" size={14} />
                  <h4 className="tips-card-title">{title}</h4>
                </div>
              </div>
              <p className="tips-card-body">{content}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};


export const Tips = () => {
  const location = useLocation();
  const [showInitialContent, setShowInitialContent] = useState(true);
  const searchResultsRef = useRef(null);

  // get not-expiry items name
  const [validInventoryNames, setValidInventoryNames] = useState([]);
  useEffect(() => {
    try {
      const storedInventory = localStorage.getItem('inventory');
      if (storedInventory) {
        const parsedInventory = JSON.parse(storedInventory);
        const validItems = parsedInventory.filter(item => {
          if (!item.expiryDate) return false;
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

  // search keywords
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  const [searchPerformed, setSearchPerformed] = useState(false);
  const handleSearch = (name) => {
    setSearchResults([]);
    setSelectedResult(null);

    let processedName = name.trim();

    if (processedName === '') {
      setSearchValue('');
      setShowInitialContent(true);
      return;
    }

    if (/^\d+$/.test(processedName)) {
      setShowInitialContent(false);
      toast.error('The keyword you searched for is not in our database, please search again.');
      setSearchValue(name);
      return;
    }

    processedName = processedName.toLowerCase();

    const inputKeywords = processedName.split(' ');
    const keywordCombinations = generateCombinations(inputKeywords);
    keywordCombinations.sort((a, b) => b.length - a.length);

    for (const combination of keywordCombinations) {
      const combinationString = combination.join(' ');
      const results = tipsdata.filter(item => {
        const itemKeywords = item.Keywords.toLowerCase().split(', ');
        return itemKeywords.includes(combinationString);
      });

      if (results.length > 0) {
        setSearchResults(results);
        setShowInitialContent(false);
        setSearchValue(name);
        setSearchPerformed(true);

        if (results.length === 1) {
          setSelectedResult(results[0]);
        }
        return;
      }
    }

    const threshold = 0.3;
    const fuse = new Fuse(tipsdata, {
      keys: ['Keywords'],
      threshold: threshold,
      includeScore: true,
    });

    const fuzzyResults = fuse.search(processedName);

    if (fuzzyResults.length > 0) {
      const matchedItems = fuzzyResults.map(result => ({
        item: result.item,
        score: result.score,
      }));
      matchedItems.sort((a, b) => a.score - b.score);
      const bestMatch = matchedItems[0].item;

      setSearchResults([bestMatch]);
      setShowInitialContent(false);
      setSearchValue(name);
      setSelectedResult(bestMatch);
      setSearchPerformed(true);
      return;
    }

    setShowInitialContent(false);
    toast.error('The keyword you searched for is not in our database, please search again.');
    setSearchValue(name);
  };

  useEffect(() => {
    if (searchPerformed && searchResultsRef.current) {
      searchResultsRef.current.scrollIntoView({ behavior: 'smooth' });
      setSearchPerformed(false);
    }
  }, [searchPerformed, searchResultsRef]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search');
    if (query) handleSearch(query);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


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

  const handleResultSelection = (result) => {
    setSelectedResult(result);
  };

  // quick tips
  const categoryTips = [
    { category: 'Meat',         frontLogo: meatLogo,   backLogo: meatTip   },
    { category: 'Fruits',       frontLogo: fruitLogo,  backLogo: fruitTip  },
    { category: 'Vegetables',   frontLogo: vegeLogo,   backLogo: vegeTip   },
    { category: 'Dairy',        frontLogo: dairyLogo,  backLogo: dairyTip  },
    { category: 'Grains',       frontLogo: grainsLogo, backLogo: grainsTip },
    { category: 'Canned Foods', frontLogo: cannedLogo, backLogo: cannedTip },
  ];

  const CategoryTipItem = ({ frontLogo, backLogo, category }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
      <div
        className={`category-tip-item${isFlipped ? ' is-flipped' : ''}`}
        onClick={() => setIsFlipped(f => !f)}
      >
        <div className="category-logo-tip">
          <img src={frontLogo} alt={category} className="logo-front" />
          <img src={backLogo} alt={`${category} storage tips`} className="logo-back" />
        </div>
      </div>
    );
  };

  return (
    <>
    <Toaster position="top-center" richColors />
    <div className="tips-whole-page">

      {/* ── Hero ── */}
      <motion.div
        className="tips-hero"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <span className="tips-eyebrow">🌿 Food Storage Guide</span>
        <h1 className="tips-hero-title">Store smarter, waste less</h1>
        <p className="tips-hero-sub">Discover the best ways to store your food and extend shelf life — organised by category and tailored to your pantry.</p>
      </motion.div>

      {/* ── Quick Category Cards ── */}
      <motion.section
        className="tips-panel tips-category-panel"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="tips-category-header">
          <span className="tips-eyebrow">Quick Reference</span>
          <h2 className="tips-panel-title">Storage Tips by Category</h2>
        </div>
        <motion.div
          className="category-tips-container"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {categoryTips.map((item, index) => (
            <motion.div key={index} className="category-tip-wrap" variants={cardFadeUp}>
              <CategoryTipItem
                frontLogo={item.frontLogo}
                backLogo={item.backLogo}
                category={item.category}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ── Your Inventory ── */}
      <motion.section
        className="tips-panel"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="tips-panel-header">
          <div>
            <span className="tips-eyebrow">From Your Pantry</span>
            <h2 className="tips-panel-title">Your Inventory</h2>
          </div>
          <p className="tips-panel-sub">Click any item to get personalised storage tips</p>
        </div>
        <motion.div
          className="inventory-tips-container"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {validInventoryNames.length > 0 ? (
            validInventoryNames
              .slice((currentPage - 1) * 10, currentPage * 10)
              .map((name, index) => (
                <motion.button
                  key={index}
                  variants={pillVariant}
                  className={`inventory-item-button ${searchValue === name ? 'selected' : ''}`}
                  onClick={() => handleSearch(name)}
                  title={name}
                >
                  <span className="item-text">{name}</span>
                </motion.button>
              ))
          ) : (
            <div className="inv-empty-state-tips">
              <span className="inv-empty-icon-tips">🌿</span>
              <p className="inv-empty-title-tips">No active items found</p>
              <p className="inv-empty-sub-tips">Add items to your pantry to see personalised storage tips here, or use the search bar below.</p>
              <Link to="/inventory" className="inv-empty-link-tips">Go to Inventory →</Link>
            </div>
          )}
        </motion.div>
        {totalPages > 1 && (
          <div className="tips-pagination-controls">
            {renderPageNumbers()}
          </div>
        )}
      </motion.section>

      {/* ── Search ── */}
      <motion.section
        className="tips-panel tips-search-panel"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="tips-panel-header tips-panel-header--centered">
          <span className="tips-eyebrow">Deep Dive</span>
          <h2 className="tips-panel-title">Search for Storage Tips</h2>
          <p className="tips-panel-sub">Enter any ingredient or food name to find detailed storage guidance</p>
        </div>
        <div className="tips-search-area">
          <div className="tips-search-input-wrap">
            <Search className="tips-search-icon" size={18} />
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(searchValue)}
              placeholder="e.g. milk, chicken, olive oil…"
            />
            <AnimatePresence>
              {searchValue && (
                <motion.button
                  className="tips-search-clear"
                  onClick={() => handleSearch('')}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <button className="tips-search-button" onClick={() => handleSearch(searchValue)}>
            Search
          </button>
        </div>
      </motion.section>

      {searchResults.length === 0 && showInitialContent && (
        <div className="initial-content-footer">
          <img src={footer} alt="Footer" />
        </div>
      )}

      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            key="results"
            className="result-tips-container"
            ref={searchResultsRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <motion.div
              className="tips-results-area"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {searchResults.map((result, index) => (
                <motion.div
                  key={index}
                  variants={cardFadeUp}
                  className={`tips-result-item ${selectedResult === result ? 'selected' : ''}`}
                  onClick={() => handleResultSelection(result)}
                >
                  <span className="tips-result-category">{result.Category_Name}</span>
                  <span className="tips-result-name">{result.Name}</span>
                </motion.div>
              ))}
            </motion.div>

            {!selectedResult && (
              <div className="tips-initial-placeholder">
                <span className="tips-placeholder-icon">👆</span>
                <p>Select a result to view storage tips</p>
              </div>
            )}

            {selectedResult && (
              <TipsContent selectedResult={selectedResult} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};
