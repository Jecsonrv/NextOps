import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { Button } from './Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './Dialog';

/**
 * InputDialog - Modal dialog with text input
 * Replacement for window.prompt() with better UX
 */
export function InputDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isConfirming = false,
  required = false,
  multiline = false,
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (required && !value.trim()) {
      return;
    }
    onConfirm(value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !multiline) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center sm:text-left">{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 space-y-4">
          {message && (
            <p className="text-sm text-gray-600 text-center sm:text-left whitespace-pre-line">
              {message}
            </p>
          )}
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          )}
          {required && !value.trim() && (
            <p className="text-xs text-red-600">Este campo es requerido</p>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || (required && !value.trim())}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isConfirming ? 'Procesando...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

InputDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string,
    placeholder: PropTypes.string,
    defaultValue: PropTypes.string,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    isConfirming: PropTypes.bool,
    required: PropTypes.bool,
    multiline: PropTypes.bool,
};
