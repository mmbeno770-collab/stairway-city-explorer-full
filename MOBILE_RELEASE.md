# Mobile release guide

Stairway City Explorer is built as a locally bundled Capacitor app. The production web assets are compiled into `www/` and copied into each native project; the app does not depend on a remote CDN to start.

## Build outputs

The **Build mobile app packages** workflow runs on pushes to the app source and can also be started manually from GitHub Actions.

- **Android test APK:** for internal device testing only.
- **Android release AAB:** generated unsigned by default. Google Play will not accept an unsigned bundle.
- **iOS simulator app:** for simulator testing only, not an App Store upload.
- **Native project archives:** Android Studio and Xcode project source.

Artifacts are available on the workflow run page while they remain within GitHub's artifact retention period.

## Android release signing

An adult account owner or the person responsible for publishing should create and securely retain the Android upload keystore. Never commit the keystore or its passwords to the repository, and never share them in chat.

To make the workflow produce `app-release-signed.aab`, configure these repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64` — Base64-encoded upload keystore file.
- `ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `ANDROID_KEY_ALIAS` — key alias in that keystore.
- `ANDROID_KEY_PASSWORD` — key password.

The workflow signs the generated AAB with that key and verifies the signature. If these secrets are absent, the workflow clearly leaves the AAB unsigned. Back up the keystore securely; losing an upload key can complicate app updates.

## iOS App Store signing

The CI workflow creates an Xcode project and builds an iOS Simulator app. A simulator build is not an App Store package.

For an App Store release, open `ios/App/App.xcworkspace` in Xcode on a Mac with the supported Xcode version, select the correct bundle identifier and the publisher's Apple Developer Team, configure the matching distribution signing/provisioning, then create an Archive and distribute it to App Store Connect. Do not share signing certificates, provisioning profiles, or App Store Connect keys in chat or commit them to Git.

## Store preparation still required

Before submission, the publisher must:

1. Own or administer the relevant developer account and complete the store's identity and business verification.
2. Confirm the bundle/package ID is available and final.
3. Add real device screenshots and complete the age-rating, privacy, content, and store listing forms accurately.
4. Test the signed release on physical devices and review Apple's current app-review rules and Google's current Play policies.
5. Submit the build for the store's review. Build success does not guarantee approval.

The prepared Hebrew listing is in `STORE_LISTING.md`; the privacy policy is in `PRIVACY_POLICY.md` and is also served at `/privacy.html`.

## Platform requirements

- Capacitor 8 needs Node.js 22 or newer. iOS builds require macOS and Xcode 26 or newer; Android builds require Android Studio and an Android SDK.
- Apple Developer Program enrollment requires the legal age of majority in the region. Google Play Console developer accounts require the account holder to be at least 18. A parent/legal guardian or other eligible adult must own and manage the publisher account where applicable.
