import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { calculateStatus } from './inventory';

ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Combined metrics ─────────────────────────────────────────────────────────
// Live inventory  → expired = Wasted | expiring-soon = About to Expire | safe = hidden
// Deletion history→ 'wasted' = Wasted | 'saved' = Saved
function computeMetrics(inventory, deletionHistory) {
  const sum = arr => arr.reduce((s, i) => s + (parseFloat(i.spent) || 0), 0);

  // Live — expired = Wasted, not-yet-expired (expiring soon OR safe) = About to Expire
  const liveWasted        = inventory.filter(i => calculateStatus(i.expiryDate).color === 'red');
  const liveAboutToExpire = inventory.filter(i => calculateStatus(i.expiryDate).color !== 'red');

  // History
  const histWasted = deletionHistory.filter(i => i.category === 'wasted');
  const histSaved  = deletionHistory.filter(i => i.category === 'saved');

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
    wastedCount: liveWasted.length + histWasted.length,
    aboutToExpireCount: liveAboutToExpire.length,
    savedCount: histSaved.length,
    top5,
  };
}

function StatCard({ label, emoji, value, sub, mod }) {
  return (
    <div className={`dash-stat-card${mod ? ' dash-stat-' + mod : ''}`}>
      <div className="dash-stat-top">
        <span className="dash-stat-emoji">{emoji}</span>
        <span className="dash-stat-label">{label}</span>
      </div>
      <span className="dash-stat-value">${value.toFixed(2)}</span>
      <span className="dash-stat-sub">{sub}</span>
    </div>
  );
}

const Dashboard = ({ inventory, deletionHistory }) => {
  const m = useMemo(
    () => computeMetrics(inventory, deletionHistory),
    [inventory, deletionHistory]
  );

  const hasValues    = m.wastedCost > 0 || m.aboutToExpireCost > 0 || m.savedCost > 0;
  const hasRatioData = m.wastedCost > 0 || m.savedCost > 0;
  const maxQty       = m.top5.length > 0 ? m.top5[0].qty : 1;

  const chartData = {
    labels: ['Wasted', 'About to Expire', 'Saved'],
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
    { label: 'About to Expire', color: '#F59E0B', value: m.aboutToExpireCost, bg: '#FFFBEB' },
    { label: 'Saved',           color: '#16A34A', value: m.savedCost,         bg: '#F0FDF4' },
  ];

  return (
    <div className="dash">

      {/* ── Hero: Gone to Waste ── */}
      {hasValues && (
        <>
          <div className="dash-waste-hero">
            <div className="dash-waste-hero-left">
              <span className="dash-waste-hero-eyebrow">🗑 Gone to waste</span>
              <div className="dash-waste-hero-amount">${m.wastedCost.toFixed(2)}</div>
              <p className="dash-waste-hero-sub">food that expired before you ate it</p>
            </div>
            {m.wasteRate > 0 && (
              <div className="dash-waste-hero-badge">
                <span className="dash-waste-pct">{m.wasteRate}%</span>
                <span className="dash-waste-pct-label">of total spend</span>
              </div>
            )}
          </div>

          <div className="dash-two-col">
            <div className="dash-metric-card dash-metric--saved">
              <span className="dash-metric-eyebrow">✅ Saved</span>
              <div className="dash-metric-amount">${m.savedCost.toFixed(2)}</div>
              <p className="dash-metric-sub">
                {m.savedCount} item{m.savedCount !== 1 ? 's' : ''} consumed in time
              </p>
            </div>
            <div className="dash-metric-card dash-metric--risk">
              <span className="dash-metric-eyebrow">⚠️ Still at risk</span>
              <div className="dash-metric-amount">${m.aboutToExpireCost.toFixed(2)}</div>
              <p className="dash-metric-sub">
                {m.aboutToExpireCount} item{m.aboutToExpireCount !== 1 ? 's' : ''} not yet expired
              </p>
            </div>
          </div>

          {hasRatioData && (
            <div className="dash-ratio-wrap">
              <div className="dash-ratio-bar">
                <div className="dash-ratio-fill--wasted" style={{ width: `${m.wasteRate}%` }} />
                <div className="dash-ratio-fill--saved"  style={{ width: `${m.saveRate}%`  }} />
              </div>
              <div className="dash-ratio-labels">
                <span style={{ color: '#EF4444' }}>{m.wasteRate}% wasted</span>
                <span style={{ color: '#16A34A' }}>{m.saveRate}% saved</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Original header + stat cards ── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <span className="dash-eyebrow">📊 Live Spending Analytics</span>
          <h2 className="dash-title">Food Budget Overview</h2>
          <p className="dash-subtitle">
            Live pantry status + permanent consumption history.
          </p>
        </div>
        {hasValues && (
          <div className="dash-header-badge">
            <span className="dash-rate-num">{m.saveRate}%</span>
            <span className="dash-rate-label">save rate</span>
          </div>
        )}
      </div>

      <div className="dash-cards">
        <StatCard label="Total Tracked"   emoji="💰" value={m.totalCost}         sub={`${inventory.length} item${inventory.length !== 1 ? 's' : ''} in pantry`} />
        <StatCard label="Wasted"          emoji="🗑"  value={m.wastedCost}        sub={`${m.wastedCount} expired item${m.wastedCount !== 1 ? 's' : ''}`}        mod="danger"  />
        <StatCard label="About to Expire" emoji="🕐"  value={m.aboutToExpireCost} sub={`${m.aboutToExpireCount} not yet expired`}                             mod="warning" />
        <StatCard label="Saved"           emoji="✅"  value={m.savedCost}         sub={`${m.savedCount} item${m.savedCount !== 1 ? 's' : ''} consumed`}          mod="success" />
      </div>

      {/* ── Chart + Top5 ── */}
      <div className="dash-main">

        <div className="dash-panel dash-chart-panel">
          <h3 className="dash-panel-title">Spending Breakdown</h3>
          <div className="dash-donut-wrap">
            <div className="dash-donut-canvas">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="dash-donut-center">
                {hasValues ? (
                  <>
                    <span className="dash-donut-pct">{m.wasteRate}%</span>
                    <span className="dash-donut-pct-label">wasted</span>
                  </>
                ) : (
                  <>
                    <span className="dash-donut-pct dash-donut-pct--empty">—</span>
                    <span className="dash-donut-pct-label">no data</span>
                  </>
                )}
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
          {!hasValues && (
            <p className="dash-empty-hint">No data yet — add items to your pantry to get started.</p>
          )}
        </div>

        <div className="dash-panel dash-top5-panel">
          <h3 className="dash-panel-title">Most Wasted Foods</h3>
          <p className="dash-panel-sub">Expired items in your pantry</p>
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
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
