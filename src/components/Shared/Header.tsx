import { Back } from './Back';
import { Logo } from './Logo';

interface HeaderProps {
  title: string;
  subtitle?: string;
  link?: string;
  description?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, link, description }) => (
  <div className="w-full relative">
    <Back />
    <Logo />
    <div className="flex flex-col gap-1 text-center">
      <p className="text-xl font-medium">{title}</p>
      {(link || subtitle) && (
        <p className="text-sm text-zinc-500 font-medium">
          {link ? (
            <a
              href={link}
              className="underline flex flex-row gap-1 justify-center items-center"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${
                  new URL(link).origin
                }&sz=16`}
                alt="favicon"
                className="inline-block ml-1 w-4 h-4"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              {subtitle}
            </a>
          ) : (
            subtitle
          )}
        </p>
      )}
      {description && <p className="text-sm font-normal text-[#313131]">{description}</p>}
    </div>
  </div>
);

export default Header;
