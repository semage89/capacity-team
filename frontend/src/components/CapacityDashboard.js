import React from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './CapacityDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const COLORS = ['#0052cc', '#0065ff', '#2684ff', '#4c9aff', '#7ab8ff', '#a5d4ff'];

const CapacityDashboard = ({ capacityData, dateRange, onDateRangeChange, loading }) => {
  const handleDateChange = (field, value) => {
    onDateRangeChange(
      field === 'start' ? value : dateRange.start,
      field === 'end' ? value : dateRange.end
    );
  };

  if (loading || !capacityData) {
    return (
      <div className="dashboard">
        <div className="loading">Ładowanie danych capacity...</div>
      </div>
    );
  }

  const { projects } = capacityData;

  // Przygotuj dane do wykresów
  const barChartData = projects
    .sort((a, b) => b.hours_spent - a.hours_spent)
    .slice(0, 10)
    .map(project => ({
      name: project.key,
      'Godziny': project.hours_spent,
      'Użytkownicy': project.user_count
    }));

  const pieChartData = projects
    .filter(p => p.hours_spent > 0)
    .sort((a, b) => b.hours_spent - a.hours_spent)
    .slice(0, 6)
    .map(project => ({
      name: project.name,
      value: project.hours_spent
    }));

  const totalHours = projects.reduce((sum, p) => sum + p.hours_spent, 0);
  const totalUsers = new Set(projects.flatMap(p => p.users.map(u => u.displayName))).size;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Przegląd Capacity</h2>
        <div className="date-range-selector">
          <label>
            Od:
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
          </label>
          <label>
            Do:
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </label>
        </div>
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
        <div className="stat-card">
          <div className="stat-value">{totalUsers}</div>
          <div className="stat-label">Użytkowników</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{(totalHours / projects.length || 0).toFixed(1)}h</div>
          <div className="stat-label">Średnio na projekt</div>
        </div>
      </div>

      <div className="charts-grid">
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

        <div className="chart-container">
          <h3>Rozkład czasu per projekt</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
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

