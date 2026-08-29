/** Raw fields lifted from a navigation app's ongoing notification. */
export type NavNotification = {
  package: string;
  title: string | null;
  text: string | null;
  subText: string | null;
  bigText: string | null;
  infoText: string | null;
  summaryText: string | null;
  ticker: string | null;
  /**
   * Every readable string the notification carried, keyed by its extras key.
   * Apps that draw a custom notification layout leave the standard fields empty
   * and put the wording here under names only they know.
   */
  extras: Record<string, string>;
  postedAt: number;
  ongoing: boolean;
};

export type NavLinkModuleEvents = {
  onNavigationUpdate: (payload: NavNotification) => void;
  onNavigationCleared: (payload: { package: string }) => void;
};
