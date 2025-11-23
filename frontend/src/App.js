import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import CapacityDashboard from './components/CapacityDashboard';
import ProjectTimeView from './components/ProjectTimeView';
import Header from './components/Header';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [capacityData, setCapacityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    checkHealth();
    loadProjects();
    loadCapacity();
  }, [dateRange]);

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      console.log('API Status:', response.data);
    } catch (err) {
      console.error('Błąd połączenia z API:', err);
      setError('Nie można połączyć się z backendem. Upewnij się, że serwer jest uruchomiony.');
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/projects`);
      setProjects(response.data);
      setError(null);
    } catch (err) {
      console.error('Błąd podczas ładowania projektów:', err);
      setError('Nie można załadować projektów. Sprawdź konfigurację Jira.');
    } finally {
      setLoading(false);
    }
  };

  const loadCapacity = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/capacity`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end
        }
      });
      setCapacityData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania capacity:', err);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };

  const handleDateRangeChange = (start, end) => {
    setDateRange({ start, end });
  };

  return (
    <div className="App">
      <Header />
      <div className="container">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        <div className="main-content">
          <div className="sidebar">
            <h2>Projekty</h2>
            {loading ? (
              <div className="loading">Ładowanie projektów...</div>
            ) : (
              <div className="project-list">
                {projects.map((project) => (
                  <div
                    key={project.key}
                    className={`project-item ${selectedProject?.key === project.key ? 'active' : ''}`}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="project-key">{project.key}</div>
                    <div className="project-name">{project.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="content-area">
            {selectedProject ? (
              <ProjectTimeView
                project={selectedProject}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
              />
            ) : (
              <CapacityDashboard
                capacityData={capacityData}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

