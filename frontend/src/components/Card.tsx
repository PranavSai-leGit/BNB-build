import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  interactive = true,
  tabIndex,
  ...props
}) => {
  return (
    <div
      tabIndex={interactive ? (tabIndex ?? 0) : undefined}
      className={`cognera-card p-5 ${interactive ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
