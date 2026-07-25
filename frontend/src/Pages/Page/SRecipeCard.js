import React, { useState } from 'react';
import { RecipeDrawer } from './RecipeDrawer';

export const SRecipeCard = ({ recipe }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div className="srecipe-container">
      <div
        className="srecipe-card"
        role="button"
        tabIndex={0}
        aria-label={`View recipe: ${recipe.title}`}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      >
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

      {isOpen && (
        <RecipeDrawer recipe={recipe} onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};
