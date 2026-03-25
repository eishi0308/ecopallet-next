// Title: Recipes Page Component

// Imports:
import './recipe.css';
import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { RecipeCard } from './RecipeCard';
import { SRecipeCard } from './SRecipeCard';
import { calculateStatus } from './calculateStatus';

// Recipes Component:
export const Recipes = () => {
  const [input, setInput] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [srecipes, setsRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [pyodideLoaded, setPyodideLoaded] = useState(false);
  const [displayedInventory, setDisplayedInventory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recipesPerPage = 4;

  const handleNextPage = () => setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));

  const indexOfLastRecipe = currentPage * recipesPerPage;
  const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;
  const displayedRecipes = srecipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
  const totalPages = Math.ceil(srecipes.length / recipesPerPage) || 1;

  const handleInputChange = (value) => setInput(value);

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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.21.2/full/pyodide.js';
    script.async = true;
    script.onload = async () => {
      window.languagePluginUrl = 'https://cdn.jsdelivr.net/pyodide/v0.21.2/full/';
      window.pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.21.2/full/',
      });
      setPyodideLoaded(true);
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (recipes.length > 0) {
      window.scrollTo({
        top: document.getElementById('recipes-container').offsetTop,
        behavior: 'smooth',
      });
    }
  }, [recipes]);

  const fetchWithBackoff = async (url, options, delay) => {
    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await fetch(url, options);
      } catch (error) {
        if (error.name !== 'AbortError' && retries === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries)));
        retries++;
      }
    }
  };

  const fetchRecipes = async (ingredientsString = '') => {
    if (!pyodideLoaded) return;
    let ingredients = ingredientsString.trim() !== ''
      ? ingredientsString.split(',')
      : selectedItems;

    const baseUrl = "https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/findByIngredients";
    const apiKey = "c28caa21ebmshad90569c94c63b6p1bed38jsn8049f9342f0f";
    const queryParams = new URLSearchParams({ ingredients: ingredients.join(','), number: 15, ranking: 1, ignorePantry: true });
    const url = `${baseUrl}?${queryParams}`;
    const options = { method: 'GET', headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com" } };

    try {
      const response = await fetchWithBackoff(url, options, 1000);
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests' : 'Failed to fetch data');
      return await response.json();
    } catch (error) {
      console.error("Error fetching recipes:", error.message);
      throw error;
    }
  };

  const fetchRecipeDetails = async (recipeId) => {
    if (!pyodideLoaded) return;
    const baseUrl = `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${recipeId}/information`;
    const apiKey = "c28caa21ebmshad90569c94c63b6p1bed38jsn8049f9342f0f";
    const options = { method: 'GET', headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com" } };
    try {
      const response = await fetchWithBackoff(baseUrl, options, 1000);
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests' : 'Failed to fetch data');
      return await response.json();
    } catch (error) {
      console.error("Error fetching recipe details:", error.message);
      throw error;
    }
  };

  const handleFetchRecipes = async () => {
    try {
      const result = await fetchRecipes();
      if (!result || !Array.isArray(result)) throw new Error('Invalid response');
      const recipeDetails = await Promise.all(result.map(r => fetchRecipeDetails(r.id)));
      const recipesWithIngredients = recipeDetails.map(d => ({ ...d, searchedIngredients: input.split(' ').join(', ') }));
      setRecipes(recipesWithIngredients);
    } catch (error) {
      console.error("Error fetching recipes:", error.message);
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
        alert("Oops! Sorry, you ran out of this item.");
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
  };

  const scrollToInventory = () => {
    const el = document.getElementById('inventory-container');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchRecipesFromInventory = async () => {
      try {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const sorted = [...inventory].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        const validItems = sorted.filter(item => new Date(item.expiryDate) > currentDate);
        const topIngredients = validItems.slice(0, 3).map(item => item.name.split(' - ')[0]);
        if (topIngredients.length === 0) return;

        const result = await fetchRecipes(topIngredients.join(','));
        if (!result || !Array.isArray(result)) throw new Error('Invalid response');
        const recipeDetails = await Promise.all(result.map(r => fetchRecipeDetails(r.id)));
        const recipesWithIngredients = recipeDetails.map(d => ({ ...d, searchedIngredients: topIngredients.join(', ') }));
        setsRecipes(recipesWithIngredients);
      } catch (error) {
        console.error("Error fetching inventory recipes:", error.message);
      }
    };

    if (pyodideLoaded) fetchRecipesFromInventory();
  }, [inventory, pyodideLoaded]);

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
          {displayedRecipes.length > 0 ? displayedRecipes.map((sampleRecipe, index) => (
            <SRecipeCard key={index} recipe={sampleRecipe} />
          )) : (
            <p className="no-recipes-msg">Loading recipes from your expiring ingredients…</p>
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
                {displayedInventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.amount}</td>
                    <td>{item.status.message}</td>
                    <td>
                      <button className="add-to-search-button" onClick={() => handleAddToSearch(item.name)}>+</button>
                    </td>
                  </tr>
                ))}
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
          />
        </div>
      </div>

      {/* ── Generated Results ── */}
      <div className="App">
        <div id="recipes-container" className="recipes-container">
          {recipes.map((recipe, index) => (
            recipe.image && recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 && (
              <RecipeCard key={index} recipe={recipe} finalizeInventory={finalizeInventory} />
            )
          ))}
        </div>
      </div>

    </div>
  );
};
