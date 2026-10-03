# Fetch Chaos 🐕🎾

**Throw it. Dog wrecks it.**

A hyper-casual mobile game: drag to aim a tennis ball, release, and watch your golden retriever chase it, jump for the catch (+50), and plow through crate-and-bottle stacks for chaos points. 10 throws, highest mess wins.

Built as one HTML5 codebase that runs in any browser and packages to **Android + iOS with Capacitor** — so the same code in this repo ships to both stores.

## Play it right now
```bash
npm start          # python3 -m http.server 8080
# open http://localhost:8080
```
Or just open `index.html` through any static host (GitHub Pages works).

**Controls:** Drag anywhere to aim (dotted line shows the arc), release to throw. Mouse and touch both work.

## Scoring
| Action | Points |
|---|---|
| Catch the ball mid-chase | +50 |
| Knock over a bottle | +15 |
| Knock over a crate | +10 |
| Distance bonus | ball distance / 25 |

Best score is saved locally. **Share Score** uses the native share sheet on mobile.

## Project layout
```
index.html            game shell + HUD
src/game.js           all gameplay (physics, dog AI, drawing, sound)
src/style.css         mobile-first styling
capacitor.config.json Android/iOS packaging (appId: com.siddpanda.fetchchaos)
STORE_PUBLISHING.md   step-by-step Google Play + App Store checklist
.github/workflows/    CI syntax check on every push
```

## Ship it to the stores

### Android (Google Play)
```bash
npm install
npx cap add android
npx cap sync
npx cap open android   # Android Studio → build signed AAB → upload to Play Console
```

### iOS (App Store)
```bash
npm install
npx cap add ios
npx cap sync
npx cap open ios       # Xcode (Mac required) → archive → App Store Connect
```
Full checklist, fees, screenshots, and review tips: see **STORE_PUBLISHING.md**.

## Roadmap to viral
- [x] v0.1 playable prototype — slingshot, chasing/jumping dog, destructible stacks, share score
- [ ] Record-the-chaos: auto 5-second replay clip export for TikTok/Reels
- [ ] Daily stack challenge (same layout for everyone, shareable result)
- [ ] Dog outfits (cosmetic IAP) + rewarded ads
- [ ] Leaderboard (Game Center / Play Games)

First distribution channel: the **Paws & Bond** Facebook page — post gameplay clips, pin the game link.

## License
MIT
