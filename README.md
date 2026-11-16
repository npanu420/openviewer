# OpenViewer

The website for [OpenViewer](https://github.com/npanu420/F1OpenViewer), an open-source desktop client for F1 TV.

**Website:** https://npanu420.github.io/openviewer/

## Development

Open `index.html` in a browser, or serve this directory with a static HTTP server. No build step is required.

The site includes the original app auto-layout video, an interactive automatic multiview and timing snapshot and operating-system-aware downloads from the latest published app release. Release metadata is checked through GitHub's public API and cached for ten minutes. If metadata is unavailable, downloads fall back to the GitHub release page.

The video plays silently when in view. Click once to pause or resume; double-click for fullscreen. No native playback controls are shown. Space/Enter toggles playback and F toggles fullscreen. Reduced-motion preferences disable autoplay.

The layout demo sits immediately after the hero. Drag the divider or use the width slider on a phone to reflow six actual app captures. The app’s 16:9 tiling solver chooses the feed count and placement from the available width and height; portrait columns are extended for narrow browser previews. A wide timing panel gives the feeds a vertical column, while wider video areas can place onboards below the main feed. The preview uses still captures, not live video streams. Captures are pre-cropped and decoded before entering the layout. Scrolling preserves the arrangement; only changes to the workspace dimensions reflow the feeds. Fit to window uses the window size independently of scroll position.

The timing demo uses a fixed replay snapshot. Video playback in the desktop app requires a valid F1 TV subscription.

## Deployment

GitHub Pages publishes the root of the `main` branch. Relative asset paths support the `/openviewer/` project path.

## Search and link previews

The static HTML includes a descriptive title and summary, a canonical URL, crawl directives, Open Graph and X/Twitter card metadata, and Schema.org WebSite, WebPage and SoftwareSourceCode data. The preview image uses the actual app screenshots. No ratings or reviews are invented.

The canonical page is `https://npanu420.github.io/openviewer/`. Query-string preview links and `/index.html` use that same canonical. The sitemap at `sitemap.xml` lists the home page and the F1 TV multiview guide at `f1-tv-multiview/`. Each has its own canonical URL; section anchors are not separate pages. The guide provides setup instructions, requirements, synchronized Live Timing and troubleshooting based on the app README. It links back to the product overview and the original project documentation.

Search engines can crawl the public site. A `robots.txt` file must be hosted at the origin root, `https://npanu420.github.io/robots.txt`, rather than inside `/openviewer/`. This project does not control that root, so it uses page-level directives and does not add an ineffective project-level robots file.

For indexing and search reporting, verify the URL-prefix property `https://npanu420.github.io/openviewer/` in Google Search Console, using its HTML verification file or meta tag, then submit `sitemap.xml`. Verification requires the owner's Google account and verification token. There is no analytics script or tracking cookie. Publication does not guarantee a search position or immediate indexing.

When a custom domain is ready, verify its ownership, configure its DNS and the GitHub Pages custom-domain setting, and update the canonical URL, social URLs, JSON-LD and sitemap together. Keep the original Pages address redirecting to the new canonical domain. A robots file can then be served from the custom domain's root.

The demo video uses `preload="none"`; it starts downloading when played in view. Autoplay respects reduced-motion preferences.

## Licences

Project code is licensed under [MIT](LICENSE). Font and animation dependencies retain their respective notices. Broadcast content and trademarks belong to their respective owners.
