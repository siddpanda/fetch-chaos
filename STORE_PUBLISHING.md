# Publishing Fetch Chaos to Google Play + App Store

Honest version: the game code is ready to package, but store accounts and reviews are yours to own. Nobody can publish under your name without them.

## 1. Accounts & fees (one-time setup)
- [ ] Google Play Console — $25 one-time — https://play.google.com/console
- [ ] Apple Developer Program — $99/year — https://developer.apple.com/programs/
- [ ] A Mac is required for the final iOS build/archive (Xcode). Android builds work on any OS with Android Studio.

## 2. Build the packages
```bash
npm install
npx cap add android && npx cap add ios
npx cap sync
```
- Android: open `android/` in Android Studio → Build → Generate Signed App Bundle (AAB). Keep the keystore safe — losing it locks future updates.
- iOS: open `ios/` in Xcode → set your Team/bundle ID `com.siddpanda.fetchchaos` → Product → Archive → upload to App Store Connect.

## 3. Store listing assets (both stores)
- [ ] App icon: 1024×1024 PNG (Apple, no transparency), 512×512 PNG (Google)
- [ ] Screenshots: at least 2 per device size — capture the dog mid-crash, those are your ad
- [ ] Short description: "Throw it. Dog wrecks it. 🐕 Drag, launch, and cause crate chaos in 10 throws!"
- [ ] Privacy policy URL (required even though v0.1 collects no data — a free GitHub Pages page works)
- [ ] Age/content rating questionnaire (Fetch Chaos: everyone, no ads yet, no IAP yet)

## 4. Review reality check
- Google: new personal accounts may need a closed test (12+ testers, 14 days) before production.
- Apple: review typically 1–3 days; "4.2 minimum functionality" is the common rejection for web-wrapped games — the native share sheet, offline play, and game feel here help; add Game Center in v0.2 to be safer.
- Neither store guarantees featuring or virality. Distribution plan: Paws & Bond page clips → TikTok/Reels of best crashes → link in bio.

## 5. After launch
- [ ] v0.2: replay-clip export, daily challenge, leaderboard
- [ ] Only then: AdMob rewarded ads + cosmetic dog outfits (IAP requires extra tax/banking setup in both consoles)
