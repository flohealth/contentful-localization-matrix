// EntryTree.test.ts
import { CMAClient } from '@contentful/app-sdk';
import { Analytics } from './analytics';
import {
  LocalizableRow,
  ClickableCellModel,
  NonLocalizableRow,
  NonLocalizableLinkRow,
  AssetDecorator,
  EntryDecorator,
  CellType,
} from './components/Models';
import { EntryTree } from './entityTree';

describe('EntryTree', () => {
  let entryTree: EntryTree;
  let mockCMAClient: any;
  let mockAnalytics: any;

  const rootEntry = {
    sys: { id: 'rootEntry', contentType: { sys: { id: 'rootContentType' } } },
    fields: {
      title: { 'en-US': 'Root Title' },
      description: { 'en-US': 'Root Description' },
      nonLocalizedField: 'A non-localized value',
      linkedEntries: {
        'en-US': [
          { sys: { id: 'linkedEntry1', linkType: 'Entry' } },
          { sys: { id: 'linkedEntry2', linkType: 'Entry' } },
        ],
      },
      linkedAsset: {
        'en-US': { sys: { id: 'linkedAsset', linkType: 'Asset' } },
      },
    },
  };

  const linkedEntry1 = {
    sys: { id: 'linkedEntry1', contentType: { sys: { id: 'linkedContentType' } } },
    fields: {
      name: { 'en-US': 'Name 1' },
      info: 'Non-localized info for Linked Entry 1',
    },
  };

  const linkedEntry2 = {
    sys: { id: 'linkedEntry2', contentType: { sys: { id: 'linkedContentType' } } },
    fields: {
      name: { 'en-US': 'Name 2' },
      info: 'Non-localized info for Linked Entry 2',
    },
  };

  const linkedAsset = {
    sys: { id: 'linkedAsset', contentType: { sys: { id: 'assetContentType' } } },
    fields: {
      title: { 'en-US': 'Asset Title' },
      file: { 'en-US': { url: '/path/to/asset' } },
    },
  };

  const contentTypes = {
    rootContentType: {
      sys: { id: 'rootContentType' },
      fields: [
        { id: 'title', name: 'Title', type: 'Text', localized: true },
        { id: 'description', name: 'Description', type: 'Text', localized: true },
        {
          id: 'nonLocalizedField',
          name: 'Non-localized Field',
          type: 'Text',
          localized: false,
        },
        {
          id: 'linkedEntries',
          name: 'Linked Entries',
          type: 'Array',
          items: { linkType: 'Entry' },
        },
        { id: 'linkedAsset', name: 'Linked Asset', type: 'Link', linkType: 'Asset' },
      ],
    },
    linkedContentType: {
      sys: { id: 'linkedContentType' },
      displayField: 'name',
      fields: [
        { id: 'name', name: 'Name', type: 'Text', localized: true },
        { id: 'info', name: 'Info', type: 'Text', localized: false },
      ],
    },
    assetContentType: {
      sys: { id: 'assetContentType' },
      fields: [
        { id: 'title', name: 'Title', type: 'Text', localized: true },
        { id: 'file', name: 'File', type: 'Link', localized: false },
      ],
    },
  };

  beforeEach(() => {
    mockCMAClient = {
      entry: {
        get: jest.fn().mockImplementation((params: { entryId: string }) => {
          const entries = { rootEntry, linkedEntry1, linkedEntry2, linkedAsset };
          return Promise.resolve((entries as any)[params.entryId]);
        }),
      },
      asset: {
        get: jest.fn().mockImplementation((params: { assetId: string }) => {
          return Promise.resolve(linkedAsset);
        }),
      },
      contentType: {
        get: jest.fn().mockImplementation((params: { contentTypeId: string }) => {
          return Promise.resolve((contentTypes as any)[params.contentTypeId]);
        }),
      },
    };

    mockAnalytics = {
      logEntity: jest.fn(),
      logCacheHitRate: jest.fn(),
    };

    entryTree = new EntryTree(
      ['en-US'],
      mockCMAClient as CMAClient,
      mockAnalytics as Analytics,
      []
    );
  });

  it('should build the tree based on test state', async () => {
    const testEntryId = 'rootEntry';
    const expectedTreeStructure = [
      new LocalizableRow('Title', [new ClickableCellModel('Title', 'Root Title', 'en-US')]),
      new LocalizableRow('Description', [
        new ClickableCellModel('Description', 'Root Description', 'en-US'),
      ]),

      new NonLocalizableRow('Linked Entries', [
        new NonLocalizableLinkRow(
          'Name 1',
          new EntryDecorator(linkedEntry1 as any, contentTypes.linkedContentType as any),
          [new LocalizableRow('Name', [new ClickableCellModel('Name', 'Name 1', 'en-US')])]
        ),
        new NonLocalizableLinkRow(
          'Name 2',
          new EntryDecorator(linkedEntry2 as any, contentTypes.linkedContentType as any),
          [new LocalizableRow('Name', [new ClickableCellModel('Name', 'Name 2', 'en-US')])]
        ),
      ]),

      new NonLocalizableRow('Linked Asset', [
        new NonLocalizableLinkRow('Asset', new AssetDecorator(linkedAsset as any), [
          new LocalizableRow('title', [new ClickableCellModel('title', 'Asset Title', 'en-US')]),
          new LocalizableRow('description', [new ClickableCellModel('description', '', 'en-US')]),
          new LocalizableRow('file', [
            new ClickableCellModel('file', '/path/to/asset', 'en-US', CellType.FieldImage),
          ]),
        ]),
      ]),
    ];

    const tree = await entryTree.getRowsTree(testEntryId);

    expect(tree).toEqual(expectedTreeStructure);
  });
});
