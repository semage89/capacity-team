import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const SettingsPanel = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [timezone, setTimezone] = useState('Europe/Warsaw');
  const [workHours, setWorkHours] = useState(8.0);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Błąd podczas ładowania użytkowników:', error);
    }
  };

  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setTimezone(user.timezone || 'Europe/Warsaw');
      setWorkHours(user.work_hours_per_day || 8.0);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    try {
      await axios.put(`${API_BASE_URL}/users/${selectedUser.id}`, {
        timezone,
        work_hours_per_day: workHours
      });
      alert('Ustawienia zapisane!');
      loadUsers();
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
      alert('Błąd podczas zapisywania ustawień');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Ustawienia
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Użytkownik</InputLabel>
            <Select
              value={selectedUser?.id || ''}
              onChange={(e) => handleUserSelect(e.target.value)}
              label="Użytkownik"
            >
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>{user.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {selectedUser && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Strefa czasowa"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                select
                SelectProps={{ native: true }}
              >
                <option value="Europe/Warsaw">Europe/Warsaw (CET)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Godziny pracy dziennie"
                type="number"
                value={workHours}
                onChange={(e) => setWorkHours(parseFloat(e.target.value))}
                inputProps={{ min: 0, max: 24, step: 0.5 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSave}>
                Zapisz ustawienia
              </Button>
            </Grid>
          </>
        )}
      </Grid>
    </Paper>
  );
};

export default SettingsPanel;

