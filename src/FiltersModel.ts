export class FiltersModel {
  constructor(
    public locales: string[],
    public hideLocalized: boolean,
    public hideFullyNonLocalized: boolean
  ) {}
}

export class FilterLocaleMode {
  constructor(public id: string, public name: string, public locales: string[]) {}
}
