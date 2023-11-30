import { CMAClient, Entry } from '@contentful/app-sdk';
import { ContentFields, KeyValueMap } from 'contentful-management';
import { Analytics } from './analytics';
import {
  AssetDecorator,
  CellModel,
  CellType,
  ClickableCellModel,
  EntryDecorator,
  IEntity,
  Row,
  LocalizableLinkRow,
  LocalizableRow,
  NonLocalizableLinkRow,
  NonLocalizableRow,
} from './components/Models';

interface IEntityLocales {
  type: string;
  locales: string[];
}

export class EntryTree {
  constructor(
    private locales: string[],
    private cma: CMAClient,
    private analytics: Analytics,
    private excludedContentTypes: string[]
  ) {}
  private entitiesCount: number = 0;
  private cacheHit: number = 0;
  private entitiesCache: Map<string, any> = new Map();
  private cacheHitRate() {
    return Math.round((this.cacheHit / (this.cacheHit + this.entitiesCount)) * 1000) / 10;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getEntity(func: (id: string) => any, entityId: string, entityType: string) {
    if (this.entitiesCache.get(entityId)) {
      this.cacheHit++;
      return this.entitiesCache.get(entityId);
    }

    this.analytics.logEntity(entityType);

    console.log(
      `Loading ${entityType} '${entityId}'... total queries: ${++this
        .entitiesCount}. Cache hit rate: ${this.cacheHitRate()}%`
    );
    const entity = await func(entityId).then((entiry: any) => {
      this.sleep(100);
      return entiry;
    });
    this.entitiesCache.set(entityId, entity);
    return entity;
  }

  private async getEntry(id: string) {
    return await this.getEntity(
      (id: string) => this.cma.entry.get({ entryId: id }),
      id,
      'entity'
    ).catch((ex) => {
      if (ex.message === 'The resource could not be found.') return null;
      throw ex;
    });
  }

  private async getAsset(id: string) {
    return await this.getEntity((id: string) => this.cma.asset.get({ assetId: id }), id, 'asset');
  }

  private async getContentType(id: string) {
    return await this.getEntity(
      (id: string) =>
        this.cma.contentType.get({
          contentTypeId: id,
        }),
      id,
      `content_type:${id}`
    );
  }

  private async loadEntryDecorator(entityId: string) {
    const entry = await this.getEntry(entityId);

    if (!entry) {
      console.debug(`Entity ${entityId} was not found in Contentful. Probably it was removed.`);
      return null;
    }
    const contentType = await this.getContentType(entry.sys.contentType.sys.id);
    return new EntryDecorator(entry, contentType);
  }

  private async getEntityRows(
    entityId: string,
    type: string,
    parentEntityType: string | null = null,
    visitedNodes: Set<string> = new Set()
  ): Promise<[Row[], IEntity] | null> {
    if (visitedNodes.has(entityId)) {
      console.debug(
        `Entity ID ${entityId} is recursively nested into current tree branch. Skipping it.`
      );
      return null;
    }

    visitedNodes.add(entityId); // Mark the node as visited

    if (type === 'Asset') {
      return this.getAssetRows(entityId);
    }

    const entryDecorator = await this.loadEntryDecorator(entityId);
    if (!entryDecorator) return null;

    if (parentEntityType && this.excludedContentTypes.includes(parentEntityType)) {
      return [[], entryDecorator];
    }

    const entityLevelRows: Row[] = [];
    for (const field of entryDecorator.contentType.fields) {
      if (this.isLinkedField(field)) {
        const row = await this.getLinkedRow(entryDecorator.entry, field, visitedNodes);
        if (row) entityLevelRows.push(row);
      } else if (field.localized) {
        const row = this.getFieldRow(entryDecorator.entry, field);
        if (row) entityLevelRows.push(row);
      }
    }
    return [entityLevelRows, entryDecorator];
  }

  protected isLinkedField(field: ContentFields<KeyValueMap>) {
    return field.type === 'Link' || (field.type === 'Array' && field.items && field.items.linkType);
  }

  protected getFieldRow(
    hostEntry: Entry<KeyValueMap>,
    field: ContentFields<KeyValueMap>,
    cellClickable: boolean = true
  ): Row | null {
    if (field.disabled) {
      return null;
    }

    if (!field.localized) {
      return new NonLocalizableRow(field.name);
    }

    const cells: CellModel[] = [];
    for (const locale of this.locales) {
      var fieldValue: string | null = null;

      if (hostEntry.fields[field.id]) {
        if (hostEntry.fields[field.id][locale] && hostEntry.fields[field.id][locale].sys)
          fieldValue = hostEntry.fields[field.id][locale].sys.id;
        else fieldValue = hostEntry.fields[field.id][locale];
      }
      cells.push(
        cellClickable
          ? new ClickableCellModel(field.name, fieldValue, locale)
          : new CellModel(field.name, fieldValue)
      );
    }
    return new LocalizableRow(field.name, cells);
  }

  protected async getLinkedRow(
    hostEntry: Entry<KeyValueMap>,
    field: ContentFields<KeyValueMap>,
    visitedNodes: Set<string>
  ): Promise<Row | null> {
    const entryType = hostEntry.sys.contentType.sys.id;

    const fieldLevelRow = await this.getFieldRow(hostEntry, field, false)!;
    fieldLevelRow.children = [];

    if (field.localized) {
      const localizedLinks: { locale: string; entityId: string; entityType: string }[] = [];
      const uniqueLinks: Map<string, IEntityLocales> = new Map();

      for (const locale of this.locales) {
        const links = this.getLinks(hostEntry, field, locale);
        for (const link of links) {
          localizedLinks.push({
            locale: locale,
            entityId: link.sys.id,
            entityType: link.sys.linkType,
          });
          uniqueLinks.set(link.sys.id, {
            type: link.sys.linkType,
            locales: uniqueLinks.get(link.sys.id)?.locales.concat(locale) || [locale],
          });
        }
      }

      for (const link of Array.from(uniqueLinks)) {
        const row = await this.linkedEntityLevelRow(
          field,
          link[0],
          link[1].type,
          link[1].locales,
          entryType,
          visitedNodes
        );
        if (row) fieldLevelRow.children.push(row);
      }
    } else {
      const links = this.getLinks(hostEntry, field, 'en-US');
      for (const link of links) {
        const row = await this.linkedEntityLevelRow(
          field,
          link.sys.id,
          link.sys.linkType,
          null,
          entryType,
          visitedNodes
        );
        if (row) fieldLevelRow.children.push(row);
      }
    }

    return fieldLevelRow.children.length > 0 ? fieldLevelRow : null;
  }

  private getLinks(entry: Entry<KeyValueMap>, field: ContentFields<KeyValueMap>, locale: string) {
    const value = entry.fields[field.id] ? entry.fields[field.id][locale] || null : null;
    return !value ? [] : field.type === 'Array' ? value : [value];
  }

  private async linkedEntityLevelRow(
    field: ContentFields<KeyValueMap>,
    entityId: string,
    entityType: string,
    entityLocales: string[] | null,
    parentEntityType: string,
    visitedNodes: Set<string>
  ): Promise<Row | null> {
    let cells: ClickableCellModel[] = [];
    const localized = field.localized && entityLocales;

    if (localized) {
      cells = this.locales.map(
        (l) =>
          new ClickableCellModel(
            l,
            entityLocales.indexOf(l) >= 0 ? '+' : null,
            l,
            CellType.EntryLevel
          )
      );
    }

    if (visitedNodes.has(entityId)) {
      console.debug(
        `Entity ID ${entityId} is recursively nested into current tree branch. Skipping it.`
      );
      const entry = await this.getEntry(entityId);
      const contentType = await this.getContentType(entry.sys.contentType.sys.id);
      const decorator = new EntryDecorator(entry, contentType);
      return localized
        ? new LocalizableLinkRow(decorator.name, decorator, cells, [], true)
        : new NonLocalizableLinkRow(decorator.name, decorator, [], true);
    }

    const children = await this.getEntityRows(entityId, entityType, parentEntityType);
    if (!children) return null;

    const entity = children[1];

    const entityLevelRow = localized
      ? new LocalizableLinkRow(entity.name, entity, cells, [])
      : new NonLocalizableLinkRow(entity.name, entity, []);

    entityLevelRow.children = children[0];
    return entityLevelRow;
  }

  protected async getAssetRows(assetId: string): Promise<[LocalizableRow[], IEntity] | null> {
    const asset = await this.getAsset(assetId);

    let rows: LocalizableRow[] = [];

    let titleCells: CellModel[] = [];
    let descriptionCells: CellModel[] = [];
    let fileCells: CellModel[] = [];

    for (const locale of this.locales) {
      const title = asset.fields.title ? asset.fields.title[locale] : '';
      titleCells.push(new ClickableCellModel('title', title, locale));

      const description = asset.fields.description ? asset.fields.description[locale] : '';
      descriptionCells.push(new ClickableCellModel('description', description, locale));

      const file = asset.fields.file[locale] ? asset.fields.file[locale].url || null : '';
      fileCells.push(new ClickableCellModel('file', file, locale, CellType.FieldImage));
    }

    rows.push(new LocalizableRow('title', titleCells));
    rows.push(new LocalizableRow('description', descriptionCells));
    rows.push(new LocalizableRow('file', fileCells));

    return Promise.resolve([rows, new AssetDecorator(asset)]);
  }

  public getRowsTree(entryId: string): Promise<Row[]> {
    return this.getEntityRows(entryId, 'Entry')
      .then((result) => {
        return result ? result[0] : [];
      })
      .then((result) => {
        this.analytics.logCacheHitRate(this.cacheHitRate());
        return result;
      });
  }
}
