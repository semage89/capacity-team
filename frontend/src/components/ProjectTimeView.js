import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import './ProjectTimeView.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectTimeView = ({ project, dateRange, onDateRangeChange }) => {
  const [timeData, setTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjectTime();
  }, [project, dateRange]);

  const loadProjectTime = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/time/project/${project.key}`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      });
      setTimeData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania czasu projektu:', err);
      setError('Nie można załadować danych czasu. Sprawdź konfigurację Tempo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field, value) => {
    onDateRangeChange(
      field === 'start' ? value : dateRange.start,
      field === 'end' ? value : dateRange.end
    );
  };

  if (loading) {
    return (
      <div className="project-time-view">
        <div className="loading">Ładowanie danych czasu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-time-view">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!timeData) {
    return (
      <div className="project-time-view">
        <div className="no-data">Brak danych dla tego projektu</div>
      </div>
    );
  }

  // Przygotuj dane do wykresu
  const userTimeData = Object.entries(timeData.user_time || {})
    .map(([user, hours]) => ({
      name: user,
      'Godziny': hours
    }))
    .sort((a, b) => b['Godziny'] - a['Godziny']);

  return (
    <div className="project-time-view">
      <div className="project-header">
        <div>
          <h2>{project.name}</h2>
          <p className="project-key">Klucz: {project.key}</p>
        </div>
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

      <div className="time-stats">
        <div className="stat-card-large">
          <div className="stat-value-large">{timeData.total_hours}h</div>
          <div className="stat-label">Łączny czas w projekcie</div>
          <div className="stat-period">
            {new Date(timeData.start_date).toLocaleDateString('pl-PL')} - {new Date(timeData.end_date).toLocaleDateString('pl-PL')}
          </div>
        </div>
        <div className="stat-card-large">
          <div className="stat-value-large">{Object.keys(timeData.user_time || {}).length}</div>
          <div className="stat-label">Użytkowników</div>
        </div>
        <div className="stat-card-large">
          <div className="stat-value-large">
            {Object.keys(timeData.user_time || {}).length > 0
              ? (timeData.total_hours / Object.keys(timeData.user_time).length).toFixed(1)
              : 0}h
          </div>
          <div className="stat-label">Średnio na użytkownika</div>
        </div>
      </div>

      {userTimeData.length > 0 && (
        <div className="chart-section">
          <h3>Wykorzystanie czasu per użytkownik</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={userTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Godziny" fill="#0052cc" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="user-time-table">
        <h3>Szczegóły per użytkownik</h3>
        <table>
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>Godziny</th>
              <th>Procent całkowitego czasu</th>
            </tr>
          </thead>
          <tbody>
            {userTimeData.map((item) => {
              const percentage = ((item['Godziny'] / timeData.total_hours) * 100).toFixed(1);
              return (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td><strong>{item['Godziny']}h</strong></td>
                  <td>
                    <div className="percentage-bar">
                      <div
                        className="percentage-fill"
                        style={{ width: `${percentage}%` }}
                      />
                      <span className="percentage-text">{percentage}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectTimeView;

