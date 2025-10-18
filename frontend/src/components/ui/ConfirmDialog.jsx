import React from 'react';
import { Button } from './Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './Dialog';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isConfirming = false,
  variant = 'destructive', // destructive, default, success
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center sm:text-left">{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 text-center sm:text-left whitespace-pre-line">{message}</p>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          {cancelText && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConfirming}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isConfirming}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isConfirming ? 'Procesando...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}