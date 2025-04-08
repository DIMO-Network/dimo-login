import { Back } from './Back';
import Logo from './Logo';

interface HeaderProps {
  title: string;
  subtitle?: string;
  link?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, link }) => (
  <div className="header w-full relative">
    <Back />
    <Logo />
    <div className="frame18Title text-center">
      <p className="text-xl font-medium">{title}</p>
      {(link || subtitle) && (
        <p className="text-sm text-zinc-500 font-medium">
          {link ? (
            <a href={link} className="underline">
              {subtitle}
            </a>
          ) : (
            subtitle
          )}
        </p>
      )}
    </div>
  </div>
);

export default Header;
