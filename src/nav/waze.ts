import { Linking } from 'react-native';

/**
 * Waze cannot be embedded — there is no public SDK for drawing its map inside
 * another app. What it does expose is a deep link, so the HUD can hand a drive
 * over to it and then read the manoeuvres back out of its notification.
 */
export async function openWaze(): Promise<boolean> {
  return openFirst(['waze://', 'https://waze.com/ul']);
}

export async function openWazeTo(query: string): Promise<boolean> {
  const encoded = encodeURIComponent(query);
  return openFirst([
    `waze://?q=${encoded}&navigate=yes`,
    `https://waze.com/ul?q=${encoded}&navigate=yes`,
  ]);
}

export async function openGoogleMaps(): Promise<boolean> {
  return openFirst(['google.navigation:q=', 'https://maps.google.com']);
}

async function openFirst(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // Try the next candidate; the https fallbacks always resolve.
    }
  }
  return false;
}
