import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryList from './InventoryList';
import './inventory.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Dashboard from './Dashboard';
import samimg2 from "./2.jpeg";
import samplePdf from "./woolworth_sample_ereceipt.pdf";


const MONTH_MAP = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
export const parseExpiryDate = (expiryDate) => {
  if (!expiryDate) return new Date('invalid');
  if (expiryDate.includes('/')) {
    // Legacy "dd/mm/yyyy" format
    const p = expiryDate.split('/');
    return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  }
  // Current "D Mon YYYY" format e.g. "1 Jan 2024"
  const p = expiryDate.split(' ');
  if (p.length === 3 && MONTH_MAP[p[1]] !== undefined) {
    return new Date(parseInt(p[2]), MONTH_MAP[p[1]], parseInt(p[0]));
  }
  return new Date(expiryDate);
};

export const calculateStatus = (expiryDate) => {
  const expiry = parseExpiryDate(expiryDate);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry - currentDate) / (1000 * 60 * 60 * 24));
  if (days < 0)   return { text: '❌ Expired',       message: '❌ Expired',       color: 'red' };
  if (days === 0) return { text: '❌ Today',         message: '❌ Today',         color: 'red' };
  if (days <= 3)  return { text: `⚡ ${days}d left`, message: `⚡ ${days}d left`, color: '#DAA520' };
  return           { text: `✅ ${days}d left`,       message: `✅ ${days}d left`, color: 'green' };
};


