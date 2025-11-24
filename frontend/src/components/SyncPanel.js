import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { Sync as SyncIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const SyncPanel = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSyncLogs();
  }, []);

  const loadSyncLogs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sync/logs`);
      setSyncLogs(response.data);
    } catch (error) {
      console.error('Błąd podczas ładowania logów:', error);
    }
  };

  const handleSync = async (type) => {
    setSyncing(true);
    setMessage(null);
    
    try {
      let endpoint = '';
      if (type === 'all') {
        endpoint = '/sync/all';
      } else if (type === 'projects') {
        endpoint = '/sync/projects';
      } else if (type === 'users') {
        endpoint = '/sync/users';
      }

      const response = await axios.post(`${API_BASE_URL}${endpoint}`);
      setMessage({
        type: 'success',
        text: `Synchronizacja zakończona: ${JSON.stringify(response.data)}`
      });
      loadSyncLogs();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Błąd synchronizacji: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Synchronizacja danych
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
            onClick={() => handleSync('all')}
            disabled={syncing}
          >
            Synchronizuj wszystko
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleSync('projects')}
            disabled={syncing}
          >
            Synchronizuj projekty
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleSync('users')}
            disabled={syncing}
          >
            Synchronizuj użytkowników
          </Button>
        </Box>

        {message && (
          <Alert severity={message.type} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Historia synchronizacji
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Typ</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Przetworzone</TableCell>
                <TableCell>Utworzone</TableCell>
                <TableCell>Zaktualizowane</TableCell>
                <TableCell>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {syncLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.sync_type}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      color={log.status === 'success' ? 'success' : log.status === 'error' ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{log.records_processed}</TableCell>
                  <TableCell>{log.records_created}</TableCell>
                  <TableCell>{log.records_updated}</TableCell>
                  <TableCell>{new Date(log.started_at).toLocaleString('pl-PL')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SyncPanel;

