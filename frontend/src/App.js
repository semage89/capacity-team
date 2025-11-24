import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import FTEManagement from './components/FTEManagement';
import TimeVerification from './components/TimeVerification';
import CapacityDashboard from './components/CapacityDashboard';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

function App() {
  const [activeTab, setActiveTab] = useState('fte');

  return (
    <div className="App">
      <Header />
      <div className="container">
        <div className="tabs">
          <button 
            className={activeTab === 'fte' ? 'active' : ''}
            onClick={() => setActiveTab('fte')}
          >
            📊 Zarządzanie FTE
          </button>
          <button 
            className={activeTab === 'verification' ? 'active' : ''}
            onClick={() => setActiveTab('verification')}
          >
            ✅ Weryfikacja Czasu
          </button>
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            📈 Dashboard
          </button>
        </div>

        <div className="content">
          {activeTab === 'fte' && <FTEManagement />}
          {activeTab === 'verification' && <TimeVerification />}
          {activeTab === 'dashboard' && <CapacityDashboard />}
        </div>
      </div>
    </div>
  );
}

export default App;

