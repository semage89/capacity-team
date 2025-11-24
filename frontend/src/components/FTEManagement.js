import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FTEManagement.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const FTEManagement = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [filterUser, setFilterUser] = useState(''); // Osobny stan dla filtra w tabeli
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [fteValue, setFteValue] = useState(1.0);
  const [assignmentMode, setAssignmentMode] = useState('single'); // 'single' or 'range'
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [dateRange, filterUser]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      const sorted = response.data.sort((a, b) => 
        (a.name || a.key).localeCompare(b.name || b.key, 'pl')
      );
      setProjects(sorted);
    } catch (err) {
      console.error('Błąd podczas ładowania projektów:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      const sorted = response.data.sort((a, b) => 
        (a.displayName || a.emailAddress || '').localeCompare(b.displayName || b.emailAddress || '', 'pl')
      );
      setUsers(sorted);
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end
      };
      if (selectedProject) params.project_key = selectedProject;
      if (filterUser) params.user_email = filterUser;

      const response = await axios.get(`${API_BASE_URL}/fte`, { params });
      setAssignments(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania przypisań FTE:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProject || !selectedUser) {
      alert('Proszę wybrać projekt i użytkownika');
      return;
    }

    if (assignmentMode === 'single' && !selectedDate) {
      alert('Proszę wybrać datę');
      return;
    }

    if (assignmentMode === 'range' && (!selectedStartDate || !selectedEndDate)) {
      alert('Proszę wybrać zakres dat');
      return;
    }

    // Sprawdź weekendy
    if (assignmentMode === 'single') {
      const date = new Date(selectedDate);
      if (date.getDay() === 0 || date.getDay() === 6) {
        alert('Nie można przypisywać FTE na weekendy (sobota i niedziela)');
        return;
      }
    } else {
      const start = new Date(selectedStartDate);
      const end = new Date(selectedEndDate);
      if (start.getDay() === 0 || start.getDay() === 6 || end.getDay() === 0 || end.getDay() === 6) {
        alert('Nie można przypisywać FTE na weekendy (sobota i niedziela)');
        return;
      }
    }

    const project = projects.find(p => p.key === selectedProject);
    const user = users.find(u => u.emailAddress === selectedUser || u.displayName === selectedUser);

    try {
      if (assignmentMode === 'single') {
        await axios.post(`${API_BASE_URL}/fte`, {
          user_email: selectedUser,
          user_display_name: user?.displayName || selectedUser,
          project_key: selectedProject,
          project_name: project?.name || selectedProject,
          assignment_date: selectedDate,
          fte_value: parseFloat(fteValue)
        });
        alert('Przypisanie FTE zostało zapisane');
      } else {
        const response = await axios.post(`${API_BASE_URL}/fte/range`, {
          user_email: selectedUser,
          user_display_name: user?.displayName || selectedUser,
          project_key: selectedProject,
          project_name: project?.name || selectedProject,
          start_date: selectedStartDate,
          end_date: selectedEndDate,
          fte_value: parseFloat(fteValue)
        });
        alert(`Utworzono ${response.data.created} przypisań, zaktualizowano ${response.data.updated}`);
      }

      loadAssignments();
      setFteValue(1.0);
    } catch (err) {
      console.error('Błąd podczas zapisywania:', err);
      alert('Błąd podczas zapisywania przypisania FTE: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to przypisanie?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/fte/${id}`);
      loadAssignments();
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
      alert('Błąd podczas usuwania przypisania');
    }
  };

  return (
    <div className="fte-management">
      <h2>Zarządzanie FTE</h2>

      <div className="fte-form">
        <h3>Nowe przypisanie FTE</h3>
        
        <div className="mode-selector">
          <label>
            <input
              type="radio"
              value="single"
              checked={assignmentMode === 'single'}
              onChange={(e) => setAssignmentMode(e.target.value)}
            />
            Pojedynczy dzień
          </label>
          <label>
            <input
              type="radio"
              value="range"
              checked={assignmentMode === 'range'}
              onChange={(e) => setAssignmentMode(e.target.value)}
            />
            Okres czasu
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Projekt:</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">Wybierz projekt</option>
              {projects.map(p => (
                <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Użytkownik:</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">Wybierz użytkownika</option>
              {users.map(u => (
                <option key={u.accountId || u.emailAddress} value={u.emailAddress || u.displayName}>
                  {u.displayName} {u.emailAddress ? `(${u.emailAddress})` : ''}
                </option>
              ))}
            </select>
          </div>

          {assignmentMode === 'single' ? (
            <div className="form-group">
              <label>Data:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  const day = date.getDay();
                  if (day === 0 || day === 6) {
                    alert('Nie można przypisywać FTE na weekendy (sobota i niedziela)');
                    return;
                  }
                  setSelectedDate(e.target.value);
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Od:</label>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    const day = date.getDay();
                    if (day === 0 || day === 6) {
                      alert('Nie można przypisywać FTE na weekendy (sobota i niedziela)');
                      return;
                    }
                    setSelectedStartDate(e.target.value);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label>Do:</label>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    const day = date.getDay();
                    if (day === 0 || day === 6) {
                      alert('Nie można przypisywać FTE na weekendy (sobota i niedziela)');
                      return;
                    }
                    setSelectedEndDate(e.target.value);
                  }}
                  min={selectedStartDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>FTE (0.0 - 1.0):</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={fteValue}
              onChange={(e) => setFteValue(e.target.value)}
            />
          </div>

          <button className="btn-primary" onClick={handleSave}>
            Zapisz
          </button>
        </div>
      </div>

      <div className="fte-filters">
        <h3>Filtry</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Użytkownik:</label>
            <select 
              value={filterUser} 
              onChange={(e) => {
                setFilterUser(e.target.value);
              }}
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
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Do:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
          <button onClick={loadAssignments}>Odśwież</button>
        </div>
      </div>

      <div className="fte-list">
        <h3>Przypisania FTE</h3>
        {loading ? (
          <div className="loading">Ładowanie...</div>
        ) : (
          (() => {
            // Grupuj przypisania po użytkowniku i projekcie
            const grouped = {};
            assignments.forEach(assignment => {
              const key = `${assignment.user_email}_${assignment.project_key}`;
              if (!grouped[key]) {
                grouped[key] = {
                  user_email: assignment.user_email,
                  user_display_name: assignment.user_display_name,
                  project_key: assignment.project_key,
                  project_name: assignment.project_name,
                  dates: [],
                  assignments: []
                };
              }
              grouped[key].dates.push(assignment.assignment_date);
              grouped[key].assignments.push(assignment);
            });

            // Sortuj daty i znajdź zakresy
            Object.keys(grouped).forEach(key => {
              const group = grouped[key];
              group.dates.sort();
              
              // Znajdź ciągłe zakresy dat
              const ranges = [];
              let currentRange = { start: group.dates[0], end: group.dates[0], fte: group.assignments[0].fte_value };
              
              for (let i = 1; i < group.dates.length; i++) {
                const prevDate = new Date(group.dates[i - 1]);
                const currDate = new Date(group.dates[i]);
                const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
                const currAssignment = group.assignments.find(a => a.assignment_date === group.dates[i]);
                
                if (daysDiff === 1 && currAssignment.fte_value === currentRange.fte) {
                  // Ciągły zakres z tym samym FTE
                  currentRange.end = group.dates[i];
                } else {
                  // Nowy zakres
                  ranges.push(currentRange);
                  currentRange = { 
                    start: group.dates[i], 
                    end: group.dates[i], 
                    fte: currAssignment.fte_value 
                  };
                }
              }
              ranges.push(currentRange);
              
              group.ranges = ranges;
            });

            const groupedArray = Object.values(grouped).sort((a, b) => {
              const nameCompare = a.user_display_name.localeCompare(b.user_display_name, 'pl');
              if (nameCompare !== 0) return nameCompare;
              return a.project_name.localeCompare(b.project_name, 'pl');
            });

            return (
              <table>
                <thead>
                  <tr>
                    <th>Użytkownik</th>
                    <th>Projekt</th>
                    <th>Okres</th>
                    <th>FTE</th>
                    <th>Capacity (h/dzień)</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedArray.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">Brak przypisań FTE w wybranym okresie</td>
                    </tr>
                  ) : (
                    groupedArray.map((group, groupIdx) => (
                      <React.Fragment key={groupIdx}>
                        {group.ranges.map((range, rangeIdx) => {
                          const startDate = new Date(range.start);
                          const endDate = new Date(range.end);
                          const daysCount = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                          const assignment = group.assignments.find(a => a.assignment_date === range.start);
                          
                          return (
                            <tr key={`${groupIdx}-${rangeIdx}`}>
                              {rangeIdx === 0 && (
                                <td rowSpan={group.ranges.length} className="user-cell">
                                  {group.user_display_name}
                                </td>
                              )}
                              {rangeIdx === 0 && (
                                <td rowSpan={group.ranges.length} className="project-cell">
                                  {group.project_name} ({group.project_key})
                                </td>
                              )}
                              <td>
                                {startDate.toLocaleDateString('pl-PL')} - {endDate.toLocaleDateString('pl-PL')}
                                {daysCount > 1 && <span className="days-count"> ({daysCount} dni)</span>}
                              </td>
                              <td>{range.fte}</td>
                              <td>{(range.fte * 8).toFixed(1)}h</td>
                              <td>
                                <button 
                                  className="btn-danger"
                                  onClick={() => {
                                    if (window.confirm('Czy na pewno chcesz usunąć wszystkie przypisania w tym zakresie?')) {
                                      group.assignments
                                        .filter(a => {
                                          const aDate = new Date(a.assignment_date);
                                          return aDate >= startDate && aDate <= endDate;
                                        })
                                        .forEach(a => handleDelete(a.id));
                                    }
                                  }}
                                >
                                  Usuń
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default FTEManagement;

