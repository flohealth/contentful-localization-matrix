import { FiltersModel } from './FiltersModel';

export class Analytics {
  constructor(private targetUrl: string) {}
  private sendingLogMessage = 'Sending analytics to the server ';
  private sendingFailedLogMessage = 'Failed to send analitycs to the Url  ';

  send(): void {
    const searchParams = new URLSearchParams();
    Object.keys(this).forEach((key) => searchParams.append(key, (this as any)[key]));

    console.log(this.sendingLogMessage + this.targetUrl, this);

    fetch(`${this.targetUrl}&${searchParams.toString()}`, {
      method: 'GET',
      // body: JSON.stringify(analytics),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    })
      .then((response) => {
        if (response.status !== 200) {
          throw Error(this.sendingFailedLogMessage + this.targetUrl + ':' + response.text());
        }
        return;
      })
      .catch((err) => {
        throw err;
      });
  }

  public content_type: string = '';
  public user_id: string = '';
  public error_message: string = '';
  public entries_loaded: number = 0;
  public assets_loaded: number = 0;
  public types_loaded: number = 0;
  public rows_count: number = 0;
  public cache_hit_rate: string = '';
  public loading_time_seconds: number = 0;
  public locales: string[] = [];
  public hide_non_localized: boolean | null = null;
  public hide_localized: boolean | null = null;

  logContentType(type: string): Analytics {
    this.content_type = type;
    return this;
  }

  logEntity(type: string): Analytics {
    if (type === 'entity') this.entries_loaded++;
    else if (type === 'asset') this.assets_loaded++;
    else this.types_loaded++;
    return this;
  }

  logRows(count: number): Analytics {
    this.rows_count = count;
    return this;
  }

  logUser(id: string): Analytics {
    this.user_id = id;
    return this;
  }

  logCacheHitRate(hitRate: number): Analytics {
    this.cache_hit_rate = `${hitRate}%`;
    return this;
  }

  logLoadingTime(ms: number): Analytics {
    this.loading_time_seconds = ms / 1000;
    return this;
  }

  logError(ex: Error): Analytics {
    this.error_message = ex.message;
    return this;
  }

  logFilters(filters: FiltersModel): Analytics {
    this.hide_non_localized = filters.hideFullyNonLocalized;
    this.hide_localized = filters.hideLocalized;
    this.locales = filters.locales;
    return this;
  }
}

export class VoidAnalytics extends Analytics {
  constructor() {
    super('');
  }

  send(): void {
    console.log(`Skipping sending the analytics: host url is not configured`, this);
  }
}
