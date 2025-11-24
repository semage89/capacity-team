import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TeamCalendar.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const TeamCalendar = () => {
  const [assignments, setAssignments] = useState([]);
  const [optimizationData, setOptimizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    assignment_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    view_mode: 'single' // 'single' or 'range'
  });
  const [editingCell, setEditingCell] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    loadProjects();
    loadUsers();
    loadAssignments();
    loadOptimization();
  }, [filters.assignment_date, filters.start_date, filters.end_date, filters.view_mode]);

  useEffect(() => {
    if (projectSearch) {
      const filtered = projects.filter(p => 
        (p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.key || '').toLowerCase().includes(projectSearch.toLowerCase())
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [projectSearch, projects]);

  useEffect(() => {
    if (userSearch) {
      const filtered = users.filter(u => 
        (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.emailAddress || '').toLowerCase().includes(userSearch.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [userSearch, users]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      const sorted = response.data.sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key, 'pl'));
      setProjects(sorted);
      setFilteredProjects(sorted);
    } catch (err) {
      console.error('Błąd podczas ładowania projektów:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      const sorted = response.data.sort((a, b) => (a.displayName || a.emailAddress || '').localeCompare(b.displayName || b.emailAddress || '', 'pl'));
      setUsers(sorted);
      setFilteredUsers(sorted);
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.view_mode === 'single') {
        params.assignment_date = filters.assignment_date;
      } else {
        params.start_date = filters.start_date;
        params.end_date = filters.end_date;
      }

      const response = await axios.get(`${API_BASE_URL}/fte`, { params });
      setAssignments(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania przypisań:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOptimization = async () => {
    try {
      const params = {
        start_date: filters.view_mode === 'single' ? filters.assignment_date : filters.start_date,
        end_date: filters.view_mode === 'single' ? filters.assignment_date : filters.end_date
      };
      const response = await axios.get(`${API_BASE_URL}/optimization/suggestions`, { params });
      setOptimizationData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania optymalizacji:', err);
    }
  };

  const getAssignmentForUserProject = (userEmail, projectKey, date) => {
    return assignments.find(a => 
      a.user_email === userEmail && 
      a.project_key === projectKey && 
      a.assignment_date === date
    );
  };

  const getUserTotalFte = (userEmail, date) => {
    const userAssignments = assignments.filter(a => 
      a.user_email === userEmail && 
      a.assignment_date === date
    );
    return userAssignments.reduce((sum, a) => sum + a.fte_value, 0);
  };

  const handleCellEdit = async (userEmail, projectKey, date, newFte) => {
    try {
      const project = projects.find(p => p.key === projectKey);
      const user = users.find(u => u.emailAddress === userEmail || u.displayName === userEmail);
      
      if (!project || !user) {
        alert('Nie znaleziono projektu lub użytkownika');
        return;
      }

      const existing = getAssignmentForUserProject(userEmail, projectKey, date);

      if (parseFloat(newFte) === 0) {
        // Usuń przypisanie jeśli FTE = 0
        if (existing) {
          await axios.delete(`${API_BASE_URL}/fte/${existing.id}`);
        }
      } else if (existing) {
        // Aktualizuj istniejące
        await axios.put(`${API_BASE_URL}/fte/${existing.id}`, {
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
      loadAssignments();
      loadOptimization();
    } catch (err) {
      console.error('Błąd podczas edycji:', err);
      alert('Błąd podczas zapisywania: ' + (err.response?.data?.error || err.message));
    }
  };

  const getCellColor = (fte, totalFte) => {
    if (fte === 0) return '#f5f5f5'; // Szary - brak
    if (totalFte > 1.0) return '#ffebee'; // Czerwony - przeciążenie
    if (totalFte < 0.8 && totalFte > 0) return '#fff3e0'; // Pomarańczowy - niedobór
    return '#e8f5e9'; // Zielony - OK
  };

  const currentDate = filters.view_mode === 'single' 
    ? filters.assignment_date 
    : filters.start_date;

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

