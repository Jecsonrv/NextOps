import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button profesional para ERP
 * Diseño sobrio con colores neutros
 */
const Button = React.forwardRef((
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    className = '',
    icon,
    onClick,
    ...props
  },
  ref
) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    // Primary: gris oscuro profesional
    primary: 'bg-slate-800 text-white hover:bg-slate-700 focus-visible:ring-slate-500',
    // Secondary: gris claro
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400',
    // Success: verde sobrio
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
    // Danger: rojo apagado
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    // Destructive: alias para danger
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    // Outline: borde sutil
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400',
    // Ghost: sin fondo
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
    // Link: como enlace
    link: 'text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
    icon: 'p-2',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      ref={ref}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && !loading && <span className="mr-1.5">{icon}</span>}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
    children: PropTypes.node,
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'destructive', 'outline', 'ghost', 'link']),
    size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'icon']),
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    className: PropTypes.string,
    icon: PropTypes.node,
    onClick: PropTypes.func,
};

export { Button };
export default Button;
