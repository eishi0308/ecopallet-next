import React, { useMemo } from 'react';
import './dashboard.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { calculateStatus } from './inventory';

ChartJS.register(ArcElement, Tooltip, Legend);

function computeMetrics(inventory, deletionHistory) {
  const sum = arr => arr.reduce((s, i) => s + (parseFloat(i.spent) || 0), 0);

  const liveWasted        = inventory.filter(i => calculateStatus(i.expiryDate).color === 'red');
  const liveAboutToExpire = inventory.filter(i => calculateStatus(i.expiryDate).color !== 'red');
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

const Dashboard = ({ inventory, deletionHistory }) => {
  const m = useMemo(
    () => computeMetrics(inventory, deletionHistory),
    [inventory, deletionHistory]
  );

  const hasValues = m.wastedCost > 0 || m.aboutToExpireCost > 0 || m.savedCost > 0;
  const maxQty    = m.top5.length > 0 ? m.top5[0].qty : 1;

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

  if (!hasValues) {
    return (
      <div className="dash">
        <div className="dash-empty-state">
          <span className="dash-empty-icon">📦</span>
          <p className="dash-empty-msg">Add items to your pantry to see your spending analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">

      {/* ── Hero ── */}
      <div className="dash-waste-hero">
        <div className="dash-waste-hero-left">
          <span className="dash-waste-hero-eyebrow">🗑 Gone to waste</span>
          <div className="dash-waste-hero-row">
            <div className="dash-waste-hero-col">
              <div className="dash-waste-hero-amount">${m.wastedCost.toFixed(2)}</div>
              <p className="dash-waste-hero-sub">{m.wastedCount} item{m.wastedCount !== 1 ? 's' : ''} gone to waste</p>
            </div>
            {m.wasteRate > 0 && (
              <>
                <div className="dash-waste-hero-divider" />
                <div className="dash-waste-hero-col">
                  <div className="dash-waste-hero-pct">{m.wasteRate}%</div>
                  <p className="dash-waste-hero-pct-label">of total spend</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Saved + Total + At Risk ── */}
      <div className="dash-three-col">
        <div className="dash-metric-card dash-metric--saved">
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
        </div>
        <div className="dash-metric-card dash-metric--total">
          <span className="dash-metric-eyebrow">💰 Total Tracked</span>
          <div className="dash-metric-amount">${m.totalCost.toFixed(2)}</div>
          <p className="dash-metric-sub">all spending tracked</p>
        </div>
        <div className="dash-metric-card dash-metric--risk">
          <span className="dash-metric-eyebrow">⚠️ Still at risk</span>
          <div className="dash-metric-amount">${m.aboutToExpireCost.toFixed(2)}</div>
          <p className="dash-metric-sub">
            {m.aboutToExpireCount} item{m.aboutToExpireCount !== 1 ? 's' : ''} not yet expired
          </p>
        </div>
      </div>

      {/* ── Donut chart + Most Wasted Foods ── */}
      <div className="dash-main">

        <div className="dash-panel dash-chart-panel">
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
        </div>

        <div className="dash-panel dash-top5-panel">
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
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
