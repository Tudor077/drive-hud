import { NativeModule, requireNativeModule } from 'expo';

import { NavLinkModuleEvents, NavNotification } from './NavLink.types';

declare class NavLinkModule extends NativeModule<NavLinkModuleEvents> {
  isSupported(): boolean;
  hasPermission(): boolean;
  openPermissionSettings(): boolean;
  getLastInstruction(): NavNotification | null;
  isConnected(): boolean;
}

export default requireNativeModule<NavLinkModule>('NavLink');
