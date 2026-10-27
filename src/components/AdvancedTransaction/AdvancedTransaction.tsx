import React, { useState } from 'react';
import { captureException } from '@sentry/react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useAuthContext } from '../../context/AuthContext';
import { executeAdvancedTransaction } from '../../services/turnkeyService';
import { sendTxnResponseToParent } from '../../utils/txnUtils';
import { sendErrorToParent } from '../../utils/errorUtils';
import { getRedirectHost } from '../../utils/urlHelpers';
import { UiStates } from '../../enums';
import { useUIManager } from '../../context/UIManagerContext';
import { useT } from '../../i18n';
import { ActionBar, Button, ErrorBox, Notice, Screen, ScreenHeader } from '../ui';

const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-label text-muted">{label}</dt>
    <dd className="break-all font-mono text-code text-fg">{children}</dd>
  </div>
);

/** A contract call the app wants signed, shown as is before approving. */
export const AdvancedTransaction: React.FC = () => {
  const t = useT();
  const { redirectUri, utm, transactionData, devLicenseAlias, oemBrand } =
    useDevCredentials();
  const appName = oemBrand?.name || devLicenseAlias || t('common.app_developer_fallback');
  const { setUiState, setComponentData, setBusy } = useUIManager();
  const { jwt, validateSession } = useAuthContext();
  const [approving, setApproving] = useState(false);
  const [failed, setFailed] = useState(false);

  const onApprove = async () => {
    setFailed(false);
    setApproving(true);
    setBusy(true);
    try {
      const validSession = await validateSession();
      if (!validSession) return;
      const receipt = await executeAdvancedTransaction(
        transactionData!.address,
        transactionData!.abi,
        transactionData!.functionName,
        transactionData!.args,
        transactionData!.value,
      );

      //Send transaction hash to developer, and show user successful txn
      sendTxnResponseToParent(receipt, jwt!, redirectUri, (transactionHash) => {
        setComponentData({ transactionHash });
        setUiState(UiStates.TRANSACTION_SUCCESS);
      });
    } catch (e) {
      console.log(e);
      captureException(e);
      setFailed(true);
    } finally {
      setApproving(false);
      setBusy(false);
    }
  };

  const onReject = async () => {
    //This will send the message, and close the window
    //Doesn't currently handle redirecting
    sendErrorToParent(`User Rejected the Transaction`, redirectUri, utm, setUiState);
  };

  const args = transactionData?.args ?? [];
  const actions = (
    <ActionBar>
      <Button variant="secondary" onClick={onReject} disabled={approving}>
        {t('tx.reject')}
      </Button>
      <Button onClick={onApprove} loading={approving} loadingLabel={t('tx.approving')}>
        {failed ? t('common.try_again') : t('tx.approve')}
      </Button>
    </ActionBar>
  );

  return (
    <Screen actions={actions}>
      <ScreenHeader title={t('tx.title')} host={getRedirectHost(redirectUri)} />
      <Notice tone="warning" title={t('tx.warning_title', { appName })}>
        {t('tx.warning_body', { host: getRedirectHost(redirectUri) || appName })}
      </Notice>
      {failed && <ErrorBox title={t('tx.error')} />}
      <dl className="flex flex-col gap-3 rounded-card bg-card px-4 py-3.5">
        <Detail label={t('tx.function')}>{transactionData?.functionName}</Detail>
        <Detail label={t('tx.parameters')}>
          {args.length ? (
            <ul className="list-disc pl-4">
              {args.map((arg, idx) => (
                <li key={idx}>{String(arg)}</li>
              ))}
            </ul>
          ) : (
            t('tx.none')
          )}
        </Detail>
        <Detail label={t('tx.address')}>{transactionData?.address}</Detail>
        {transactionData?.value != null && (
          <Detail label={t('tx.value')}>{transactionData.value.toString()}</Detail>
        )}
      </dl>
    </Screen>
  );
};

export default AdvancedTransaction;
