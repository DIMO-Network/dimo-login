import React, { type FC } from "react";

import { IconProps } from ".";

export const PlusIcon: FC<IconProps> = ({ className = "" }) => {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.75 0.75C5.75 0.335786 5.41421 0 5 0C4.58579 0 4.25 0.335786 4.25 0.75V4.25H0.75C0.335786 4.25 0 4.58579 0 5C0 5.41421 0.335786 5.75 0.75 5.75L4.25 5.75V9.25C4.25 9.66421 4.58579 10 5 10C5.41421 10 5.75 9.66421 5.75 9.25V5.75L9.25 5.75C9.66421 5.75 10 5.41421 10 5C10 4.58579 9.66421 4.25 9.25 4.25H5.75V0.75Z"
        fill="#18181B"
      />
    </svg>
  );
};
