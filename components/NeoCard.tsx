import React from 'react';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const NeoCard: React.FC<NeoCardProps> = ({ children, className = '', onClick }) => {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "p-6", // Explicitly set padding to match original usage
        onClick && "cursor-pointer hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all",
        className
      )}
    >
      {children}
    </Card>
  );
};
