import React from 'react';
import { Button } from './ui/button';

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

export const NeoButton: React.FC<NeoButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  className = '', 
  ...props 
}) => {
  
  let uiVariant: "default" | "neutral" | "noShadow" | "reverse" | null | undefined = "default";
  let extraClasses = "";

  if (variant === 'secondary') {
    uiVariant = 'neutral';
  } else if (variant === 'ghost') {
    uiVariant = 'noShadow'; // Closest base
    extraClasses = "bg-transparent border-transparent shadow-none hover:bg-gray-200 hover:translate-x-0 hover:translate-y-0";
  }

  return (
    <Button 
      variant={uiVariant as any}
      className={`${extraClasses} ${className}`} 
      {...props}
    >
      {icon && <span className="text-lg mr-2">{icon}</span>}
      {children}
    </Button>
  );
};
