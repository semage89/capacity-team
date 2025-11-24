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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [fteValue, setFteValue] = useState(1.0);
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
    if (!selectedProject || !selectedUser || !selectedDate) {
      alert('Proszę wypełnić wszystkie pola');
      return;
    }

    const project = projects.find(p => p.key === selectedProject);
    const user = users.find(u => u.emailAddress === selectedUser || u.displayName === selectedUser);

    try {
      await axios.post(`${API_BASE_URL}/fte`, {
        user_email: selectedUser,
        user_display_name: user?.displayName || selectedUser,
        project_key: selectedProject,
        project_name: project?.name || selectedProject,
        assignment_date: selectedDate,
        fte_value: parseFloat(fteValue)
      });

      alert('Przypisanie FTE zostało zapisane');
      loadAssignments();
      setFteValue(1.0);
    } catch (err) {
      console.error('Błąd podczas zapisywania:', err);
      alert('Błąd podczas zapisywania przypisania FTE');
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

          <div className="form-group">
            <label>Data:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

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

