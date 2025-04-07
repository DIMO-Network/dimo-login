interface CardProps {
  width: string;
  height: string;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  width,
  height,
  className = "",
  children,
}) => (
  <div
    className={`${width} ${height} py-10 px-8 lg:px-4 rounded-2xl bg-white ${className}`}
  >
    {children}
  </div>
);

export default Card;
