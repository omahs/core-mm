import type { BaseConfig, BaseState } from '@metamask/base-controller';
import { BaseControllerV1 } from '@metamask/base-controller';
import {
  BNToHex,
  query,
  safelyExecuteWithTimeout,
} from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import type { Provider } from '@metamask/eth-query';
import type { PreferencesState } from '@metamask/preferences-controller';
import { assert } from '@metamask/utils';
import { Mutex } from 'async-mutex';

/**
 * @type AccountInformation
 *
 * Account information object
 * @property balance - Hex string of an account balancec in wei
 */
// This interface was created before this ESLint rule was added.
// Convert to a `type` in a future major version.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AccountInformation {
  balance: string;
}

/**
 * @type AccountTrackerConfig
 *
 * Account tracker controller configuration
 * @property provider - Provider used to create a new underlying EthQuery instance
 */
// This interface was created before this ESLint rule was added.
// Remove in a future major version.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AccountTrackerConfig extends BaseConfig {
  interval: number;
  provider?: Provider;
}

/**
 * @type AccountTrackerState
 *
 * Account tracker controller state
 * @property accounts - Map of addresses to account information
 */
// This interface was created before this ESLint rule was added.
// Remove in a future major version.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AccountTrackerState extends BaseState {
  accounts: { [address: string]: AccountInformation };
}

/**
 * Controller that tracks the network balances for all user accounts.
 */
export class AccountTrackerController extends BaseControllerV1<
  AccountTrackerConfig,
  AccountTrackerState
> {
  private ethQuery?: EthQuery;

  private readonly mutex = new Mutex();

  private handle?: ReturnType<typeof setTimeout>;

  private syncAccounts() {
    const { accounts } = this.state;
    const addresses = Object.keys(this.getIdentities());
    const existing = Object.keys(accounts);
    const newAddresses = addresses.filter(
      (address) => !existing.includes(address),
    );
    const oldAddresses = existing.filter(
      (address) => !addresses.includes(address),
    );
    newAddresses.forEach((address) => {
      accounts[address] = { balance: '0x0' };
    });

    oldAddresses.forEach((address) => {
      delete accounts[address];
    });
    this.update({ accounts: { ...accounts } });
  }

  /**
   * Name of this controller used during composition
   */
  override name = 'AccountTrackerController';

  private readonly getIdentities: () => PreferencesState['identities'];

  private readonly getSelectedAddress: () => PreferencesState['selectedAddress'];

  private readonly getMultiAccountBalancesEnabled: () => PreferencesState['isMultiAccountBalancesEnabled'];

  /**
   * Creates an AccountTracker instance.
   *
   * @param options - The controller options.
   * @param options.onPreferencesStateChange - Allows subscribing to preference controller state changes.
   * @param options.getIdentities - Gets the identities from the Preferences store.
   * @param options.getSelectedAddress - Gets the selected address from the Preferences store.
   * @param options.getMultiAccountBalancesEnabled - Gets the multi account balances enabled flag from the Preferences store.
   * @param config - Initial options used to configure this controller.
   * @param state - Initial state to set on this controller.
   */
  constructor(
    {
      onPreferencesStateChange,
      getIdentities,
      getSelectedAddress,
      getMultiAccountBalancesEnabled,
    }: {
      onPreferencesStateChange: (
        listener: (preferencesState: PreferencesState) => void,
      ) => void;
      getIdentities: () => PreferencesState['identities'];
      getSelectedAddress: () => PreferencesState['selectedAddress'];
      getMultiAccountBalancesEnabled: () => PreferencesState['isMultiAccountBalancesEnabled'];
    },
    config?: Partial<AccountTrackerConfig>,
    state?: Partial<AccountTrackerState>,
  ) {
    super(config, state);
    this.defaultConfig = {
      interval: 10000,
    };
    this.defaultState = { accounts: {} };
    this.initialize();
    this.getIdentities = getIdentities;
    this.getSelectedAddress = getSelectedAddress;
    this.getMultiAccountBalancesEnabled = getMultiAccountBalancesEnabled;
    onPreferencesStateChange(() => {
      this.refresh();
    });
    this.poll();
  }

  /**
   * Sets a new provider.
   *
   * TODO: Replace this wth a method.
   *
   * @param provider - Provider used to create a new underlying EthQuery instance.
   */
  set provider(provider: Provider) {
    this.ethQuery = new EthQuery(provider);
  }

  get provider() {
    throw new Error('Property only used for setting');
  }

  /**
   * Starts a new polling interval.
   *
   * @param interval - Polling interval trigger a 'refresh'.
   */
  async poll(interval?: number): Promise<void> {
    const releaseLock = await this.mutex.acquire();
    interval && this.configure({ interval }, false, false);
    this.handle && clearTimeout(this.handle);
    await this.refresh();
    this.handle = setTimeout(() => {
      releaseLock();
      this.poll(this.config.interval);
    }, this.config.interval);
  }

  /**
   * Refreshes the balances of the accounts depending on the multi-account setting.
   * If multi-account is disabled, only updates the selected account balance.
   * If multi-account is enabled, updates balances for all accounts.
   */
  refresh = async () => {
    this.syncAccounts();
    const accounts = { ...this.state.accounts };
    const isMultiAccountBalancesEnabled = this.getMultiAccountBalancesEnabled();

    const accountsToUpdate = isMultiAccountBalancesEnabled
      ? Object.keys(accounts)
      : [this.getSelectedAddress()];

    for (const address of accountsToUpdate) {
      accounts[address] = {
        balance: BNToHex(await this.getBalanceFromChain(address)),
      };
    }

    this.update({ accounts });
  };

  /**
   * Fetches the balance of a given address from the blockchain.
   *
   * @param address - The account address to fetch the balance for.
   * @returns A promise that resolves to the balance in a hex string format.
   */
  private async getBalanceFromChain(
    address: string,
  ): Promise<string | undefined> {
    return await safelyExecuteWithTimeout(async () => {
      assert(this.ethQuery, 'Provider not set.');
      return await query(this.ethQuery, 'getBalance', [address]);
    });
  }

  /**
   * Sync accounts balances with some additional addresses.
   *
   * @param addresses - the additional addresses, may be hardware wallet addresses.
   * @returns accounts - addresses with synced balance
   */
  async syncBalanceWithAddresses(
    addresses: string[],
  ): Promise<Record<string, { balance: string }>> {
    return await Promise.all(
      addresses.map((address): Promise<[string, string] | undefined> => {
        return safelyExecuteWithTimeout(async () => {
          assert(this.ethQuery, 'Provider not set.');
          const balance = await query(this.ethQuery, 'getBalance', [address]);
          return [address, balance];
        });
      }),
    ).then((value) => {
      return value.reduce((obj, item) => {
        if (!item) {
          return obj;
        }

        const [address, balance] = item;
        return {
          ...obj,
          [address]: {
            balance,
          },
        };
      }, {});
    });
  }
}

export default AccountTrackerController;
