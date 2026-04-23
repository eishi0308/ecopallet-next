import React, { useState, useMemo, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { calculateStatus, parseExpiryDate } from './inventory';
import './inventory.css';
import samimg3 from "./3.jpeg";

const getStatusBadgeClass = (color) => {
  if (color === 'red')      return 'danger';
  if (color === '#DAA520')  return 'warning';
  return 'safe';
};

const CATEGORY_STYLES = {
  'Dairy':        { bg: '#EFF6FF', color: '#1D4ED8', emoji: '🧀' },
  'Meat':         { bg: '#FEF2F2', color: '#B91C1C', emoji: '🥩' },
  'Serviced':     { bg: '#FEF2F2', color: '#B91C1C', emoji: '🥩' },
  'Chilled':      { bg: '#F0F9FF', color: '#0369A1', emoji: '❄️' },
  'Frozen':       { bg: '#ECFEFF', color: '#0E7490', emoji: '🧊' },
  'Fruit':        { bg: '#F0FDF4', color: '#15803D', emoji: '🍎' },
  'Vegetable':    { bg: '#F0FDF4', color: '#15803D', emoji: '🥦' },
  'Bakery':       { bg: '#FFFBEB', color: '#B45309', emoji: '🍞' },
  'Pantry':       { bg: '#FFF7ED', color: '#C2410C', emoji: '🏺' },
  'Cooking':      { bg: '#FFF7ED', color: '#C2410C', emoji: '🍳' },
  'Drinks':       { bg: '#F5F3FF', color: '#6D28D9', emoji: '🥤' },
  'Health':       { bg: '#F0FDF4', color: '#166534', emoji: '💊' },
  'Toiletries':   { bg: '#FAF5FF', color: '#7E22CE', emoji: '🧴' },
  'Household':    { bg: '#F8FAFC', color: '#475569', emoji: '🏠' },
  'Baby':         { bg: '#FDF2F8', color: '#BE185D', emoji: '👶' },
  'Pet':          { bg: '#FFF7ED', color: '#92400E', emoji: '🐾' },
};

const CategoryBadge = ({ category }) => {
  if (!category || category === 'Uncategorised') return null;
  const style = CATEGORY_STYLES[category] || { bg: '#F1F5F9', color: '#475569', emoji: '🏷️' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      marginTop: 4, padding: '2px 7px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
      background: style.bg, color: style.color,
    }}>
      {style.emoji} {category}
    </span>
  );
};

