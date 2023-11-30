import { useEffect, useState } from 'react';
import { ErrorCircleOutlineIcon } from '@contentful/f36-icons';
import { EditorExtensionSDK } from '@contentful/app-sdk';
import {
  Table,
  Skeleton,
  Badge,
  ModalLauncher,
  Modal,
  Paragraph,
} from '@contentful/f36-components';

import '../css/styles.css';
import { EntryTree } from '../entityTree';
import { Analytics } from '../analytics';

import LocalizedCell from './LocalizedCell';
import {
  MatrixTableModel,
  LocalizableRow,
  NonLocalizableRow,
  MatrixComponentModel,
  Row,
} from './Models';
import RowHeader from './RowHeader';

const countRows = (rows: Row[]) => {
  const subsum: number = rows.reduce(
    (counter: number, row) => counter + countRows(row.children),
    0
  );

  return rows.length + subsum;
};

const Matrix = ({
  matrixModel,
  sdk,
  analytics,
  excludedContentTypes,
}: {
  matrixModel: MatrixComponentModel;
  sdk: EditorExtensionSDK;
  analytics: Analytics;
  excludedContentTypes: string[];
}) => {
  const [tableData, setTableData] = useState<MatrixTableModel | undefined>();

  const locales = matrixModel.filters.locales;
  const itemId = matrixModel.itemId;
  const cma = matrixModel.cma;

  useEffect(() => {
    (async () => {
      try {
        console.debug('Loading data for the matrix...');
        setTableData(undefined);
        const timeFrom = Date.now();

        const tree = new EntryTree(locales, cma, analytics, excludedContentTypes);
        const treeData = await tree.getRowsTree(itemId);
        const tableModel = new MatrixTableModel(locales, treeData);

        setTableData(tableModel);

        analytics.logRows(countRows(tableModel.rows)).logLoadingTime(Date.now() - timeFrom);

        console.debug('Done loading data.', treeData, tableModel);
      } catch (ex) {
        if (ex instanceof Error) {
          analytics.logError(ex);
        }
        console.error(ex);
        showError();
      } finally {
        analytics.send();
      }
    })();
  }, [analytics, cma, excludedContentTypes, itemId, locales]);

  analytics.logFilters(matrixModel.filters);

  const localesInHeadRow = (locale: string) => (
    <Table.Cell align="center">
      <b>{locale}</b>
    </Table.Cell>
  );

  const showError = () => {
    ModalLauncher.open(({ isShown, onClose }) => (
      <Modal onClose={() => onClose(false)} isShown={isShown}>
        {() => (
          <>
            <Modal.Header title="Unexpected error" onClose={() => onClose()} />
            <Modal.Content>
              <ErrorCircleOutlineIcon variant="negative"></ErrorCircleOutlineIcon>
              <Paragraph>
                Ooops... Unexpected error happened. You can either contact the contentful admin, or
                check the console of your browser to get details about the error.
              </Paragraph>
            </Modal.Content>
          </>
        )}
      </Modal>
    ));
  };

  const needToDrawLine = (row: Row, allRows: Row[]) =>
    !(allRows.indexOf(row) + 1 === allRows.length);

  const rows = (row: Row, indentLinesConfig: boolean[]): JSX.Element[] => {
    const allRows: JSX.Element[] = [];

    if (row.visible(matrixModel.filters))
      allRows.push(
        <Table.Row>
          <th css="header-th">
            <RowHeader row={row} indentLinedConfig={indentLinesConfig} sdk={sdk} />
          </th>
          {row instanceof LocalizableRow && row.cells.map((cell) => <LocalizedCell cell={cell} />)}
          {row instanceof NonLocalizableRow && (
            <Table.Cell
              style={{ textAlign: 'center', padding: 0 }}
              className="cell-basic"
              colSpan={locales.length}>
              <Badge variant="secondary" size="small">
                Non-localizable
              </Badge>
            </Table.Cell>
          )}
        </Table.Row>
      );

    return allRows.concat(
      row.children.flatMap((kid) =>
        rows(kid, indentLinesConfig.concat(needToDrawLine(kid, row.children)))
      )
    );
  };

  const skeletonRowBasic = (locales: string[]) => (
    <Table>
      <Table.Head>
        <Table.Row style={{ whiteSpace: 'nowrap' }}>
          <Table.Cell className="cell-basic"></Table.Cell>
          {locales.map(localesInHeadRow)}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        <Skeleton.Row rowCount={5} columnCount={locales.length + 1} />
      </Table.Body>
    </Table>
  );

  return tableData ? (
    <div>
      <Table style={{ marginBottom: '30px' }}>
        <Table.Head isSticky={true}>
          <Table.Row style={{ whiteSpace: 'nowrap' }}>
            <Table.Cell></Table.Cell>
            {tableData.locales.map(localesInHeadRow)}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {tableData.rows.flatMap((kid) => rows(kid, [needToDrawLine(kid, tableData.rows)]))}
        </Table.Body>
      </Table>
    </div>
  ) : (
    <>{skeletonRowBasic(locales)}</>
  );
};

export default Matrix;
