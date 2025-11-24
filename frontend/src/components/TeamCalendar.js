import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TeamCalendar.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const TeamCalendar = () => {
  const [calendarData, setCalendarData] = useState(null);
  const [optimizationData, setOptimizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    project_key: '',
    user_email: ''
  });
  const [editingCell, setEditingCell] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadProjects();
    loadUsers();
    loadCalendar();
    loadOptimization();
  }, [filters]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      setProjects(response.data.sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key, 'pl')));
    } catch (err) {
      console.error('Błąd podczas ładowania projektów:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data.sort((a, b) => (a.displayName || a.emailAddress || '').localeCompare(b.displayName || b.emailAddress || '', 'pl')));
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
    }
  };

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: filters.start_date,
        end_date: filters.end_date
      };
      if (filters.project_key) params.project_key = filters.project_key;
      if (filters.user_email) params.user_email = filters.user_email;

      const response = await axios.get(`${API_BASE_URL}/team/calendar`, { params });
      setCalendarData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania kalendarza:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOptimization = async () => {
    try {
      const params = {
        start_date: filters.start_date,
        end_date: filters.end_date
      };
      const response = await axios.get(`${API_BASE_URL}/optimization/suggestions`, { params });
      setOptimizationData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania optymalizacji:', err);
    }
  };

  const handleCellEdit = async (userEmail, date, projectKey, newFte) => {
    try {
      const project = projects.find(p => p.key === projectKey);
      const user = users.find(u => u.emailAddress === userEmail || u.displayName === userEmail);
      
      if (!project || !user) {
        alert('Nie znaleziono projektu lub użytkownika');
        return;
      }

      // Sprawdź czy przypisanie istnieje
      const existing = calendarData.calendar
        .find(u => u.user_email === userEmail)
        ?.days[date]?.projects
        .find(p => p.project_key === projectKey);

      if (existing) {
        // Aktualizuj istniejące
        await axios.put(`${API_BASE_URL}/fte/${existing.assignment_id}`, {
          fte_value: parseFloat(newFte)
        });
      } else {
        // Utwórz nowe
        await axios.post(`${API_BASE_URL}/fte`, {
          user_email: userEmail,
          user_display_name: user.displayName || userEmail,
          project_key: projectKey,
          project_name: project.name || projectKey,
          assignment_date: date,
          fte_value: parseFloat(newFte)
        });
      }

      setEditingCell(null);
      loadCalendar();
    } catch (err) {
      console.error('Błąd podczas edycji:', err);
      alert('Błąd podczas zapisywania: ' + (err.response?.data?.error || err.message));
    }
  };

  const generateDateRange = () => {
    const dates = [];
    const start = new Date(filters.start_date);
    const end = new Date(filters.end_date);
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getCellColor = (totalFte, overloaded, underutilized) => {
    if (overloaded) return '#ffebee'; // Czerwony - przeciążenie
    if (underutilized) return '#fff3e0'; // Pomarańczowy - niedobór
    if (totalFte === 0) return '#f5f5f5'; // Szary - brak
    return '#e8f5e9'; // Zielony - OK
  };

  const dates = generateDateRange();

  return (
    <div className="team-calendar">
      <h2>Kalendarz Zespołu</h2>

      <div className="calendar-filters">
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
        </div>
      </div>

      {optimizationData && (
        <div className="optimization-alerts">
          {optimizationData.summary.total_overloaded_days > 0 && (
            <div className="alert alert-danger">
              ⚠️ Wykryto {optimizationData.summary.total_overloaded_days} dni z przeciążeniem zasobów
            </div>
          )}
          {optimizationData.summary.total_underutilized_days > 0 && (
            <div className="alert alert-warning">
              ℹ️ Wykryto {optimizationData.summary.total_underutilized_days} dni z niedoborem wykorzystania
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading">Ładowanie kalendarza...</div>
      ) : calendarData && calendarData.calendar ? (
        <div className="calendar-container">
          <div className="calendar-table-wrapper">
            <table className="calendar-table">
              <thead>
                <tr>
                  <th className="sticky-col">Użytkownik</th>
                  {dates.map((date, idx) => (
                    <th key={idx} className={date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}>
                      {date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarData.calendar.map((userData, userIdx) => (
                  <tr key={userIdx}>
                    <td className="sticky-col user-name">
                      {userData.user_display_name}
                    </td>
                    {dates.map((date, dateIdx) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const dayData = userData.days[dateStr];
                      const isEditing = editingCell === `${userData.user_email}_${dateStr}`;

                      if (isEditing) {
                        return (
                          <td key={dateIdx} className="editing-cell">
                            <input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              defaultValue={dayData?.total_fte || 0}
                              onBlur={(e) => {
                                const projectKey = dayData?.projects[0]?.project_key || filters.project_key || projects[0]?.key;
                                if (projectKey) {
                                  handleCellEdit(userData.user_email, dateStr, projectKey, e.target.value);
                                }
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.target.blur();
                                }
                              }}
                              autoFocus
                            />
                          </td>
                        );
                      }

                      const bgColor = dayData 
                        ? getCellColor(dayData.total_fte, dayData.overloaded, dayData.underutilized)
                        : '#f5f5f5';

                      return (
                        <td
                          key={dateIdx}
                          className={`calendar-cell ${dayData?.overloaded ? 'overloaded' : ''} ${dayData?.underutilized ? 'underutilized' : ''} ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`}
                          style={{ backgroundColor: bgColor }}
                          onClick={() => setEditingCell(`${userData.user_email}_${dateStr}`)}
                          title={dayData ? `${dayData.projects.map(p => `${p.project_name}: ${p.fte}`).join(', ')} (Total: ${dayData.total_fte})` : 'Brak przypisań'}
                        >
                          {dayData ? (
                            <div className="cell-content">
                              <div className="cell-fte">{dayData.total_fte.toFixed(1)}</div>
                              {dayData.overloaded && <span className="overload-indicator">⚠️</span>}
                              {dayData.underutilized && <span className="underutilized-indicator">ℹ️</span>}
                              {dayData.projects.length > 1 && (
                                <div className="project-count">{dayData.projects.length} proj.</div>
                              )}
                            </div>
                          ) : (
                            <div className="cell-content empty">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#e8f5e9' }}></div>
              <span>Optymalne (0.8-1.0 FTE)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fff3e0' }}></div>
              <span>Niedobór (&lt;0.8 FTE)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#ffebee' }}></div>
              <span>Przeciążenie (&gt;1.0 FTE)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f5f5f5' }}></div>
              <span>Brak przypisania</span>
            </div>
            <div className="legend-note">
              💡 Kliknij na komórkę, aby edytować FTE
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">Brak danych do wyświetlenia</div>
      )}
    </div>
  );
};

export default TeamCalendar;

