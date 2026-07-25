import React, { useState } from 'react';
import { RecipeDrawer } from './RecipeDrawer';

export const RecipeCard = ({ recipe, finalizeInventory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const handleCookingClick = (event) => {
    event.stopPropagation();

    // Show the custom popup
    setShowPopup(true);
  };

  const handleConfirm = () => {
    // Close the popup
    setShowPopup(false);

    // Call finalizeInventory if user confirms
    finalizeInventory();

  };

  const handleCancel = () => {
    // Close the popup
    setShowPopup(false);

  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <>
      <div
        className="recipe-card"
        role="button"
        tabIndex={0}
        aria-label={`View recipe: ${recipe.title}`}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      >
        <div className="recipe-image-placeholder">
          <img src={recipe.image} alt="Recipe" />
          {/* Prep time badge over image */}
          <div className="recipe-minutes">
            ⏱ {recipe.preparationMinutes !== -1 ? `${recipe.preparationMinutes} min` : 'N/A'}
          </div>
        </div>
        <div className="card-front-body">
          <h2 className="recipe-title">{recipe.title}</h2>
          <span className="card-open-hint">View recipe →</span>
        </div>
      </div>

      {/* ── Recipe detail drawer ── */}
      {isOpen && (
        <RecipeDrawer
          recipe={recipe}
          onClose={() => setIsOpen(false)}
          footer={
            <button className="cooking-button" onClick={handleCookingClick}>
              I'm cooking this
            </button>
          }
        />
      )}

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
    </>
  );
};
