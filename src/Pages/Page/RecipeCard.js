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
      {/* Front side of the card */}
      <div className="card-front">
        {/* Preparation time */}
        <div className="recipe-minutes">
          <p style={{ textAlign: "right" }}>
            Preparation Time (minutes):{" "}
            {recipe.preparationMinutes !== -1 ? (
              <span className="recipe-minutes">{recipe.preparationMinutes}</span>
            ) : (
              <span className="recipe-minutes">Data not available</span>
            )}
          </p>
        </div>

        {/* Display recipe image */}
        <div className="recipe-image-placeholder">
          <img src={recipe.image} alt="Recipe" />
        </div>
        {/* Recipe title */}
        <h2 className="recipe-title">{recipe.title}</h2>
      </div>

      {/* Back side of the card */}
      <div className="card-back">
        {/* Recipe instructions */}
        {/* Preparation time */}
        <div className="recipe-minutes-div">
          <p className="recipe-minutes" style={{ textAlign: "right" }}>
            Preparation Time (minutes):{" "}
            {recipe.preparationMinutes !== -1 ? (
              <span className="recipe-minutes">{recipe.preparationMinutes}</span>
            ) : (
              <span className="recipe-minutes">Data not available</span>
            )}
          </p>
        </div>
        {/* Recipe searched ingredients */}
        <div className="recipe-instructions">Searched Ingredients:</div>
        <div className="recipe-ingredients">{recipe.searchedIngredients}</div>
        {/* Recipe instructions */}
        <div className="recipe-instructions">Instructions:</div>
        <div className="recipe-ingredients">
          <ol>
            {recipe.analyzedInstructions.length > 0 ? recipe.analyzedInstructions[0].steps.map((step, index) => (
              <li key={index}>{`Step ${index + 1}: ${step.step}`}</li>
            )) : <li>No instructions available</li>}
          </ol>
        </div>
        {/* "I'm cooking this" button */}
        <button className="cooking-button" onClick={handleCookingClick}>
          I'm cooking this
        </button>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="rec-popup">
          <div className="rec-popup-content">
            <p>Do you want to update your inventory to remove the used ingredients?</p>
            <div className="rec-popup-buttons">
              <button onClick={handleConfirm}>Yes</button>
              <button onClick={handleCancel}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
