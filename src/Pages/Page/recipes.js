// Title: Recipes Page Component

// Description: 
// This component represents a page where users can search for recipes based on available ingredients, manage their inventory, and view recipe details. 
// It integrates various functionalities including fetching recipes from an external API, displaying inventory data, and handling user interactions.

// Imports:
import './recipe.css';
import InventoryList from './InventoryList';
import React, { useState, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { RecipeCard } from './RecipeCard';
import { SRecipeCard } from './SRecipeCard';
import { calculateStatus } from './calculateStatus';
import { finalizeInventory, handleResetInventory } from './inventoryUtils';
import { fetchRecipes, fetchRecipeDetails } from './apiUtils';

// Recipes Component:
export const Recipes = () => {
  // State Variables:
  const [input, setInput] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [srecipes, setsRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [pyodideLoaded, setPyodideLoaded] = useState(false);
  const [displayedInventory, setDisplayedInventory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recipesPerPage = 4;


  const handleNextPage = () => {
    setCurrentPage(prevPage => prevPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage(prevPage => Math.max(1, prevPage - 1));
  };

  const indexOfLastRecipe = currentPage * recipesPerPage;
  const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;

  // Slice the recipes array to display only the recipes for the current page
  const displayedRecipes = srecipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
  // Input Change Handler:
  const handleInputChange = (value) => {
    setInput(value);
  };

  // Effect Hook to Load Inventory from Local Storage:
  useEffect(() => {
    try {
      const storedInventory = localStorage.getItem('inventory');
      if (storedInventory) {
        const parsedInventory = JSON.parse(storedInventory);
        const updatedDisplayedInventory = parsedInventory.map(item => {
          const status = calculateStatus(item.expiryDate);
          return { ...item, status: status };
        });
        setInventory(parsedInventory);
        setDisplayedInventory(updatedDisplayedInventory);
      }
    } catch (error) {
      console.error('Error parsing inventory:', error);
    }
  }, []);

  // Effect Hook to Load Pyodide:
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

    return () => {
      document.body.removeChild(script);
    };
  }, []);

useEffect(() => {
  // Scroll to the recipe container when recipes are loaded
  if (recipes.length > 0) {
    window.scrollTo({
      top: document.getElementById('recipes-container').offsetTop,
      behavior: 'smooth', // Optional: Smooth scrolling animation
    });
  }
}, [recipes]); // Run every time recipes state changes


  // Function to Fetch with Exponential Backoff:
  const fetchWithBackoff = async (url, options, delay) => {
    const maxRetries = 3; // Maximum number of retries
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await fetch(url, options);
      } catch (error) {
        // If the error is not recoverable or max retries are reached, throw error
        if (error.name !== 'AbortError' && retries === maxRetries - 1) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries)));
        retries++;
      }
    }
  };

// Function to Fetch Recipes:
const fetchRecipes = async (ingredientsString = '') => {
  if (!pyodideLoaded) return; // Exit if pyodide is not loaded

  let ingredients;
  if (ingredientsString.trim() !== '') {
    // If ingredientsString is not empty, split it by comma to get an array of ingredients
    ingredients = ingredientsString.split(',');
    console.log("ing:", ingredients);
  } else {
    // Otherwise, default to using selectedItems
    ingredients = selectedItems;
  }

  const baseUrl = "https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/findByIngredients";
  const apiKey = "c28caa21ebmshad90569c94c63b6p1bed38jsn8049f9342f0f";
  const number = 15;
  const ranking = 1;
  const ignorePantry = true;

  const queryParams = new URLSearchParams({
    ingredients: ingredients.join(','),
    number: number,
    ranking: ranking,
    ignorePantry: ignorePantry
  });

  const url = `${baseUrl}?${queryParams}`;

  const headers = {
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com"
  };

  const options = {
    method: 'GET',
    headers: headers
  };

  try {
    const response = await fetchWithBackoff(url, options, 1000); // Initial delay of 1 second
    console.log("Response status:", response.status); // Log the response status
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many requests');
      } else {
        throw new Error('Failed to fetch data');
      }
    }
    const data = await response.json();
    console.log("Response data:", data); // Log the response data
    return data;
  } catch (error) {
    console.error("Error fetching recipes:", error.message);
    throw error;
  }
};

  // Function to Fetch Recipe Details:
  const fetchRecipeDetails = async (recipeId) => {
    if (!pyodideLoaded) return; // Exit if pyodide is not loaded

    const baseUrl = `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${recipeId}/information`;
    const apiKey = "c28caa21ebmshad90569c94c63b6p1bed38jsn8049f9342f0f"; 
    

    const headers = {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com"
    };

    const options = {
      method: 'GET',
      headers: headers
    };

    try {
      const response = await fetchWithBackoff(baseUrl, options, 1000); // Initial delay of 1 second
      console.log("Response status:", response.status); // Log the response status
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests');
        } else {
          throw new Error('Failed to fetch data');
        }
      }
      const data = await response.json();
      console.log("Recipe details:", data); // Log the recipe details
      return data;
    } catch (error) {
      console.error("Error fetching recipe details:", error.message);
      throw error;
    }
  };

  // Function to Handle Fetching Recipes:
