import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FTEManagement.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const FTEManagement = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEndDate, setSelectedEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [fteValue, setFteValue] = useState(1.0);
  const [assignmentMode, setAssignmentMode] = useState('single'); // 'single' or 'range'
  const [projectSearch, setProjectSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadProjects();
    loadUsers();
    loadAssignments();
  }, [dateRange]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      const sorted = response.data.sort((a, b) => 
        (a.name || a.key).localeCompare(b.name || b.key, 'pl')
      );
      setProjects(sorted);
      setFilteredProjects(sorted);
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
      setFilteredUsers(sorted);
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
    }
  };

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

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end
      };
      if (selectedProject) params.project_key = selectedProject;
      if (selectedUser) params.user_email = selectedUser;

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
            <input
              type="text"
              placeholder="Wyszukaj projekt..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="search-input"
            />
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">Wybierz projekt</option>
              {filteredProjects.map(p => (
                <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Użytkownik:</label>
            <input
              type="text"
              placeholder="Wyszukaj użytkownika..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="search-input"
            />
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">Wybierz użytkownika</option>
              {filteredUsers.map(u => (
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
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Od:</label>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Do:</label>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
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
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Użytkownik</th>
                <th>Projekt</th>
                <th>FTE</th>
                <th>Capacity (h)</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">Brak przypisań FTE w wybranym okresie</td>
                </tr>
              ) : (
                assignments.map(assignment => (
                  <tr key={assignment.id}>
                    <td>{new Date(assignment.assignment_date).toLocaleDateString('pl-PL')}</td>
                    <td>{assignment.user_display_name}</td>
                    <td>{assignment.project_name} ({assignment.project_key})</td>
                    <td>{assignment.fte_value}</td>
                    <td>{(assignment.fte_value * 8).toFixed(1)}h</td>
                    <td>
                      <button 
                        className="btn-danger"
                        onClick={() => handleDelete(assignment.id)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FTEManagement;

