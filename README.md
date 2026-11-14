# OpenViewer

The website for [OpenViewer](https://github.com/npanu420/F1OpenViewer), an open-source desktop client for F1 TV.

**Website:** https://npanu420.github.io/openviewer/

## Development

Open `index.html` in a browser, or serve this directory with a static HTTP server. No build step is required.

The site includes the original app auto-layout video, an interactive timing snapshot and operating-system-aware downloads from the latest published app release. Release metadata is checked through GitHub's public API and cached for ten minutes. If metadata is unavailable, downloads fall back to the GitHub release page.

The video plays silently when in view. Click once to pause or resume; double-click for fullscreen. No native playback controls are shown. Space/Enter toggles playback and F toggles fullscreen. Reduced-motion preferences disable autoplay.

The timing demo uses a fixed replay snapshot. Video playback in the desktop app requires a valid F1 TV subscription.

## Deployment

GitHub Pages publishes the root of the `main` branch. Relative asset paths support the `/openviewer/` project path.

## Licences

Project code is licensed under [MIT](LICENSE). Font and animation dependencies retain their respective notices. Broadcast content and trademarks belong to their respective owners.
