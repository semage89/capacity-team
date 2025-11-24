import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Tabs, Tab } from '@mui/material';
import TeamCalendar from './components/TeamCalendar';
import SyncPanel from './components/SyncPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import SettingsPanel from './components/SettingsPanel';

const theme = createTheme({
  palette: {
    primary: {
      main: '#366092',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  const [tab, setTab] = useState(0);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
            <Tab label="Kalendarz" />
            <Tab label="Synchronizacja" />
            <Tab label="Analityka" />
            <Tab label="Ustawienia" />
          </Tabs>
        </Box>

        {tab === 0 && <TeamCalendar />}
        {tab === 1 && <SyncPanel />}
        {tab === 2 && <AnalyticsPanel />}
        {tab === 3 && <SettingsPanel />}
      </Container>
    </ThemeProvider>
  );
}

export default App;
