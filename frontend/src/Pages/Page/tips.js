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

const wordReveal = {
  hidden:  { opacity: 0, y: 36, filter: 'blur(5px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.62, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const EASE = [0.25, 0.46, 0.45, 0.94];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://ecopallet-next.onrender.com';

// Generated entries are cached so a given food is only ever paid for once.
const GENERATED_CACHE_KEY = 'tips-generated-cache';
const loadGeneratedCache = () => {
  try { return JSON.parse(localStorage.getItem(GENERATED_CACHE_KEY)) || {}; }
  catch { return {}; }
};
const saveGeneratedCache = (cache) => {
  try { localStorage.setItem(GENERATED_CACHE_KEY, JSON.stringify(cache)); }
  catch { /* quota or private mode — the session cache still works */ }
};

// Mirrors the expiry formats calculateStatus accepts ("3 Aug 2026" and "dd/mm/yyyy").
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  let d;
  if (expiryDate.includes('/')) {
    const p = expiryDate.split('/');
    d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  } else {
    const p = expiryDate.split(' ');
    d = (p.length === 3 && MONTHS[p[1]] !== undefined)
      ? new Date(Number(p[2]), MONTHS[p[1]], Number(p[0]))
      : new Date(expiryDate);
  }
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
};

const FloatingOrb = ({ size, color, style, delay = 0, dur = 10 }) => (
  <motion.div
    className="tips-orb"
    style={{ width: size, height: size, background: color, ...style }}
    animate={{ y: [0, -38, -8, -30, 0], x: [0, 12, 3, -10, 0], scale: [1, 1.05, 0.97, 1.03, 1] }}
    transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);



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
        {selectedResult.generated && (
          <span className="tips-generated-badge" title="Not in our curated guide — written for you just now">
            ✦ AI-written
          </span>
        )}
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
  const [inventoryItems, setInventoryItems] = useState([]);
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
        setInventoryItems(validItems);
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

    // Nothing curated matches. Instead of dead-ending, generate an entry.
    setShowInitialContent(false);
    setSearchValue(name);
    generateTips(processedName, name);
  };

  // ── AI fallback: only ever runs when the 423-entry dataset has no answer ──
  const [isGenerating, setIsGenerating] = useState(false);
  const generatedCache = useRef(loadGeneratedCache());

  const generateTips = async (key, original) => {
    const cached = generatedCache.current[key];
    if (cached) {
      setSearchResults([cached]);
      setSelectedResult(cached);
      setSearchPerformed(true);
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/storage-tips?name=${encodeURIComponent(key)}`);

      if (res.status === 404) {
        toast.error(`We couldn't find "${original}" — try a different food name.`);
        return;
      }
      if (!res.ok) throw new Error('generate failed');

      const entry = await res.json();
      generatedCache.current[key] = entry;
      saveGeneratedCache(generatedCache.current);

      setSearchResults([entry]);
      setSelectedResult(entry);
      setSearchPerformed(true);
    } catch (error) {
      toast.error('Could not reach the storage guide. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Situational advice for one pantry item (quantity, days left, price) ──
  const [advice, setAdvice] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const handleInventoryClick = (name) => {
    handleSearch(name);
    fetchAdvice(name);
  };

  const fetchAdvice = async (name) => {
    const item = inventoryItems.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (!item) { setAdvice(null); return; }

    setAdvice(null);
    setAdviceLoading(true);
    try {
      const daysLeft = daysUntilExpiry(item.expiryDate);
      const res = await fetch(`${BACKEND_URL}/storage-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          amount: Number(item.amount) || null,
          days_left: daysLeft,
          spent: Number(item.spent) || null,
        }),
      });
      if (!res.ok) throw new Error('advice failed');
      const data = await res.json();
      setAdvice({ text: data.advice, item: item.name, daysLeft });
    } catch (error) {
      setAdvice(null); // stay quiet — the curated tips below are still useful
    } finally {
      setAdviceLoading(false);
    }
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
    const itemsPerPage = 20;
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

  // Where food actually belongs — ordered coldest to warmest.
  // The "avoid" line is the part people get wrong, so it earns its own row.
  const STORAGE_ZONES = [
    {
      zone: 'Freezer',
      temp: '−18°C',
      tone: 'freezer',
      best: ['Bread', 'Meat & fish', 'Herbs', 'Milk', 'Cooked portions'],
      avoid: 'Refreezing anything that has already thawed',
    },
    {
      zone: 'Fridge — main shelves',
      temp: '1–4°C',
      tone: 'shelves',
      best: ['Dairy', 'Eggs', 'Leftovers', 'Cooked food'],
      avoid: 'Keeping eggs in the door — they need the steady cold',
    },
    {
      zone: 'Fridge — crisper',
      temp: '1–4°C · humid',
      tone: 'crisper',
      best: ['Leafy greens', 'Carrots', 'Broccoli', 'Berries'],
      avoid: 'Apples beside greens — their ethylene wilts them fast',
    },
    {
      zone: 'Fridge — door',
      temp: '5–10°C',
      tone: 'door',
      best: ['Condiments', 'Jams', 'Juice', 'Butter'],
      avoid: 'Milk — the warmest, most variable spot',
    },
    {
      zone: 'Pantry — cool & dark',
      temp: '10–21°C',
      tone: 'pantry',
      best: ['Potatoes', 'Onions', 'Oils', 'Unopened tins'],
      avoid: 'Potatoes next to onions, and tomatoes in the fridge',
    },
  ];

  return (
    <>
    <Toaster position="top-center" richColors />
    <div className="tips-whole-page">
      <div className="tips-noise" aria-hidden="true" />

      {/* ── Hero ── */}
      <motion.div
        className="tips-hero"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <FloatingOrb size={300} color="radial-gradient(circle, rgba(22,163,74,0.26) 0%, transparent 70%)" style={{ right: '-3%', top: '-40%' }} delay={0} dur={9} />
        <FloatingOrb size={160} color="radial-gradient(circle, rgba(134,239,172,0.15) 0%, transparent 70%)" style={{ right: '30%', bottom: '-35%' }} delay={2} dur={12} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="tips-eyebrow">
            <motion.span
              className="tips-pill-dot"
              animate={{ scale: [1, 1.7, 1], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            🌿 Food Storage Guide
          </span>
          <motion.h1
            className="tips-hero-title"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } } }}
            style={{ perspective: 800 }}
          >
            {['Store smarter,', 'waste less'].map((w, i) => (
              <motion.span key={i} variants={wordReveal} style={{ display: 'inline-block', marginRight: '0.28em' }}>{w}</motion.span>
            ))}
          </motion.h1>
          <motion.p
            className="tips-hero-sub"
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.52, duration: 0.6, ease: EASE }}
          >
            Discover the best ways to store your food and extend shelf life — organised by category and tailored to your pantry.
          </motion.p>
        </div>
      </motion.div>

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

      {/* ── Situational advice — only possible because we know YOUR item ── */}
      <AnimatePresence>
        {(adviceLoading || advice) && (
          <motion.div
            key="advice"
            className="tips-advice"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <span className="tips-advice-mark" aria-hidden="true">✦</span>
            {adviceLoading ? (
              <p className="tips-advice-text tips-advice-text--loading">
                Looking at your {searchValue}…
              </p>
            ) : (
              <div>
                <p className="tips-advice-label">
                  For your {advice.item}
                  {typeof advice.daysLeft === 'number' && (
                    <span className={`tips-advice-days${advice.daysLeft <= 3 ? ' tips-advice-days--urgent' : ''}`}>
                      {advice.daysLeft < 0
                        ? 'past expiry'
                        : advice.daysLeft === 0
                          ? 'expires today'
                          : `${advice.daysLeft} ${advice.daysLeft === 1 ? 'day' : 'days'} left`}
                    </span>
                  )}
                </p>
                <p className="tips-advice-text">{advice.text}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Writing tips for a food the curated guide doesn't cover ── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            key="generating"
            className="tips-generating"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <span className="tips-generating-spinner" aria-hidden="true" />
            <div>
              <p className="tips-generating-title">
                “{searchValue}” isn’t in our guide yet — writing storage tips for it now
              </p>
              <p className="tips-generating-sub">This happens once. We’ll remember it next time.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ── Your Inventory ── */}
      <motion.section
        className="tips-panel"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="tips-panel-header tips-panel-header--stacked">
          <div>
            <span className="tips-eyebrow">From Your Pantry</span>
            <h2 className="tips-panel-title">Your Inventory</h2>
            <p className="tips-panel-sub">Click any item to get personalised storage tips</p>
          </div>
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
              .slice((currentPage - 1) * 20, currentPage * 20)
              .map((name, index) => (
                <motion.button
                  key={index}
                  variants={pillVariant}
                  className={`inventory-item-button ${searchValue === name ? 'selected' : ''}`}
                  onClick={() => handleInventoryClick(name)}
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

      {/* ── Storage Zone Guide ── */}
      <motion.section
        className="tips-panel tips-category-panel"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        <div className="tips-category-header">
          <span className="tips-eyebrow">Quick Reference</span>
          <h2 className="tips-panel-title">Where does it go?</h2>
          <p className="zone-guide-sub">The five places food lives, coldest first — and the mistake to avoid in each.</p>
        </div>
        <motion.div
          className="zone-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {STORAGE_ZONES.map(z => (
            <motion.article key={z.zone} className={`zone-card zone-card--${z.tone}`} variants={cardFadeUp}>
              <div className="zone-card-top">
                <h3 className="zone-card-name">{z.zone}</h3>
                <span className="zone-card-temp">{z.temp}</span>
              </div>
              <p className="zone-card-label">Best for</p>
              <ul className="zone-card-chips">
                {z.best.map(b => <li key={b}>{b}</li>)}
              </ul>
              <p className="zone-card-avoid">
                <span className="zone-card-avoid-mark" aria-hidden="true">✕</span>
                {z.avoid}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </motion.section>

      {searchResults.length === 0 && showInitialContent && (
        <div className="initial-content-footer">
          <img src={footer} alt="Footer" />
        </div>
      )}
    </div>
    </>
  );
};
