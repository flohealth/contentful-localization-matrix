import { ParametersAPI } from '@contentful/app-sdk';
import { FilterLocaleMode } from './FiltersModel';

export class Config {
  constructor(private parameters: ParametersAPI) {}
  private errorMsg =
    'Unable to parse locales_all_order into string array of locales, separated by comma. Please confirm the format is correct: en-US, pt-BR';

  public analyticsHost = this.parameters.installation['analytics_host'] as string;

  public hideFullyLocalized =
    (this.parameters.instance['filter_fully_localized'] as boolean | undefined) || false;
  public hideFullyNonLocalized =
    (this.parameters.instance['filter_fully_non_localized'] as boolean | undefined) || false;

  public defaultLocale: string = (() => {
    if (!this.parameters.instance['locales_default'])
      throw Error('Default locale was not set in instance parameter locales_default');

    return this.parameters.instance['locales_default'] as string;
  })();

  public splitCommaSeparatedString(str: string, errorMsg: string) {
    try {
      return str
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
    } catch (ex) {
      console.error(ex);

      throw Error(errorMsg);
    }
  }

  public localesOrder: string[] | undefined = (() => {
    if (!this.parameters.instance['locales_all_order']) return undefined;
    return this.splitCommaSeparatedString(
      this.parameters.instance['locales_all_order'] as string,
      this.errorMsg
    );
  })();

  public localesAllOption: boolean = !!this.localesOrder;
  public localesClearAll: boolean =
    (this.parameters.instance['locales_clear_all'] as boolean | undefined) || false;
  public localesModes: FilterLocaleMode[] = this.parseFilterModes();

  public excludedContentTypes = this.splitCommaSeparatedString(
    this.parameters.instance['break_on_content_type'] as string | '',
    'Unable to parse break_on_content_type into string array of content types, separated by comma.'
  );

  parseFilterModes(): FilterLocaleMode[] {
    const modes = Object.keys(this.parameters.instance)
      .filter((key) => key.startsWith('locales_mode'))
      .map((key) => {
        const modeValue = this.parameters.instance[key] as string;
        if (modeValue.indexOf(':') < 0)
          throw Error(
            `Unable to parse instance parameter ${key}: "${modeValue}". It must be in the following format: "<Mode display name>: en-US, fr-FR"`
          );

        const name = modeValue.substring(0, modeValue.indexOf(':'));
        const locales = modeValue.substring(modeValue.indexOf(':') + 1, modeValue.length);
        return new FilterLocaleMode(
          key,
          name,
          this.splitCommaSeparatedString(locales, this.errorMsg)
        );
      });

    return modes;
  }
}