// Function to Handle Fetching Recipes:
const handleFetchRecipes = async () => {
  try {
    const result = await fetchRecipes();
    if (!result || !Array.isArray(result)) {
      throw new Error('Invalid response received while fetching recipes');
    }

    // Assuming result is an array of objects with recipe IDs
    const recipeIds = result.map(recipe => recipe.id);

    // Fetch details for each recipe ID
    const recipeDetails = await Promise.all(recipeIds.map(fetchRecipeDetails));

// Append searched ingredients to each recipe detail
const recipesWithIngredients = recipeDetails.map((recipeDetail, index) => ({
  ...recipeDetail,
  searchedIngredients: input.split(' ').join(', '), // Join ingredients with commas
}));

    setRecipes(recipesWithIngredients); // Update recipes state with recipes containing searched ingredients
    console.log("Recipe details:", recipesWithIngredients); // Log the recipe details

    // Handle the recipe details as needed, e.g., display them in your application
  } catch (error) {
    console.error("Error fetching recipes:", error.message);
  }
};


  // Function to Finalize Inventory:
  const finalizeInventory = () => {
    // Update the main inventory with the displayed inventory
    setInventory([...displayedInventory]);

    // Optionally, you can also save the updated inventory to localStorage
    try {
      localStorage.setItem('inventory', JSON.stringify(displayedInventory));
      alert("Yay! Glad you liked the recipe. Your inventory state is updated!")
    } catch (error) {
      console.error('Error saving inventory to localStorage:', error);
    }
  };








  // Function to Handle Manual Addition to Search:
  const handleAddToSearchManual = (itemName) => {
    // Update the selected items
    setSelectedItems(prevItems => [...prevItems, itemName]);

    // Update the input value
    setInput(prevInput => {
      const trimmedInput = prevInput.trim();
      return trimmedInput ? trimmedInput + ' ' + itemName : itemName;
    });
  };

  // Function to Add Item to Search:
  const handleAddToSearch = (itemName) => {
    // Find the item in the displayed inventory
    const selectedItem = displayedInventory.find(item => item.name === itemName);
    if (selectedItem) {
      // Reduce the quantity by 1
      const updatedQuantity = selectedItem.amount - 1;

      if (updatedQuantity < 0) {
        // Check if the updated quantity is less than 0
        // Display an alert
        alert("Oops! Sorry, you ran out of this item.");
      } else {
        // Reduce the quantity by 1
        const updatedItem = { ...selectedItem, amount: updatedQuantity };
        // Update the displayed inventory
        setDisplayedInventory(prevInventory => {
          // Find the index of the updated item in the inventory array
          const index = prevInventory.findIndex(item => item.name === itemName);
          if (index !== -1) {
            // Create a copy of the previous inventory array
            const updatedInventory = [...prevInventory];
            // Update the item at the found index with the updated item
            updatedInventory[index] = updatedItem;
            return updatedInventory;
          }
          return prevInventory;
        });

        if (updatedQuantity >= 0) {
          // Update the selected items only if quantity is greater than or equal to 0
          setSelectedItems(prevItems => [...prevItems, itemName]);
          setInput(prevInput => {
            const trimmedInput = prevInput.trim();
            return trimmedInput ? trimmedInput + ' ' + itemName : itemName;
          });
        }
      }
    }
  };

  // Function to Reset Inventory:
  const handleResetInventory = () => {
    // Recalculate status for each item in the main inventory
    const updatedDisplayedInventory = inventory.map(item => {
      const status = calculateStatus(item.expiryDate);
      return { ...item, status: status };
    });
    // Update displayed inventory with recalculated status
    setDisplayedInventory(updatedDisplayedInventory);
    alert("Your inventory state has been reset!")
  };

  // Function to Remove Selected Item:
  const handleRemoveSelected = (itemName) => {
    setSelectedItems(prevItems => prevItems.filter(item => item !== itemName));
    setInput(prevInput => prevInput.replace(itemName, '').trim()); // Remove the item name from the search bar input
  };

  // Scroll to inventory container when generate button is clicked
  const scrollToInventory = () => {
    const inventoryContainer = document.getElementById('inventory-container');
    if (inventoryContainer) {
      inventoryContainer.scrollIntoView({ behavior: 'smooth' });
    }
  };


