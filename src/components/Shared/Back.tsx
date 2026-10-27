import { ChevronLeftIcon } from '@heroicons/react/24/outline';

import { useUIManager } from '../../context/UIManagerContext';
import { useT } from '../../i18n';
import { Button } from '../ui';

/** Back to the previous step. AppShell's top bar renders it. */
export const Back = () => {
  const t = useT();
  const { goBack, prevUiStates } = useUIManager();

  if (prevUiStates.length <= 1) return null;
  return (
    <Button variant="ghost" size="icon" aria-label={t('common.back')} onClick={goBack}>
      <ChevronLeftIcon className="size-5" aria-hidden="true" />
    </Button>
  );
};

export default Back;
