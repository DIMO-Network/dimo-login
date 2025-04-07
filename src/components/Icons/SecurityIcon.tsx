import React, { type FC } from 'react';

import { IconProps } from '.';

export const SecurityIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg className={className} viewBox="0 0 21 20" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.5623 1.05537L3.72897 3.64704C3.12897 3.9137 2.7373 4.5137 2.7373 5.17204V9.0887C2.7373 13.7137 5.9373 18.0387 10.2373 19.0887C14.5373 18.0387 17.7373 13.7137 17.7373 9.0887V5.17204C17.7373 4.5137 17.3456 3.9137 16.7456 3.64704L10.9123 1.05537C10.4873 0.863704 9.9873 0.863704 9.5623 1.05537ZM10.2373 9.9137H16.0706C15.629 13.347 13.3373 16.4054 10.2373 17.3637V9.92204H4.40397V5.17204L10.2373 2.58037V9.9137Z"
        fill="#080808"
      />
    </svg>
  );
};
