import React, { useEffect } from 'react';

import { useDevCredentials } from '../../context/DevCredentialsContext';
import { useUIManager } from '../../context/UIManagerContext';
import { VehicleManagerMandatoryParams } from '../../types/params';
import SelectVehicles from './SelectVehicles';

/** The share-vehicles flow's entry: the request, then the vehicle list. */
export const VehicleManager: React.FC = () => {
  const { permissionTemplateId, permissions } =
    useDevCredentials<VehicleManagerMandatoryParams>();
  const { setComponentData } = useUIManager();

  // ManageVehicle reads the request from componentData.
  useEffect(() => {
    setComponentData({
      ...(permissionTemplateId && { permissionTemplateId }),
      ...(permissions && { permissions }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionTemplateId, permissions]);

  // Missing permissions are reported by the entry validations.
  if (!permissionTemplateId && !permissions) return null;
  return <SelectVehicles />;
};

export default VehicleManager;
