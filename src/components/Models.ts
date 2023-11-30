import { CMAClient, Entry } from '@contentful/app-sdk';
import { EntityStatus } from '@contentful/f36-components';
import {
  AssetProps,
  ContentTypeProps,
  KeyValueMap,
  isPublished,
  isUpdated,
  isDraft,
  EntityMetaSysProps,
} from 'contentful-management';

import { FiltersModel } from '../FiltersModel';

export enum CellType {
  FieldText, // simple field-level text cell
  FieldImage, // simple field-level image cell
  EntryLevel, // indicates belonging of an entry to a field's locale
}

export class CellModel {
  constructor(
    public locale: string,
    public value: string | null,
    public type: CellType = CellType.FieldText
  ) {}
}

export class ClickableCellModel extends CellModel {
  constructor(
    public field: string,
    public value: string | null,
    public locale: string,
    public type: CellType = CellType.FieldText
  ) {
    super(locale, value, type);
  }
}

export abstract class Row {
  constructor(public fieldName: string, public children: Row[]) {}

  fullyLocalized(): boolean {
    return this.children.every((c) => c.fullyLocalized());
  }

  fullyNonLocalized(): boolean {
    return this.children.every((c) => c.fullyNonLocalized());
  }

  public visible(filter: FiltersModel): boolean {
    return this.children.some((c) => c.visible(filter));
  }
}

export class LocalizableRow extends Row {
  constructor(public fieldName: string, public cells: CellModel[], public children: Row[] = []) {
    super(fieldName, children);
  }

  fullyLocalized(): boolean {
    return this.children.length === 0 ? this.cells.every((c) => c.value) : super.fullyLocalized();
  }

  fullyNonLocalized() {
    return this.children.length === 0
      ? this.cells.every((c) => !c.value)
      : super.fullyNonLocalized();
  }

  visible(filters: FiltersModel): boolean {
    let visible = true;
    if (filters.hideLocalized && this.fullyLocalized()) visible = false;
    if (filters.hideFullyNonLocalized && this.fullyNonLocalized()) visible = false;

    return visible;
  }
}

export class NonLocalizableRow extends Row {
  constructor(public fieldName: string, public children: Row[] = []) {
    super(fieldName, children);
  }
}

export class LocalizableLinkRow extends LocalizableRow {
  constructor(
    public fieldName: string,
    public entity: IEntity,
    public cells: CellModel[],
    public children: Row[] = [],
    circular: boolean = false
  ) {
    super(fieldName, cells, children);
    this.circular = circular;
  }
  public circular: boolean;
}

export class NonLocalizableLinkRow extends NonLocalizableRow {
  constructor(
    public fieldName: string,
    public entity: IEntity,
    public children: Row[] = [],
    circular: boolean = false
  ) {
    super(fieldName, children);
    this.circular = circular;
  }
  public circular: boolean;
}

export class MatrixTableModel {
  constructor(public locales: string[], public rows: Row[]) {}
}

export class MatrixComponentModel {
  constructor(
    public filters: FiltersModel,
    public itemId: string,
    public itemType: string,
    public cma: CMAClient,
    public pathSegment: string,
    public onClose: () => void
  ) {}
}

export interface IEntity {
  status: EntityStatus;
  name: string;
  id: string;
  type: string;
  contentTypeId: string;
}

export class EntityBase {
  constructor(entity: { sys: EntityMetaSysProps }) {
    this.id = entity.sys.id;
    this.type = entity.sys.type;
    this.status = this.getStatus(entity);
  }

  public id: string;
  public type: string;
  public status: EntityStatus;

  private getStatus(entity: { sys: EntityMetaSysProps }): EntityStatus {
    if (!!entity.sys.archivedVersion) return 'archived';
    if (isDraft(entity)) return 'draft';
    if (isUpdated(entity)) return 'changed';
    if (isPublished(entity)) return 'published';
    return 'deleted';
  }
}

export class EntryDecorator extends EntityBase implements IEntity {
  constructor(entry: Entry<KeyValueMap>, type: ContentTypeProps) {
    super(entry);

    this.name = entry.fields[type.displayField]?.['en-US'] || '<undefined value>';
    this.contentTypeId = entry.sys.contentType.sys.id;
    this.contentType = type;
    this.entry = entry;
  }

  public contentTypeId: string;
  public name: string;
  public contentType: ContentTypeProps;
  public entry: Entry<KeyValueMap>;
}

export class AssetDecorator extends EntityBase implements IEntity {
  constructor(asset: AssetProps) {
    super(asset);
    this.name = 'Asset';
  }

  public contentTypeId: string = 'asset';
  public name: string;
}
