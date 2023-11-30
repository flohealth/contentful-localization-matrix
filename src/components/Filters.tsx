import { useState } from 'react';

import {
  Box,
  Button,
  Flex,
  Grid,
  Menu,
  Paragraph,
  Radio,
  Switch,
  Text,
} from '@contentful/f36-components';
import { ChevronDownIcon } from '@contentful/f36-icons';

import { Config } from '../Config';
import { FilterLocaleMode, FiltersModel } from '../FiltersModel';

const Filters = ({
  locales,
  onChange,
  defaultLocale,
  config,
}: {
  locales: string[];
  onChange: (filter: FiltersModel) => void;
  defaultLocale: string;
  config: Config;
}) => {
  console.debug('Initializing filter with locales', locales);

  const firstModeLocales = config.localesModes.length > 0 ? config.localesModes[0].locales : [];
  const defaultSelectedLocales =
    firstModeLocales.indexOf(defaultLocale) < 0
      ? firstModeLocales.concat(defaultLocale)
      : firstModeLocales;

  const [selectedLocales, setSelectedLocales] = useState<string[]>(defaultSelectedLocales);
  const [hideNonLocalized, setHideNonLocalized] = useState<boolean>(false);
  const [hideLocalized, setHideLocalized] = useState<boolean>(false);
  const [modeChecked, setModeChecked] = useState<boolean[]>(
    config.localesModes.map((mode, index) => index === 0)
  );
  const [allChecked, setAllChecked] = useState<boolean>(false);

  const sortLocales = (unsorted: string[]): string[] => {
    if (!config.localesOrder) return unsorted;

    const unknownLocales = config.localesOrder.filter((x) => !unsorted.includes(x));
    if (unknownLocales.length > 0) {
      console.warn(
        `Unknown locales found in locales_all_order instance parameter, and will be skipped`,
        unknownLocales
      );
    }

    const sortedLocalesSet: string[] = config.localesOrder.filter((x) => unsorted.includes(x));

    return sortedLocalesSet.concat(unsorted.filter((x) => !config.localesOrder!.includes(x)));
  };

  const sortedLocales = sortLocales(locales);

  const onChecked = (index: number) => {
    const selected = [...selectedLocales];
    if (selected.indexOf(sortedLocales[index]) < 0) selected.push(sortedLocales[index]);
    else selected.splice(selected.indexOf(sortedLocales[index]), 1);
    setSelectedLocales(selected);
  };

  const onApplyClicked = () => {
    onChange(new FiltersModel(sortLocales(selectedLocales), hideLocalized, hideNonLocalized));
  };

  const setFilter = (mode: string) => {
    if (mode === 'hide-non-localized') setHideNonLocalized((hideNonLocalized) => !hideNonLocalized);
    else if (mode === 'hide-localized') setHideLocalized((hideLocalized) => !hideLocalized);
  };

  const modesMap = new Map<string, FilterLocaleMode | undefined>();
  modesMap.set('all', undefined);
  modesMap.set('uncheck', undefined);
  config.localesModes.map((mode) => modesMap.set(mode.id, mode));

  const onLocaleModeChanged = (modeId: string, index: number | undefined = undefined) => {
    setModeChecked(config.localesModes.map(() => false));
    setAllChecked(false);
    setSelectedLocales([defaultLocale]);

    if (modeId === 'all') {
      setSelectedLocales(sortedLocales);
      setAllChecked(true);
    } else {
      const mode = modesMap.get(modeId);
      if (mode) {
        const locales =
          mode.locales.indexOf(defaultLocale) < 0
            ? mode.locales.concat(defaultLocale)
            : mode.locales;
        setSelectedLocales(locales);
        setModeChecked(config.localesModes.map((m, i) => index === i));
      }
    }
  };

  const localeItem = (item: string, index: number) => (
      <Menu.Item>
        <Switch
            style={{ width: '100%' }}
            key={item}
            id={item}
            name={item}
            isDisabled={item === defaultLocale}
            isChecked={selectedLocales.indexOf(item) >= 0}
            onChange={() => onChecked(index)}>
          {item}
        </Switch>
      </Menu.Item>
  );

  const localeMode = (mode: FilterLocaleMode, index: number) => (
      <Menu.Item>
        <Radio
            style={{ width: '100%' }}
            id={`locales-mode-${mode.id}`}
            name="locales-mode"
            value={mode.id}
            isChecked={modeChecked[index]}
            onChange={() => onLocaleModeChanged(mode.id, index)}>
          {mode.name}
        </Radio>
      </Menu.Item>
  );

  return (
    <Grid
      style={{ margin: '20px', marginLeft: '30px', width: '580px' }}
      columns="0.5fr 2.5fr 1fr 1fr"
      rowGap="spacingM"
      columnGap="spacingS">
      <Grid.Item>
        <Paragraph><b>Filters:</b></Paragraph>
      </Grid.Item>
      <Grid.Item>
        <Box marginBottom="spacingXs">
          {config.hideFullyLocalized && (
            <Switch
              name="hide-localized"
              id="hide-localized"
              isChecked={hideLocalized}
              onChange={() => setFilter('hide-localized')}>
              Hide fully localized rows
            </Switch>
          )}
        </Box>
        <Box>
          {config.hideFullyNonLocalized && (
            <Switch
              name="hide-non-localized"
              id="hide-non-localized"
              isChecked={hideNonLocalized}
              onChange={() => setFilter('hide-non-localized')}>
              Hide fully non-localized rows
            </Switch>
          )}
        </Box>
      </Grid.Item>
      <Grid.Item>
        <Menu defaultIsOpen={true} closeOnSelect={false} placement="bottom-start">
          <Menu.Trigger>
            <Button>
              <Flex alignItems="center">
                <Text>Locales</Text>
                <ChevronDownIcon variant="primary" />
              </Flex>
            </Button>
          </Menu.Trigger>
          <Menu.List>
            {config.localesModes.map(localeMode)}
            {config.localesAllOption && (
              <>
                <Menu.Item>
                  <Radio
                    style={{ width: '100%' }}
                    id="locales-all"
                    name="locales-mode"
                    value="all"
                    isChecked={allChecked}
                    onChange={() => onLocaleModeChanged('all')}>
                    All
                  </Radio>
                </Menu.Item>
                <Menu.Divider />
              </>
            )}
            {config.localesClearAll && (
              <>
                <Menu.Item>
                  <Button
                    style={{ width: '100%' }}
                    variant="secondary"
                    size="small"
                    onClick={() => onLocaleModeChanged('uncheck')}>
                    Uncheck all
                  </Button>
                </Menu.Item>
                <Menu.Divider />
              </>
            )}
            {sortedLocales.map((item, index) => {
              return localeItem(item, index);
            })}
          </Menu.List>
        </Menu>
      </Grid.Item>
      <Grid.Item>
        <Button variant="primary" size="medium" onClick={onApplyClicked}>
          Apply filters
        </Button>
      </Grid.Item>
    </Grid>
  );
};

export default Filters;
