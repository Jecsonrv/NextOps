import PropTypes from 'prop-types';

/**
 * Cards profesionales para ERP
 * Diseño limpio con sombras sutiles
 */
function Card({
  title,
  subtitle,
  children,
  actions,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  noPadding = false,
}) {
  return (
    <div className={`bg-white rounded border border-slate-200 ${className}`}>
      {(title || subtitle || actions) && (
        <div className={`px-4 py-3 border-b border-slate-100 ${headerClassName}`}>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-1.5">{actions}</div>
            )}
          </div>
        </div>
      )}
      <div className={noPadding ? '' : `p-4 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-4 py-3 border-b border-slate-100 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-sm font-semibold text-slate-800 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);

const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs text-slate-500 ${className}`}>
    {children}
  </p>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`px-4 py-3 border-t border-slate-100 bg-slate-50 ${className}`}>
    {children}
  </div>
);

export { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter };
export default Card;

Card.propTypes = {
    title: PropTypes.node,
    subtitle: PropTypes.node,
    children: PropTypes.node,
    actions: PropTypes.node,
    className: PropTypes.string,
    headerClassName: PropTypes.string,
    bodyClassName: PropTypes.string,
};

CardHeader.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

CardTitle.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

CardContent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

CardDescription.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

CardFooter.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};
