// src/components/FormularioRepuesto.jsx
import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography 
} from '@mui/material';

const FormularioRepuesto = ({ open, onClose, repuesto, onSubmit }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {repuesto ? 'Editar Repuesto' : 'Nuevo Repuesto'}
      </DialogTitle>
      <DialogContent>
        <Typography>
          Componente en desarrollo. Funcionalidad próximamente.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onClose} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormularioRepuesto;