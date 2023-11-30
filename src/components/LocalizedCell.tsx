import {ReactElement, useState} from 'react';

import { Table, Tooltip } from '@contentful/f36-components';
import { CloseIcon, DoneIcon, MinusIcon, PlusIcon } from '@contentful/f36-icons';
import { Popover } from '@mui/material';

import { CellModel, CellType, ClickableCellModel } from './Models';

const RowHeader = ({ cell }: { cell: CellModel }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  let clickableOkIcon: ReactElement;

  if (cell.type === CellType.FieldImage) {
    clickableOkIcon = (
      <>
        <Popover
          id="mouse-over-popover"
          sx={{
            pointerEvents: 'none',
          }}
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          onClose={handlePopoverClose}
          disableRestoreFocus>
          <img alt={cell.value || undefined} src={cell.value || undefined} width="300px"></img>
        </Popover>
        <DoneIcon
          size="medium"
          variant="positive"
          onMouseEnter={handlePopoverOpen}
          onMouseLeave={handlePopoverClose}
        />
      </>
    );
  } else if (cell.type === CellType.EntryLevel) {
    clickableOkIcon = (
      <Tooltip placement="bottom" content={`This entity is used in '${cell.locale}'`}>
        <PlusIcon size="medium" variant="positive" />
      </Tooltip>
    );
  } else
    clickableOkIcon = (
      <Tooltip placement="bottom" content={cell.value || ''}>
        <DoneIcon size="medium" variant="positive" />
      </Tooltip>
    );

  const nonClickableOkIcon =
    cell.type === CellType.EntryLevel ? (
      <PlusIcon size="medium" variant="positive" />
    ) : (
      <DoneIcon size="medium" variant="positive" />
    );

  const nokIcon =
    cell.type === CellType.EntryLevel ? (
      <Tooltip placement="bottom" content={`This entity is not used in '${cell.locale}'`}>
        <MinusIcon size="medium" variant="negative" />
      </Tooltip>
    ) : (
      <CloseIcon size="small" variant="warning"></CloseIcon>
    );

  const icon = cell.value
    ? cell instanceof ClickableCellModel
      ? clickableOkIcon
      : nonClickableOkIcon
    : nokIcon;

  return (
    <Table.Cell align="center" className="cell-basic">
      {icon}
    </Table.Cell>
  );
};

export default RowHeader;
