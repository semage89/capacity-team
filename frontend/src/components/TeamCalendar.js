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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import pl from 'date-fns/locale/pl';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const TeamCalendar = () => {
  const [assignments, setAssignments] = useState([]);
  const [optimizationData, setOptimizationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    project_key: '',
    user_email: ''
  });
  const [editingCell, setEditingCell] = useState(null);
  const [editDialog, setEditDialog] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadProjects();
    loadUsers();
    loadAssignments();
    loadOptimization();
  }, [filters.start_date, filters.end_date]);

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
      const sorted = activeUsers.sort((a, b) => (a.displayName || a.emailAddress || '').localeCompare(b.displayName || b.emailAddress || '', 'pl'));
      setUsers(sorted);
    } catch (err) {
      console.error('Błąd podczas ładowania użytkowników:', err);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const params = {
        start_date: filters.start_date.toISOString().split('T')[0],
        end_date: filters.end_date.toISOString().split('T')[0]
      };
      if (filters.project_key) params.project_key = filters.project_key;
      if (filters.user_email) params.user_email = filters.user_email;

      const response = await axios.get(`${API_BASE_URL}/fte`, { params });
      setAssignments(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania przypisań:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOptimization = async () => {
    try {
      const params = {
        start_date: filters.start_date.toISOString().split('T')[0],
        end_date: filters.end_date.toISOString().split('T')[0]
      };
      const response = await axios.get(`${API_BASE_URL}/optimization/suggestions`, { params });
      setOptimizationData(response.data);
    } catch (err) {
      console.error('Błąd podczas ładowania optymalizacji:', err);
    }
  };

  const handleCellEdit = async (userEmail, projectKey, date, newFte) => {
    try {
      const project = projects.find(p => p.key === projectKey);
      const user = users.find(u => u.emailAddress === userEmail || u.displayName === userEmail);
      
      if (!project || !user) {
        alert('Nie znaleziono projektu lub użytkownika');
        return;
      }

      const existing = assignments.find(a => 
        a.user_email === userEmail && 
        a.project_key === projectKey && 
        a.assignment_date === date
      );

      if (parseFloat(newFte) === 0) {
        if (existing) {
          await axios.delete(`${API_BASE_URL}/fte/${existing.id}`);
        }
      } else if (existing) {
        await axios.put(`${API_BASE_URL}/fte/${existing.id}`, {
          fte_value: parseFloat(newFte)
        });
      } else {
        await axios.post(`${API_BASE_URL}/fte`, {
          user_email: userEmail,
          user_display_name: user.displayName || userEmail,
          project_key: projectKey,
          project_name: project.name || projectKey,
          assignment_date: date,
          fte_value: parseFloat(newFte)
        });
      }

      setEditDialog(null);
      loadAssignments();
      loadOptimization();
    } catch (err) {
      console.error('Błąd podczas edycji:', err);
      alert('Błąd podczas zapisywania: ' + (err.response?.data?.error || err.message));
    }
  };

  const isWeekend = (date) => {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
  };

  const generateDateRange = () => {
    const dates = [];
    const start = new Date(filters.start_date);
    const end = new Date(filters.end_date);
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const getCellColor = (totalFte) => {
    if (totalFte === 0) return '#f5f5f5';
    if (totalFte > 1.0) return '#ffebee';
    if (totalFte < 0.8 && totalFte > 0) return '#fff3e0';
    return '#e8f5e9';
  };

  const dates = generateDateRange();
  
  // Grupuj użytkowników i ich przypisania
  const userAssignmentsMap = {};
  assignments.forEach(assignment => {
    if (!userAssignmentsMap[assignment.user_email]) {
      userAssignmentsMap[assignment.user_email] = {
        user_email: assignment.user_email,
        user_display_name: assignment.user_display_name,
        dates: {}
      };
    }
    const dateStr = assignment.assignment_date;
    if (!userAssignmentsMap[assignment.user_email].dates[dateStr]) {
      userAssignmentsMap[assignment.user_email].dates[dateStr] = [];
    }
    userAssignmentsMap[assignment.user_email].dates[dateStr].push(assignment);
  });

  const allUsers = users
    .filter(u => !filters.user_email || (u.emailAddress || u.displayName) === filters.user_email)
    .map(u => ({
      email: u.emailAddress || u.displayName,
      displayName: u.displayName || u.emailAddress
    }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          Kalendarz Zespołu
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Projekt</InputLabel>
                  <Select
                    value={filters.project_key || ''}
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
                    value={filters.user_email || ''}
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

              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Od"
                  value={filters.start_date}
                  onChange={(newValue) => setFilters({...filters, start_date: newValue})}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Do"
                  value={filters.end_date}
                  onChange={(newValue) => setFilters({...filters, end_date: newValue})}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {optimizationData && (
          <Box sx={{ mb: 2 }}>
            {optimizationData.summary.total_overloaded_days > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                ⚠️ Wykryto {optimizationData.summary.total_overloaded_days} dni z przeciążeniem zasobów
              </Alert>
            )}
            {optimizationData.summary.total_underutilized_days > 0 && (
              <Alert severity="warning">
                ℹ️ Wykryto {optimizationData.summary.total_underutilized_days} dni z niedoborem wykorzystania
              </Alert>
            )}
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ overflow: 'auto' }}>
            <TableContainer>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 10, bgcolor: 'background.paper', minWidth: 150 }}>
                      <strong>Użytkownik</strong>
                    </TableCell>
                    {dates.map((date, idx) => {
                      const isWeekendDay = isWeekend(date);
                      return (
                        <TableCell
                          key={idx}
                          align="center"
                          sx={{
                            minWidth: 100,
                            bgcolor: isWeekendDay ? 'action.hover' : 'background.paper',
                            color: isWeekendDay ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          <Box>
                            <Typography variant="caption" display="block">
                              {date.toLocaleDateString('pl-PL', { weekday: 'short' })}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                            </Typography>
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allUsers.map((user, userIdx) => {
                    const userData = userAssignmentsMap[user.email] || {
                      user_email: user.email,
                      user_display_name: user.displayName,
                      dates: {}
                    };
                    
                    return (
                      <TableRow key={userIdx}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 9,
                            bgcolor: 'background.paper',
                            fontWeight: 600
                          }}
                        >
                          {userData.user_display_name}
                        </TableCell>
                        {dates.map((date, dateIdx) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const isWeekendDay = isWeekend(date);
                          const dayAssignments = userData.dates[dateStr] || [];
                          const filteredAssignments = filters.project_key 
                            ? dayAssignments.filter(a => a.project_key === filters.project_key)
                            : dayAssignments;
                          const totalFte = filteredAssignments.reduce((sum, a) => sum + a.fte_value, 0);
                          const overloaded = totalFte > 1.0;
                          const underutilized = totalFte < 0.8 && totalFte > 0;

                          if (isWeekendDay) {
                            return (
                              <TableCell
                                key={dateIdx}
                                sx={{
                                  bgcolor: '#f5f5f5',
                                  opacity: 0.5,
                                  cursor: 'not-allowed'
                                }}
                              >
                                <Typography variant="caption" color="text.secondary">
                                  -
                                </Typography>
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell
                              key={dateIdx}
                              onClick={() => setEditDialog({ userEmail: user.email, date: dateStr, assignments: filteredAssignments })}
                              sx={{
                                bgcolor: getCellColor(totalFte),
                                cursor: 'pointer',
                                border: overloaded ? '2px solid #c62828' : underutilized ? '2px dashed #e65100' : '1px solid transparent',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                  transform: 'scale(1.05)',
                                  zIndex: 5,
                                  position: 'relative'
                                },
                                minHeight: 80,
                                verticalAlign: 'top',
                                p: 1
                              }}
                            >
                              {filteredAssignments.length > 0 ? (
                                <Box>
                                  {filteredAssignments.map((assignment, idx) => (
                                    <Chip
                                      key={idx}
                                      label={`${assignment.project_name}: ${assignment.fte_value}`}
                                      size="small"
                                      sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}
                                    />
                                  ))}
                                  <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 600 }}>
                                    Total: {totalFte.toFixed(2)}
                                  </Typography>
                                  {overloaded && <Typography variant="caption" color="error">⚠️</Typography>}
                                  {underutilized && <Typography variant="caption" color="warning.main">ℹ️</Typography>}
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary" align="center">
                                  Kliknij aby dodać
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Dialog do edycji przypisań */}
        <Dialog
          open={editDialog !== null}
          onClose={() => setEditDialog(null)}
          maxWidth="sm"
          fullWidth
        >
          {editDialog && (
            <>
              <DialogTitle>
                Edycja przypisań - {new Date(editDialog.date).toLocaleDateString('pl-PL')}
              </DialogTitle>
              <DialogContent>
                <Box sx={{ mt: 2 }}>
                  {editDialog.assignments.map((assignment, idx) => (
                    <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">{assignment.project_name}</Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCellEdit(editDialog.userEmail, assignment.project_key, editDialog.date, 0)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <TextField
                        fullWidth
                        type="number"
                        label="FTE"
                        inputProps={{ min: 0, max: 1, step: 0.1 }}
                        value={assignment.fte_value}
                        onChange={(e) => {
                          const newFte = parseFloat(e.target.value) || 0;
                          handleCellEdit(editDialog.userEmail, assignment.project_key, editDialog.date, newFte);
                        }}
                        size="small"
                      />
                    </Box>
                  ))}
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Dodaj projekt</InputLabel>
                    <Select
                      value=""
                      onChange={(e) => {
                        const projectKey = e.target.value;
                        if (projectKey) {
                          const project = projects.find(p => p.key === projectKey);
                          if (project) {
                            handleCellEdit(editDialog.userEmail, projectKey, editDialog.date, 0.5);
                          }
                        }
                      }}
                      label="Dodaj projekt"
                    >
                      <MenuItem value="">Wybierz projekt...</MenuItem>
                      {projects
                        .filter(p => !editDialog.assignments.find(a => a.project_key === p.key))
                        .map(p => (
                          <MenuItem key={p.key} value={p.key}>
                            {p.name} ({p.key})
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditDialog(null)}>Zamknij</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Legenda:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label="Optymalne (0.8-1.0 FTE)" sx={{ bgcolor: '#e8f5e9' }} size="small" />
            <Chip label="Niedobór (&lt;0.8 FTE)" sx={{ bgcolor: '#fff3e0' }} size="small" />
            <Chip label="Przeciążenie (&gt;1.0 FTE)" sx={{ bgcolor: '#ffebee' }} size="small" />
            <Chip label="Brak przypisania" sx={{ bgcolor: '#f5f5f5' }} size="small" />
          </Box>
          <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
            💡 Kliknij na komórkę, aby edytować przypisania FTE per projekt
          </Typography>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default TeamCalendar;
