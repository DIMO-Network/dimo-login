# The Call Chain

  ## 1. Entry Points (UI Components):

  - `src/components/Vehicles/SelectVehicles.tsx:58` - Bulk sharing vehicles
    - User clicks "Share" button → calls
  handleShareVehicles(selectedVehicles)
    - This is for sharing multiple vehicles at once
  - `src/components/Vehicles/ManageVehicle.tsx:46` - Single vehicle updates
    - User clicks "Revoke" or "Extend" → calls updateVehiclePermissions()
    - This is for updating permissions on a single vehicle (revoke or extend
   expiration)

  ## 2. Hook Layer:

  - src/hooks/useShareVehicles.ts - Handles bulk vehicle sharing
    - Line 88-103: Main hook that validates session and prepares permissions
    - Line 35-40: shareVehicles() function decides single vs bulk
    - Line 26-33: shareMultipleVehicles() calls setVehiclePermissionsBulk()
    - Line 18-25: shareSingleVehicle() calls setVehiclePermissions()
  - src/hooks/useUpdateVehiclePermissions.tsx - Handles single vehicle
  updates
    - Line 23-47: Validates session, generates IPFS source, and calls
  setVehiclePermissions()

  ## 3. Service Layer:

  - src/services/turnkeyService.ts - Final execution
    - Line 177-198: setVehiclePermissions() - Calls the KernelSigner to set
  permissions for one vehicle
    - Line 200-221: setVehiclePermissionsBulk() - Calls the KernelSigner to
  set permissions for multiple vehicles

  # The Flow

  ## SelectVehicles.tsx (Line 58)
    → useShareVehicles hook
      → shareVehicles() → shareMultipleVehicles() OR shareSingleVehicle()
        → setVehiclePermissionsBulk() OR setVehiclePermissions() in
  turnkeyService.ts
          → kernelSigner.setVehiclePermissionsBulk() or
  kernelSigner.setVehiclePermissions()
            → Blockchain transaction

  ## ManageVehicle.tsx (Line 46)
    → useUpdateVehiclePermissions hook
      → setVehiclePermissions() in turnkeyService.ts
        → kernelSigner.setVehiclePermissions()
          → Blockchain transaction

  The actual blockchain transactions are handled by the
  @dimo-network/transactions SDK's KernelSigner instance, which is created
  and managed in turnkeyService.ts.