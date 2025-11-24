import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import './TimeVerification.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const TimeVerification = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    project_key: '',
    user_email: '',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      setProjects(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania projektów:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
    }
  };

  const loadVerification = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: filters.start_date,
        end_date: filters.end_date
      };
      if (filters.project_key) params.project_key = filters.project_key;
      if (filters.user_email) params.user_email = filters.user_email;

      const response = await axios.get(`${API_BASE_URL}/verification/time`, { params });
      setVerificationData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania weryfikacji:', err);
      alert('Błąd podczas ładowania danych weryfikacji');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (userData) => {
    if (!userData || !userData.daily_details) return [];
    
    return userData.daily_details.map(day => ({
      date: new Date(day.date).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' }),
      'Czas spędzony (h)': day.hours_spent,
      'Capacity (h)': day.capacity_hours,
      'Wykorzystanie (%)': day.utilization_percent
    }));
  };

  return (
    <div className="time-verification">
      <h2>Weryfikacja Czasu vs Capacity</h2>

      <div className="verification-filters">
        <div className="form-row">
          <div className="form-group">
            <label>Projekt:</label>
            <select 
              value={filters.project_key} 
              onChange={(e) => setFilters({...filters, project_key: e.target.value})}
            >
              <option value="">Wszystkie projekty</option>
              {projects.map(p => (
                <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Użytkownik:</label>
            <select 
              value={filters.user_email} 
              onChange={(e) => setFilters({...filters, user_email: e.target.value})}
            >
              <option value="">Wszyscy użytkownicy</option>
              {users.map(u => (
                <option key={u.accountId || u.emailAddress} value={u.emailAddress || u.displayName}>
                  {u.displayName} {u.emailAddress ? `(${u.emailAddress})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Od:</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({...filters, start_date: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Do:</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({...filters, end_date: e.target.value})}
            />
          </div>

          <button className="btn-primary" onClick={loadVerification}>
            Sprawdź
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">Ładowanie danych weryfikacji...</div>
      )}

      {verificationData && verificationData.results && (
        <div className="verification-results">
          {verificationData.results.length === 0 ? (
            <div className="no-data">
              Brak danych do wyświetlenia dla wybranych filtrów
            </div>
          ) : (
            verificationData.results.map((userData, index) => {
              const chartData = prepareChartData(userData);
              const utilizationColor = userData.utilization_percent > 100 ? '#dc3545' : 
                                     userData.utilization_percent > 80 ? '#ffc107' : '#28a745';

              return (
                <div key={index} className="user-verification-card">
                  <div className="user-header">
                    <h3>{userData.user_display_name}</h3>
                    <div className="user-stats">
                      <div className="stat-item">
                        <span className="stat-label">Czas spędzony:</span>
                        <span className="stat-value">{userData.total_time_spent_hours}h</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Capacity:</span>
                        <span className="stat-value">{userData.total_capacity_hours}h</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Wykorzystanie:</span>
                        <span 
                          className="stat-value" 
                          style={{ color: utilizationColor, fontWeight: 'bold' }}
                        >
                          {userData.utilization_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {chartData.length > 0 && (
                    <div className="chart-container">
                      <h4>Wykres dzienny</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Czas spędzony (h)" fill="#0052cc" />
                          <Bar dataKey="Capacity (h)" fill="#28a745" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="daily-details">
                    <h4>Szczegóły dzienne</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Czas spędzony (h)</th>
                          <th>FTE</th>
                          <th>Capacity (h)</th>
                          <th>Wykorzystanie (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userData.daily_details.map((day, dayIndex) => {
                          const dayUtilizationColor = day.utilization_percent > 100 ? '#dc3545' : 
                                                     day.utilization_percent > 80 ? '#ffc107' : '#28a745';
                          return (
                            <tr key={dayIndex}>
                              <td>{new Date(day.date).toLocaleDateString('pl-PL')}</td>
                              <td>{day.hours_spent.toFixed(2)}</td>
                              <td>{day.fte}</td>
                              <td>{day.capacity_hours.toFixed(2)}</td>
                              <td style={{ color: dayUtilizationColor, fontWeight: 'bold' }}>
                                {day.utilization_percent.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TimeVerification;

