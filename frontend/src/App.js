import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Tabs, Tab, Paper } from '@mui/material';
import Header from './components/Header';
import FTEManagement from './components/FTEManagement';
import TimeVerification from './components/TimeVerification';
import CapacityDashboard from './components/CapacityDashboard';
import TeamCalendar from './components/TeamCalendar';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

// Material-UI Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#0052cc',
      light: '#2684ff',
      dark: '#0065ff',
    },
    secondary: {
      main: '#6554c0',
    },
    background: {
      default: '#f4f5f7',
      paper: '#ffffff',
    },
    error: {
      main: '#de350b',
    },
    warning: {
      main: '#ffab00',
    },
    success: {
      main: '#00875a',
    },
    info: {
      main: '#00b8d9',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        },
      },
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Header />
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Paper elevation={0} sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                },
              }}
            >
              <Tab icon="📅" label="Kalendarz Zespołu" iconPosition="start" />
              <Tab icon="📊" label="Zarządzanie FTE" iconPosition="start" />
              <Tab icon="✅" label="Weryfikacja Czasu" iconPosition="start" />
              <Tab icon="📈" label="Dashboard" iconPosition="start" />
            </Tabs>
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {activeTab === 0 && <TeamCalendar />}
            {activeTab === 1 && <FTEManagement />}
            {activeTab === 2 && <TimeVerification />}
            {activeTab === 3 && <CapacityDashboard />}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
