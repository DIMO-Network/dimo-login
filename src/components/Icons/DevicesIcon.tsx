import React, { type FC } from 'react';

import { IconProps } from '.';

export const DevicesIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg className={className} viewBox="0 0 21 20" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_352_2049)">
        <path
          d="M3.57064 5.8335C3.57064 5.37516 3.94564 5.00016 4.40397 5.00016H17.7373C18.1956 5.00016 18.5706 4.62516 18.5706 4.16683C18.5706 3.7085 18.1956 3.3335 17.7373 3.3335H3.57064C2.65397 3.3335 1.90397 4.0835 1.90397 5.00016V14.1668H1.4873C0.795638 14.1668 0.237305 14.7252 0.237305 15.4168C0.237305 16.1085 0.795638 16.6668 1.4873 16.6668H11.904V14.1668H3.57064V5.8335ZM19.404 6.66683H14.404C13.9456 6.66683 13.5706 7.04183 13.5706 7.50016V15.8335C13.5706 16.2918 13.9456 16.6668 14.404 16.6668H19.404C19.8623 16.6668 20.2373 16.2918 20.2373 15.8335V7.50016C20.2373 7.04183 19.8623 6.66683 19.404 6.66683ZM18.5706 14.1668H15.2373V8.3335H18.5706V14.1668Z"
          fill="#080808"
        />
      </g>
      <defs>
        <clipPath id="clip0_352_2049">
          <rect width="20" height="20" fill="white" transform="translate(0.237305)" />
        </clipPath>
      </defs>
    </svg>
  );
};
