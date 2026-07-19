# Requirements Document

## Introduction

The Apostolic Songs PWA (Faarfannaa) must work primarily offline. Users should be able to browse artists, play songs, and enjoy the full app experience without an internet connection. Internet access is only needed to initially download or update songs. All downloaded songs remain available permanently unless the user explicitly deletes them. No sign-in or sign-up is required at any point.

The app already has foundational pieces in place — a service worker with audio/API caching, IndexedDB for metadata persistence, and a background prefetch mechanism. This feature spec formalises and completes the offline-first contract: identifying gaps, hardening the existing flows, and ensuring every part of the user experience degrades gracefully (or not at all) when the network is absent.

## Glossary

- **App**: The Faarfannaa Apostolic Songs Progressive Web App (Next.js)
- **Service_Worker**: The `public/sw.js` script that intercepts network requests and manages all browser caches
- **Audio_Cache**: The `faarfannaa-audio` Cache Storage bucket — permanent, never cleared on SW update
- **API_Cache**: The `faarfannaa-api` Cache Storage bucket — permanent, never cleared on SW update
- **Image_Cache**: The `faarfannaa-img` Cache Storage bucket — permanent, never cleared on SW update
- **IDB**: IndexedDB database (`faarfannaa-db`) holding song and artist metadata
- **Player**: The audio playback engine implemented in `PlayerContext.tsx`
- **Prefetcher**: The background song-fetching logic in `PlayerContext.tsx` that runs 3 seconds after first load
- **Offline_Mode**: The state in which `navigator.onLine` is `false` or all network requests fail
- **Cache_Hit**: A response successfully served from Cache Storage without a network request
- **Song**: A record with `id`, `title`, `artist_id`, `audio_url`, `image_url`, and optional metadata as defined in `lib/types.ts`
- **Artist**: A record with `id`, `name`, `image_url`, `category`, and `is_group` as defined in `lib/types.ts`

---

## Requirements

### Requirement 1: Offline Audio Playback

**User Story:** As a user, I want to play any previously downloaded song while I am offline, so that I can enjoy worship music without an internet connection.

#### Acceptance Criteria

1. WHEN a song has been cached in the Audio_Cache AND the user is in Offline_Mode, THE Player SHALL play the song without attempting a network request.
2. WHEN the user requests audio playback AND a Cache_Hit exists for the song's `audio_url`, THE Service_Worker SHALL respond with the cached audio within 200 ms of the fetch event.
3. WHEN the user seeks to a different position in a cached song, THE Service_Worker SHALL respond with an HTTP 206 Partial Content response sliced from the cached audio blob.
4. WHEN a song is not present in the Audio_Cache AND the device is in Offline_Mode, THE Player SHALL display a message indicating the song is not available offline rather than showing a playback error or crashing.
5. WHEN the user plays a song that is available in the Audio_Cache, THE Player SHALL begin playback without displaying any network error messages or connection warnings. Playback error messages that arise from the audio element itself after playback has started are permitted.

---

### Requirement 2: Automatic Background Download of All Songs

**User Story:** As a user, I want all songs to be downloaded automatically when I first open the app online, so that the full library is ready for offline use without me having to manually download each song.

#### Acceptance Criteria

1. WHEN the app is loaded for the first time in a browser session AND the device is online, THE Prefetcher SHALL initiate fetching of all songs from `/api/songs` after a 3-second delay.
2. WHEN the Prefetcher receives a valid song list, THE Service_Worker SHALL cache the audio file for each song sequentially with a 40 ms pause between downloads to avoid saturating the network.
3. WHEN the Service_Worker caches an audio file AND the file is already present in the Audio_Cache, THE Service_Worker SHALL skip downloading that file and proceed to the next song.
4. WHEN the Prefetcher has fetched songs successfully, THE IDB SHALL persist the full song and artist metadata so it is available on subsequent offline sessions.
5. WHEN the app is reloaded in the same browser session AND `sessionStorage` contains the key `songs_prefetched = '1'`, THE Prefetcher SHALL NOT repeat the background download to prevent duplicate network traffic.

