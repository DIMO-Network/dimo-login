import React from 'react';

interface FilesRequestedNoteProps {
  brandName: string;
  fileLabels: string[];
}

// The files a share grants, shown next to the vehicle list so they aren't
// only in the collapsed contract text.
export const FilesRequestedNote: React.FC<FilesRequestedNoteProps> = ({
  brandName,
  fileLabels,
}) => (
  <section className="w-full max-w-[440px] mt-4 text-left">
    <p className="text-sm text-gray-600">
      Sharing also gives {brandName || 'the app'} access to these files for each vehicle:
    </p>
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Files requested">
      {fileLabels.map((label) => (
        <li
          key={label}
          className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-black"
        >
          {label}
        </li>
      ))}
    </ul>
  </section>
);
