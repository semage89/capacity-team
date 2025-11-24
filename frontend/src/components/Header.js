import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { CalendarToday } from '@mui/icons-material';

const Header = () => {
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
      <Toolbar>
        <CalendarToday sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Capacity Team Planner
        </Typography>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Planowanie zasobów i capacity
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