---

### Requirement 3: Offline Artist and Song Browsing

**User Story:** As a user, I want to browse the full list of artists and their songs while offline, so that I can navigate and queue music without needing internet.

#### Acceptance Criteria

1. WHEN the device is in Offline_Mode AND artist metadata has been previously stored in the IDB, THE App SHALL display the artist list using data loaded from the IDB.
2. WHEN the device is in Offline_Mode AND song metadata for a specific artist has been previously stored in the IDB, THE App SHALL display that artist's track list using data loaded from the IDB.
3. WHEN the device is online AND an API response for `/api/artists` or `/api/songs` is received, THE Service_Worker SHALL store that response in the API_Cache to serve as a fallback.
4. WHEN the Service_Worker intercepts a request to `/api/songs` or `/api/artists` AND the network request fails, THE Service_Worker SHALL always serve the most recently cached API response for that URL when one is available, regardless of any other fallback strategy.
5. IF the network request fails AND no cached API response exists, THEN THE Service_Worker SHALL respond with an empty collection `{ "songs": [], "_offline": true }` or `{ "artists": [], "_offline": true }` rather than returning an HTTP error status.

---

### Requirement 4: Transparent Offline State — No Blocking Errors

**User Story:** As a user, I want the app to keep working normally when I go offline, so that losing internet connectivity does not interrupt my experience.

#### Acceptance Criteria

1. WHILE the device is in Offline_Mode, THE App SHALL remain fully navigable — all routes (`/home`, `/library`, `/player`, `/playlist`, `/settings`) SHALL load from the Service_Worker cache.
2. WHILE the device is in Offline_Mode, THE App SHALL NOT display modal dialogs, full-screen error overlays, or forced redirects that block the user from accessing the app.
3. WHEN the device transitions from online to Offline_Mode, THE Player SHALL continue playing any song that is currently loaded in the audio element without interruption.
4. WHEN the device is in Offline_Mode AND a network-dependent action fails silently (e.g. a background refresh), THE App SHALL NOT propagate that failure as a visible error to the user.
5. WHEN the device transitions from Offline_Mode to online, THE App SHALL resume network-dependent operations (e.g. background metadata refresh) without requiring a page reload.

---

### Requirement 5: Persistent Offline Indicator

**User Story:** As a user, I want to clearly see whether I am online or offline, so that I understand the app's current connectivity state without being alarmed.

#### Acceptance Criteria

1. WHILE the device is in Offline_Mode, THE App SHALL display an amber/yellow connectivity indicator in the header that reads "Offline".
2. WHILE the device is online, THE App SHALL display a green connectivity indicator in the header that reads "Online" based on the app's current perception of `navigator.onLine` — the indicator reflects the browser's reported connectivity state and does not independently verify network reachability.
3. WHEN the connectivity state changes, THE App SHALL update the indicator within 1 second of the `online` or `offline` browser event firing. WHEN multiple connectivity events fire in rapid succession, THE App SHALL process each event in order and update the indicator within 1 second of each individual event.
4. THE App SHALL NOT display a disruptive banner, toast, or modal solely because the device is offline — the indicator in the header is sufficient.

---

### Requirement 6: Manual Per-Song Download

**User Story:** As a user, I want to manually trigger the download of a specific song, so that I can ensure that particular song is cached for offline use.

#### Acceptance Criteria

1. WHEN the user triggers a download action for a song, THE Player SHALL send a `CACHE_AUDIO` message to the Service_Worker containing the song's `audio_url`.
2. WHEN the Service_Worker receives a `CACHE_AUDIO` message AND the audio URL is not already in the Audio_Cache, THE Service_Worker SHALL fetch and store the full audio file in the Audio_Cache.
3. WHEN the Service_Worker receives a `CACHE_AUDIO` message AND the audio URL is already present in the Audio_Cache, THE Service_Worker SHALL take no action to avoid duplicate downloads.
4. WHEN a song's audio file has been successfully stored in the Audio_Cache, THE App SHALL reflect a cached status indicator for that song (e.g. a green cloud/check icon) in the song list. WHERE the audio file is being downloaded but has not yet completed, THE App MAY show the cached indicator based on the intended cache state before the download completes.
5. WHEN the user plays any song while online, THE Player SHALL automatically send a `CACHE_AUDIO` message so that every played song is cached for future offline use.

