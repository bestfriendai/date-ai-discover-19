
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string | ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
}

const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
        {typeof icon === 'string' ? (
          <>
            {icon === 'heart' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            )}
            {icon === 'calendar' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            )}
          </>
        ) : (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>

      {actionLabel && (
        actionHref ? (
          <Link to={actionHref}>
            <Button>{actionLabel}</Button>
          </Link>
        ) : actionOnClick ? (
          <Button onClick={actionOnClick}>{actionLabel}</Button>
        ) : null
      )}
    </div>
  );
};

export default EmptyState;
