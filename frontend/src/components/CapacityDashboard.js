import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './CapacityDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const CapacityDashboard = () => {
  const [capacityData, setCapacityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCapacity();
  }, [dateRange]);

  const loadCapacity = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/capacity`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      });
      setCapacityData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania capacity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !capacityData) {
    return <div className="loading">Ładowanie danych capacity...</div>;
  }

  const { projects } = capacityData;
  const barChartData = projects
    .sort((a, b) => b.hours_spent - a.hours_spent)
    .slice(0, 10)
    .map(project => ({
      name: project.key,
      'Godziny': project.hours_spent,
      'Użytkownicy': project.user_count
    }));

  const totalHours = projects.reduce((sum, p) => sum + p.hours_spent, 0);

  return (
    <div className="capacity-dashboard">
      <h2>Przegląd Capacity</h2>
      
      <div className="date-range-selector">
        <label>
          Od:
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          />
        </label>
        <label>
          Do:
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          />
        </label>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Projektów</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalHours.toFixed(1)}h</div>
          <div className="stat-label">Łączny czas</div>
        </div>
      </div>

      <div className="chart-container">
        <h3>Top 10 projektów - wykorzystanie czasu</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Godziny" fill="#0052cc" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="projects-table">
        <h3>Szczegóły projektów</h3>
        <table>
          <thead>
            <tr>
              <th>Klucz</th>
              <th>Nazwa</th>
              <th>Użytkownicy</th>
              <th>Godziny</th>
            </tr>
          </thead>
          <tbody>
            {projects
              .sort((a, b) => b.hours_spent - a.hours_spent)
              .map((project) => (
                <tr key={project.key}>
                  <td><strong>{project.key}</strong></td>
                  <td>{project.name}</td>
                  <td>{project.user_count}</td>
                  <td>{project.hours_spent.toFixed(1)}h</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CapacityDashboard;