---

### Requirement 7: Permanent Song Storage — No Automatic Deletion

**User Story:** As a user, I want my downloaded songs to remain available indefinitely, so that I never unexpectedly lose offline access to songs I have already downloaded.

#### Acceptance Criteria

1. WHEN a Service_Worker update is deployed, THE Service_Worker SHALL preserve the Audio_Cache, API_Cache, and Image_Cache intact and SHALL only delete old versioned shell caches.
2. WHEN the app starts and a new Service_Worker version activates, THE App SHALL retain all previously cached audio files — no audio file SHALL be evicted as a result of a version update.
3. THE Service_Worker SHALL designate `faarfannaa-audio`, `faarfannaa-api`, and `faarfannaa-img` as permanent caches that are never included in the set of caches to delete during activation.
4. WHEN the user explicitly clears browser storage or site data through browser settings, THE App SHALL gracefully handle the empty cache state on next load by resuming the background download on the next online session.

---

### Requirement 8: PWA Installability and App Shell Caching

**User Story:** As a user, I want to install the app on my device and have it launch instantly, so that it feels like a native offline-capable app.

#### Acceptance Criteria

1. WHEN the Service_Worker installs, THE Service_Worker SHALL cache all static shell assets (`/`, `/home`, `/library`, `/playlist`, `/settings`, `/player`, `/icons/icon-192.png`, `/manifest.json`) into the versioned shell cache.
2. WHEN a navigation request is received AND the network responds within 5 seconds, THE Service_Worker SHALL serve the fresh network response and update the shell cache entry.
3. WHEN a navigation request is received AND the network times out or fails, THE Service_Worker SHALL serve the cached version of the requested route, falling back to `/home` if the specific route is not cached.
4. WHEN the Service_Worker activates, THE Service_Worker SHALL call `clients.claim()` so that all open tabs are immediately controlled without requiring a reload.
5. WHERE the browser supports the `beforeinstallprompt` event, THE App SHALL surface an install prompt to the user so the app can be added to the home screen.

---

### Requirement 9: Image Caching for Offline Display

**User Story:** As a user, I want artist and song artwork to be visible when I am offline, so that the app looks complete and polished even without internet.

#### Acceptance Criteria

1. WHEN the Service_Worker intercepts a request to a Supabase image URL (`*.supabase.*`) AND a Cache_Hit exists in the Image_Cache, THE Service_Worker SHALL respond with the cached image.
2. WHEN the Service_Worker intercepts a request to a Supabase image URL AND no Cache_Hit exists, THE Service_Worker SHALL fetch the image from the network and, only if the network response is successful (HTTP 2xx), store it in the Image_Cache before returning the response.
3. WHEN the Prefetcher caches all songs, THE Service_Worker SHALL also fetch and store each song's `image_url` in the Image_Cache alongside the audio download sequence.
4. IF a Supabase image request fails AND no cached image exists, THEN THE Service_Worker SHALL respond with an empty 503 response so that the `<img>` element falls back gracefully to its placeholder rather than breaking the layout.

---

### Requirement 10: No Authentication Required

**User Story:** As a user, I want to use the entire app — browsing, playing, and downloading songs — without signing up or signing in, so that the app is immediately accessible to everyone.

#### Acceptance Criteria

1. THE App SHALL NOT present a sign-in or sign-up screen to access song browsing, playback, or offline download features.
2. THE App SHALL NOT gate any user-facing route behind an authentication check.
3. WHEN the user navigates to any route in the `(user)` route group, THE App SHALL render the page content directly without redirecting to a login page. THE App SHALL NOT display loading screens, authentication checks, or network-dependent intermediate states before rendering user-facing content.
4. THE App SHALL NOT display UI elements (buttons, banners, tooltips) that prompt the user to create an account or log in to access songs.
