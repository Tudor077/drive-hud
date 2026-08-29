import { Platform } from 'react-native';

import type {
  NavNotification,
} from '../../modules/nav-link/src/NavLink.types';

type NavLinkApi = {
  available: boolean;
  isSupported(): boolean;
  hasPermission(): boolean;
  openPermissionSettings(): boolean;
  getLastInstruction(): NavNotification | null;
  isConnected(): boolean;
  addListener(
    event: 'onNavigationUpdate',
    listener: (payload: NavNotification) => void
  ): { remove(): void };
  addClearedListener(listener: () => void): { remove(): void };
};

const UNAVAILABLE: NavLinkApi = {
  available: false,
  isSupported: () => false,
  hasPermission: () => false,
  openPermissionSettings: () => false,
  getLastInstruction: () => null,
  isConnected: () => false,
  addListener: () => ({ remove() {} }),
  addClearedListener: () => ({ remove() {} }),
};

/**
 * Only Android exposes other apps' notifications at all, and the native module
 * is built for Android alone — so everywhere else this degrades to a stub
 * rather than throwing at import time.
 */
function load(): NavLinkApi {
  if (Platform.OS !== 'android') return UNAVAILABLE;
  try {
    // Required lazily: on a platform without the native module this throws,
    // and a stub HUD without navigation is better than a crash.
    const native = require('../../modules/nav-link/src/NavLinkModule').default;
    return {
      available: true,
      isSupported: () => native.isSupported(),
      hasPermission: () => native.hasPermission(),
      openPermissionSettings: () => native.openPermissionSettings(),
      getLastInstruction: () => native.getLastInstruction(),
      isConnected: () => native.isConnected(),
      addListener: (event, listener) => native.addListener(event, listener),
      addClearedListener: (listener) => native.addListener('onNavigationCleared', listener),
    };
  } catch {
    return UNAVAILABLE;
  }
}

export const NavLink = load();
