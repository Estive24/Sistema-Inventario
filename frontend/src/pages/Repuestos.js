import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Warning,
  FilterList,
  Clear,
  Visibility,
  AttachMoney,
  Inventory,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { repuestosService, categoriasService, proveedoresService } from '../services/api';
//import FormularioRepuesto from '../components/FormularioRepuesto';//

const Repuestos = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estados locales
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filtroCategoria, setFiltroCategoria] = useState(searchParams.get('categoria') || '');
  const [filtroProveedor, setFiltroProveedor] = useState(searchParams.get('proveedor') || '');
  const [soloStockBajo, setSoloStockBajo] = useState(searchParams.get('stock_bajo') === 'true');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Construir parámetros de consulta
  const buildQueryParams = () => {
    const params = {
      page: page + 1,
      page_size: rowsPerPage,
    };

    if (searchTerm) params.search = searchTerm;
    if (filtroCategoria) params.categoria = filtroCategoria;
    if (filtroProveedor) params.proveedor = filtroProveedor;
    if (soloStockBajo) params.stock_bajo = 'true';

    return params;
  };

  // Consultas
  const { data: repuestosData, isLoading, error } = useQuery(
    ['repuestos', page, rowsPerPage, searchTerm, filtroCategoria, filtroProveedor, soloStockBajo],
    () => repuestosService.getRepuestos(buildQueryParams()),
    {
      keepPreviousData: true,
    }
  );

  const { data: categoriasData } = useQuery(
    'categorias',
    () => categoriasService.getCategorias()
  );

  const { data: proveedoresData } = useQuery(
    'proveedores',
    () => proveedoresService.getProveedores()
  );

  // Mutaciones
  const eliminarMutation = useMutation(
    (id) => repuestosService.eliminarRepuesto(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('repuestos');
        toast.success('Repuesto eliminado exitosamente');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Error al eliminar repuesto');
      },
    }
  );

  // Efectos
  useEffect(() => {
    // Actualizar URL con parámetros de búsqueda
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filtroCategoria) params.set('categoria', filtroCategoria);
    if (filtroProveedor) params.set('proveedor', filtroProveedor);
    if (soloStockBajo) params.set('stock_bajo', 'true');
    
    setSearchParams(params);
  }, [searchTerm, filtroCategoria, filtroProveedor, soloStockBajo, setSearchParams]);

  // Manejadores de eventos
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditarRepuesto = (repuesto) => {
    setRepuestoSeleccionado(repuesto);
    setDialogAbierto(true);
  };

  const handleEliminarRepuesto = (repuesto) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el repuesto "${repuesto.nombre}"?`)) {
      eliminarMutation.mutate(repuesto.id);
    }
  };

  const handleLimpiarFiltros = () => {
    setSearchTerm('');
    setFiltroCategoria('');
    setFiltroProveedor('');
    setSoloStockBajo(false);
    setPage(0);
  };

  const handleCerrarDialog = () => {
    setDialogAbierto(false);
    setRepuestoSeleccionado(null);
  };

  const repuestos = repuestosData?.data?.results || [];
  const totalRepuestos = repuestosData?.data?.count || 0;
  const categorias = categoriasData?.data || [];
  const proveedores = proveedoresData?.data?.results || [];

  // Función para obtener el color del chip de stock
  const getStockColor = (repuesto) => {
    if (repuesto.stock_actual === 0) return 'error';
    if (repuesto.stock_bajo) return 'warning';
    return 'success';
  };

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Gestión de Repuestos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra el inventario de repuestos del sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogAbierto(true)}
          size="large"
        >
          Agregar Repuesto
        </Button>
      </Box>

      {/* Alertas */}
      {soloStockBajo && repuestos.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Mostrando repuestos con stock bajo
          </Typography>
          <Typography variant="body2">
            Se encontraron {totalRepuestos} repuesto{totalRepuestos !== 1 ? 's' : ''} que requieren atención inmediata.
          </Typography>
        </Alert>
      )}

      {/* Filtros y búsqueda */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por nombre, código, modelo o serie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant={mostrarFiltros ? "contained" : "outlined"}
                startIcon={<FilterList />}
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
              >
                Filtros
              </Button>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant={soloStockBajo ? "contained" : "outlined"}
                color="warning"
                startIcon={<Warning />}
                onClick={() => setSoloStockBajo(!soloStockBajo)}
              >
                Stock Bajo
              </Button>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Clear />}
                onClick={handleLimpiarFiltros}
              >
                Limpiar
              </Button>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {totalRepuestos} repuesto{totalRepuestos !== 1 ? 's' : ''}
              </Typography>
            </Grid>
          </Grid>

          {/* Filtros expandidos */}
          {mostrarFiltros && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={filtroCategoria}
                    label="Categoría"
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                  >
                    <MenuItem value="">Todas las categorías</MenuItem>
                    {categorias.map((categoria) => (
                      <MenuItem key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Proveedor</InputLabel>
                  <Select
                    value={filtroProveedor}
                    label="Proveedor"
                    onChange={(e) => setFiltroProveedor(e.target.value)}
                  >
                    <MenuItem value="">Todos los proveedores</MenuItem>
                    {proveedores.map((proveedor) => (
                      <MenuItem key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Tabla de repuestos */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Repuesto</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell align="center">Stock</TableCell>
                <TableCell align="center">Precio</TableCell>
                <TableCell>Ubicación</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                // Skeleton loading
                Array.from(new Array(rowsPerPage)).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from(new Array(6)).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : repuestos.length > 0 ? (
                repuestos.map((repuesto) => (
                  <TableRow key={repuesto.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {repuesto.nombre}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Código: {repuesto.codigo_interno}
                        </Typography>
                        {repuesto.modelo && (
                          <Typography variant="caption" color="text.secondary">
                            Modelo: {repuesto.modelo}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={repuesto.categoria_nombre}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Chip
                          label={`${repuesto.stock_actual} unidades`}
                          color={getStockColor(repuesto)}
                          size="small"
                          icon={<Inventory />}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Mín: {repuesto.stock_minimo}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                          ${repuesto.precio_unitario?.toLocaleString('es-CL')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total: ${repuesto.valor_total_stock?.toLocaleString('es-CL')}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {repuesto.ubicacion_bodega || 'No especificada'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton size="small" color="info">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditarRepuesto(repuesto)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarRepuesto(repuesto)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No se encontraron repuestos con los filtros aplicados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={totalRepuestos}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Card>

      {/* Dialog para formulario */}
      <Dialog
        open={dialogAbierto}
        onClose={handleCerrarDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {repuestoSeleccionado ? 'Editar Repuesto' : 'Agregar Nuevo Repuesto'}
        </DialogTitle>
        <DialogContent>
          <FormularioRepuesto
            repuesto={repuestoSeleccionado}
            onSuccess={() => {
              handleCerrarDialog();
              queryClient.invalidateQueries('repuestos');
            }}
            onCancel={handleCerrarDialog}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Repuestos;