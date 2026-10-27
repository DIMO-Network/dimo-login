import React, { useState } from 'react';
import { ArrowTopRightOnSquareIcon, CheckIcon } from '@heroicons/react/24/outline';

import { backToThirdParty } from '../../utils/messageHandler';
import { isEmbed } from '../../utils/isEmbed';
import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { message, useT } from '../../i18n';
import { ErrorContent } from '../Shared';
import { ActionBar, Button, DoneHeader, Screen } from '../ui';
import { useAppName } from '../../hooks/useAppName';

/** Done: a signed message or a completed transaction. */
export const SuccessfulTransaction: React.FC = () => {
  const t = useT();
  const { redirectUri, utm } = useDevCredentials();
  const appName = useAppName();
  const { componentData } = useUIManager();
  const { jwt } = useAuthContext();
  const [copied, setCopied] = useState(false);

  const isSignature = componentData?.flowKind === 'signature';

  if (isSignature) {
    if (!componentData.signature) {
      return (
        <ErrorContent
          title={message('sign.missing.title')}
          message={message('sign.missing.body')}
        />
      );
    }

    const handleCopy = () => {
      void navigator.clipboard
        .writeText(componentData.signature)
        .then(() => setCopied(true));
    };

    const handleBackToThirdParty = () => {
      const payload = {
        signature: componentData.signature,
        signer: componentData.signer,
        token: jwt,
      };
      backToThirdParty(payload, redirectUri, utm);
    };

    return (
      <Screen
        actions={
          <ActionBar className="[&>div]:flex-col">
            {!isEmbed() && (
              <Button fullWidth onClick={handleBackToThirdParty}>
                {t('common.back_to_app', { appName })}
              </Button>
            )}
            <Button variant="secondary" fullWidth onClick={handleCopy}>
              {copied && <CheckIcon className="size-4" aria-hidden="true" />}
              {copied ? t('sign.copied') : t('sign.copy')}
            </Button>
          </ActionBar>
        }
      >
        <DoneHeader title={t('sign.done_title')}>
          {t('sign.done_body', { appName })}
        </DoneHeader>
        <p className="break-all rounded-control bg-card p-3 font-mono text-code text-fg">
          {componentData.signature}
        </p>
      </Screen>
    );
  }

  if (!componentData?.transactionHash) {
    return (
      <ErrorContent
        title={message('tx.missing.title')}
        message={message('tx.missing.body')}
      />
    );
  }

  const handleView = () => {
    if (componentData.transactionHash) {
      const scanBaseUrl =
        process.env.REACT_APP_ENVIRONMENT === 'prod'
          ? 'https://polygonscan.com'
          : 'https://amoy.polygonscan.com';

      window.open(`${scanBaseUrl}/tx/${componentData.transactionHash}`);
    }
  };

  const handleBackToThirdParty = () => {
    //If Dev is using popup mode, we simply exit the flow here and close the window
    //By this point the dev should already have the transaction data, so this screen is mainly for the users UX, for them to know what happened
    //Redirect mode however, the user controls when the data is sent because we need to perform a redirect
    const payload = {
      transactionHash: componentData.transactionHash,
      token: jwt,
    };
    backToThirdParty(payload, redirectUri, utm);
  };

  return (
    <Screen
      actions={
        <ActionBar className="[&>div]:flex-col">
          {!isEmbed() && (
            <Button fullWidth onClick={handleBackToThirdParty}>
              {t('common.back_to_app', { appName })}
            </Button>
          )}
          <Button variant="secondary" fullWidth onClick={handleView}>
            {t('tx.view')}
            <ArrowTopRightOnSquareIcon className="size-4" aria-hidden="true" />
          </Button>
        </ActionBar>
      }
    >
      <DoneHeader title={t('tx.done_title')}>{t('tx.done_body', { appName })}</DoneHeader>
      <p className="break-all rounded-control bg-card p-3 font-mono text-code text-fg">
        {componentData.transactionHash}
      </p>
    </Screen>
  );
};

export default SuccessfulTransaction;
