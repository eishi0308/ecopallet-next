import React, { useEffect, useRef } from 'react';

// Shared detail surface for both suggestion cards and generated recipe cards.
// Side drawer on desktop, bottom sheet on mobile (see .rdrawer in recipe.css).
export const RecipeDrawer = ({ recipe, onClose, footer }) => {
  const panelRef = useRef(null);

  // Escape to close, and lock background scroll while open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (panelRef.current) panelRef.current.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const steps = recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0
    ? recipe.analyzedInstructions[0].steps
    : [];

  return (
    <div className="rdrawer-overlay" onClick={onClose}>
      <aside
        ref={panelRef}
        className="rdrawer"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rdrawer-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="rdrawer-hero">
          <img src={recipe.image} alt={recipe.title} className="rdrawer-img" />
          <button className="rdrawer-close" onClick={onClose} aria-label="Close recipe">×</button>
        </div>

        <div className="rdrawer-scroll">
          <h3 id="rdrawer-title" className="rdrawer-title">{recipe.title}</h3>

          <div className="rdrawer-meta">
            {recipe.searchedIngredients && (
              <span className="rdrawer-tag">🌿 {recipe.searchedIngredients}</span>
            )}
            {recipe.preparationMinutes > 0 && (
              <span className="rdrawer-tag rdrawer-tag--time">⏱ {recipe.preparationMinutes} min</span>
            )}
          </div>

          <p className="rdrawer-section-label">Instructions</p>
          <ol className="rdrawer-steps">
            {steps.length > 0
              ? steps.map((step, index) => <li key={index}>{step.step}</li>)
              : <li>No instructions available</li>}
          </ol>
        </div>

        {footer && <div className="rdrawer-footer">{footer}</div>}
      </aside>
    </div>
  );
};
