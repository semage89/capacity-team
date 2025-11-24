import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pl';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('pl');
import { Box, Paper, Typography, Button, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';

const localizer = momentLocalizer(moment);
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const TeamCalendar = () => {
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [selectedProject, selectedUser, currentDate]);

  const loadData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/projects`),
        axios.get(`${API_BASE_URL}/users`)
      ]);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Błąd podczas ładowania danych:', error);
    }
  };

  const loadCalendar = async () => {
    try {
      const startDate = moment(currentDate).startOf(view).format('YYYY-MM-DD');
      const endDate = moment(currentDate).endOf(view).format('YYYY-MM-DD');
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        ...(selectedProject && { project_id: selectedProject }),
        ...(selectedUser && { user_id: selectedUser })
      });

      const response = await axios.get(`${API_BASE_URL}/allocations?${params}`);
      
      const calendarEvents = response.data.map(allocation => ({
        id: allocation.id,
        title: `${allocation.user?.display_name || ''} - ${allocation.project?.name || ''} (${allocation.allocation_percentage}%)`,
        start: new Date(allocation.start_date),
        end: allocation.end_date ? new Date(allocation.end_date) : new Date(moment().add(1, 'year')),
        resource: allocation,
        color: getColorForProject(allocation.project_id)
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Błąd podczas ładowania kalendarza:', error);
    }
  };

  const getColorForProject = (projectId) => {
    const colors = ['#366092', '#f50057', '#4caf50', '#ff9800', '#9c27b0'];
    return colors[projectId % colors.length];
  };

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Projekt</InputLabel>
            <Select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              label="Projekt"
            >
              <MenuItem value="">Wszystkie</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Użytkownik</InputLabel>
            <Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              label="Użytkownik"
            >
              <MenuItem value="">Wszyscy</MenuItem>
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>{user.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={loadCalendar}>
            Odśwież
          </Button>
        </Box>

        <Box sx={{ height: '70vh' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onNavigate={setCurrentDate}
            onView={setView}
            view={view}
            date={currentDate}
            messages={{
              next: 'Następny',
              previous: 'Poprzedni',
              today: 'Dzisiaj',
              month: 'Miesiąc',
              week: 'Tydzień',
              day: 'Dzień',
              agenda: 'Agenda'
            }}
          />
        </Box>
      </Paper>
    </DndProvider>
  );
};

export default TeamCalendar;
