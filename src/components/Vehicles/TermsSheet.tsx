import React, { useMemo, useState } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

import { Button, Dialog } from '../ui';
import { formatDate } from '../../i18n/format';
import { Language, useLanguage, useT } from '../../i18n';
import { AccessItem, inGroup } from './access';
import { AccessRows } from './AccessRows';
import { ShareEnd, useShareEndLabel } from './AccessSummary';
import { ContractDescription } from './ContractDescription';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2.5">
    <h3 className="text-label text-muted">{title}</h3>
    {children}
  </section>
);

/**
 * "Details": every item with a plain description, how long it lasts, and the
 * contract text. A translation is a courtesy, so Japanese readers can switch
 * to the English original. (The signed document itself is built by
 * the transactions SDK from the same terms.)
 */
export const TermsSheet = ({
  open,
  onClose,
  items,
  end,
  contract,
}: {
  open: boolean;
  onClose: () => void;
  items: AccessItem[];
  end: ShareEnd;
  /** The contract text in a language; throws if the request can't be described. */
  contract: (language?: Language) => string;
}) => {
  const t = useT();
  const language = useLanguage();
  const endLabel = useShareEndLabel();
  const [showOriginal, setShowOriginal] = useState(false);
  const translated = language !== 'en';
  const contractLanguage = translated && showOriginal ? 'en' : undefined;

  const text = useMemo(() => {
    if (!open) return '';
    try {
      return contract(contractLanguage);
    } catch (error) {
      console.error('Could not describe the contract:', error);
      return '';
    }
    // The text follows the language on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contractLanguage, language]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="sheet"
      title={t('terms.title')}
      closeLabel={t('common.close')}
    >
      {inGroup(items, 'you').length > 0 && (
        <Section title={t('request.about_you')}>
          <AccessRows items={inGroup(items, 'you')} tileClassName="bg-card" />
        </Section>
      )}
      {inGroup(items, 'vehicles').length > 0 && (
        <Section
          title={
            inGroup(items, 'you').length > 0
              ? t('request.about_vehicles')
              : t('terms.access')
          }
        >
          <AccessRows items={inGroup(items, 'vehicles')} tileClassName="bg-card" />
        </Section>
      )}
      <Section title={t('terms.duration')}>
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-card text-ink">
            <CalendarIcon className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body-sm font-medium text-ink">{endLabel(end)}</span>
            <span className="text-label font-normal text-muted">
              {end.noEnd
                ? t('terms.duration_no_end')
                : t('terms.duration_until', { date: formatDate(end.date) })}
            </span>
          </span>
        </div>
      </Section>
      {text && (
        <Section title={t('terms.full')}>
          {translated && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-label font-normal text-muted">
              <span>
                {t(showOriginal ? 'contract.original_note' : 'contract.courtesy')}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOriginal((value) => !value)}
              >
                {showOriginal
                  ? t('contract.view_translation')
                  : t('contract.view_original')}
              </Button>
            </div>
          )}
          <ContractDescription description={text} lang={contractLanguage} />
        </Section>
      )}
    </Dialog>
  );
};

export default TermsSheet;
