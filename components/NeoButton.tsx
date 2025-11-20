import React from 'react';

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
  const baseStyles = "font-bold py-2 px-4 flex items-center justify-center gap-2 transition-all duration-200 text-sm sm:text-base";
  
  const variants = {
    primary: "bg-hf-yellow text-black border-2 border-black shadow-neo hover:shadow-neo-hover hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none",
    secondary: "bg-white text-black border-2 border-black shadow-neo hover:shadow-neo-hover hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none",
    ghost: "bg-transparent text-black border-2 border-transparent hover:bg-gray-200"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}
    </button>
  );
};