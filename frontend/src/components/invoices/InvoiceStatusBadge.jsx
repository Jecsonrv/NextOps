import PropTypes from 'prop-types';
import { Chip, Tooltip } from '@mui/material';

/**
 * Badge visual para mostrar el estado de provisión de una factura.
 * Incluye colores, iconos y tooltips descriptivos.
 */
const InvoiceStatusBadge = ({ invoice }) => {
  const getStatusConfig = (estado) => {
    const configs = {
      pendiente: {
        label: 'PENDIENTE',
        icon: '⏳',
        tooltip: 'Factura pendiente de revisión'
      },
      revision: {
        label: 'REVISIÓN',
        icon: '👁️',
        tooltip: 'Factura en proceso de validación operativa'
      },
      disputada: {
        label: 'DISPUTADA',
        icon: '⚠️',
        tooltip: 'Factura con disputa activa. No se provisionará hasta resolver.'
      },
      provisionada: {
        label: 'PROVISIONADA',
        icon: '✓',
        tooltip: 'Factura aprobada y lista para contabilidad'
      },
      anulada: {
        label: 'ANULADA',
        icon: '✕',
        tooltip: 'Factura anulada completamente. No se pagará.'
      },
      anulada_parcialmente: {
        label: 'ANULADA PARCIAL',
        icon: '◐',
        tooltip: 'Factura con ajuste parcial. Monto modificado.'
      },
      rechazada: {
        label: 'RECHAZADA',
        icon: '✕',
        tooltip: 'Factura rechazada. No procede.'
      }
    };

    return configs[estado] || configs.pendiente;
  };

  const config = getStatusConfig(invoice.estado_provision);

  // Colores consistentes con tipo de costo y naviera
  const customStyles = {
    pendiente: {
      backgroundColor: '#FEF3C7',
      color: '#92400E',
      border: '1px solid #FCD34D'
    },
    revision: {
      backgroundColor: '#DBEAFE',
      color: '#1E40AF',
      border: '1px solid #93C5FD'
    },
    disputada: {
      backgroundColor: '#FEF3C7',
      color: '#92400E',
      border: '1px solid #FCD34D'
    },
    provisionada: {
      backgroundColor: '#D1FAE5',
      color: '#065F46',
      border: '1px solid #6EE7B7'
    },
    anulada: {
      backgroundColor: '#FEE2E2',
      color: '#991B1B',
      border: '1px solid #FCA5A5'
    },
    anulada_parcialmente: {
      backgroundColor: '#FED7AA',
      color: '#9A3412',
      border: '1px solid #FDBA74'
    },
    rechazada: {
      backgroundColor: '#FEE2E2',
      color: '#991B1B',
      border: '1px solid #FCA5A5'
    }
  };

  const customStyle = customStyles[invoice.estado_provision] || customStyles.pendiente;

  return (
    <Tooltip title={config.tooltip} arrow>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 600,
          minWidth: 'fit-content',
          ...customStyle
        }}
      >
        <span style={{ fontSize: '0.85rem' }}>{config.icon}</span>
        <span>{config.label}</span>
      </div>
    </Tooltip>
  );
};

InvoiceStatusBadge.propTypes = {
    invoice: PropTypes.object.isRequired,
};

/**
 * Badge para mostrar el resultado de una disputa.
 */
export const DisputeResultBadge = ({ resultado }) => {
  const getResultConfig = (resultado) => {
    const configs = {
      pendiente: {
        label: 'PENDIENTE',
        color: 'default',
        tooltip: 'Sin resolver'
      },
      aprobada_total: {
        label: 'APROBADA 100%',
        color: 'success',
        tooltip: 'Aprobada totalmente'
      },
      aprobada_parcial: {
        label: 'APROBADA PARCIAL',
        color: 'info',
        tooltip: 'Aprobada parcialmente'
      },
      rechazada: {
        label: 'RECHAZADA',
        color: 'error',
        tooltip: 'Rechazada por proveedor'
      },
      anulada: {
        label: 'ANULADA',
        color: 'warning',
        tooltip: 'Anulada internamente'
      }
    };

    return configs[resultado] || configs.pendiente;
  };

  const config = getResultConfig(resultado);

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
        sx={{ 
          height: '24px',
          fontSize: '0.75rem',
          fontWeight: 500
        }}
      />
    </Tooltip>
  );
};

DisputeResultBadge.propTypes = {
    resultado: PropTypes.string,
};

/**
 * Indicador de tipo de costo (vinculado vs auxiliar).
 */
export const CostTypeBadge = () => {
  // Badge removido - ya no se muestra
  return null;
};

/**
 * Indicador de exclusión de estadísticas.
 */
export const ExcludedFromStatsBadge = ({ invoice }) => {
  if (!invoice.debe_excluirse_estadisticas) {
    return null;
  }

  return (
    <Tooltip title="Excluida de estadísticas" arrow>
      <Chip
        label="!"
        size="small"
        color="default"
        sx={{ 
          height: '20px',
          minWidth: '20px',
          fontSize: '0.7rem',
          fontWeight: 700,
          opacity: 0.6,
          '& .MuiChip-label': {
            padding: '0 4px'
          }
        }}
      />
    </Tooltip>
  );
};

ExcludedFromStatsBadge.propTypes = {
    invoice: PropTypes.object.isRequired,
};

export default InvoiceStatusBadge;
