import Logo from "./Logo";

interface HeaderProps {
    title: string;
    subtitle: string;
    link?: string;
  }
  
  const Header: React.FC<HeaderProps> = ({ title, subtitle, link }) => (
    <div className="header mb-2 lg:mb-4 h-full max-h-[108px]">
      <Logo />
      <div className="frame18Title text-center">
        <p className="text-xl font-medium">{title}</p>
        <p className="text-sm text-zinc-500 font-medium mb-2 lg:mb-4">
          {link ? (
            <a href={link} className="underline">
              {subtitle}
            </a>
          ) : (
            subtitle
          )}
        </p>
      </div>
    </div>
  );
  

  export default Header;