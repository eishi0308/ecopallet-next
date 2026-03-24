import React, { useState } from 'react';

export const SRecipeCard = ({ recipe }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleClick = () => {
    setIsPopupOpen(true);
  };

  const handleClose = () => {
    setIsPopupOpen(false);
  };

  return (
    <div className="srecipe-container">
      <div className="srecipe-card" style={{ cursor: 'pointer' }} onClick={handleClick}>
        <div className="srecipe-card">
          <img src={recipe.image} alt="Recipe" />
        </div>
      </div>

      <div className="recipe-title">{recipe.title}</div>

      {isPopupOpen && (
        <div className="popup">
          <div className="popup-content">
            <span className="close" onClick={handleClose}>
              &times;
            </span>
            <h2>{recipe.title}</h2>
            <p>Searched Ingredients: {recipe.searchedIngredients}</p>
            <h3>Instructions:</h3>
            <ol>
              {recipe.analyzedInstructions.length > 0 ? (
                recipe.analyzedInstructions[0].steps.map((step, index) => (
                  <li key={index}>{`Step ${index + 1}: ${step.step}`}</li>
                ))
              ) : (
                <li>No instructions available</li>
              )}
            </ol>
            <p>Preparation time: {recipe.preparationMinutes} minutes</p>
          </div>
        </div>
      )}
    </div>
  );
};
