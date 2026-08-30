import { NativeModule, requireNativeModule } from 'expo';

import { NavLinkModuleEvents, NavNotification } from './NavLink.types';

declare class NavLinkModule extends NativeModule<NavLinkModuleEvents> {
  isSupported(): boolean;
  hasPermission(): boolean;
  openPermissionSettings(): boolean;
  getLastInstruction(): NavNotification | null;
  isConnected(): boolean;
  hasQuietAccess(): boolean;
  openQuietSettings(): boolean;
  setQuiet(enabled: boolean): boolean;
}

export default requireNativeModule<NavLinkModule>('NavLink');
