import React, { useState } from 'react';

export const SRecipeCard = ({ recipe }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div className="srecipe-container">
      <div className="srecipe-card" onClick={() => setIsPopupOpen(true)}>
        <div className="srecipe-img-wrap">
          <img src={recipe.image} alt={recipe.title} />
          {recipe.preparationMinutes > 0 && (
            <span className="srecipe-time">⏱ {recipe.preparationMinutes} min</span>
          )}
        </div>
        <div className="srecipe-info">
          <p className="srecipe-title">{recipe.title}</p>
        </div>
      </div>

      {isPopupOpen && (
        <div className="srec-modal-overlay" onClick={() => setIsPopupOpen(false)}>
          <div className="srec-modal" onClick={e => e.stopPropagation()}>
            <button className="srec-modal-close" onClick={() => setIsPopupOpen(false)}>×</button>
            <img src={recipe.image} alt={recipe.title} className="srec-modal-img" />
            <div className="srec-modal-body">
              <h3 className="srec-modal-title">{recipe.title}</h3>
              <div className="srec-modal-meta">
                {recipe.searchedIngredients && (
                  <span className="srec-modal-tag">🌿 {recipe.searchedIngredients}</span>
                )}
                {recipe.preparationMinutes > 0 && (
                  <span className="srec-modal-tag">⏱ {recipe.preparationMinutes} min</span>
                )}
              </div>
              <p className="srec-modal-section-label">Instructions</p>
              <ol className="srec-modal-steps">
                {recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 ? (
                  recipe.analyzedInstructions[0].steps.map((step, index) => (
                    <li key={index}>{step.step}</li>
                  ))
                ) : (
                  <li>No instructions available</li>
                )}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
