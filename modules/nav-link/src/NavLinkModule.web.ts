import { registerWebModule, NativeModule } from 'expo';

import { NavLinkModuleEvents, NavNotification } from './NavLink.types';

/** Browsers cannot read another app's notifications; every call is a no-op. */
class NavLinkModule extends NativeModule<NavLinkModuleEvents> {
  isSupported(): boolean {
    return false;
  }

  hasPermission(): boolean {
    return false;
  }

  openPermissionSettings(): boolean {
    return false;
  }

  getLastInstruction(): NavNotification | null {
    return null;
  }

  isConnected(): boolean {
    return false;
  }
}

export default registerWebModule(NavLinkModule, 'NavLinkModule');
