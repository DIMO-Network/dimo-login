interface CardProps {
  width?: string;
  height?: string;
  className?: string;
  children: React.ReactNode;
}

/** A tonal card. The page frame itself is AppShell. */
export const Card: React.FC<CardProps> = ({
  width = '',
  height = '',
  className = '',
  children,
}) => (
  <div className={`${width} ${height} rounded-card bg-card p-4 ${className}`}>
    {children}
  </div>
);

export default Card;
