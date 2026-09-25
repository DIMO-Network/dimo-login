import React, { useEffect, useState } from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { getTemplateDescription } from '../../services/permissionsService';
import { Header, ErrorMessage } from '../Shared';
import { useUIManager } from '../../context/UIManagerContext';
import SelectVehicles from './SelectVehicles';
import { ContractDescription } from './ContractDescription';
import { getAppUrl } from '../../utils/urlHelpers';
import { VehicleManagerMandatoryParams } from '../../types/params';
import { toCloudEventAgreements } from '../../services/vehicleDocumentAgreements';

export const VehicleManager: React.FC = () => {
  const { user } = useAuthContext();
  const {
    clientId,
    devLicenseAlias,
    oemBrand,
    permissionTemplateId,
    permissions,
    cloudEvent,
    expirationDate,
    region,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const displayName = oemBrand?.name || devLicenseAlias;
  const { setComponentData, error, setError } = useUIManager();

  //Data from SDK
  const [templateDescription, setTemplateDescription] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean | undefined>(false);

  const fetchPermissions = async () => {
    if (permissionTemplateId || permissions) {
      try {
        setComponentData({
          ...(permissionTemplateId && { permissionTemplateId }),
          ...(permissions && { permissions }),
        });
        setTemplateDescription(
          getTemplateDescription({
            email: user.email,
            devLicenseAlias: displayName,
            permissions,
            permissionTemplateId,
            fileAgreements: toCloudEventAgreements(cloudEvent),
            expirationDate,
            region: region?.toUpperCase(),
          }),
        );
      } catch (error) {
        setError('Could not fetch permissions');
        console.error('Error fetching permissions:', error);
      }
    }
  };

  useEffect(() => {
    Promise.all([fetchPermissions()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user.smartContractAddress,
    clientId,
    permissionTemplateId,
    permissions,
    devLicenseAlias,
  ]);

  const renderPermissionDescription = () => (
    <ContractDescription description={templateDescription} isExpanded={!!isExpanded} />
  );

  const appUrl = getAppUrl();

  return (
    <>
      <Header
        title={`${displayName} wants to use DIMO to connect to your vehicles data`}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      <div className="flex flex-col items-center justify-center max-h-[480px] lg:max-h-[584px] box-border overflow-y-auto w-full">
        {error && <ErrorMessage message={error} />}

        <>
          <div className="description w-fit w-full mt-2 text-sm overflow-y-auto font-normal text-[#313131]">
            {renderPermissionDescription()}
          </div>
          <div className="w-full">
            <button
              className="bg-white w-[145px] text-[#09090B] font-medium text-sm text-left underline decoration-[#D4D4D8]"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          </div>
        </>

        {(permissionTemplateId || permissions) && <SelectVehicles />}
      </div>
    </>
  );
};

export default VehicleManager;
