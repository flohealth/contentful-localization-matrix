import React, { useState } from 'react';
import { EditorExtensionSDK } from '@contentful/app-sdk';
import { useCMA, useSDK } from '@contentful/react-apps-toolkit';
import Matrix from '../components/Matrix';
import { MatrixComponentModel } from '../components/Models';
import { Analytics, VoidAnalytics } from '../analytics';
import Filters from '../components/Filters';
import { FiltersModel } from '../FiltersModel';
import { Config } from '../Config';

const Entry = () => {
  const sdk = useSDK<EditorExtensionSDK>();
  const cma = useCMA();
  const config = new Config(sdk.parameters);

  const [matrixModel, setMatrixModel] = useState<MatrixComponentModel | undefined>();
  const analytics = config.analyticsHost
    ? new Analytics(config.analyticsHost)
    : new VoidAnalytics();

  analytics.logUser(sdk.ids.user);
  analytics.logContentType(sdk.entry.getSys().contentType.sys.id);
  const allLocales = sdk.locales.available;

  const onFiltersChanged = (filter: FiltersModel) => {
    const matrixModel = new MatrixComponentModel(filter, entryId, 'Entry', cma, entryType, onClose);
    setMatrixModel(matrixModel);
  };

  const entryId = sdk.entry.getSys().id;
  const entryType = sdk.entry.getSys().contentType.sys.id;
  const onClose = () => {};

  console.debug('Config: ', config);
  console.debug('Instance parameters: ', sdk.parameters.instance);

  return (
    <>
      <Filters
        defaultLocale={config.defaultLocale}
        locales={allLocales}
        config={config}
        onChange={onFiltersChanged}
      />
      {matrixModel && <Matrix matrixModel={matrixModel!} sdk={sdk} analytics={analytics} excludedContentTypes={config.excludedContentTypes} />}
    </>
  );
};

export default Entry;
