import { EditorExtensionSDK } from '@contentful/app-sdk';
import { InlineEntryCard, Flex, Tooltip } from '@contentful/f36-components';
import { LinkIcon, LinkAlternateIcon, CycleIcon } from '@contentful/f36-icons';
import { Typography } from '@mui/material';

import { Row, LocalizableLinkRow, NonLocalizableLinkRow } from './Models';

const emptyIndent = <div className="empty-box-style"></div>;
const lineIndent = <div className="box-style"></div>;
const lastIndent = (
  <div>
    <div className="box-last-style-top"></div>
    <div className="box-last-style box-last-style-bottom"></div>
  </div>
);

const FIELD_VALUE_LENGTH = 20;

const RowHeader = ({
  row,
  indentLinedConfig,
  sdk,
}: {
  row: Row;
  indentLinedConfig: boolean[];
  sdk: EditorExtensionSDK;
}) => {
  const shorten = row.fieldName.length > FIELD_VALUE_LENGTH;

  function drawIndent() {
    const indents = [];
    for (let index = 0; index < indentLinedConfig.length; index++) {
      if (index === indentLinedConfig.length - 1) indents.push(lastIndent);
      else if (indentLinedConfig[index]) indents.push(lineIndent);
      else indents.push(emptyIndent);
    }

    return indents;
  }

  const displayFieldValue = (raw: string) => {
    return raw.length > FIELD_VALUE_LENGTH ? `${raw.substring(0, FIELD_VALUE_LENGTH)}...` : raw;
  };

  const buildUrl = (row: LocalizableLinkRow | NonLocalizableLinkRow) => {
    const main = `https://app.contentful.com/spaces/${sdk.ids.space}`;

    const productionList = ['prod', 'production', 'master'];
    // use alias if it exists, otherwise use environment
    const env = sdk.ids.environmentAlias ? sdk.ids.environmentAlias : sdk.ids.environment;
    const envPart = productionList.includes(env.toLowerCase()) ? '' : `environments/${env}`;

    const entityType = row.entity.type === 'Asset' ? 'assets' : 'entries';

    return envPart
      ? `${main}/${envPart}/${entityType}/${row.entity.id}`
      : `${main}/${entityType}/${row.entity.id}`;
  };

  return (
    <div style={{ display: 'flex', marginLeft: '20px', alignItems: 'flex-start' }}>
      {drawIndent()}
      <div className="box-title">
        {row instanceof LocalizableLinkRow || row instanceof NonLocalizableLinkRow ? (
          <a className="entry-card-link" target="_blank" rel="noreferrer" href={buildUrl(row)}>
            <InlineEntryCard className="entry-card" as="fieldset" status={row.entity.status}>
              <Flex alignItems="center">
                {row.circular ? (
                  <Tooltip
                    placement="bottom"
                    content={'This entry has already been referenced in one of the parent entries'}>
                    <CycleIcon />
                  </Tooltip>
                ) : (
                  <></>
                )}
                <Tooltip placement="bottom" content={`Content Type: ${row.entity.contentTypeId}`}>
                  <LinkAlternateIcon />
                </Tooltip>
                &nbsp;
                {shorten ? (
                  <Tooltip placement="right" content={row.fieldName}>
                    <Typography variant="body2" className="link-row-name">
                      {displayFieldValue(row.fieldName)}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="body2">{displayFieldValue(row.fieldName)}</Typography>
                )}
              </Flex>
            </InlineEntryCard>
          </a>
        ) : (
          <>
            {shorten ? (
              <Tooltip placement="right" content={row.fieldName}>
                <Typography variant="body2">{displayFieldValue(row.fieldName)}</Typography>
              </Tooltip>
            ) : (
              <Typography variant="body2">{displayFieldValue(row.fieldName)}</Typography>
            )}
            {row.children.length ? (
              <>
                {' '}
                &emsp;
                <LinkIcon /> <Typography variant="body2">&nbsp;{row.children.length}</Typography>
              </>
            ) : (
              <></>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RowHeader;
