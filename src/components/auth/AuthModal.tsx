import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Auth from './Auth';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Auth onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
