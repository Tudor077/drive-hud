#!/usr/bin/env node
/**
 * `expo prebuild` signs release builds with the bundled debug keystore, which
 * is fine for sideloading but not for the Play Store. When a real keystore is
 * available, this rewrites the generated Gradle config to use it.
 *
 * Run after prebuild, only when the keystore secrets are present. It fails
 * loudly rather than quietly producing a debug-signed APK.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const GRADLE = 'android/app/build.gradle';
const RELEASE_CONFIG = `        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH') ?: 'release.keystore')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
`;

const source = readFileSync(GRADLE, 'utf8');

const configAnchor = `    signingConfigs {
`;
if (!source.includes(configAnchor)) {
  throw new Error(`Could not find the signingConfigs block in ${GRADLE}.`);
}

const releaseAnchor = `            signingConfig signingConfigs.debug
            def enableShrinkResources`;
if (!source.includes(releaseAnchor)) {
  throw new Error(`Could not find the release signingConfig line in ${GRADLE}.`);
}

const patched = source
  .replace(configAnchor, configAnchor + RELEASE_CONFIG)
  .replace(
    releaseAnchor,
    `            signingConfig signingConfigs.release
            def enableShrinkResources`
  );

writeFileSync(GRADLE, patched);
console.log('Release signing config applied.');