useEffect(() => {
  // Function to get the first 3 ingredients from inventory


// Fetch Recipes from Inventory:
// Fetch Recipes from Inventory:
// Fetch Recipes from Inventory:
// Fetch Recipes from Inventory:
const fetchRecipesFromInventory = async () => {
  try {
    // Get the current date
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1);


    // Sort all items based on their expiry date, in ascending order
    inventory.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    // Filter out the expired items and select only the items expiring in the future
    const validItems = inventory.filter(item => new Date(item.expiryDate) > currentDate);

    // Take the first three items from the sorted list as the ingredients to search for recipes
     const topIngredients = validItems.slice(0, 3).map(item => {
      // Remove batch number if present
      const nameParts = item.name.split(' - ');
      return nameParts[0]; // Take only the first part before ' - ' (batch number)
    }); console.log("Top ingredients:", topIngredients); // Log top ingredients

    if (topIngredients.length === 0) {
      console.log("No non-expired ingredients available. No recipes to fetch.");
      return;
    }

    const result = await fetchRecipes(topIngredients.join(',')); // Join ingredients with commas
    console.log("Result:", result); // Log the result

    if (!result || !Array.isArray(result)) {
      throw new Error('Invalid response received while fetching recipes');
    }

    // Assuming result is an array of objects with recipe IDs
    const recipeIds = result.map(recipe => recipe.id);

    // Fetch details for each recipe ID
    const recipeDetails = await Promise.all(recipeIds.map(fetchRecipeDetails));

    // Append searched ingredients to each recipe detail
    const recipesWithIngredients = recipeDetails.map((recipeDetail, index) => ({
      ...recipeDetail,
      searchedIngredients: topIngredients.join(', '), // Join ingredients with spaces and commas
    }));

    setsRecipes(recipesWithIngredients);
    console.log("Recipe details:", recipesWithIngredients); // Log the recipe details

    // Handle the recipe details as needed, e.g., display them in your application
  } catch (error) {
    console.error("Error fetching recipes:", error.message);
  }
};



  // Call the function to fetch recipes from inventory only when Pyodide is loaded
  if (pyodideLoaded) {
    fetchRecipesFromInventory();
  }
}, [inventory, pyodideLoaded]); // Dependency on inventory ensures the effect runs whenever inventory changes, and pyodideLoaded ensures it runs only when Pyodide is loaded

  // Return JSX:
  return (
    <div className="recipe-page">
<div className="suggestion-box">
      <div className="left-box">
      <div className="cursive-text">Explore Recipes with EcoPallete </div>
      <div className="sub-text"> Suggested recipes don't suit your palette? Generate Recipes from your ingredients</div>
      <button className="gen-button" onClick={scrollToInventory}>Generate manually</button>
</div>

  <div>
<div classname>
  <hr className="header-line" />
  <p className="header-text">Whip Up Magic with These Soon-to-Expire Ingredients!</p>
  <p className="ingredients-text">{srecipes.length > 0 && srecipes[0].searchedIngredients}</p>
</div>
      <div className="srecipes-container">

<button className="previous-next" onClick={handlePrevPage} disabled={currentPage === 1}>
  &lt; {/* Display the < character */}
</button>


        {/* Ensure srecipes is populated and map over the recipes for the current page */}
        {displayedRecipes.length > 0 && displayedRecipes.map((sampleRecipe, index) => (
          <SRecipeCard key={index} recipe={sampleRecipe} />
        ))}
<button className="previous-next" onClick={handleNextPage} disabled={indexOfLastRecipe >= srecipes.length}>
  &gt; {/* Display the > character */}
</button>
      </div>

    </div>


    </div>
      <div id="inventory-container" className="inventory-container">

        <div className="inventory-search-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody className="inventory-body">
            {displayedInventory.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.amount}</td>
                <td>{item.status.message}</td> {/* Display status message as text */}
                <td>
                  <button className="add-to-search-button" onClick={() => handleAddToSearch(item.name)}>+</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
<h1 className="partition-button">&rarr;</h1>


        <SearchBar
          onInputChange={handleInputChange}
          onSearch={handleFetchRecipes}
          selectedItems={selectedItems}
          onRemoveSelected={handleRemoveSelected}
          onAddToSearch={handleAddToSearchManual}
        />
      </div>
      </div>
      <div className="App">
<div id="recipes-container" className="recipes-container">
  {recipes.map((recipe, index) => (
  // Check if the image and analyzed instructions exist
  recipe.image && recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 && (
<RecipeCard key={index} recipe={recipe} finalizeInventory={finalizeInventory} />
  )
))}

</div>
      </div>
    </div>
  );
};