import React, { FC } from 'react';
import { ConnectedLoader } from './Loader';

export const PollingVirtualKeyStep: FC = () => (
  <div className="py-10">
    <ConnectedLoader />
  </div>
);

export default PollingVirtualKeyStep;
