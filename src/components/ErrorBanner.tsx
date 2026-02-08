import { AlertCircle, X } from 'lucide-react';
import { Button } from './ui';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-4">
        <div className="p-2 bg-amber-100 rounded-xl">
          <AlertCircle className="h-5 w-5 text-amber-600" />
        </div>
        <p className="text-sm font-medium text-amber-800 flex-1">{message}</p>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
