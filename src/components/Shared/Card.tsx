interface CardProps {
  width: string;
  height: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ width, height, children }) => (
  <div className={`${width} ${height} pt-6 px-10 lg:px-4 pb-10 rounded-lg bg-white`}>
    {children}
  </div>
);

export default Card;
