import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { HudScreen } from './src/screens/HudScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SettingsProvider, useSettings, useTheme } from './src/settings/SettingsContext';

function Root() {
  const [showSettings, setShowSettings] = useState(false);
  const { ready } = useSettings();
  const { theme } = useTheme();

  // Rendering the HUD before stored settings load would flash the defaults —
  // wrong colour, wrong units, unmirrored — in the driver's eyeline.
  if (!ready) return <View style={[styles.root, { backgroundColor: theme.bg }]} />;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar hidden style={theme.mode === 'day' ? 'dark' : 'light'} />
      {showSettings ? (
        <SettingsScreen onClose={() => setShowSettings(false)} />
      ) : (
        <HudScreen onOpenSettings={() => setShowSettings(true)} />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
