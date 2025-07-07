import React, { FC } from 'react';
import { UIManagerLoader } from './Loader';

export const PollingVirtualKeyStep: FC = () => (
  <div className="py-10">
    <UIManagerLoader />
  </div>
);

export default PollingVirtualKeyStep;
