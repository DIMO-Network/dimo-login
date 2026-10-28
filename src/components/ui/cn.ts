import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge doesn't know the custom type scale, and would read
// `text-body-sm` as a color and drop `text-fg` beside it (the console hit
// this in its ui/input.tsx).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'title',
            'panel-title',
            'card-title',
            'metric',
            'body',
            'body-sm',
            'label',
            'code',
          ],
        },
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
