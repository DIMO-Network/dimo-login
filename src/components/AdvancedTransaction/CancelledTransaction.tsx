import React from 'react';
import Card from '../Shared/Card';
import Header from '../Shared/Header';

const CancelledTransaction: React.FC = () => {
  return (
    <Card width="w-full max-w-[600px]" height="h-full max-h-[308px]">
      <Header title="Transaction Cancelled" subtitle={''} />
    </Card>
  );
};

export default CancelledTransaction;