const InventoryList = ({ inventory, onEdit, onDelete, onBulkDelete, togglePopup, onEditingItemChange }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [updatedValues, setUpdatedValues] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [file2, setFile2] = useState(null);
  const [imgSrc2, setImgSrc2] = useState('');
  const [extractedText2, setExtractedText2] = useState('');
  const [msg2, setMsg2] = useState('');
  const [showScanExpiryPopup, setShowScanExpiryPopup] = useState(false);
  const [scanningItemId, setScanningItemId] = useState(null);
  const [sortingOrder, setSortingOrder] = useState('asc');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const toggleSortingOrder = () => setSortingOrder(o => o === 'asc' ? 'desc' : 'asc');

  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => {
      const dateA = new Date(a.expiryDate);
      const dateB = new Date(b.expiryDate);
      return sortingOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [inventory, sortingOrder]);

  const allSelected = sortedInventory.length > 0 && selectedIds.size === sortedInventory.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedInventory.map(i => i.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteConfirmed = () => {
    if (onBulkDelete) onBulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const handleFileChange = (e) => setFile2(e.target.files[0]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file2', file2);
    try {
      const response = await fetch('https://rohan22.pythonanywhere.com/recpt', { method: 'POST', body: formData });
      const data = await response.json();
      setImgSrc2(data.imgSrc2);
      setExtractedText2(data.extracted_text2);
      setMsg2('Image uploaded successfully!');
      let newExpiryDate;
      if (data.extracted_text2) {
        const date = new Date(data.extracted_text2);
        if (isNaN(date.getTime())) { console.error("Invalid date format"); return; }
        newExpiryDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } else {
        newExpiryDate = '1 Jan 2025';
      }
      const index = inventory.findIndex(item => item.id === scanningItemId);
      if (index !== -1) {
        const updatedInventory = [...inventory];
        updatedInventory[index] = { ...updatedInventory[index], expiryDate: newExpiryDate };
        onEdit(scanningItemId, updatedInventory[index]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setMsg2(error instanceof TypeError ? 'Could not read image, please try another' : 'Something went wrong, please try again');
    } finally {
      setUploadingImage(false);
      setShowScanExpiryPopup(false);
    }
  };

  const handleEdit = (id, item) => {
    if (editingItem !== null && editingItem !== id) return;
    const formattedExpiryDate = parseExpiryDate(item.expiryDate);
    setOriginalValues(item);
    setEditingItem(id);
    onEditingItemChange(id);
    setUpdatedValues({ ...item, expiryDate: formattedExpiryDate });
  };

  const handleScanExpiry = (id) => {
    if (editingItem !== null) return;
    setScanningItemId(id);
    setShowScanExpiryPopup(true);
  };

  const handleCancel = () => {
    setUpdatedValues(originalValues);
    setEditingItem(null);
    onEditingItemChange(null);
  };

  const handleInputChange = (e, field) => {
    setUpdatedValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleDateChange = (date) => {
    setUpdatedValues(prev => ({ ...prev, expiryDate: date }));
  };

  const getMonthName = (month) => {
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month];
  };

  const handleSave = (id) => {
    const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/;
    const specialCharsExceptDot = /[!@#$%^&*(),?":{}|<>]/;
    if (!updatedValues.name || !updatedValues.amount || !updatedValues.spent || !updatedValues.expiryDate) {
      alert('Please fill in all the fields'); return;
    }
    if (specialCharsRegex.test(updatedValues.name) || specialCharsRegex.test(updatedValues.amount)) {
      alert('Special characters are not allowed.'); return;
    }
    if (specialCharsExceptDot.test(updatedValues.spent)) {
      alert('Special characters except decimal are not allowed.'); return;
    }
    const amount = parseFloat(updatedValues.amount);
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount'); return; }
    const spent = parseFloat(updatedValues.spent);
    if (isNaN(spent) || spent <= 0) { alert('Please enter a valid spent amount'); return; }
    const formattedSpent = parseFloat(updatedValues.spent).toFixed(2);
    const formattedExpiryDate = `${updatedValues.expiryDate.getDate()} ${getMonthName(updatedValues.expiryDate.getMonth())} ${updatedValues.expiryDate.getFullYear()}`;
    onEdit(id, { ...updatedValues, amount, spent: formattedSpent, expiryDate: formattedExpiryDate });
    setEditingItem(null);
    onEditingItemChange(null);
    setUpdatedValues({});
  };

  const confirmDelete = (id) => {
    setShowDeleteConfirmation(true);
    setItemToDelete(id);
  };

  const handleDelete = () => {
    onDelete(itemToDelete);
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
  };

  const bulkSelectedItems = sortedInventory.filter(i => selectedIds.has(i.id));

  return (
    <div>
      {/* Floating bulk action bar — slides up from bottom when items are selected */}
      <div className={`bulk-action-bar${selectedIds.size > 0 ? ' bulk-action-bar--active' : ''}`}>
        <button className="bulk-action-clear" onClick={() => setSelectedIds(new Set())} aria-label="Deselect all">✕</button>
        <span className="bulk-action-count">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</span>
        <button className="bulk-delete-btn" onClick={() => setShowBulkDeleteConfirm(true)}>
          🗑 Delete Selected
        </button>
      </div>

      {/* ── Mobile sort bar (card view only) ── */}
      <div className="inv-mobile-sort-bar">
        <span className="inv-mobile-sort-label">Sort by expiry</span>
        <button className="inv-mobile-sort-btn" onClick={toggleSortingOrder}>
          {sortingOrder === 'asc' ? '↑ Soonest first' : '↓ Latest first'}
        </button>
      </div>

      {/* ── Mobile card list ── */}
      <div className="inv-card-list">
        {sortedInventory.map((item) => {
          const status = calculateStatus(item.expiryDate);
          const isEditing = editingItem === item.id;
          const isSelected = selectedIds.has(item.id);
          const statusKey = status.color === 'red' ? 'danger' : status.color === '#DAA520' ? 'warning' : 'safe';
          return (
            <div key={item.id} className={`inv-card inv-card--${statusKey}${isEditing ? ' inv-card--editing' : ''}${isSelected ? ' inv-card--selected' : ''}`}>
              <div className="inv-card-header">
                <div
                  className={`inv-card-sel${isSelected ? ' inv-card-sel--on' : ''}`}
                  onClick={() => toggleSelectOne(item.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Select ${item.name}`}
                >
                  {isSelected && '✓'}
                </div>
                <div className="inv-card-name-block">
                  {isEditing
                    ? <input className="edit-cell-input" type="text" value={updatedValues.name} onChange={(e) => handleInputChange(e, 'name')} />
                    : <span className="inv-card-name">{item.name}</span>
                  }
                  <CategoryBadge category={item.category} />
                </div>
                <span className={`status-badge status-${getStatusBadgeClass(status.color)}`}>
                  {status.text}
                </span>
              </div>
              <div className="inv-card-meta">
                <div className="inv-card-field inv-card-field--expiry">
                  <span className="inv-card-field-label">Expiry</span>
                  {isEditing
                    ? <DatePicker selected={updatedValues.expiryDate} onChange={handleDateChange} dateFormat="dd MMM yyyy" className="date-picker edit-date-picker" popperPlacement="bottom-start" portalId="root" />
                    : <span className="inv-card-field-value">{item.expiryDate}</span>
                  }
                </div>
                <div className="inv-card-field">
                  <span className="inv-card-field-label">Qty</span>
                  {isEditing
                    ? <input className="edit-cell-input edit-cell-input--sm" type="text" value={updatedValues.amount} onChange={(e) => handleInputChange(e, 'amount')} />
                    : <span className="inv-card-field-value">{item.amount}</span>
                  }
                </div>
                <div className="inv-card-field">
                  <span className="inv-card-field-label">Price</span>
                  {isEditing
                    ? <input className="edit-cell-input edit-cell-input--sm" type="text" value={updatedValues.spent} onChange={(e) => handleInputChange(e, 'spent')} />
                    : <span className="inv-card-field-value">${item.spent}</span>
                  }
                </div>
              </div>
              <div className="inv-card-actions">
                {isEditing ? (
                  <>
                    <button className="row-btn row-btn-save inv-card-btn" onClick={() => handleSave(item.id)}>Save</button>
                    <button className="row-btn row-btn-cancel inv-card-btn" onClick={handleCancel}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="row-btn row-btn-edit inv-card-btn" onClick={() => handleEdit(item.id, item)} disabled={editingItem !== null && editingItem !== item.id}>Edit</button>
                    <button className="row-btn row-btn-scan inv-card-btn" onClick={() => handleScanExpiry(item.id, item)} disabled={editingItem !== null}>Scan</button>
                    <button className="row-btn row-btn-delete inv-card-btn" onClick={() => confirmDelete(item.id)} disabled={editingItem !== null && editingItem !== item.id}>Delete</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ── */}
      <table>
        <thead>
          <tr>
            <th className="col-checkbox">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all"
              />
            </th>
            <th>Name</th>
            <th>Qty</th>
            <th>
              Status
              <button onClick={toggleSortingOrder} className="sort-button">
                {sortingOrder === 'asc' ? '↑' : '↓'}
              </button>
            </th>
            <th>Expiry Date</th>
            <th>Price $</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedInventory.map((item) => {
            const status = calculateStatus(item.expiryDate);
            const isEditing = editingItem === item.id;
            const isSelected = selectedIds.has(item.id);
            const statusKey = status.color === 'red' ? 'danger' : status.color === '#DAA520' ? 'warning' : 'safe';
            return (
              <tr key={item.id} className={`${isEditing ? 'row-editing' : ''} row-status-${statusKey}${isSelected ? ' row-selected' : ''}`}>
                <td className="col-checkbox">
                  <div className="cell-inner cell-inner--center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(item.id)}
                      aria-label={`Select ${item.name}`}
                    />
                  </div>
                </td>
                <td>
                  <div className="cell-inner cell-inner--col">
                    {isEditing
                      ? <input className="edit-cell-input" type="text" value={updatedValues.name} onChange={(e) => handleInputChange(e, 'name')} />
                      : (
                        <>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                          <CategoryBadge category={item.category} />
                        </>
                      )}
                  </div>
                </td>
                <td>
                  <div className="cell-inner">
                    {isEditing
                      ? <input className="edit-cell-input edit-cell-input--sm" type="text" value={updatedValues.amount} onChange={(e) => handleInputChange(e, 'amount')} />
                      : item.amount}
                  </div>
                </td>
                <td>
                  <div className="cell-inner">
                    <span className={`status-badge status-${getStatusBadgeClass(status.color)}`}>
                      {status.text}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="cell-inner">
                    {isEditing
                      ? <DatePicker
                          selected={updatedValues.expiryDate}
                          onChange={handleDateChange}
                          dateFormat="dd MMM yyyy"
                          className="date-picker edit-date-picker"
                          popperPlacement="bottom-start"
                          portalId="root"
                        />
                      : item.expiryDate}
                  </div>
                </td>
                <td>
                  <div className="cell-inner">
                    {isEditing
                      ? <input className="edit-cell-input edit-cell-input--sm" type="text" value={updatedValues.spent} onChange={(e) => handleInputChange(e, 'spent')} />
                      : `$${item.spent}`}
                  </div>
                </td>
                <td>
                  <div className="cell-inner">
                  <div className="row-actions">
                    {isEditing ? (
                      <>
                        <button className="row-btn row-btn-save" onClick={() => handleSave(item.id)}>Save</button>
                        <button className="row-btn row-btn-cancel" onClick={handleCancel}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button
                          className="row-btn row-btn-edit"
                          onClick={() => handleEdit(item.id, item)}
                          disabled={editingItem !== null && editingItem !== item.id}
                        >
                          Edit
                        </button>
                        <button
                          className="row-btn row-btn-scan"
                          onClick={() => handleScanExpiry(item.id, item)}
                          disabled={editingItem !== null}
                        >
                          Scan
                        </button>
                        <button
                          className="row-btn row-btn-delete"
                          onClick={() => confirmDelete(item.id)}
                          disabled={editingItem !== null && editingItem !== item.id}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {inventory.length === 0 && (
        <>
          <div className="empty-cart-image" />
          <div className="empty-inventory-message">
            <h2>Your pantry is empty</h2>
            <p>Click "Scan Receipt" or "Add Item" above to get started.</p>
          </div>
        </>
      )}

      {showScanExpiryPopup && (
        <div className="popup">
          <h2>Scan package to log expiry date</h2>
          {uploadingImage && <div className="loading-overlay">Loading…</div>}
          <div className="scan-options">
            <form onSubmit={handleUpload} encType="multipart/form-data">
              <input type="file" name="file" onChange={handleFileChange} />
              <input type="submit" value="Upload" />
            </form>
            <img src={samimg3} alt="Sample" width="25" height="25" />
            <a href={samimg3} download> Download Sample Image</a>
          </div>
          <button className="popup-cancel-btn" onClick={() => setShowScanExpiryPopup(false)}>Cancel</button>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="delete-confirmation-popup">
          <p>Are you sure you want to delete this item?</p>
          <button onClick={handleDelete}>Yes, delete</button>
          <button onClick={cancelDelete}>Cancel</button>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <>
          <div className="modal-overlay" onClick={() => setShowBulkDeleteConfirm(false)} />
          <div className="bulk-delete-modal">
            <div className="bulk-delete-modal-icon">🗑</div>
            <h2 className="bulk-delete-modal-title">Delete {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}?</h2>
            <p className="bulk-delete-modal-subtitle">This cannot be undone. The following items will be removed:</p>
            <ul className="bulk-delete-modal-list">
              {bulkSelectedItems.map(item => (
                <li key={item.id} className="bulk-delete-modal-item">
                  <span>{item.name.split(' - ')[0]}</span>
                </li>
              ))}
            </ul>
            <div className="bulk-delete-modal-actions">
              <button className="bulk-delete-modal-btn-confirm" onClick={handleBulkDeleteConfirmed}>
                Yes, delete all
              </button>
              <button className="bulk-delete-modal-btn-cancel" onClick={() => setShowBulkDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryList;
