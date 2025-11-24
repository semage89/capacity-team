import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { pl } from 'date-fns/locale';
import { TrendingUp, People, Work } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const COLORS = ['#0052cc', '#2684ff', '#4c9aff', '#6bb5ff', '#8cc8ff', '#b3d9ff'];

const CapacityDashboard = () => {
  const [capacityData, setCapacityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  useEffect(() => {
    loadCapacity();
  }, [dateRange]);

  const loadCapacity = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/capacity`, {
        params: {
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0]
        }
      });
      setCapacityData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania capacity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !capacityData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  const { projects } = capacityData;
  const barChartData = projects
    .sort((a, b) => b.hours_spent - a.hours_spent)
    .slice(0, 10)
    .map(project => ({
      name: project.key,
      'Godziny': project.hours_spent,
      'Użytkownicy': project.user_count
    }));

  const pieChartData = projects
    .sort((a, b) => b.hours_spent - a.hours_spent)
    .slice(0, 6)
    .map(project => ({
      name: project.key,
      value: project.hours_spent
    }));

  const totalHours = projects.reduce((sum, p) => sum + p.hours_spent, 0);
  const totalUsers = new Set(projects.flatMap(p => p.users || [])).size;
  const totalProjects = projects.length;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Dashboard Capacity
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Od"
              value={dateRange.start}
              onChange={(newValue) => setDateRange({...dateRange, start: newValue})}
              slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
            />
            <DatePicker
              label="Do"
              value={dateRange.end}
              onChange={(newValue) => setDateRange({...dateRange, end: newValue})}
              slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
            />
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Work sx={{ fontSize: 40, color: 'primary.main' }} />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Łączne godziny
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {totalHours.toFixed(1)}h
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <People sx={{ fontSize: 40, color: 'secondary.main' }} />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Użytkownicy
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {totalUsers}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Projekty
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {totalProjects}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top 10 projektów - Godziny
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Godziny" fill="#0052cc" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rozkład godzin (Top 6)
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Wszystkie projekty
                </Typography>
                <Grid container spacing={2}>
                  {projects
                    .sort((a, b) => b.hours_spent - a.hours_spent)
                    .map((project, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {project.name || project.key}
                            </Typography>
                            <Chip label={project.key} size="small" color="primary" variant="outlined" />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {project.hours_spent.toFixed(1)}h
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {project.user_count} użytkowników
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default CapacityDashboard;
