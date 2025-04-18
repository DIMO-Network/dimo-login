import React, { FC } from 'react';
import { Loader } from './Loader';

export const PollingVirtualKeyStep: FC = () => (
  <div className="py-10">
    <Loader />
  </div>
);

export default PollingVirtualKeyStep;