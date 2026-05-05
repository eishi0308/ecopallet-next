// Title: Recipes Page Component

// Imports:
import './recipe.css';
import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { RecipeCard } from './RecipeCard';
import { SRecipeCard } from './SRecipeCard';
import { calculateStatus } from './calculateStatus';

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
  const [outOfStockToast, setOutOfStockToast] = useState(false);
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
    } finally {
      setIsGenerating(false);
    }
  };

  const finalizeInventory = () => {
    setInventory([...displayedInventory]);
    try {
      localStorage.setItem('inventory', JSON.stringify(displayedInventory));
      alert("Yay! Glad you liked the recipe. Your inventory state is updated!");
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
      } finally {
        setSLoading(false);
      }
    };

    if (inventory.length > 0) fetchRecipesFromInventory();
  }, [inventory]);

  const expiringIngredients = srecipes.length > 0
    ? srecipes[0].searchedIngredients.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="recipe-page">

      {/* ── Hero ── */}
      <div className="recipe-hero">
        <span className="recipe-hero-eyebrow">🍽 Recipe Assistant</span>
        <h1 className="recipe-hero-title">Turn your pantry into a meal</h1>
        <p className="recipe-hero-sub">Recipes auto-suggested from your expiring ingredients — or build your own from scratch.</p>
        {expiringIngredients.length > 0 && (
          <div className="recipe-hero-tags">
            <span className="recipe-hero-tags-label">Using soon:</span>
            {expiringIngredients.map((ing, i) => (
              <span key={i} className="recipe-hero-tag">{ing}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Smart Suggestions ── */}
      <section className="suggestion-section">
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

        <div className="srecipes-container">
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
            <SRecipeCard key={index} recipe={sampleRecipe} />
          )) : (
            <p className="no-recipes-msg">Add items to your inventory to see recipe suggestions.</p>
          )}
        </div>
      </section>

      {/* ── Bridge CTA ── */}
      <div className="bridge-cta">
        <div className="bridge-line" />
        <div className="bridge-center">
          <span className="bridge-hint">Don't see what you want?</span>
          <button className="gen-button" onClick={scrollToInventory}>Build your own ↓</button>
        </div>
        <div className="bridge-line" />
      </div>

      {/* ── Custom Builder ── */}
      <div id="inventory-container" className="inventory-container">
        <div className="inventory-container-header">
          <span className="section-eyebrow">🔧 Custom Builder</span>
          <h3 className="inventory-section-title">Build Your Own Recipe</h3>
          <p className="inventory-section-sub">Pick ingredients from your inventory, or type them directly — then generate matching recipes.</p>
        </div>
        <div className="inventory-search-container">
          <div className="inventory-table-wrapper">
            <p className="table-col-label">Your Inventory</p>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Add</th>
                </tr>
              </thead>
              <tbody className="inventory-body">
                {displayedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="inventory-empty-state">
                      <div className="inventory-empty-inner">
                        <span className="inventory-empty-icon">🧺</span>
                        <p className="inventory-empty-title">Your pantry is empty</p>
                        <p className="inventory-empty-sub">Scan a receipt to add items to your pantry</p>
                        <a href="/inventory" className="inventory-empty-link">Go to Inventory →</a>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedInventory.map((item) => (
                    <tr key={item.id} className={`inv-row-${item.status.color === 'red' ? 'danger' : item.status.color === '#DAA520' ? 'warning' : 'safe'}`}>
                      <td>{item.name}</td>
                      <td>{item.amount}</td>
                      <td>
                        <span className={`status-badge status-${item.status.color === 'red' ? 'danger' : item.status.color === '#DAA520' ? 'warning' : 'safe'}`}>
                          {item.status.text}
                        </span>
                      </td>
                      <td>
                        <button className="add-to-search-button" onClick={() => handleAddToSearch(item.name)}>+</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
      </div>

      {/* ── Generated Results ── */}
      <div className="recipes-results-wrapper">
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
          ) : (
            recipes.map((recipe, index) => (
              recipe.image && recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 && (
                <RecipeCard key={index} recipe={recipe} finalizeInventory={finalizeInventory} />
              )
            ))
          )}
        </div>
      </div>

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
