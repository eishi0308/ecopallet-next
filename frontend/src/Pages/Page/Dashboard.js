import React, { useMemo, useState } from 'react';
import './dashboard.css';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { calculateStatus } from './inventory';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardFadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
};

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

function computeTrend(deletionHistory, period) {
  const now = new Date();
  const buckets = [];
  if (period === 'weekly') {
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      buckets.push({ start: new Date(start), end: new Date(end), label: i === 0 ? 'This wk' : `${i}w ago` });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      buckets.push({ start, end, label: start.toLocaleString('default', { month: 'short' }) });
    }
  }
  return buckets.map(({ start, end, label }) => {
    const items = deletionHistory.filter(item => {
      const d = new Date(item.deletedAt);
      return d >= start && d <= end;
    });
    const wasted = items.filter(i => i.category === 'wasted').reduce((s, i) => s + (parseFloat(i.spent) || 0), 0);
    const saved  = items.filter(i => i.category === 'saved').reduce((s, i) => s + (parseFloat(i.spent) || 0), 0);
    return { label, wasted: +wasted.toFixed(2), saved: +saved.toFixed(2) };
  });
}

function computeMetrics(inventory, deletionHistory) {
  const sum = arr => arr.reduce((s, i) => s + (parseFloat(i.spent) || 0), 0);

  const liveWasted        = inventory.filter(i => calculateStatus(i.expiryDate).color === 'red');
  const liveAboutToExpire = inventory.filter(i => calculateStatus(i.expiryDate).color === '#DAA520');
  const histWasted        = deletionHistory.filter(i => i.category === 'wasted');
  const histSaved         = deletionHistory.filter(i => i.category === 'saved');

  const wastedCost        = sum(liveWasted) + sum(histWasted);
  const aboutToExpireCost = sum(liveAboutToExpire);
  const savedCost         = sum(histSaved);
  const totalCost         = wastedCost + aboutToExpireCost + savedCost;

  const wasteRate = totalCost > 0 ? Math.round((wastedCost / totalCost) * 100) : 0;
  const saveRate  = totalCost > 0 ? Math.round((savedCost  / totalCost) * 100) : 0;

  const allWasted = [...liveWasted, ...histWasted];
  const byName = allWasted.reduce((acc, i) => {
    const name = (i.name || '').split(' - ')[0];
    acc[name] = (acc[name] || 0) + (parseFloat(i.amount) || 1);
    return acc;
  }, {});
  const top5 = Object.entries(byName)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  return {
    wastedCost, aboutToExpireCost, savedCost, totalCost, wasteRate, saveRate,
    wastedCount:        liveWasted.length + histWasted.length,
    aboutToExpireCount: liveAboutToExpire.length,
    savedCount:         histSaved.length,
    top5,
  };
}

const CATEGORY_COLORS = {
  'Produce':    '#16A34A',
  'Dairy':      '#2563EB',
  'Meat':       '#DC2626',
  'Seafood':    '#0891B2',
  'Bakery':     '#D97706',
  'Frozen':     '#0E7490',
  'Beverages':  '#0284C7',
  'Snacks':     '#EA580C',
  'Pantry':     '#C2410C',
  'Vegetable':  '#15803D',
  'Fruit':      '#15803D',
  'Condiments':    '#F97316',
  'Drinks':     '#6D28D9',
  'Health':     '#166534',
  'Chilled':    '#0369A1',
  'Serviced':   '#B91C1C',
  'Toiletries': '#7E22CE',
  'Household':  '#475569',
  'Other':      '#94A3B8',
};

