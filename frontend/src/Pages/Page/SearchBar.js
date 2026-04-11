import React, { useState } from 'react';

export const SearchBar = ({ onSearch, onInputChange, selectedItems, onRemoveSelected, onAddToSearch }) => {
  const [input, setInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (value) => {
    setInput(value);
    onInputChange(value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && input.trim() !== '') {
      if (!isValidIngredient(input.trim())) {
        alert('Please add a valid ingredient.');
      } else {
        // Add the typed item to the selected items
        onAddToSearch(input.trim());
        // Clear the input field and error message
        setInput('');
        setErrorMessage('');
      }
    }
  };

  const isValidIngredient = (ingredient) => {
    // Add your validation logic here
    // For example, check if the ingredient contains only letters and spaces
    return /^[a-zA-Z\s]+$/.test(ingredient);
  };

  return (
    <div>
      <div className="search-container">
        <div className="selected-items-box">
          {selectedItems.map((item, index) => (
            <div key={index} className="selected-item">
              <span>{item}</span>
              <button onClick={() => onRemoveSelected(item)}>×</button>
            </div>
          ))}
          {/* Editable input field for adding more items */}
          <input
            className="search-input"
            type="text"
            placeholder="Add more items..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>
        <button className="search-button" onClick={onSearch}>Generate Recipes</button>
      </div>
    </div>
  );
};
