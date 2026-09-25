import React from 'react';

import { Vehicle } from '../../models/vehicle';
import Header from '../Shared/Header';
import { SharedPermissionsNote, UpdateNeededBadge } from './SharedPermissionsNote';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { VehicleManagerMandatoryParams } from '../../types';
import { getAddedPermissions } from '../../utils/permissions';
import {
  getMissingFileLabels,
  toCloudEventAgreements,
} from '../../services/vehicleDocumentAgreements';

export const ManageVehicleDetails = ({
  vehicle,
  needsUpdate,
  newShareEnd,
  keptFiles,
}: {
  vehicle: Vehicle;
  needsUpdate: boolean;
  // How long the share lasts after the offered action (Update or Extend).
  newShareEnd: string;
  // Files the current grant shares, which that action keeps.
  keptFiles: string[];
}) => {
  const { permissions, permissionTemplateId, cloudEvent } =
    useDevCredentials<VehicleManagerMandatoryParams>();

  const { tokenId, expiresAt, make, model, year } = vehicle;
  const addedPermissions = needsUpdate
    ? getAddedPermissions([vehicle], permissions, permissionTemplateId)
    : [];
  const addedFiles = getMissingFileLabels([vehicle], toCloudEventAgreements(cloudEvent));

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
      <p className="text-center text-sm text-gray-600 mt-1">
        {needsUpdate ? 'Updating' : 'Extending'} keeps it shared {newShareEnd}.
      </p>
      {!!keptFiles.length && (
        <p className="text-center text-sm text-gray-600 mt-1">
          Also shares {keptFiles.join(', ').toLowerCase()}, which{' '}
          {needsUpdate ? 'updating' : 'extending'} keeps.
        </p>
      )}

      {needsUpdate && (
        <div className="flex flex-col items-center text-center mt-3">
          <UpdateNeededBadge />
          <SharedPermissionsNote
            addedPermissions={addedPermissions}
            addedFiles={addedFiles}
          />
        </div>
      )}
    </>
  );
};