export function Maininventory() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(() => {
    const stored = localStorage.getItem('inventory');
    if (!stored) return [];
    const items = JSON.parse(stored);
    // Fix any duplicate IDs from old data
    const seenIds = new Set();
    return items.map((item, i) => {
      if (seenIds.has(item.id)) {
        const newId = Date.now() + i + Math.random();
        seenIds.add(newId);
        return { ...item, id: newId };
      }
      seenIds.add(item.id);
      return item;
    });
  });
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showScanProducePopup, setShowScanProducePopup] = useState(false);
  const [showScanPackagePopup, setShowScanPackagePopup] = useState(false);
  const [showPdfReceiptPopup, setShowPdfReceiptPopup] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfItems, setPdfItems] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showNonPantryModal, setShowNonPantryModal] = useState(false);
  const [nonPantryChecked, setNonPantryChecked] = useState(new Set());

  const NON_PANTRY_CATEGORIES = new Set(['Toiletries', 'Household', 'Baby', 'Pet']);
  const [expiryPlaceholder, setExpiryPlaceholder] = useState(new Date());
  const [newItem, setNewItem] = useState({ name: '', amount: '', spent: '', expiryDate: '', status: '' });
  const [msg1, setMsg1] = useState('');
  const [file1, setFile1] = useState(null);
  const [imgSrc1, setImgSrc1] = useState('');
  const [extractedText1, setExtractedText1] = useState('');
  const [msg2, setMsg2] = useState('');
  const [file2, setFile2] = useState(null);
  const [imgSrc2, setImgSrc2] = useState('');
  const [extractedText2, setExtractedText2] = useState('');
  const [hasOneItemInInventory, setHasOneItemInInventory] = useState(inventory.length === 1);
  const [showCongratsPopup, setShowCongratsPopup] = useState(true);
  const [showCongratsTimer, setShowCongratsTimer] = useState(true);
  const [scanBtnEntrance, setScanBtnEntrance] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredInventory = inventory.filter(i => {
    const matchesText = i.name.toLowerCase().includes(filterText.toLowerCase());
    const color = calculateStatus(i.expiryDate).color;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'green'   && color === 'green') ||
      (filterStatus === 'warning' && color === '#DAA520') ||
      (filterStatus === 'red'     && color === 'red');
    return matchesText && matchesStatus;
  });

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredInventory.length);
  const currentInventory = filteredInventory.slice(startIndex, endIndex);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmationShown, setConfirmationShown] = useState(false);
  const [deletionHistory, setDeletionHistory] = useState(() =>
    JSON.parse(localStorage.getItem('deletionHistory') || '[]')
  );
  const [editingItem, setEditingItem] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredItemsList, setExpiredItemsList] = useState([]);
  const [showZeroQtyModal, setShowZeroQtyModal] = useState(false);
  const [zeroQtyItems, setZeroQtyItems] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('default');
  const [undoData, setUndoData] = useState(null);
  const undoTimerRef = useRef(null);

  const handleEditingItemChange = (itemId) => setEditingItem(itemId);


  useEffect(() => {
    const timeout = setTimeout(() => setShowCongratsTimer(false), 6000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const hasExpired = inventory.some(i => calculateStatus(i.expiryDate).color === 'red');
    if (hasExpired) {
      setScanBtnEntrance(false);
      return;
    }
    const timeout = setTimeout(() => setScanBtnEntrance(false), 2400);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!showExpiredModal && !scanBtnEntrance) {
      setScanBtnEntrance(true);
      const timeout = setTimeout(() => setScanBtnEntrance(false), 2400);
      return () => clearTimeout(timeout);
    }
  }, [showExpiredModal]);

  useEffect(() => { if (!showCongratsTimer) setShowCongratsPopup(false); }, [showCongratsTimer]);

  useEffect(() => { setCurrentPage(1); }, [filterText, filterStatus]);

  useEffect(() => {
    const hasNoExpired = !inventory.some(i => calculateStatus(i.expiryDate).color === 'red');
    if (hasOneItemInInventory && showCongratsTimer && hasNoExpired) setShowCongratsPopup(true);
    else setShowCongratsPopup(false);
  }, [hasOneItemInInventory, showCongratsTimer, inventory]);

  const handleEditItem = (id, updatedItem) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === id) {
        const status = calculateStatus(updatedItem.expiryDate);
        return { ...item, ...updatedItem, status };
      }
      return item;
    });
    setInventory(updatedInventory);
    localStorage.setItem('inventory', JSON.stringify(updatedInventory));
  };

  useEffect(() => {
    const hasOneItem = inventory.length === 1;
    if (hasOneItem !== hasOneItemInInventory) setHasOneItemInInventory(hasOneItem);
  }, [inventory, hasOneItemInInventory]);

  useEffect(() => {
    const zeroQty = inventory.filter(item => item.amount === 0);
    if (zeroQty.length > 0) {
      setZeroQtyItems(zeroQty);
      setShowZeroQtyModal(true);
    }
  }, []);

  const handleZeroQtyConfirm = () => {
    const newEntries = zeroQtyItems.map(item => {
      const status = calculateStatus(item.expiryDate);
      const category = status.color === 'red' ? 'wasted' : 'saved';
      return { id: Date.now() + Math.random(), name: item.name.split(' - ')[0], amount: item.amount, spent: parseFloat(item.spent) || 0, category, deletedAt: new Date().toISOString() };
    });
    const newHistory = [...deletionHistory, ...newEntries];
    setDeletionHistory(newHistory);
    localStorage.setItem('deletionHistory', JSON.stringify(newHistory));
    const updated = inventory.filter(item => item.amount !== 0);
    setInventory(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
    setShowZeroQtyModal(false);
    showToast(`${zeroQtyItems.length} empty item${zeroQtyItems.length !== 1 ? 's' : ''} removed.`, 'danger');
  };

  useEffect(() => {
    const hasZeroQty = inventory.some(item => item.amount === 0);
    if (hasZeroQty) return;
    const expired = inventory.filter(item => calculateStatus(item.expiryDate).color === 'red');
    if (expired.length > 0 && !confirmationShown) {
      setExpiredItemsList(expired);
      setShowExpiredModal(true);
      setConfirmationShown(true);
    }
  }, [inventory, confirmationShown]);

  const showToast = (msg, type = 'default') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleDeleteExpired = () => {
    const newEntries = expiredItemsList.map(item => ({
      id: Date.now() + Math.random(),
      name: item.name.split(' - ')[0],
      amount: item.amount,
      spent: parseFloat(item.spent) || 0,
      category: 'wasted',
      deletedAt: new Date().toISOString(),
    }));
    const newHistory = [...deletionHistory, ...newEntries];
    setDeletionHistory(newHistory);
    localStorage.setItem('deletionHistory', JSON.stringify(newHistory));
    const expiredIds = new Set(expiredItemsList.map(item => item.id));
    const updated = inventory.filter(item => !expiredIds.has(item.id));
    setInventory(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
    setShowExpiredModal(false);
    showToast(`${expiredItemsList.length} expired item${expiredItemsList.length > 1 ? 's' : ''} removed.`, 'danger');
  };

  const handleKeepExpired = () => {
    setShowExpiredModal(false);
    showToast('Expired items kept. You can remove them manually anytime.', 'warning');
  };

  const handleDeleteItem = (id, category) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const resolvedCategory = category || (calculateStatus(item.expiryDate).color === 'red' ? 'wasted' : 'saved');
    const entry = {
      id: Date.now(),
      name: item.name.split(' - ')[0],
      amount: item.amount,
      spent: parseFloat(item.spent) || 0,
      category: resolvedCategory,
      deletedAt: new Date().toISOString(),
    };
    const newHistory = [...deletionHistory, entry];
    setDeletionHistory(newHistory);
    localStorage.setItem('deletionHistory', JSON.stringify(newHistory));
    setInventory(prev => prev.filter(i => i.id !== id));

    // Undo support — keep deleted item recoverable for 5 seconds
    setUndoData({ item, historyEntryId: entry.id });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoData(null), 5000);
  };

  const handleUndoDelete = () => {
    if (!undoData) return;
    setInventory(prev => [...prev, undoData.item]);
    const newHistory = deletionHistory.filter(e => e.id !== undoData.historyEntryId);
    setDeletionHistory(newHistory);
    localStorage.setItem('deletionHistory', JSON.stringify(newHistory));
    setUndoData(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    showToast('Item restored.', 'success');
  };

  const handleBulkDeleteItems = (ids) => {
    const idsSet = new Set(ids);
    const toDelete = inventory.filter(i => idsSet.has(i.id));
    const newEntries = toDelete.map(item => {
      const status = calculateStatus(item.expiryDate);
      const category = status.color === 'red' ? 'wasted' : 'saved';
      return {
        id: Date.now() + Math.random(),
        name: item.name.split(' - ')[0],
        amount: item.amount,
        spent: parseFloat(item.spent) || 0,
        category,
        deletedAt: new Date().toISOString(),
      };
    });
    const newHistory = [...deletionHistory, ...newEntries];
    setDeletionHistory(newHistory);
    localStorage.setItem('deletionHistory', JSON.stringify(newHistory));
    const updated = inventory.filter(i => !idsSet.has(i.id));
    setInventory(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
    showToast(`${ids.length} item${ids.length !== 1 ? 's' : ''} deleted.`, 'danger');
  };

  const isPopupActive = showAddPopup || showScanProducePopup || showScanPackagePopup || showPdfReceiptPopup;
  const closeAllPopups = () => {
    setShowAddPopup(false);
    setShowScanProducePopup(false);
    setShowScanPackagePopup(false);
    setShowPdfReceiptPopup(false);
    setPdfItems([]);
    setPdfFile(null);
    setPdfError('');
  };

  const scrollToDashboard = () => {
    const el = document.getElementById('dashboard-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const stored = localStorage.getItem('inventory');
    if (!stored) return;
    const items = JSON.parse(stored);
    const seenIds = new Set();
    const fixed = items.map((item, i) => {
      if (seenIds.has(item.id)) {
        const newId = Date.now() + i + Math.random();
        seenIds.add(newId);
        return { ...item, id: newId };
      }
      seenIds.add(item.id);
      return item;
    });
    setInventory(fixed);
  }, []);

  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

  const togglePopup = (popupType) => {
    setShowAddPopup(false);
    setShowScanProducePopup(false);
    setShowScanPackagePopup(false);
    setShowStatusModal(false);
    switch (popupType) {
      case 'add':
        if (!showAddPopup) {
          const today = new Date();
          setExpiryPlaceholder(today);
          setNewItem({ name: '', amount: '', spent: '',
            expiryDate: today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            status: '' });
        }
        setShowAddPopup(!showAddPopup);
        break;
      case 'produce':  setShowScanProducePopup(!showScanProducePopup);  break;
      case 'package':  setShowScanPackagePopup(!showScanPackagePopup);  break;
      case 'statusInfo': setShowStatusModal(!showStatusModal); break;
      default: break;
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/;
    const specialCharsExceptDot = /[!@#$%^&*(),?":{}|<>]/;
    if (!newItem.name || !newItem.amount || !newItem.spent) { alert('Please fill in all the fields'); return; }
    if (specialCharsRegex.test(newItem.name) || specialCharsRegex.test(newItem.amount)) { alert('Special characters are not allowed.'); return; }
    if (specialCharsExceptDot.test(newItem.spent)) { alert('Special characters except decimal are not allowed.'); return; }
    const amount = parseFloat(newItem.amount);
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid quantity'); return; }
    const spent = parseFloat(newItem.spent);
    if (isNaN(spent) || spent <= 0) { alert('Please enter a valid price'); return; }
    let expiryDate = newItem.expiryDate || new Date().toLocaleDateString('en-GB');
    const formattedSpent = parseFloat(newItem.spent).toFixed(2);
    const status = calculateStatus(expiryDate);
    const sameNameItems = inventory.filter(i => i.name === newItem.name);
    const batchNumber = sameNameItems.length + 1;
    const newInventoryItem = {
      id: Date.now(),
      name: batchNumber > 1 ? `${newItem.name} - Batch ${batchNumber}` : newItem.name,
      amount: parseFloat(newItem.amount),
      spent: formattedSpent,
      expiryDate,
      status,
    };
    const updated = [...inventory, newInventoryItem];
    setInventory(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
    setNewItem({ name: '', amount: '', spent: '', expiryDate: '', status: '' });
    setShowAddPopup(false);
  };

  const populateItems = (name, amount, spent, expiryDate, status) => {
    const newInventoryItem = { id: Date.now() + Math.random(), name, amount, spent, expiryDate, status };
    setInventory(prev => [...prev, newInventoryItem]);
  };

  const handleFileChange1 = (e) => setFile1(e.target.files[0]);
  const handleFileChange2 = (e) => setFile2(e.target.files[0]);

  const handleUpload2 = async (e) => {
    e.preventDefault();
    setUploadingImage(true);
    if (!file1) { alert('Please select a file.'); return; }
    const formData = new FormData();
    formData.append('file1', file1);
    try {
      const response = await fetch('https://rohan2101new.pythonanywhere.com/pred', { method: 'POST', body: formData });
      setUploadingImage(true);
      const data = await response.json();
      setImgSrc1(data.imgSrc1); setExtractedText1(data.extracted_text1); setMsg1(data.msg1);
      const daysToAdd = parseInt(data.msg1, 10);
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + daysToAdd);
      const formattedDate = `${currentDate.getDate()} ${new Intl.DateTimeFormat('en', { month: 'long' }).format(currentDate)} ${currentDate.getFullYear()}`;
      setNewItem(prev => ({ ...prev, name: '', amount: '', spent: '', expiryDate: data.extracted_text2, status: '' }));
      if (extractedText1 !== '' || msg1 !== '') {
        populateItems(data.extracted_text1, '', '', formattedDate, '');
        setShowScanProducePopup(false);
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error reading image data, try another image.');
      setMsg1('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const handleUpload3 = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file2', file2);
    try {
      const response = await fetch('https://rohan22.pythonanywhere.com/recpt', { method: 'POST', body: formData });
      const data = await response.json();
      setImgSrc2(data.imgSrc2); setExtractedText2(data.extracted_text2); setMsg2('Image uploaded successfully!');
      setNewItem(prev => ({ ...prev, name: '', amount: '', spent: '', expiryDate: "20 Apr 2023", status: '' }));
      if (extractedText2 !== '' || msg2 !== '') {
        const dateString = data.extracted_text2;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { console.error("Invalid date format"); return; }
        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        populateItems('', '', '', formattedDate, '');
        alert("Successfully scanned the image!");
        togglePopup('package');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  };

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile) { setPdfError('Please select a PDF file.'); return; }
    setPdfLoading(true);
    setPdfError('');
    const formData = new FormData();
    formData.append('file', pdfFile);
    try {
      const response = await fetch('https://ecopallet-next.onrender.com/ereceipt', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to parse receipt');
      }
      const data = await response.json();
      setPdfItems(data.items.map(item => ({
        ...item,
        expiryDate: item.expiry_date,
        name: item.short_name || item.name,
      })));
    } catch (error) {
      setPdfError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePdfItemChange = (index, field, value) => {
    setPdfItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleConfirmPdfItems = (itemsToAdd) => {
    const items = itemsToAdd ?? pdfItems;
    const newItems = items.map((item, index) => ({
      id: Date.now() + index,
      name: item.name,
      amount: item.qty,
      spent: item.unit_price.toFixed(2),
      expiryDate: item.expiryDate,
      status: calculateStatus(item.expiryDate),
      category: item.category,
    }));
    const updated = [...inventory, ...newItems];
    setInventory(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
    setShowPdfReceiptPopup(false);
    setPdfItems([]);
    setPdfFile(null);
    const isFirstScan = inventory.length === 0;
    showToast(isFirstScan ? '🎉 Your pantry is alive. Great first scan!' : `${newItems.length} item${newItems.length > 1 ? 's' : ''} added from receipt.`, 'success');
  };

  const handleAddToPantryClick = () => {
    const flagged = pdfItems.reduce((acc, item, idx) => {
      if (NON_PANTRY_CATEGORIES.has(item.category)) acc.add(idx);
      return acc;
    }, new Set());
    if (flagged.size > 0) {
      setNonPantryChecked(flagged);
      setShowNonPantryModal(true);
    } else {
      handleConfirmPdfItems(pdfItems);
    }
  };

  const handleNonPantryConfirm = (removeIndices) => {
    const filtered = pdfItems.filter((_, i) => !removeIndices.has(i));
    setShowNonPantryModal(false);
    handleConfirmPdfItems(filtered);
  };


  // Computed stats
  const freshCount    = inventory.filter(i => calculateStatus(i.expiryDate).color === 'green').length;
  const expiringCount = inventory.filter(i => calculateStatus(i.expiryDate).color === '#DAA520').length;
  const expiredCount  = inventory.filter(i => calculateStatus(i.expiryDate).color === 'red').length;
  const [activeTab, setActiveTab] = useState('pantry');

  return (
    <div>
      {isPopupActive && <div className="modal-overlay" onClick={closeAllPopups} />}

      <div className="main-content">
        <div className="App">

          {/* ── Page Header ── */}
          <div className="inv-page-header">
            <div>
              <span className="inv-eyebrow">🥦 Pantry Manager</span>
              <h1 className="inv-header-text">My Pantry</h1>
              <p className="inv-header-sub">Track what you have, reduce what you waste</p>
            </div>
          </div>

          {/* ── Tab Switcher ── */}
          <div className="inv-tabs">
            <button
              className={`inv-tab${activeTab === 'pantry' ? ' inv-tab--active' : ''}`}
              onClick={() => setActiveTab('pantry')}
            >
              📦 Pantry
            </button>
            <button
              className={`inv-tab${activeTab === 'analytics' ? ' inv-tab--active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Analytics
            </button>
          </div>

          {activeTab === 'pantry' && <>

          {/* ── Stats Row ── */}
          <div className="inv-stats-row">
            <div
              className={`inv-stat-card inv-stat-total inv-stat-card--clickable${filterStatus === 'all' ? ' inv-stat-card--active-filter' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              <span className="inv-stat-num">{inventory.length}</span>
              <span className="inv-stat-label">Total items</span>
            </div>
            <div
              className={`inv-stat-card inv-stat-fresh inv-stat-card--clickable${filterStatus === 'green' ? ' inv-stat-card--active-filter' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'green' ? 'all' : 'green')}
            >
              <span className="inv-stat-num">{freshCount}</span>
              <span className="inv-stat-label">Fresh</span>
            </div>
            <div
              className={`inv-stat-card inv-stat-warning inv-stat-card--clickable${filterStatus === 'warning' ? ' inv-stat-card--active-filter' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'warning' ? 'all' : 'warning')}
            >
              <span className="inv-stat-num">{expiringCount}</span>
              <span className="inv-stat-label">Expiring soon</span>
              <span className="inv-stat-sublabel">within 3 days</span>
            </div>
            <div
              className={`inv-stat-card inv-stat-danger inv-stat-card--clickable${filterStatus === 'red' ? ' inv-stat-card--active-filter' : ''}`}
              onClick={() => setFilterStatus(filterStatus === 'red' ? 'all' : 'red')}
            >
              <span className="inv-stat-num">{expiredCount}</span>
              <span className="inv-stat-label">Expired</span>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="inv-toolbar">
            {/* Left: inventory actions */}
            <div className="inv-toolbar-group">
              <button
                className={`inv-action-btn inv-scan-cta${inventory.length === 0 ? ' inv-scan-cta--pulse' : ''}${scanBtnEntrance ? ' inv-scan-cta--entrance' : ''}`}
                onClick={() => { closeAllPopups(); setShowPdfReceiptPopup(true); }}
                disabled={editingItem !== null}
              >
                <span className="inv-scan-cta-icon">📄</span>
                Upload Receipt
              </button>
              <button className="inv-action-btn" onClick={() => togglePopup('add')} disabled={editingItem !== null}>
                + Add Item
              </button>
              <button className="inv-action-btn" onClick={() => togglePopup('produce')} disabled={editingItem !== null}>
                🌿 Scan Produce
              </button>
            </div>

            {/* Divider */}
            <div className="inv-toolbar-divider" />

            {/* Right: discovery CTAs */}
            <div className="inv-toolbar-group inv-toolbar-group--right">
              <button className="inv-insight-btn" onClick={() => navigate('/recipes')}>
                🍳 What Can I Cook?
              </button>
              <button className="inv-insight-btn" onClick={() => navigate('/tips')}>
                🧊 How to Keep Longer?
              </button>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          {inventory.length > 0 && (
            <div className="inv-filter-bar">
              <div className="inv-filter-search">
                <i className="bi bi-search inv-filter-search-icon" />
                <input
                  className="inv-filter-input"
                  type="text"
                  placeholder="Search your pantry…"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                />
                {filteredInventory.length !== inventory.length && (
                  <span className="inv-filter-count">{filteredInventory.length} shown</span>
                )}
                {filterText && (
                  <button className="inv-filter-clear" onClick={() => setFilterText('')}>
                    <i className="bi bi-x-circle-fill" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Empty State ── */}
          {inventory.length === 0 && (
            <div className="inv-empty-state">
              <div className="inv-empty-icon-wrap">
                <span className="inv-empty-scan-line" />
                <span className="inv-empty-icon">🧾</span>
              </div>
              <h2 className="inv-empty-title">Start by uploading a receipt</h2>
              <p className="inv-empty-sub">Upload your Woolworths e-receipt PDF and we'll fill in the rest</p>
              <button
                className="inv-empty-cta"
                onClick={() => { closeAllPopups(); setShowPdfReceiptPopup(true); }}
              >
                📄 Upload Your First Receipt
              </button>
            </div>
          )}

          {/* ── Inventory Table ── */}
          <div className="inventory-table-container">
            <InventoryList
              inventory={currentInventory}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onBulkDelete={handleBulkDeleteItems}
              togglePopup={togglePopup}
              onEditingItemChange={handleEditingItemChange}
            />
          </div>

          {/* ── Add Item Popup ── */}
          {showAddPopup && (
            <>
              <div className="modal-overlay" onClick={() => setShowAddPopup(false)} />
              <div className="popup">
                <h2>Add New Item</h2>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" name="name" value={newItem.name} onChange={handleInputChange} placeholder="e.g. Milk" />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="text" name="amount" value={newItem.amount} onChange={handleInputChange} placeholder="e.g. 2" />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input type="text" name="spent" value={newItem.spent} onChange={handleInputChange} placeholder="e.g. 3.50" />
                </div>
                <div className="form-group">
                  <label>Expiry Date</label>
                  <DatePicker
                    selected={expiryPlaceholder}
                    onChange={(date) => {
                      const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      setExpiryPlaceholder(date);
                      setNewItem(prev => ({ ...prev, expiryDate: formattedDate }));
                    }}
                    dateFormat="dd MMM yyyy"
                    className="date-picker add-date-picker"
                    portalId="root"
                    popperPlacement="bottom"
                    fixedHeight
                    renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
                      <div className="dp-header">
                        <button className="dp-nav-btn" onClick={decreaseMonth} disabled={prevMonthButtonDisabled}>‹</button>
                        <span className="dp-header-label">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <button className="dp-nav-btn" onClick={increaseMonth} disabled={nextMonthButtonDisabled}>›</button>
                      </div>
                    )}
                  />
                </div>
                <div className="form-actions">
                  <button onClick={handleAddItem}>Save Item</button>
                  <button className="popup-cancel-btn" onClick={() => togglePopup('add')}>Cancel</button>
                </div>
              </div>
            </>
          )}


          {/* ── Scan Package Popup ── */}
          {showScanPackagePopup && (
            <div className="popup">
              <h2>Scan Package</h2>
              <div className="scan-options">
                <form onSubmit={handleUpload3} encType="multipart/form-data">
                  <input type="file" name="file2" onChange={handleFileChange2} />
                  <input type="submit" value="Upload" />
                </form>
                {imgSrc2 && <img src={imgSrc2} alt="Uploaded" />}
              </div>
              <button className="popup-cancel-btn" onClick={() => togglePopup('package')}>Cancel</button>
            </div>
          )}

          {/* ── PDF Receipt Popup ── */}
          {showPdfReceiptPopup && (
            <div className="popup" style={{ maxWidth: 760, width: '95vw', maxHeight: '85vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ marginBottom: 22 }}>
                <h2 style={{
                  margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A',
                  letterSpacing: '-0.4px', fontFamily: 'Inter, -apple-system, sans-serif', lineHeight: 1.2,
                }}>
                  📄 Upload your e-receipt
                </h2>
                <p style={{
                  margin: '6px 0 0', fontSize: 14, fontWeight: 500,
                  color: '#64748B', fontFamily: 'Inter, -apple-system, sans-serif',
                }}>
                  Woolworths e-receipt PDF · AI identifies items & estimates expiry dates
                </p>
              </div>

              {/* Step 1: file picker */}
              {pdfItems.length === 0 && !pdfLoading && (
                <>
                  <form onSubmit={handlePdfUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                        border: `2px dashed ${isDragOver ? '#16A34A' : pdfFile ? '#16A34A' : '#E2E8F0'}`,
                        borderRadius: 14, cursor: 'pointer',
                        background: isDragOver ? 'rgba(22,163,74,0.08)' : pdfFile ? 'rgba(22,163,74,0.04)' : '#F8FAFC',
                        transition: 'border-color 200ms, background 200ms',
                      }}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setIsDragOver(false);
                        const f = e.dataTransfer.files[0];
                        if (f && f.name.toLowerCase().endsWith('.pdf')) { setPdfFile(f); setPdfError(''); }
                        else setPdfError('Please drop a PDF file.');
                      }}
                    >
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{pdfFile ? '✅' : isDragOver ? '📥' : '📂'}</span>
                      <span style={{
                        color: pdfFile ? '#15803D' : '#94A3B8', fontSize: 14,
                        fontWeight: 600, fontFamily: 'Inter, -apple-system, sans-serif',
                      }}>
                        {pdfFile ? pdfFile.name : isDragOver ? 'Drop it here!' : 'Click to choose or drag & drop a PDF'}
                      </span>
                      <input
                        type="file" accept=".pdf" style={{ display: 'none' }}
                        onChange={e => { setPdfFile(e.target.files[0]); setPdfError(''); }}
                      />
                    </label>
                    {pdfError && <p style={{ color: '#DC2626', margin: 0, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>⚠️ {pdfError}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" style={{ flex: 1 }}>🔍 Upload & Parse</button>
                      <button type="button" className="popup-cancel-btn" onClick={closeAllPopups}>Cancel</button>
                    </div>
                  </form>
                  <p style={{ marginTop: 14, fontSize: 13, fontWeight: 500, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>
                    No receipt?{' '}
                    <a href={samplePdf} download="woolworth_sample_ereceipt.pdf" style={{ color: '#16A34A', fontWeight: 700, textDecoration: 'none' }}>
                      Download a sample PDF →
                    </a>
                  </p>
                </>
              )}

              {/* Step 1b: loading state */}
              {pdfItems.length === 0 && pdfLoading && (
                <div className="pdf-loading-state">
                  <div className="pdf-loading-spinner" />
                  <p className="pdf-loading-title">Reading your receipt…</p>
                  <p className="pdf-loading-sub">AI is identifying items and estimating expiry dates.<br/>This usually takes 5–10 seconds.</p>
                  <div className="pdf-loading-dots">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              {/* Step 2: review cards */}
              {pdfItems.length > 0 && (
                <>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
                        {pdfItems.length} item{pdfItems.length !== 1 ? 's' : ''} found
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
                        Edit anything before saving to your pantry
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                      color: '#1D4ED8', border: '1px solid #BFDBFE',
                      borderRadius: 999, padding: '5px 13px', fontSize: 11, fontWeight: 700,
                      whiteSpace: 'nowrap', letterSpacing: '0.03em',
                    }}>
                      🤖 AI estimated
                    </span>
                  </div>

                  {/* Item cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pdfItems.map((item, idx) => {
                      const CAT = {
                        'Dairy':      { bg: '#EFF6FF', color: '#1D4ED8', emoji: '🧀', accent: '#3B82F6' },
                        'Meat':       { bg: '#FEF2F2', color: '#B91C1C', emoji: '🥩', accent: '#EF4444' },
                        'Serviced':   { bg: '#FEF2F2', color: '#B91C1C', emoji: '🥩', accent: '#EF4444' },
                        'Chilled':    { bg: '#F0F9FF', color: '#0369A1', emoji: '❄️', accent: '#0EA5E9' },
                        'Frozen':     { bg: '#ECFEFF', color: '#0E7490', emoji: '🧊', accent: '#06B6D4' },
                        'Fruit':      { bg: '#F0FDF4', color: '#15803D', emoji: '🍎', accent: '#22C55E' },
                        'Vegetable':  { bg: '#F0FDF4', color: '#15803D', emoji: '🥦', accent: '#22C55E' },
                        'Bakery':     { bg: '#FFFBEB', color: '#B45309', emoji: '🍞', accent: '#F59E0B' },
                        'Pantry':     { bg: '#FFF7ED', color: '#C2410C', emoji: '🏺', accent: '#F97316' },
                        'Cooking':    { bg: '#FFF7ED', color: '#C2410C', emoji: '🍳', accent: '#F97316' },
                        'Drinks':     { bg: '#F5F3FF', color: '#6D28D9', emoji: '🥤', accent: '#8B5CF6' },
                        'Health':     { bg: '#F0FDF4', color: '#166534', emoji: '💊', accent: '#16A34A' },
                        'Toiletries': { bg: '#FAF5FF', color: '#7E22CE', emoji: '🧴', accent: '#A855F7' },
                        'Household':  { bg: '#F8FAFC', color: '#475569', emoji: '🏠', accent: '#64748B' },
                        'Baby':       { bg: '#FDF2F8', color: '#BE185D', emoji: '👶', accent: '#EC4899' },
                        'Pet':        { bg: '#FFF7ED', color: '#92400E', emoji: '🐾', accent: '#D97706' },
                      };
                      const cat = CAT[item.category] || { bg: '#F1F5F9', color: '#475569', emoji: '🏷️', accent: '#94A3B8' };
                      const fieldStyle = {
                        border: '1.5px solid #E2E8F0', borderRadius: 8,
                        padding: '6px 8px', fontSize: 13, fontWeight: 600,
                        color: '#0F172A', outline: 'none', background: '#F8FAFC',
                        fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
                        transition: 'border-color 150ms',
                      };
                      return (
                        <div key={idx} style={{
                          background: '#fff', borderRadius: 16,
                          border: '1.5px solid #F1F5F9',
                          overflow: 'hidden',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}>
                          {/* Category accent bar */}
                          <div style={{ height: 3, background: `linear-gradient(90deg, ${cat.accent}, ${cat.accent}55)` }} />

                          <div style={{ padding: '13px 15px 14px' }}>
                            {/* Row 1: Emoji avatar + name input + remove */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                              <div style={{
                                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                                background: cat.bg, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 19,
                              }}>
                                {cat.emoji}
                              </div>
                              <input
                                type="text" value={item.name}
                                onChange={e => handlePdfItemChange(idx, 'name', e.target.value)}
                                style={{
                                  flex: 1, minWidth: 0, border: 'none',
                                  borderBottom: `2px solid ${cat.accent}25`,
                                  background: 'transparent', fontSize: 15, fontWeight: 700,
                                  color: '#0F172A', padding: '3px 0', outline: 'none',
                                  fontFamily: 'Inter, sans-serif', transition: 'border-color 150ms',
                                }}
                                onFocus={e => e.currentTarget.style.borderBottomColor = cat.accent}
                                onBlur={e => e.currentTarget.style.borderBottomColor = `${cat.accent}25`}
                              />
                              <button
                                onClick={() => setPdfItems(prev => prev.filter((_, i) => i !== idx))}
                                title="Remove item"
                                style={{
                                  flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                                  border: 'none', background: '#F1F5F9', color: '#CBD5E1',
                                  fontSize: 13, cursor: 'pointer', fontWeight: 700,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 150ms',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#CBD5E1'; }}
                              >✕</button>
                            </div>

                            {/* Row 2: category pill + shelf life */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                background: cat.bg, color: cat.color,
                                borderRadius: 999, padding: '2px 10px',
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                              }}>
                                {item.category}
                              </span>
                              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                                · 🗓 {item.shelf_days}d shelf life
                              </span>
                            </div>

                            {/* Row 3: fields */}
                            <div style={{
                              display: 'grid', gridTemplateColumns: '64px 84px 1fr', gap: 8,
                              background: '#F8FAFC', borderRadius: 10, padding: '10px 12px',
                              border: '1px solid #F1F5F9',
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter, sans-serif' }}>QTY</span>
                                <input
                                  type="number" value={item.qty} min={1}
                                  onChange={e => handlePdfItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                                  style={{ ...fieldStyle, width: '100%', textAlign: 'center' }}
                                  onFocus={e => e.currentTarget.style.borderColor = cat.accent}
                                  onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter, sans-serif' }}>PRICE ($)</span>
                                <input
                                  type="number" value={item.unit_price} min={0} step={0.01}
                                  onChange={e => handlePdfItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                  style={{ ...fieldStyle, width: '100%', textAlign: 'center' }}
                                  onFocus={e => e.currentTarget.style.borderColor = cat.accent}
                                  onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter, sans-serif' }}>EXPIRES</span>
                                <input
                                  type="text" value={item.expiryDate}
                                  onChange={e => handlePdfItemChange(idx, 'expiryDate', e.target.value)}
                                  style={{ ...fieldStyle, width: '100%' }}
                                  onFocus={e => e.currentTarget.style.borderColor = cat.accent}
                                  onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={handleAddToPantryClick}
                      style={{
                        width: '100%', border: 'none', borderRadius: 14, padding: '15px',
                        fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.2px',
                        background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                        color: '#fff',
                        boxShadow: '0 6px 20px rgba(22,163,74,0.35)',
                        transition: 'transform 100ms, box-shadow 100ms',
                        fontFamily: 'Inter, sans-serif',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(22,163,74,0.45)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(22,163,74,0.35)'; }}
                    >
                      Add {pdfItems.length} item{pdfItems.length > 1 ? 's' : ''} to pantry →
                    </button>
                    <button
                      onClick={closeAllPopups}
                      style={{
                        background: 'none', border: 'none', color: '#94A3B8',
                        fontSize: 13, cursor: 'pointer', padding: '6px',
                        fontFamily: 'Inter, sans-serif', fontWeight: 500,
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Non-pantry confirmation modal — rendered as fixed overlay */}
                  {showNonPantryModal && (
                    <>
                      <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
                        backdropFilter: 'blur(2px)', zIndex: 1200,
                      }} />
                      <div style={{
                        position: 'fixed', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: '#fff', borderRadius: 18,
                        padding: '28px 24px 22px', width: 'min(400px, calc(100vw - 32px))',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 1201,
                        maxHeight: '80vh', overflowY: 'auto',
                      }}>
                        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>🧴</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 6 }}>
                          Not pantry items?
                        </div>
                        <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 18, lineHeight: 1.5 }}>
                          These items may not belong in your food pantry. Uncheck any you want to keep.
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                          {pdfItems.map((item, idx) => {
                            if (!NON_PANTRY_CATEGORIES.has(item.category)) return null;
                            const checked = nonPantryChecked.has(idx);
                            return (
                              <label key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                background: checked ? '#FEF2F2' : '#F8FAFC',
                                border: `1.5px solid ${checked ? '#FECACA' : '#E2E8F0'}`,
                                borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                                transition: 'all 150ms',
                              }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setNonPantryChecked(prev => {
                                    const next = new Set(prev);
                                    if (next.has(idx)) next.delete(idx); else next.add(idx);
                                    return next;
                                  })}
                                  style={{ accentColor: '#EF4444', width: 16, height: 16, flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.name}</div>
                                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.category}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            onClick={() => handleNonPantryConfirm(nonPantryChecked)}
                            style={{
                              background: '#EF4444', color: '#fff', border: 'none',
                              borderRadius: 10, padding: '11px', fontSize: 14,
                              fontWeight: 700, cursor: 'pointer', width: '100%',
                            }}
                          >
                            Remove checked & add rest
                          </button>
                          <button
                            onClick={() => handleNonPantryConfirm(new Set())}
                            style={{
                              background: '#F1F5F9', color: '#475569', border: 'none',
                              borderRadius: 10, padding: '11px', fontSize: 14,
                              fontWeight: 600, cursor: 'pointer', width: '100%',
                            }}
                          >
                            Add all anyway
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Scan Produce Popup ── */}
          {showScanProducePopup && (
            <div className="popup">
              <h2>Scan Produce</h2>
              {uploadingImage && <div className="loading-overlay">Loading…</div>}
              <div className="scan-options">
                <form id="uploadFormProduce" onSubmit={handleUpload2} encType="multipart/form-data">
                  <input type="file" name="file1" onChange={handleFileChange1} />
                  <input type="submit" value="Upload" />
                </form>
                {imgSrc1 && <img src={imgSrc1} alt="Uploaded" />}
                <img src={samimg2} alt="Sample" width="25" height="25" />
                <a href={samimg2} download> Download Sample Image</a>
              </div>
              <button className="popup-cancel-btn" onClick={() => togglePopup('produce')}>Cancel</button>
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="inv-pagination">
              <button className="inv-pagination-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>← Previous</button>
              <span className="inv-pagination-info">Page {currentPage} of {totalPages}</span>
              <button className="inv-pagination-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next →</button>
            </div>
          )}

          {/* ── Congrats toast ── */}
          {showCongratsPopup && (
            <div className="congrats-toast">
              <button className="congrats-toast-close" onClick={() => setShowCongratsPopup(false)} aria-label="Dismiss">✕</button>
              <div className="congrats-toast-icon">🎉</div>
              <div className="congrats-toast-body">
                <p className="congrats-toast-title">You're all set!</p>
                <p className="congrats-toast-sub">Your pantry is live. Ready to cook something great?</p>
                <a href="/recipes" className="congrats-toast-cta">View Recipes →</a>
              </div>
              <div className="congrats-toast-progress" />
            </div>
          )}

          </>}

          {activeTab === 'analytics' && (
            <Dashboard inventory={inventory} deletionHistory={deletionHistory} />
          )}

        </div>
      </div>

      {/* ── Expired Items Modal ── */}
      {showExpiredModal && (
        <>
          <div className="expired-modal-overlay" onClick={handleKeepExpired} />
          <div className="expired-modal">
            <div className="expired-modal-icon">⚠️</div>
            <h2 className="expired-modal-title">Expired Items Found</h2>
            <p className="expired-modal-subtitle">
              {expiredItemsList.length} item{expiredItemsList.length > 1 ? 's have' : ' has'} passed their expiry date.
            </p>
            <ul className="expired-modal-list">
              {expiredItemsList.map(item => {
                const status = calculateStatus(item.expiryDate);
                return (
                  <li key={item.id} className="expired-modal-item">
                    <span className="expired-modal-name">{item.name.split(' - ')[0]}</span>
                    <span className="expired-modal-badge">{status.message}</span>
                  </li>
                );
              })}
            </ul>
            <div className="expired-modal-actions">
              <button className="expired-modal-btn-delete" onClick={handleDeleteExpired}>
                🗑 Delete All Expired
              </button>
              <button className="expired-modal-btn-keep" onClick={handleKeepExpired}>
                Keep for Now
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Zero quantity modal ── */}
      {showZeroQtyModal && (
        <>
          <div className="expired-modal-overlay" onClick={() => setShowZeroQtyModal(false)} />
          <div className="expired-modal">
            <div className="expired-modal-icon">🫙</div>
            <h2 className="expired-modal-title">Empty Items Found</h2>
            <p className="expired-modal-subtitle">
              {zeroQtyItems.length} item{zeroQtyItems.length !== 1 ? 's have' : ' has'} a quantity of 0. Remove them?
            </p>
            <ul className="expired-modal-list">
              {zeroQtyItems.map(item => (
                <li key={item.id} className="expired-modal-item">
                  <span className="expired-modal-name">{item.name.split(' - ')[0]}</span>
                  <span className="expired-modal-badge" style={{ background: '#F1F5F9', color: '#64748B' }}>qty 0</span>
                </li>
              ))}
            </ul>
            <div className="expired-modal-actions">
              <button className="expired-modal-btn-delete" onClick={handleZeroQtyConfirm}>
                🗑 Remove Empty Items
              </button>
              <button className="expired-modal-btn-keep" onClick={() => setShowZeroQtyModal(false)}>
                Keep for Now
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast notification ── */}
      {toastMsg && (
        <div className={`inv-toast inv-toast--${toastType}`}>
          <span className="inv-toast-icon">
            {toastType === 'success' ? '✅' : toastType === 'warning' ? '⚠️' : toastType === 'danger' ? '🗑' : 'ℹ️'}
          </span>
          <p className="inv-toast-msg">{toastMsg}</p>
        </div>
      )}

      {/* ── Undo toast (shown after single item delete) ── */}
      {undoData && (
        <div className="inv-toast inv-toast--danger inv-toast--undo">
          <span className="inv-toast-icon">🗑</span>
          <p className="inv-toast-msg">"{undoData.item.name.split(' - ')[0]}" removed</p>
          <button className="inv-toast-undo-btn" onClick={handleUndoDelete}>Undo</button>
        </div>
      )}
    </div>
  );
}

export default Maininventory;
