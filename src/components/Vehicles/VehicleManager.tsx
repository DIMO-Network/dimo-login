import React, { useEffect, useState } from 'react';

import { useAuthContext } from '../../context/AuthContext';
import { useDevCredentials } from '../../context/DevCredentialsContext';
import { getTemplateDescription } from '../../services/permissionsService';
import { Header, ErrorMessage } from '../Shared';
import { useUIManager } from '../../context/UIManagerContext';
import SelectVehicles from './SelectVehicles';
import { getAppUrl } from '../../utils/urlHelpers';
import { VehicleManagerMandatoryParams } from '../../types/params';

export const VehicleManager: React.FC = () => {
  const { user } = useAuthContext();
  const {
    clientId,
    devLicenseAlias,
    permissionTemplateId,
    permissions,
    cloudEvent,
    expirationDate,
    region,
  } = useDevCredentials<VehicleManagerMandatoryParams>();
  const { setComponentData, error, setError } = useUIManager();

  //Data from SDK
  const [templateDescription, setTemplateDescription] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean | undefined>(false);

  const fetchPermissions = async () => {
    if (permissionTemplateId || permissions) {
      try {
        setComponentData({
          ...(permissionTemplateId && { permissionTemplateId }),
          ...(permissions && { permissions }),
        });
        setTemplateDescription(
          getTemplateDescription({
            email: user.email,
            devLicenseAlias,
            permissions,
            permissionTemplateId,
            fileTags: cloudEvent?.tags,
            expirationDate,
            region: region?.toUpperCase(),
          }),
        );
      } catch (error) {
        setError('Could not fetch permissions');
        console.error('Error fetching permissions:', error);
      }
    }
  };

  useEffect(() => {
    Promise.all([fetchPermissions()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user.smartContractAddress,
    clientId,
    permissionTemplateId,
    permissions,
    devLicenseAlias,
  ]);

  const renderDescription = (description: string) => {
    const paragraphs = description.split('\n\n');

    // Show only the first paragraph by default, and the rest will be shown when expanded
    const firstParagraph = paragraphs[0];

    return (
      <div>
        {/* Render the first paragraph or the entire description based on the `isExpanded` state */}
        {isExpanded ? (
          description.split('\n\n').map((paragraph, index) => {
            const hasBulletPoints = paragraph.includes('- ');
            const isLink = paragraph.includes('http');
            return (
              <React.Fragment key={index}>
                {/* Check if the paragraph contains bullet points */}
                {hasBulletPoints && (
                  <ul className="list-disc list-inside mb-4">
                    {paragraph.split('\n-').map((line, i) =>
                      i === 0 ? (
                        <p key={i} className="mb-2">
                          {line.trim()}
                        </p>
                      ) : (
                        <li key={i} className="ml-4">
                          {line.trim()}
                        </li>
                      ),
                    )}
                  </ul>
                )}
                {/* Check if the paragraph contains a link */}
                {isLink && (
                  <p
                    className="mb-4 text-zinc-500 underline cursor-pointer"
                    dangerouslySetInnerHTML={
                      // Use `dangerouslySetInnerHTML` to render HTML content
                      {
                        __html: paragraph.replace(/(\r\n|\n|\r)/gm, '<br />'),
                      }
                    }
                  ></p>
                )}
                {/* Render paragraph without bullet points or links */}
                {!hasBulletPoints && !isLink && <p className="mb-4">{paragraph}</p>}
              </React.Fragment>
            );
          })
        ) : (
          <p className="mb-4">{firstParagraph}</p> // Show only the first paragraph
        )}
      </div>
    );
  };

  const renderPermissionDescription = () => {
    return renderDescription(templateDescription);
  };

  const appUrl = getAppUrl();

  return (
    <>
      <Header
        title={`${devLicenseAlias} wants to use DIMO to connect to your vehicles data`}
        subtitle={appUrl.hostname}
        link={`${appUrl.protocol}//${appUrl.host}`}
      />
      <div className="flex flex-col items-center justify-center max-h-[480px] lg:max-h-[584px] box-border overflow-y-auto w-full">
        {error && <ErrorMessage message={error} />}

        <>
          <div className="description w-fit w-full mt-2 text-sm overflow-y-auto font-normal text-[#313131]">
            {renderPermissionDescription()}
          </div>
          <div className="w-full">
            <button
              className="bg-white w-[145px] text-[#09090B] font-medium text-sm text-left underline decoration-[#D4D4D8]"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          </div>
        </>

        {(permissionTemplateId || permissions) && <SelectVehicles />}
      </div>
    </>
  );
};

export default VehicleManager;
