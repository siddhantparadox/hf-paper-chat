import React from 'react';

interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const NeoCard: React.FC<NeoCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border-2 border-black shadow-neo p-6 ${onClick ? 'cursor-pointer hover:shadow-neo-hover hover:-translate-y-1 transition-all' : ''} ${className}`}
    >
      {children}
    </div>
  );
};