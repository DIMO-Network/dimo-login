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
      <p>
        <a
          href={`https://assets.dimo.org/ipfs/${link[1]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline underline-offset-2"
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
      <div className="flex flex-col gap-1">
        {intro.map((line, i) => (
          <p key={`intro-${i}`}>{line.trim()}</p>
        ))}
        <ul className="list-disc pl-[18px]">
          {bullets.map((line, i) => (
            <li key={i}>{line.slice(2).trim()}</li>
          ))}
        </ul>
      </div>
    );
  }

  return <p className="whitespace-pre-line">{text}</p>;
};

export const ContractDescription = ({
  description,
  isExpanded = true,
  lang,
}: {
  description: string;
  isExpanded?: boolean;
  /** Set when the text isn't in the language on screen (the English original). */
  lang?: string;
}) => {
  const paragraphs = description.split('\n\n').filter((p) => p.trim());
  // Show only the first paragraph until expanded.
  const shown = isExpanded ? paragraphs : paragraphs.slice(0, 1);
  return (
    <div
      lang={lang}
      className="flex flex-col gap-2 rounded-control bg-card px-3.5 py-3 text-code text-fg"
    >
      {shown.map((paragraph, index) => (
        <Paragraph key={index} text={paragraph} />
      ))}
    </div>
  );
};

export default ContractDescription;
