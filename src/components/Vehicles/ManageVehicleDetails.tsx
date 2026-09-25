import React from 'react';

import { Vehicle } from '../../models/vehicle';
import Header from '../Shared/Header';
import { SharedPermissionsNote, UpdateNeededBadge } from './SharedPermissionsNote';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../../types';
import { getAddedPermissions, needsPermissionUpdate } from '../../utils/permissions';

export const ManageVehicleDetails = ({ vehicle }: { vehicle: Vehicle }) => {
  const { permissions, permissionTemplateId } =
    useDevCredentials<VehicleManagerMandatoryParams>();

  const { tokenId, expiresAt, make, model, year } = vehicle;
  const needsUpdate = needsPermissionUpdate(vehicle, permissions, permissionTemplateId);
  const addedPermissions = needsUpdate
    ? getAddedPermissions([vehicle], permissions, permissionTemplateId)
    : [];

  return (
    <>
      <Header title={`${make} ${model} ${year}`} subtitle={`ID:${tokenId}`} />

      <img
        style={{ height: '80px', width: '80px' }}
        className="rounded-full object-cover mx-auto mt-8"
        src={
          'https://assets.dimo.xyz/ipfs/QmaaxazmGtNM6srcRmLyNdjCp8EAmvaTDYSo1k2CXVRTaY'
        }
        alt={`${make} ${model}`}
      />

      <p className="text-center mt-8">Shared until {expiresAt}</p>

      {needsUpdate && (
        <div className="flex flex-col items-center text-center mt-3">
          <UpdateNeededBadge />
          <SharedPermissionsNote
            needsUpdate={needsUpdate}
            addedPermissions={addedPermissions}
          />
        </div>
      )}
    </>
  );
};
