import React, {FC, useState} from "react";
import {ChevronDownIcon, ChevronUpIcon} from "@heroicons/react/24/solid";

const DEFAULT_DESCRIPTION = 'The developer is requesting access to view your vehicle data. Select the vehicles you’d like to share access to.';
interface IProps {
  description?: string;
}
export const Description: FC<IProps> = ({ description }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  return (
    <>
      <div className="description w-fit max-w-[440px] mt-2 text-sm mb-4 overflow-y-auto max-h-[356px]">
        {description
          ? <ExpandedDescription description={description ?? ''} isExpanded={isExpanded} />
          : DEFAULT_DESCRIPTION}
      </div>
      <div className="w-full max-w-[440px]">
        <button
          className="bg-white w-[145px] text-[#09090B] font-medium border border-gray-300 px-4 py-2 rounded-3xl hover:border-gray-500 flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>{isExpanded ? "Show less" : "Show more"}</span>
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 ml-2" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 ml-2" />
          )}
        </button>
      </div>
    </>
  )
}

const ExpandedDescription: FC<{description: string; isExpanded: boolean}> = ({ description, isExpanded }) => {
  const paragraphs = description?.split("\n\n");

  // Show only the first paragraph by default, and the rest will be shown when expanded
  const firstParagraph = paragraphs[0];
  return (
    <div>
      {/* Render the first paragraph or the entire description based on the `isExpanded` state */}
      {isExpanded ? (
        description.split("\n\n").map((paragraph, index) => (
          <React.Fragment key={index}>
            {/* Check if the paragraph contains bullet points */}
            {paragraph.includes("- ") ? (
              <ul className="list-disc list-inside mb-4">
                {paragraph.split("\n-").map((line, i) =>
                  i === 0 ? (
                    <p key={i} className="mb-2">
                      {line.trim()}
                    </p>
                  ) : (
                    <li key={i} className="ml-4">
                      {line.trim()}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="mb-4">{paragraph}</p>
            )}
          </React.Fragment>
        ))
      ) : (
        <p className="mb-4">{firstParagraph}</p> // Show only the first paragraph
      )}
    </div>
  );

}
