import React, { useState, useEffect } from 'react';

const Dashboard = ({ top5WastedFoods }) => {
  const [wastedFoods, setWastedFoods] = useState([]);

  useEffect(() => {
    const storedWastedFoods = JSON.parse(localStorage.getItem('top5WastedFoods')) || [];
    const updatedWastedFoods = [...storedWastedFoods, ...top5WastedFoods];
    updatedWastedFoods.sort((a, b) => b.wastedAmount - a.wastedAmount);
    const newTop5WastedFoods = updatedWastedFoods.slice(0, 5);
    setWastedFoods(newTop5WastedFoods);
    localStorage.setItem('top5WastedFoods', JSON.stringify(newTop5WastedFoods));
  }, [top5WastedFoods]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-left-side">
        <div className="dashboard-header">
          <div className="dashboard-image"></div>

        </div>
        <div className="justline"></div>
      </div>
      <div className="dashboard-table-container">
        <h3>Most Wasted Foods this week:</h3>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Frequency</th>
            </tr>
          </thead>
          <tbody>
            {wastedFoods.map((food, index) => (
              <tr key={index}>
                <td>{food.name}</td>
                <td>{food.wastedAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
