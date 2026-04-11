import React, { useState } from 'react';

export const RecipeCard = ({ recipe, finalizeInventory }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleCookingClick = (event) => {
    event.stopPropagation(); // Prevent card flip when button is clicked

    // Show the custom popup
    setShowPopup(true);
  };

  const handleConfirm = () => {
    // Close the popup
    setShowPopup(false);

    // Call finalizeInventory if user confirms
    finalizeInventory();

    // Implement your logic here for when the user clicks "I'm cooking this"
    console.log(`Cooking ${recipe.title}`);
  };

  const handleCancel = () => {
    // Close the popup
    setShowPopup(false);

    // Implement logic for when the user cancels the update
    console.log("User canceled inventory update");
  };

  return (
    <div className={`recipe-card ${isFlipped ? 'is-flipped' : ''}`} onClick={handleCardFlip}>

      {/* ── Front face ── */}
      <div className="card-front">
        <div className="recipe-image-placeholder">
          <img src={recipe.image} alt="Recipe" />
          {/* Prep time badge over image */}
          <div className="recipe-minutes">
            ⏱ {recipe.preparationMinutes !== -1 ? `${recipe.preparationMinutes} min` : 'N/A'}
          </div>
        </div>
        <div className="card-front-body">
          <h2 className="recipe-title">{recipe.title}</h2>
          <span className="card-flip-hint">Tap to see recipe →</span>
        </div>
      </div>

      {/* ── Back face ── */}
      <div className="card-back">
        <div className="card-back-header">
          <p className="card-back-title">{recipe.title}</p>
          <div className="card-back-meta">
            {recipe.searchedIngredients && (
              <span className="card-back-tag">🌿 {recipe.searchedIngredients}</span>
            )}
            {recipe.preparationMinutes !== -1 && (
              <span className="card-back-tag card-back-tag--time">⏱ {recipe.preparationMinutes} min</span>
            )}
          </div>
        </div>

        <div className="card-back-scroll">
          <div className="recipe-instructions">Instructions</div>
          <div className="recipe-ingredients">
            <ol>
              {recipe.analyzedInstructions.length > 0
                ? recipe.analyzedInstructions[0].steps.map((step, index) => (
                    <li key={index}>{step.step}</li>
                  ))
                : <li>No instructions available</li>}
            </ol>
          </div>
        </div>

        <div className="card-back-footer">
          <button className="cooking-button" onClick={handleCookingClick}>
            I'm cooking this
          </button>
        </div>
      </div>

      {/* ── Confirm popup ── */}
      {showPopup && (
        <div className="rec-popup">
          <div className="rec-popup-content">
            <p>Update your inventory to remove the used ingredients?</p>
            <div className="rec-popup-buttons">
              <button onClick={handleConfirm}>Yes, update</button>
              <button onClick={handleCancel}>No thanks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
