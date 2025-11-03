import PropTypes from 'prop-types';

function Card({
  title,
  subtitle,
  children,
  actions,
  className = '',
  headerClassName = '',
  bodyClassName = ''
}) {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {(title || subtitle || actions) && (
        <div className={`px-6 py-4 border-b border-gray-200 ${headerClassName}`}>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 ${className}`}>
    {children}
  </p>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-gray-200 ${className}`}>
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
