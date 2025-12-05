import React from 'react';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean; // Enable hover styles without onClick (for when parent handles the click)
}

export const NeoCard: React.FC<NeoCardProps> = ({ children, className = '', onClick, interactive }) => {
  const isInteractive = onClick || interactive;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-6", // Explicitly set padding to match original usage
        isInteractive && "cursor-pointer hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all",
        className
      )}
    >
      {children}
    </Card>
  );
};
