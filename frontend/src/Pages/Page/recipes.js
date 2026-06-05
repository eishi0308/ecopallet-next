// Title: Recipes Page Component

// Imports:
import './recipe.css';
import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { RecipeCard } from './RecipeCard';
import { SRecipeCard } from './SRecipeCard';
import { calculateStatus } from './calculateStatus';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};
const cardFadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
};

const wordReveal = {
  hidden:  { opacity: 0, y: 36, filter: 'blur(5px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.62, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const EASE = [0.25, 0.46, 0.45, 0.94];

const FloatingOrb = ({ size, color, style, delay = 0, dur = 10 }) => (
  <motion.div
    className="recipe-orb"
    style={{ width: size, height: size, background: color, ...style }}
    animate={{ y: [0, -38, -8, -30, 0], x: [0, 12, 3, -10, 0], scale: [1, 1.05, 0.97, 1.03, 1] }}
    transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

const BACKEND_URL = 'https://ecopallet-next.onrender.com';

// Recipes Component:
export const Recipes = () => {
  const [input, setInput] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [srecipes, setsRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [displayedInventory, setDisplayedInventory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [chipFilter, setChipFilter] = useState('');
  const [expiredConfirm, setExpiredConfirm] = useState(null); // item name pending confirm
  const [outOfStockToast, setOutOfStockToast] = useState(false);
  const [cookingDoneToast, setCookingDoneToast] = useState(false);
  const [sLoading, setSLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const recipesPerPage = 4;

  const handleNextPage = () => setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));

  const indexOfLastRecipe = currentPage * recipesPerPage;
  const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;
  const displayedRecipes = srecipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
  const totalPages = Math.ceil(srecipes.length / recipesPerPage) || 1;

  const handleInputChange = (value) => setInput(value);

  // Load inventory from localStorage on mount
  useEffect(() => {
    try {
      const storedInventory = localStorage.getItem('inventory');
      if (storedInventory) {
        const parsedInventory = JSON.parse(storedInventory);
        const updatedDisplayedInventory = parsedInventory.map(item => ({
          ...item,
          status: calculateStatus(item.expiryDate),
        }));
        setInventory(parsedInventory);
        setDisplayedInventory(updatedDisplayedInventory);
      }
    } catch (error) {
      console.error('Error parsing inventory:', error);
    }
  }, []);

  // Scroll to results when manual search recipes load
  useEffect(() => {
    if (recipes.length > 0) {
      window.scrollTo({
        top: document.getElementById('recipes-container').offsetTop,
        behavior: 'smooth',
      });
    }
  }, [recipes]);

  // Call backend: find recipes by ingredients string
  const fetchRecipes = async (ingredientsString = '') => {
    const ingredients = ingredientsString.trim() !== ''
      ? ingredientsString.split(',').map(i => i.trim()).join(',')
      : selectedItems.join(',');

    const response = await fetch(`${BACKEND_URL}/recipes?ingredients=${encodeURIComponent(ingredients)}&number=15`);
    if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests' : 'Failed to fetch recipes');
    return response.json();
  };

  // Call backend: get full details for one recipe
  const fetchRecipeDetails = async (recipeId) => {
    const response = await fetch(`${BACKEND_URL}/recipes/${recipeId}`);
    if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests' : 'Failed to fetch recipe details');
    return response.json();
  };

  // Manual search triggered by user clicking "Generate"
  const handleFetchRecipes = async () => {
    setIsGenerating(true);
    setRecipes([]);
    try {
      const result = await fetchRecipes();
      if (!result || !Array.isArray(result)) throw new Error('Invalid response');
      const recipeDetails = await Promise.all(result.map(r => fetchRecipeDetails(r.id)));
      const recipesWithIngredients = recipeDetails.map(d => ({ ...d, searchedIngredients: input.split(' ').join(', ') }));
      setRecipes(recipesWithIngredients);
    } catch (error) {
      console.error("Error fetching recipes:", error.message);
      toast.error('Could not fetch recipes. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const finalizeInventory = () => {
    setInventory([...displayedInventory]);
    try {
      localStorage.setItem('inventory', JSON.stringify(displayedInventory));
      setCookingDoneToast(true);
    } catch (error) {
      console.error('Error saving inventory:', error);
    }
  };

  const handleAddToSearchManual = (itemName) => {
    setSelectedItems(prev => [...prev, itemName]);
    setInput(prev => prev.trim() ? prev.trim() + ' ' + itemName : itemName);
  };

  const handleAddToSearch = (itemName) => {
    const selectedItem = displayedInventory.find(item => item.name === itemName);
    if (selectedItem) {
      const updatedQuantity = selectedItem.amount - 1;
      if (updatedQuantity < 0) {
        setOutOfStockToast(true);
        setTimeout(() => setOutOfStockToast(false), 3000);
      } else {
        const updatedItem = { ...selectedItem, amount: updatedQuantity };
        setDisplayedInventory(prev => {
          const index = prev.findIndex(item => item.name === itemName);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = updatedItem;
            return updated;
          }
          return prev;
        });
        setSelectedItems(prev => [...prev, itemName]);
        setInput(prev => prev.trim() ? prev.trim() + ' ' + itemName : itemName);
      }
    }
  };

  const handleRemoveSelected = (itemName) => {
    setSelectedItems(prev => prev.filter(item => item !== itemName));
    setInput(prev => prev.replace(itemName, '').trim());
    setDisplayedInventory(prev => {
      const index = prev.findIndex(item => item.name === itemName);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], amount: updated[index].amount + 1 };
        return updated;
      }
      return prev;
    });
  };

  const filteredInventory = chipFilter.trim()
    ? displayedInventory.filter(item => item.name.toLowerCase().includes(chipFilter.toLowerCase()))
    : displayedInventory;

  const scrollToInventory = () => {
    const el = document.getElementById('inventory-container');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-fetch recipes from top 3 soonest-expiring inventory items
  useEffect(() => {
    const fetchRecipesFromInventory = async () => {
      try {
        setSLoading(true);
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const sorted = [...inventory].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        const validItems = sorted.filter(item => new Date(item.expiryDate) > currentDate);
        const topIngredients = validItems.slice(0, 3).map(item => item.name.split(' - ')[0]);
        if (topIngredients.length === 0) { setSLoading(false); return; }

        const result = await fetchRecipes(topIngredients.join(','));
        if (!result || !Array.isArray(result)) throw new Error('Invalid response');
        const recipeDetails = await Promise.all(result.map(r => fetchRecipeDetails(r.id)));
        const recipesWithIngredients = recipeDetails.map(d => ({ ...d, searchedIngredients: topIngredients.join(', ') }));
        setsRecipes(recipesWithIngredients);
      } catch (error) {
        console.error("Error fetching inventory recipes:", error.message);
        toast.error('Could not load recipe suggestions. Please try again later.');
      } finally {
        setSLoading(false);
      }
    };

    if (inventory.length > 0) fetchRecipesFromInventory();
  }, [inventory]);

  const visibleRecipes = recipes.filter(r => r.image && r.analyzedInstructions?.length > 0);

  const expiringIngredients = srecipes.length > 0
    ? srecipes[0].searchedIngredients.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="recipe-page">
      <div className="recipe-noise" aria-hidden="true" />
      <Toaster position="top-center" richColors />

      {/* ── Hero ── */}
      <motion.div className="recipe-hero" variants={fadeUp} initial="hidden" animate="visible">
        <FloatingOrb size={300} color="radial-gradient(circle, rgba(22,163,74,0.26) 0%, transparent 70%)" style={{ right: '-3%', top: '-40%' }} delay={0} dur={9} />
        <FloatingOrb size={160} color="radial-gradient(circle, rgba(134,239,172,0.15) 0%, transparent 70%)" style={{ right: '32%', bottom: '-35%' }} delay={2} dur={12} />
        <div style={{ position: 'relative', zIndex: 1 }}>
        <span className="recipe-hero-eyebrow">
          <motion.span
            className="recipe-pill-dot"
            animate={{ scale: [1, 1.7, 1], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          🍽 Recipe Assistant
        </span>
        <motion.h1
          className="recipe-hero-title"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } } }}
          style={{ perspective: 800 }}
        >
          {['Turn your', 'pantry into', 'a meal'].map((w, i) => (
            <motion.span key={i} variants={wordReveal} style={{ display: 'inline-block', marginRight: '0.28em' }}>{w}</motion.span>
          ))}
        </motion.h1>
        <motion.p
          className="recipe-hero-sub"
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.52, duration: 0.6, ease: EASE }}
        >
          Recipes auto-suggested from your expiring ingredients — or build your own from scratch.
        </motion.p>
        {expiringIngredients.length > 0 && (
          <div className="recipe-hero-tags">
            <span className="recipe-hero-tags-label">Using soon:</span>
            {expiringIngredients.map((ing, i) => (
              <span key={i} className="recipe-hero-tag">{ing}</span>
            ))}
          </div>
        )}
        </div>
      </motion.div>

      {/* ── Smart Suggestions ── */}
      <motion.section className="suggestion-section" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
        <div className="suggestion-header">
          <div className="suggestion-header-left">
            <span className="section-eyebrow">🌿 Smart Suggestions</span>
            <h2 className="suggestion-title">Recipes for you</h2>
          </div>
          <div className="suggestion-nav">
            <button className="nav-arrow-btn" onClick={handlePrevPage} disabled={currentPage === 1}>‹</button>
            <span className="nav-page-label">{currentPage} / {totalPages}</span>
            <button className="nav-arrow-btn" onClick={handleNextPage} disabled={indexOfLastRecipe >= srecipes.length}>›</button>
          </div>
        </div>

        <motion.div className="srecipes-container" variants={stagger} initial="hidden" animate="visible">
          {sLoading ? (
            [0,1,2,3].map(i => (
              <div key={i} className="srecipe-skeleton">
                <div className="srecipe-skeleton-img" />
                <div className="srecipe-skeleton-body">
                  <div className="srecipe-skeleton-line srecipe-skeleton-line--title" />
                  <div className="srecipe-skeleton-line srecipe-skeleton-line--sub" />
                </div>
              </div>
            ))
          ) : displayedRecipes.length > 0 ? displayedRecipes.map((sampleRecipe, index) => (
            <motion.div key={index} variants={cardFadeUp}><SRecipeCard recipe={sampleRecipe} /></motion.div>
          )) : (
            <div className="no-recipes-empty">
              <span className="no-recipes-empty-icon">🧺</span>
              <p className="no-recipes-empty-title">Your pantry is empty</p>
              <p className="no-recipes-empty-sub">Add items to your inventory and we'll auto-suggest recipes from your expiring ingredients.</p>
              <a href="/inventory" className="no-recipes-empty-cta">Go to Inventory →</a>
            </div>
          )}
        </motion.div>
      </motion.section>

      {/* ── Bridge CTA ── */}
      <motion.div className="bridge-cta" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
        <div className="bridge-card">
          <div className="bridge-card-body">
            <span className="bridge-eyebrow">✦ Custom Builder</span>
            <h2 className="bridge-card-title">Want something specific?</h2>
            <p className="bridge-card-desc">Pick ingredients from your pantry — or type anything — and we'll find the perfect match.</p>
            <div className="bridge-features">
              <span className="bridge-feature">✓ From your inventory</span>
              <span className="bridge-feature">✓ Any ingredient</span>
            </div>
          </div>
          <button className="bridge-cta-btn" onClick={scrollToInventory}>
            <span className="bridge-btn-label">Build your recipe</span>
            <span className="bridge-btn-arrow">↓</span>
          </button>
        </div>
      </motion.div>

      {/* ── Custom Builder ── */}
      <motion.div id="inventory-container" className="inventory-container" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
        <div className="inventory-container-header">
          <span className="section-eyebrow">🔧 Custom Builder</span>
          <h3 className="inventory-section-title">Build Your Own Recipe</h3>
          <p className="inventory-section-sub">Pick ingredients from your inventory, or type them directly — then generate matching recipes.</p>
        </div>
        <div className="inventory-search-container">
          <div className="inventory-table-wrapper">
            <div className="chip-panel-header">
              <span className="chip-panel-label">Your Pantry</span>
              {displayedInventory.length > 0 && (
                <span className="chip-panel-count">{displayedInventory.length} items</span>
              )}
            </div>
            {displayedInventory.length === 0 ? (
              <div className="inventory-empty-inner">
                <span className="inventory-empty-icon">🧺</span>
                <p className="inventory-empty-title">Your pantry is empty</p>
                <p className="inventory-empty-sub">Scan a receipt to add items to your pantry</p>
                <a href="/inventory" className="inventory-empty-link">Go to Inventory →</a>
              </div>
            ) : (
              <>
                <div className="chip-filter-wrap">
                  <input
                    type="text"
                    className="chip-filter-input"
                    placeholder="Filter ingredients…"
                    value={chipFilter}
                    onChange={e => setChipFilter(e.target.value)}
                  />
                </div>
                <div className="chip-grid">
                  {filteredInventory.length === 0 ? (
                    <p className="chip-no-match">No match for "{chipFilter}"</p>
                  ) : (
                    filteredInventory.map(item => {
                      const sClass = item.status.color === 'red' ? 'danger' : item.status.color === '#DAA520' ? 'warning' : 'safe';
                      const isZero = Number(item.amount) === 0;
                      return (
                        <button
                          key={item.id}
                          className={`ingredient-chip ingredient-chip--${sClass}${isZero ? ' ingredient-chip--zero' : ''}`}
                          onClick={() => {
                            if (sClass === 'danger' && !isZero) { setExpiredConfirm(item.name); return; }
                            handleAddToSearch(item.name);
                          }}
                          disabled={isZero}
                          title={isZero ? 'Out of stock' : `Add ${item.name}`}
                        >
                          {item.name}
                          <span className="chip-qty">{item.amount}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          <div className="search-arrow-divider">→</div>

          <SearchBar
            onInputChange={handleInputChange}
            onSearch={handleFetchRecipes}
            selectedItems={selectedItems}
            onRemoveSelected={handleRemoveSelected}
            onAddToSearch={handleAddToSearchManual}
            isGenerating={isGenerating}
          />
        </div>
      </motion.div>

      {/* ── Generated Results ── */}
      <motion.div className="recipes-results-wrapper" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
        <div id="recipes-container" className="recipes-container">
          {isGenerating ? (
            [0,1,2,3].map(i => (
              <div key={i} className="recipe-gen-skeleton">
                <div className="recipe-gen-skeleton-img" />
                <div className="recipe-gen-skeleton-body">
                  <div className="recipe-gen-skeleton-line recipe-gen-skeleton-line--title" />
                  <div className="recipe-gen-skeleton-line recipe-gen-skeleton-line--sub" />
                  <div className="recipe-gen-skeleton-line recipe-gen-skeleton-line--sub2" />
                </div>
              </div>
            ))
          ) : visibleRecipes.length > 0 ? (
            visibleRecipes.map((recipe, index) => (
              <RecipeCard key={index} recipe={recipe} finalizeInventory={finalizeInventory} />
            ))
          ) : recipes.length > 0 ? (
            <div className="no-recipes-generated-empty">
              <span className="no-recipes-generated-icon">🍽️</span>
              <p className="no-recipes-generated-title">No complete recipes found</p>
              <p className="no-recipes-generated-sub">Try different ingredients or a more general search term.</p>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* ── Cooking done toast ── */}
      {cookingDoneToast && (
        <>
          <div className="oos-overlay" onClick={() => setCookingDoneToast(false)} />
          <div className="oos-toast cooking-done-toast">
            <span className="oos-toast-icon">🍽️</span>
            <p className="oos-toast-title">Enjoy your meal!</p>
            <p className="oos-toast-sub">Your pantry has been updated with the ingredients used.</p>
            <button className="oos-toast-close cooking-done-toast-close" onClick={() => setCookingDoneToast(false)}>Got it</button>
          </div>
        </>
      )}

      {/* ── Expired ingredient confirm ── */}
      {expiredConfirm && (
        <>
          <div className="oos-overlay" onClick={() => setExpiredConfirm(null)} />
          <div className="expired-confirm-popup">
            <div className="expired-confirm-icon-wrap">
              <span className="expired-confirm-icon">⚠️</span>
            </div>
            <p className="expired-confirm-title">Expired Ingredient</p>
            <p className="expired-confirm-sub">
              <span className="expired-confirm-name">{expiredConfirm}</span> has passed its expiry date. It may not be safe to eat. Use it anyway?
            </p>
            <div className="expired-confirm-actions">
              <button className="expired-confirm-btn expired-confirm-btn--cancel" onClick={() => setExpiredConfirm(null)}>Cancel</button>
              <button className="expired-confirm-btn expired-confirm-btn--confirm" onClick={() => { handleAddToSearch(expiredConfirm); setExpiredConfirm(null); }}>Use anyway</button>
            </div>
          </div>
        </>
      )}

      {/* ── Out-of-stock popup ── */}
      {outOfStockToast && (
        <>
          <div className="oos-overlay" onClick={() => setOutOfStockToast(false)} />
          <div className="oos-toast">
            <span className="oos-toast-icon">🪣</span>
            <p className="oos-toast-title">All out!</p>
            <p className="oos-toast-sub">You've used up all of this ingredient. Try a different one.</p>
            <button className="oos-toast-close" onClick={() => setOutOfStockToast(false)}>Got it</button>
          </div>
        </>
      )}

    </div>
  );
};
