import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  TextField,
  MenuItem,
  Typography,
  Alert,
  InputAdornment
} from '@mui/material';

/**
 * Formulario para actualizar el resultado de una disputa.
 * Incluye validaciones y mensajes de ayuda según el resultado seleccionado.
 */
const DisputeResultForm = ({ dispute, formData, setFormData }) => {
  const [showMontoRecuperado, setShowMontoRecuperado] = useState(
    formData.resultado === 'aprobada_parcial'
  );

  const resultadoOptions = [
    { value: 'pendiente', label: 'Pendiente', description: 'Sin resolver aún' },
    { 
      value: 'aprobada_total', 
      label: 'Aprobada Total', 
      description: 'Proveedor acepta 100% del reclamo. Factura será ANULADA.',
      impact: 'La factura NO se pagará y se excluirá de estadísticas.'
    },
    { 
      value: 'aprobada_parcial', 
      label: 'Aprobada Parcial', 
      description: 'Proveedor acepta parte del reclamo. Se ajustará el monto.',
      impact: 'La factura se pagará con el monto ajustado.'
    },
    { 
      value: 'rechazada', 
      label: 'Rechazada por Proveedor', 
      description: 'Proveedor rechaza el reclamo. Debemos pagar.',
      impact: 'La factura volverá a PENDIENTE y deberá provisionarse.'
    },
    { 
      value: 'anulada', 
      label: 'Anulada (Error Interno)', 
      description: 'Disputa creada por error. No procede.',
      impact: 'La factura volverá a PENDIENTE para revisión normal.'
    }
  ];

  const handleResultadoChange = (e) => {
    const newResultado = e.target.value;
    setFormData({
      ...formData,
      resultado: newResultado
    });
    
    // Mostrar campo de monto recuperado solo si es aprobación parcial
    setShowMontoRecuperado(newResultado === 'aprobada_parcial');
    
    // Limpiar monto recuperado si no es aprobación parcial
    if (newResultado !== 'aprobada_parcial') {
      setFormData(prev => ({
        ...prev,
        monto_recuperado: 0
      }));
    }
  };

  const selectedOption = resultadoOptions.find(opt => opt.value === formData.resultado);

  return (
    <Box>
      {/* Campo de Resultado */}
      <TextField
        select
        fullWidth
        label="Resultado de la Disputa"
        name="resultado"
        value={formData.resultado}
        onChange={handleResultadoChange}
        required
        margin="normal"
        helperText="Selecciona el resultado final de la gestión con el proveedor"
      >
        {resultadoOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Box>
              <Typography variant="body1">{option.label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </TextField>

      {/* Alerta con impacto del resultado seleccionado */}
      {selectedOption && selectedOption.impact && formData.resultado !== 'pendiente' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            Impacto:
          </Typography>
          <Typography variant="body2">
            {selectedOption.impact}
          </Typography>
        </Alert>
      )}

      {/* Campo de Monto Recuperado (solo para aprobación parcial) */}
      {showMontoRecuperado && (
        <TextField
          fullWidth
          type="number"
          label="Monto Recuperado"
          name="monto_recuperado"
          value={formData.monto_recuperado || ''}
          onChange={(e) => setFormData({
            ...formData,
            monto_recuperado: parseFloat(e.target.value) || 0
          })}
          required
          margin="normal"
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          helperText={`Monto que el proveedor acepta ajustar. Máximo: $${dispute.monto_disputa}`}
          inputProps={{
            min: 0,
            max: dispute.monto_disputa,
            step: 0.01
          }}
        />
      )}

      {/* Campo de Resolución (descripción) */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Descripción de la Resolución"
        name="resolucion"
        value={formData.resolucion || ''}
        onChange={(e) => setFormData({
          ...formData,
          resolucion: e.target.value
        })}
        margin="normal"
        helperText="Describe cómo se resolvió la disputa, acuerdos alcanzados, etc."
      />

      {/* Campo de Fecha de Resolución */}
      <TextField
        fullWidth
        type="date"
        label="Fecha de Resolución"
        name="fecha_resolucion"
        value={formData.fecha_resolucion || new Date().toISOString().split('T')[0]}
        onChange={(e) => setFormData({
          ...formData,
          fecha_resolucion: e.target.value
        })}
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        inputProps={{
          max: new Date().toISOString().split('T')[0]
        }}
        helperText="Fecha en que se resolvió la disputa con el proveedor"
      />

      {/* Información adicional */}
      {formData.resultado !== 'pendiente' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Nota:</strong> Al guardar este resultado, la factura cambiará automáticamente de estado
            y se registrará un evento en el timeline. Esta acción no se puede deshacer fácilmente.
          </Typography>
        </Alert>
      )}

      {/* Resumen de la disputa */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Resumen de la Disputa
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Factura: <strong>{dispute.invoice_data?.numero_factura}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monto en disputa: <strong>${dispute.monto_disputa}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tipo: <strong>{dispute.tipo_disputa_display}</strong>
        </Typography>
        {formData.resultado === 'aprobada_parcial' && formData.monto_recuperado > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Monto a recuperar: <strong>${formData.monto_recuperado}</strong>
            </Typography>
            <Typography variant="body2" color="primary.main">
              Nuevo monto factura: <strong>${dispute.invoice_data?.monto - formData.monto_recuperado}</strong>
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

DisputeResultForm.propTypes = {
  dispute: PropTypes.shape({
    monto_disputa: PropTypes.number,
    invoice_data: PropTypes.shape({
      numero_factura: PropTypes.string,
      monto: PropTypes.number,
    }),
    tipo_disputa_display: PropTypes.string,
  }).isRequired,
  formData: PropTypes.shape({
    resultado: PropTypes.string,
    monto_recuperado: PropTypes.number,
    resolucion: PropTypes.string,
    fecha_resolucion: PropTypes.string,
  }).isRequired,
  setFormData: PropTypes.func.isRequired,
};

export default DisputeResultForm;