function computeCategoryBreakdown(inventory, deletionHistory) {
  const map = {};
  // Include current inventory items (in pantry)
  inventory.forEach(item => {
    const cat = item.foodCategory || item.category || 'Other';
    if (!map[cat]) map[cat] = { wasted: 0, saved: 0, inPantry: 0 };
    map[cat].inPantry += parseFloat(item.spent) || 0;
  });
  // Include history (wasted / saved)
  deletionHistory.forEach(item => {
    const cat = item.foodCategory || item.category || 'Other';
    if (!map[cat]) map[cat] = { wasted: 0, saved: 0, inPantry: 0 };
    if (item.category === 'wasted') map[cat].wasted += parseFloat(item.spent) || 0;
    else map[cat].saved += parseFloat(item.spent) || 0;
  });
  return Object.entries(map)
    .map(([cat, vals]) => ({
      cat,
      wasted:   +vals.wasted.toFixed(2),
      saved:    +vals.saved.toFixed(2),
      inPantry: +vals.inPantry.toFixed(2),
      total:    +(vals.wasted + vals.saved + vals.inPantry).toFixed(2),
    }))
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);
}

const Dashboard = ({ inventory, deletionHistory, hideCategorySpending }) => {
  const [trendPeriod, setTrendPeriod] = useState('weekly');

  const m = useMemo(
    () => computeMetrics(inventory, deletionHistory),
    [inventory, deletionHistory]
  );

  const trendData = useMemo(
    () => computeTrend(deletionHistory, trendPeriod),
    [deletionHistory, trendPeriod]
  );

  const hasTrendData = trendData.some(d => d.wasted > 0 || d.saved > 0);

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(inventory, deletionHistory),
    [inventory, deletionHistory]
  );

  const trendChartData = {
    labels: trendData.map(d => d.label),
    datasets: [
      {
        label: 'Wasted',
        data: trendData.map(d => d.wasted),
        backgroundColor: 'rgba(239,68,68,0.82)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Saved',
        data: trendData.map(d => d.saved),
        backgroundColor: 'rgba(22,163,74,0.82)',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: ctx => ` $${ctx.parsed.y.toFixed(2)}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter, sans-serif' }, color: '#94A3B8' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { size: 11, family: 'Inter, sans-serif' },
          color: '#94A3B8',
          callback: v => `$${v}`,
        },
      },
    },
    animation: { duration: 500, easing: 'easeInOutQuart' },
  };

  const hasValues = m.wastedCost > 0 || m.aboutToExpireCost > 0 || m.savedCost > 0;
  const maxQty    = m.top5.length > 0 ? m.top5[0].qty : 1;

  const chartData = {
    labels: ['Wasted', 'At Risk', 'Saved'],
    datasets: [{
      data: hasValues
        ? [m.wastedCost, m.aboutToExpireCost, m.savedCost]
        : [1, 1, 1],
      backgroundColor: hasValues ? ['#EF4444', '#F59E0B', '#16A34A'] : ['#E2E8F0', '#E2E8F0', '#E2E8F0'],
      borderColor:     hasValues ? ['#FEF2F2', '#FFFBEB', '#F0FDF4'] : ['#F8FAFC', '#F8FAFC', '#F8FAFC'],
      borderWidth: 4,
      hoverOffset: hasValues ? 6 : 0,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: hasValues,
        callbacks: { label: ctx => ` $${ctx.parsed.toFixed(2)}` },
      },
    },
    animation: { duration: 700, easing: 'easeInOutQuart' },
  };

  const legend = [
    { label: 'Wasted',          color: '#EF4444', value: m.wastedCost,        bg: '#FEF2F2' },
    { label: 'At Risk',         color: '#F59E0B', value: m.aboutToExpireCost, bg: '#FFFBEB' },
    { label: 'Saved',           color: '#16A34A', value: m.savedCost,         bg: '#F0FDF4' },
  ];

  if (!hasValues) {
    const hasItems = inventory.length > 0 || deletionHistory.length > 0;
    return (
      <motion.div className="dash" variants={fadeUp} initial="hidden" animate="visible">
        <div className="dash-empty-state">
          <span className="dash-empty-icon">{hasItems ? '📊' : '📦'}</span>
          <p className="dash-empty-msg">
            {hasItems
              ? 'No waste data yet — analytics will appear as you use or remove items.'
              : 'Add items to your pantry to see your spending analytics.'}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="dash" variants={stagger} initial="hidden" animate="visible">

      {/* ── 2x2 Grid ── */}
      <motion.div className="dash-two-by-two" variants={stagger}>
        <motion.div variants={cardFadeUp} className="dash-metric-card dash-metric--wasted">
          <span className="dash-metric-eyebrow">🗑 Gone to waste</span>
          <div className="dash-metric-row">
            <div className="dash-metric-col">
              <div className="dash-metric-amount">${m.wastedCost.toFixed(2)}</div>
              <p className="dash-metric-sub">{m.wastedCount} item{m.wastedCount !== 1 ? 's' : ''} gone to waste</p>
            </div>
            {m.wasteRate > 0 && (
              <>
                <div className="dash-metric-divider" />
                <div className="dash-metric-col">
                  <div className="dash-metric-pct">{m.wasteRate}%</div>
                  <p className="dash-metric-sub">of total spend</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
        <motion.div variants={cardFadeUp} className="dash-metric-card dash-metric--saved">
          <span className="dash-metric-eyebrow">✅ Saved</span>
          <div className="dash-metric-row">
            <div className="dash-metric-col">
              <div className="dash-metric-amount">${m.savedCost.toFixed(2)}</div>
              <p className="dash-metric-sub">{m.savedCount} item{m.savedCount !== 1 ? 's' : ''} consumed in time</p>
            </div>
            {m.saveRate > 0 && (
              <>
                <div className="dash-metric-divider" />
                <div className="dash-metric-col">
                  <div className="dash-metric-pct dash-metric-pct--saved">{m.saveRate}%</div>
                  <p className="dash-metric-sub">saved</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
        <motion.div variants={cardFadeUp} className="dash-metric-card dash-metric--total">
          <span className="dash-metric-eyebrow">💰 Total Tracked</span>
          <div className="dash-metric-amount">${m.totalCost.toFixed(2)}</div>
          <p className="dash-metric-sub">all spending tracked</p>
        </motion.div>
        <motion.div variants={cardFadeUp} className="dash-metric-card dash-metric--risk">
          <span className="dash-metric-eyebrow">⚠️ Still at risk</span>
          <div className="dash-metric-amount">${m.aboutToExpireCost.toFixed(2)}</div>
          <p className="dash-metric-sub">
            {m.aboutToExpireCount} item{m.aboutToExpireCount !== 1 ? 's' : ''} not yet expired
          </p>
        </motion.div>
      </motion.div>

      {/* ── Donut chart + Most Wasted Foods ── */}
      <motion.div className="dash-main" variants={stagger}>

        <motion.div variants={cardFadeUp} className="dash-panel dash-chart-panel">
          <h3 className="dash-panel-title">Spending Breakdown</h3>
          <div className="dash-donut-wrap">
            <div className="dash-donut-canvas">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="dash-donut-center">
                <span className="dash-donut-pct">{m.wasteRate}%</span>
                <span className="dash-donut-pct-label">wasted</span>
              </div>
            </div>
            <div className="dash-legend">
              {legend.map(l => (
                <div key={l.label} className="dash-legend-row" style={{ '--leg-bg': l.bg }}>
                  <span className="dash-legend-dot" style={{ background: l.color }} />
                  <span className="dash-legend-name">{l.label}</span>
                  <span className="dash-legend-val" style={{ color: l.color }}>
                    ${l.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={cardFadeUp} className="dash-panel dash-top5-panel">
          <h3 className="dash-panel-title">Most Wasted Foods</h3>
          <p className="dash-panel-sub">Your repeat offenders — buy less or use faster</p>
          {m.top5.length > 0 ? (
            <div className="dash-top5-list">
              {m.top5.map(({ name, qty }, i) => (
                <div key={name} className="dash-top5-row">
                  <span className="dash-top5-rank">#{i + 1}</span>
                  <div className="dash-top5-body">
                    <div className="dash-top5-meta">
                      <span className="dash-top5-name">{name}</span>
                      <span className="dash-top5-qty">×{qty}</span>
                    </div>
                    <div className="dash-top5-track">
                      <div className="dash-top5-fill" style={{ width: `${(qty / maxQty) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-empty-state">
              <span className="dash-empty-icon">🌿</span>
              <p className="dash-empty-msg">No expired food — great work!</p>
            </div>
          )}
        </motion.div>

      </motion.div>

      {/* ── Trend chart ── */}
      <motion.div variants={cardFadeUp} className="dash-panel dash-trend-panel">
        <div className="dash-trend-header">
          <div>
            <h3 className="dash-panel-title">Waste Trend</h3>
            <p className="dash-panel-sub" style={{ margin: 0 }}>Wasted vs saved over time</p>
          </div>
          <div className="dash-trend-legend">
            <span className="dash-trend-legend-dot dash-trend-legend-dot--wasted" />
            <span className="dash-trend-legend-label">Wasted</span>
            <span className="dash-trend-legend-dot dash-trend-legend-dot--saved" />
            <span className="dash-trend-legend-label">Saved</span>
            <div className="dash-toggle">
              <button className={`dash-toggle-btn${trendPeriod === 'weekly' ? ' dash-toggle-btn--active' : ''}`} onClick={() => setTrendPeriod('weekly')}>W</button>
              <button className={`dash-toggle-btn${trendPeriod === 'monthly' ? ' dash-toggle-btn--active' : ''}`} onClick={() => setTrendPeriod('monthly')}>M</button>
            </div>
          </div>
        </div>
        {hasTrendData ? (
          <div className="dash-trend-chart">
            <Bar data={trendChartData} options={trendChartOptions} />
          </div>
        ) : (
          <div className="dash-empty-state">
            <span className="dash-empty-icon">📈</span>
            <p className="dash-empty-msg">No history yet — trend will appear as you remove items.</p>
          </div>
        )}
      </motion.div>

      {/* ── Category Breakdown ── */}
      {!hideCategorySpending && (
      <motion.div variants={cardFadeUp} className="dash-panel dash-cat-panel">
        <h3 className="dash-panel-title">Spending by Category</h3>
        <p className="dash-panel-sub" style={{ margin: '0 0 20px' }}>Which food types cost you the most</p>
        {categoryBreakdown.length > 0 ? (
          <div className="dash-cat-list">
            {categoryBreakdown.map(({ cat, wasted, saved, inPantry, total }) => {
              const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
              const maxTotal = categoryBreakdown[0].total;
              return (
                <div key={cat} className="dash-cat-row">
                  <div className="dash-cat-meta">
                    <span className="dash-cat-name" style={{ color }}>{cat}</span>
                    <span className="dash-cat-total">${total.toFixed(2)}</span>
                  </div>
                  <div className="dash-cat-track">
                    <div className="dash-cat-fill" style={{ width: `${(inPantry / maxTotal) * 100}%`, background: 'rgba(100,116,139,0.45)' }} />
                    <div className="dash-cat-fill" style={{ width: `${(saved   / maxTotal) * 100}%`, background: 'rgba(22,163,74,0.75)' }} />
                    <div className="dash-cat-fill" style={{ width: `${(wasted  / maxTotal) * 100}%`, background: 'rgba(239,68,68,0.75)' }} />
                  </div>
                  <div className="dash-cat-breakdown">
                    {inPantry > 0 && <span className="dash-cat-chip dash-cat-chip--pantry">🧺 ${inPantry.toFixed(2)} in pantry</span>}
                    {saved    > 0 && <span className="dash-cat-chip dash-cat-chip--saved">✅ ${saved.toFixed(2)} saved</span>}
                    {wasted   > 0 && <span className="dash-cat-chip dash-cat-chip--wasted">🗑 ${wasted.toFixed(2)} wasted</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dash-empty-state">
            <span className="dash-empty-icon">🏷️</span>
            <p className="dash-empty-msg">No category data yet — scan a receipt to see your breakdown.</p>
          </div>
        )}
      </motion.div>
      )}

    </motion.div>
  );
};

export default Dashboard;
