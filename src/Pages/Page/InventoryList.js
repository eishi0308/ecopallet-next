import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { calculateStatus, parseExpiryDate } from './inventory';
import './inventory.css';
import samimg3 from "./3.jpeg";

const getStatusBadgeClass = (color) => {
  if (color === 'red')      return 'status-danger';
  if (color === '#DAA520')  return 'status-warning';
  return 'status-safe';
};

const InventoryList = ({ inventory, onEdit, onDelete, togglePopup, onEditingItemChange }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [updatedValues, setUpdatedValues] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [imgSrc, setImgSrc] = useState('');
  const [file2, setFile2] = useState(null);
  const [imgSrc2, setImgSrc2] = useState('');
  const [extractedText2, setExtractedText2] = useState('');
  const [msg2, setMsg2] = useState('');
  const [showScanExpiryPopup, setShowScanExpiryPopup] = useState(false);
  const [scanningItemId, setScanningItemId] = useState(null);
  const [sortingOrder, setSortingOrder] = useState('asc');
  const [uploadingImage, setUploadingImage] = useState(false);

  const toggleSortingOrder = () => setSortingOrder(o => o === 'asc' ? 'desc' : 'asc');

  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => {
      const dateA = new Date(a.expiryDate);
      const dateB = new Date(b.expiryDate);
      return sortingOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [inventory, sortingOrder]);

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

  return (
    <div>
      <table>
        <thead>
          <tr>
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
            const statusKey = status.color === 'red' ? 'danger' : status.color === '#DAA520' ? 'warning' : 'safe';
            return (
              <tr key={item.id} className={`${isEditing ? 'row-editing' : ''} row-status-${statusKey}`}>
                <td>
                  {isEditing
                    ? <input className="edit-cell-input" type="text" value={updatedValues.name} onChange={(e) => handleInputChange(e, 'name')} />
                    : item.name}
                </td>
                <td>
                  {isEditing
                    ? <input className="edit-cell-input edit-cell-input--sm" type="text" value={updatedValues.amount} onChange={(e) => handleInputChange(e, 'amount')} />
                    : item.amount}
                </td>
                <td>
                  <span className={`status-badge status-${getStatusBadgeClass(status.color)}`}>
                    {status.message}
                  </span>
                </td>
                <td>
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
                </td>
                <td>
                  {isEditing
                    ? <input className="edit-cell-input edit-cell-input--sm" type="text" value={updatedValues.spent} onChange={(e) => handleInputChange(e, 'spent')} />
                    : `$${item.spent}`}
                </td>
                <td>
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
            {imgSrc && <img src={imgSrc} alt="Uploaded" />}
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
    </div>
  );
};

export default InventoryList;
