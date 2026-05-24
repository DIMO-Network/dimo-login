import React from 'react';

import Logo from './Logo';
import { Loader, LoaderProps } from '../';
import { useDevCredentials } from '../../context/DevCredentialsContext';

export type LoadingContentProps = LoaderProps;

export const LoadingContent: React.FC<LoadingContentProps> = ({ message }) => {
  const { oemBrand } = useDevCredentials();
  // On the loading screen we only render a logo when the OEM brand is actually
  // known (e.g. hydrated from the localStorage cache). We deliberately skip the
  // default DIMO fallback here so an OEM popup never flashes the DIMO mark
  // before the brand fetch resolves — better a logo-less loader than the wrong
  // brand. The DIMO fallback still applies on the header/sign-in screens.
  const hasBrandLogo = Boolean(oemBrand?.logoUrl);

  return (
    <div className="w-full md:w-[440px]">
      {hasBrandLogo && <Logo />}
      <Loader message={message} />
    </div>
  );
};
