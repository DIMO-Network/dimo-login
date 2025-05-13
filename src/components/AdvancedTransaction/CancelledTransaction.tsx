// src/components/SuccessPage.tsx
import React from 'react';
import Header from '../Shared/Header';

export const CancelledTransaction: React.FC = () => {
  return (
    <>
      <Header title="Transaction Cancelled" subtitle={''} />
    </>
  );
};

export default CancelledTransaction;
