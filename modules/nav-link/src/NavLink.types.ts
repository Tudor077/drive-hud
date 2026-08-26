/** Raw fields lifted from a navigation app's ongoing notification. */
export type NavNotification = {
  package: string;
  title: string | null;
  text: string | null;
  subText: string | null;
  bigText: string | null;
  infoText: string | null;
  postedAt: number;
  ongoing: boolean;
};

export type NavLinkModuleEvents = {
  onNavigationUpdate: (payload: NavNotification) => void;
  onNavigationCleared: (payload: { package: string }) => void;
};
