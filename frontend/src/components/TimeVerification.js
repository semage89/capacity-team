import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { pl } from 'date-fns/locale/pl';
import { Search as SearchIcon } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const TimeVerification = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    project_key: '',
    user_email: '',
    capacity_status: '',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end_date: new Date()
  });

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      const sorted = response.data.sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key, 'pl'));
      setProjects(sorted);
    } catch (err) {
      console.error('Błąd podczas ładowania projektów:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      // Filtruj tylko aktywnych użytkowników
      const activeUsers = response.data.filter(u => u.active !== false);
      setUsers(activeUsers);
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
    }
  };

  const loadVerification = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: filters.start_date.toISOString().split('T')[0],
        end_date: filters.end_date.toISOString().split('T')[0]
      };
      if (filters.project_key) params.project_key = filters.project_key;
      if (filters.user_email) params.user_email = filters.user_email;

      const response = await axios.get(`${API_BASE_URL}/verification/time`, { params });
      setVerificationData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania weryfikacji:', err);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (userData) => {
    if (!userData || !userData.daily_details) return [];
    
    return userData.daily_details.map(day => ({
      date: new Date(day.date).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' }),
      'Czas spędzony (h)': day.hours_spent,
      'Capacity (h)': day.capacity_hours,
      'Wykorzystanie (%)': day.utilization_percent
    }));
  };

  let filteredResults = verificationData?.results || [];
  
  if (filters.capacity_status) {
    filteredResults = filteredResults.filter(userData => {
      if (filters.capacity_status === 'overloaded') {
        return userData.utilization_percent > 100;
      } else if (filters.capacity_status === 'optimal') {
        return userData.utilization_percent >= 80 && userData.utilization_percent <= 100;
      } else if (filters.capacity_status === 'underutilized') {
        return userData.utilization_percent < 80 && userData.utilization_percent > 0;
      }
      return true;
    });
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          Weryfikacja Czasu vs Capacity
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Projekt</InputLabel>
                  <Select
                    value={filters.project_key}
                    onChange={(e) => setFilters({...filters, project_key: e.target.value})}
                    label="Projekt"
                  >
                    <MenuItem value="">Wszystkie projekty</MenuItem>
                    {projects.map(p => (
                      <MenuItem key={p.key} value={p.key}>
                        {p.name} ({p.key})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Użytkownik</InputLabel>
                  <Select
                    value={filters.user_email}
                    onChange={(e) => setFilters({...filters, user_email: e.target.value})}
                    label="Użytkownik"
                  >
                    <MenuItem value="">Wszyscy użytkownicy</MenuItem>
                    {users.map(u => (
                      <MenuItem key={u.accountId || u.emailAddress} value={u.emailAddress || u.displayName}>
                        {u.displayName} {u.emailAddress ? `(${u.emailAddress})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status Capacity</InputLabel>
                  <Select
                    value={filters.capacity_status}
                    onChange={(e) => setFilters({...filters, capacity_status: e.target.value})}
                    label="Status Capacity"
                  >
                    <MenuItem value="">Wszystkie</MenuItem>
                    <MenuItem value="overloaded">Przeciążenie (&gt;100%)</MenuItem>
                    <MenuItem value="optimal">Optymalne (80-100%)</MenuItem>
                    <MenuItem value="underutilized">Niedobór (&lt;80%)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <DatePicker
                  label="Od"
                  value={filters.start_date}
                  onChange={(newValue) => setFilters({...filters, start_date: newValue})}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <DatePicker
                  label="Do"
                  value={filters.end_date}
                  onChange={(newValue) => setFilters({...filters, end_date: newValue})}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={12}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={loadVerification}
                  size="large"
                  fullWidth
                >
                  Sprawdź
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {verificationData && filteredResults.length === 0 && !loading && (
          <Alert severity="info">Brak danych do wyświetlenia dla wybranych filtrów</Alert>
        )}

        {verificationData && filteredResults.length > 0 && (
          <Box>
            {filteredResults.map((userData, index) => {
              const chartData = prepareChartData(userData);
              const utilizationColor = userData.utilization_percent > 100 ? 'error' : 
                                     userData.utilization_percent > 80 ? 'warning' : 'success';

              return (
                <Card key={index} sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5" component="h3">
                        {userData.user_display_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Chip 
                          label={`Czas: ${userData.total_time_spent_hours}h`} 
                          color="primary" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`Capacity: ${userData.total_capacity_hours}h`} 
                          color="info" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`${userData.utilization_percent.toFixed(1)}%`}
                          color={utilizationColor}
                          sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                        />
                      </Box>
                    </Box>

                    {chartData.length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Wykres dzienny
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Czas spędzony (h)" fill="#0052cc" />
                            <Bar dataKey="Capacity (h)" fill="#28a745" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}

                    <Typography variant="h6" gutterBottom>
                      Szczegóły dzienne
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Data</strong></TableCell>
                            <TableCell align="right"><strong>Czas spędzony (h)</strong></TableCell>
                            <TableCell align="right"><strong>FTE</strong></TableCell>
                            <TableCell align="right"><strong>Capacity (h)</strong></TableCell>
                            <TableCell align="right"><strong>Wykorzystanie (%)</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userData.daily_details.map((day, dayIndex) => {
                            const dayUtilizationColor = day.utilization_percent > 100 ? 'error' : 
                                                       day.utilization_percent > 80 ? 'warning' : 'success';
                            return (
                              <TableRow key={dayIndex} hover>
                                <TableCell>{new Date(day.date).toLocaleDateString('pl-PL')}</TableCell>
                                <TableCell align="right">{day.hours_spent.toFixed(2)}</TableCell>
                                <TableCell align="right">{day.fte}</TableCell>
                                <TableCell align="right">{day.capacity_hours.toFixed(2)}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={`${day.utilization_percent.toFixed(1)}%`}
                                    color={dayUtilizationColor}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default TimeVerification;
