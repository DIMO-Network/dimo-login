import React from 'react';
import { useUIManager } from '../../context/UIManagerContext';
import { translateText, useT, type Text } from '../../i18n';

export const UIManagerLoader: React.FC = () => {
  const { loadingMessage } = useUIManager();

  return <Loader message={loadingMessage} />;
};

export type LoaderProps = {
  message?: Text;
};

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  const t = useT();
  const text = translateText(message, t);
  return (
    <div className="flex flex-col items-center gap-10" role="status" aria-live="polite">
      {!!text && <div className="text-lg">{text}</div>}
      <div className="flex space-x-2">
        <div className="dot w-3 h-3 rounded-full animate-wave delay-100"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-200"></div>
        <div className="dot w-3 h-3 rounded-full animate-wave delay-300"></div>
      </div>
    </div>
  );
};

export const UIManagerLoaderWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLoading } = useUIManager();

  if (isLoading) {
    return <UIManagerLoader />;
  }
  return <>{children}</>;
};

export default UIManagerLoader;
