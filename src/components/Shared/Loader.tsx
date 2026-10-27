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
    <div
      className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      {!!text && <div className="text-body text-fg">{text}</div>}
      <div className="flex gap-2" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-2.5 animate-dot-wave rounded-full bg-muted"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
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
