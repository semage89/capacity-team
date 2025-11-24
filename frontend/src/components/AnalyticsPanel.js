import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const AnalyticsPanel = () => {
  const [overloadData, setOverloadData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(`${API_BASE_URL}/analytics/overload`, {
        params: { start_date: startDate, end_date: endDate }
      });
      setOverloadData(response.data);
    } catch (error) {
      console.error('Błąd podczas ładowania analityki:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const url = `${API_BASE_URL}/export/allocations/${format}?start_date=${startDate}&end_date=${endDate}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Błąd podczas eksportu:', error);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Analityka obłożenia
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('excel')}
            >
              Eksport Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('pdf')}
            >
              Eksport PDF
            </Button>
          </Box>
        </Box>

        {overloadData && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Podsumowanie
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip
                  label={`Przeciążenia: ${overloadData.summary.total_overloaded_days}`}
                  color="error"
                />
                <Chip
                  label={`Niedobory: ${overloadData.summary.total_underutilized_days}`}
                  color="warning"
                />
              </Box>
            </Box>

            {overloadData.overloaded.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Przeciążenia zasobów
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Użytkownik</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell>Alokacja</TableCell>
                        <TableCell>Sugestia</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overloadData.overloaded.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.user?.display_name}</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>
                            <Chip label={`${item.total_allocation.toFixed(1)}%`} color="error" size="small" />
                          </TableCell>
                          <TableCell>{item.suggestion}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {overloadData.underutilized.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Niedobory zasobów
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Użytkownik</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell>Alokacja</TableCell>
                        <TableCell>Dostępna pojemność</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overloadData.underutilized.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.user?.display_name}</TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.total_allocation.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Chip label={`${item.available_capacity.toFixed(1)}%`} color="warning" size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AnalyticsPanel;

