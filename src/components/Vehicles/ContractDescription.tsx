import React from 'react';

import { POLICY_ATTACHMENT_CID_BY_REGION } from '../../enums';

// The contract text includes values other parties control (the license alias,
// the requested files), so it is rendered as text only, never as HTML. The one
// link DIMO adds itself, the policy attachment, is recognised by its exact
// shape and one of DIMO's own policy documents, and rendered as a real anchor.
// Anything else, including a look-alike injected through a license alias, is
// shown as text.
const ATTACHMENT_LINK =
  /^<a href="https:\/\/assets\.dimo\.org\/ipfs\/([A-Za-z0-9]+)" target="_blank">([^<]*)<\/a>$/;
const POLICY_CIDS: readonly string[] = Object.values(POLICY_ATTACHMENT_CID_BY_REGION);

const Paragraph = ({ text }: { text: string }) => {
  const link = text.trim().match(ATTACHMENT_LINK);
  if (link && POLICY_CIDS.includes(link[1])) {
    return (
      <p className="mb-4">
        <a
          href={`https://assets.dimo.org/ipfs/${link[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 underline"
        >
          {link[2]}
        </a>
      </p>
    );
  }

  const lines = text.split('\n');
  const bullets = lines.filter((line) => line.startsWith('- '));
  if (bullets.length) {
    const intro = lines.filter((line) => !line.startsWith('- ') && line.trim());
    return (
      <ul className="list-disc list-inside mb-4">
        {intro.map((line, i) => (
          <p key={`intro-${i}`} className="mb-2">
            {line.trim()}
          </p>
        ))}
        {bullets.map((line, i) => (
          <li key={i} className="ml-4">
            {line.slice(2).trim()}
          </li>
        ))}
      </ul>
    );
  }

  return <p className="mb-4">{text}</p>;
};

export const ContractDescription = ({
  description,
  isExpanded,
}: {
  description: string;
  isExpanded: boolean;
}) => {
  const paragraphs = description.split('\n\n').filter((p) => p.trim());
  // Show only the first paragraph until expanded.
  const shown = isExpanded ? paragraphs : paragraphs.slice(0, 1);
  return (
    <div>
      {shown.map((paragraph, index) => (
        <Paragraph key={index} text={paragraph} />
      ))}
    </div>
  );
};

export default ContractDescription;
