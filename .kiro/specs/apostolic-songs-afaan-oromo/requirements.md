# Requirements Document

## Introduction

This document specifies the requirements for the **Apostolic Songs Afaan Oromo** web application — a Progressive Web App (PWA) for streaming and offline playback of Apostolic Church songs in Afaan Oromo and other Ethiopian languages. The app is built with Next.js and a Supabase backend.

The application already has a partial implementation. These requirements define the complete expected behavior so that gaps can be identified, existing behavior can be validated, and new functionality can be built correctly.

Key design principles:
- **No authentication wall**: Users access the Home Page and browse/play all songs without signing in.
- **Authentication is scoped**: Sign Up and Sign In are required only to interact with the New Songs upload feature.
- **Offline-first**: Songs that have been played or cached are available without internet.
- **PWA**: The app can be installed on any device (Android, iOS, tablet, laptop, desktop) and behaves like a native application.
- **Performance**: Every interaction must feel instant and smooth across all supported devices.

---

## Glossary

- **App**: The Apostolic Songs Afaan Oromo Next.js Progressive Web App.
- **Splash_Screen**: The animated loading screen shown at the very first visit.
- **Home_Page**: The main page (`/home`) displaying artists by category, accessible without authentication.
- **Auth_Page**: The Sign Up / Sign In page (`/auth`), required only for New Songs access.
- **New_Songs_Section**: The portion of the App that allows authenticated users to upload, view, and interact with newly submitted songs.
- **Service_Worker**: The background script (`/sw.js`) responsible for caching, offline support, and PWA functionality.
- **IndexedDB**: The browser's local database used to persist song and artist metadata for offline use.
- **Audio_Cache**: The Cache Storage bucket (`faarfannaa-audio`) that stores full audio file blobs for offline playback.
- **PWA**: Progressive Web App — a web application installable on a device via the browser, behaving like a native app.
- **Install_Prompt**: The UI component that invites the user to install the PWA on their device.
- **Mini_Player**: The persistent bottom bar showing the currently playing song with playback controls.
- **Player_Context**: The React context (`PlayerContext`) that owns all audio playback state and offline caching logic.
- **User_Context**: The React context (`UserContext`) that owns the authenticated user session state.
- **Admin**: A privileged role with access to the admin dashboard for uploading songs and managing users.
- **Approved_User**: A registered user whose account has been approved by an Admin.
- **Pending_User**: A registered user whose account is awaiting Admin approval.
- **JWT**: JSON Web Token used to authenticate user sessions via an HttpOnly cookie.
- **Device_ID**: A stable 32-character hex identifier stored in `localStorage`, used to enforce one account per device.
- **Category**: A classification applied to artists and songs; valid values are `new`, `old`, `single`, `group`.
- **Language**: The language tag of a song; valid values are `oromo`, `english`, `amharic`, `sidama`, `arabic`.
- **Supabase**: The hosted PostgreSQL + Storage backend providing the database and file storage.

---

## Requirements

---

### Requirement 1: Unauthenticated Access to Home Page

**User Story:** As a visitor, I want to open the app and go directly to the Home Page without signing in, so that I can browse and play songs without creating an account.

#### Acceptance Criteria

1. WHEN the Splash_Screen animation completes (after the progress bar reaches 100%) on the first visit, THE App SHALL navigate the user to the Home_Page regardless of whether an authenticated session exists.
2. WHEN a returning user opens the App and a prior visit flag is detected in session storage, THE App SHALL skip the Splash_Screen and navigate the user directly to the Home_Page without requiring an authenticated session.
3. THE Home_Page SHALL display the artist list and permit song playback for users without an authenticated session.
4. WHILE a user is on the Home_Page without an authenticated session, THE App SHALL NOT redirect the user to the Auth_Page.
5. WHEN a user navigates to `/home`, `/library`, `/playlist`, `/player`, or `/settings` without an authenticated session, THE App SHALL permit access to those routes without redirecting to Auth_Page.
6. IF a user without an authenticated session attempts to access a feature that requires authentication (such as saving to a personal library or managing a playlist), THEN THE App SHALL display a message indicating that signing in is required, without redirecting away from the current page.

---

### Requirement 2: Loading / Splash Screen

**User Story:** As a first-time visitor, I want to see a branded loading screen when the app first opens, so that the app feels polished and professional while assets are being prepared.

#### Acceptance Criteria

1. WHEN a user visits the App for the first time in a browser session, THE Splash_Screen SHALL display an animated logo (a CSS animation or SVG keyframe sequence that transforms the logo element), the application title, subtitle, and a progress indicator.
2. WHEN the Splash_Screen progress reaches 100%, THE App SHALL automatically navigate to `/home` within 300 milliseconds without requiring any user action.
3. IF a returning user visits the App in the same browser session (the `visited` key exists in sessionStorage), THEN THE Splash_Screen SHALL be skipped and the App SHALL route the user to `/home` immediately.
4. WHILE the Splash_Screen is displayed, THE App SHALL invoke the Service_Worker registration (via `navigator.serviceWorker.register`) so that PWA caching begins before user navigation.
5. THE Splash_Screen SHALL complete its animation sequence within 1500 milliseconds of the page render.

---

### Requirement 3: Authentication Scope — New Songs Section Only

**User Story:** As a user who wants to upload or interact with new songs, I want to be prompted to Sign In or Sign Up only when I access the New Songs feature, so that casual browsing is never blocked.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access the New_Songs_Section (upload, submit, or manage new songs), THE App SHALL redirect the user to the Auth_Page.
2. WHEN a user successfully signs in with valid credentials, THE App SHALL issue a JWT session cookie and redirect the user to the URL stored in the `redirect` query parameter on the Auth_Page (or to `/home` if no `redirect` parameter is present).
3. WHEN a user successfully registers and their status is `pending`, THE App SHALL redirect the user to the Pending page (`/pending`) and display a message that account approval is required.
4. WHEN an Approved_User accesses the New_Songs_Section, THE App SHALL permit access without redirecting to the Auth_Page.
5. IF a user submits the registration form with an email that is already registered, THEN THE Auth_Page SHALL display a descriptive error message without creating a duplicate account.
6. IF a user submits the login form with incorrect credentials, THEN THE Auth_Page SHALL display a descriptive error message without revealing whether the email or password is wrong.
7. THE Auth_Page SHALL enforce a minimum password length of 5 characters and a minimum full name length of 6 characters at the client side before submission; the server SHALL also reject requests that do not meet these constraints.
8. THE App SHALL enforce one account per device by associating each registration with the Device_ID stored in `localStorage`; IF a registration request arrives from a Device_ID that already has an account, THEN THE App SHALL reject the request and display an error message to the user.
9. WHEN a user signs out, THE App SHALL invalidate the session cookie and allow the user to continue browsing the Home_Page without authentication.
10. WHEN a Pending_User attempts to access the New_Songs_Section, THE App SHALL redirect the user to `/pending` rather than to the Auth_Page.

---

### Requirement 4: PWA Installability

**User Story:** As a user on any device, I want to install the App to my home screen directly from the browser, so that I can launch it like a native application without opening a browser.

#### Acceptance Criteria

1. THE App SHALL include a valid Web App Manifest (`/manifest.json`) with `name`, `short_name`, `start_url`, `display: standalone`, `background_color`, `theme_color`, and at least one icon entry of size 192×192 and one of size 512×512.
2. WHEN the browser fires the `beforeinstallprompt` event AND neither `pwa_installed` nor `pwa_dismissed` is set in `localStorage`, THE Install_Prompt component SHALL display a sticky install banner to the user.
3. WHEN a user taps the install button on the Install_Prompt banner, THE App SHALL trigger the native browser install dialog.
4. WHEN the user accepts the native install dialog, THE App SHALL hide the Install_Prompt banner and write `pwa_installed='1'` to `localStorage`.
5. WHEN the user dismisses the Install_Prompt banner, THE App SHALL write a `pwa_dismissed` flag to `localStorage`.
6. IF `pwa_dismissed` is set in `localStorage`, THEN THE Install_Prompt component SHALL NOT display the install banner on any subsequent page load or navigation.
7. WHERE the user's browser is Safari on iOS, THE App SHALL display a step-by-step guide explaining how to use "Add to Home Screen" via the Share button.
8. WHILE the App is running in standalone display mode (launched from the home screen), THE App SHALL present a full-screen experience without browser navigation bars.
9. THE App SHALL invoke `navigator.serviceWorker.register` on each page load so that the Service_Worker is active after the first visit.

---

### Requirement 5: Offline Playback

**User Story:** As a user with an intermittent internet connection, I want to play songs that I have already listened to or that the app has cached, so that I can enjoy music even when offline.

#### Acceptance Criteria

1. WHEN a user plays a song while online, THE Service_Worker SHALL cache the full audio file blob in the Audio_Cache for future offline playback.
2. WHEN the App loads in a browser session where the Service_Worker is active and the per-session prefetch flag is not set in sessionStorage, THE Player_Context SHALL fetch all songs from the API and send their audio URLs to the Service_Worker to be cached in the background, then set the per-session prefetch flag to prevent duplicate fetches within the same session.
3. WHILE the device has no internet connection, THE App SHALL serve audio files for previously cached songs directly from the Audio_Cache without making a network request.
4. WHILE the device has no internet connection, THE App SHALL serve song and artist metadata from the IndexedDB store populated during previous online sessions.
5. WHEN a browser sends a `Range` HTTP request header for a cached audio file, THE Service_Worker SHALL respond with the correct `206 Partial Content` response sliced from the cached blob, enabling seeking within offline audio.
6. THE App SHALL display a real-time online/offline status indicator (pill) in the header of the Home_Page that updates within 500 milliseconds of a connectivity change.
7. WHEN the device reconnects to the internet, THE App SHALL resume fetching live data from the API and update the IndexedDB and Audio_Cache with any new or updated content within one fetch cycle.
8. IF the App is offline and the requested audio file is not in the Audio_Cache, THEN THE Service_Worker SHALL respond with a `503 Service Unavailable` status so the player can surface a meaningful error to the user.

---

### Requirement 6: Performance

**User Story:** As a user on any device and network condition, I want the App to load instantly, navigate without perceptible delay, and feel as responsive as a native application.

#### Acceptance Criteria

1. THE Home_Page SHALL display meaningful content (artist list or skeleton loading state) within 1500 milliseconds of navigation on a 3G or better mobile network.
2. IF artist data for a category is already stored in the in-memory cache (`dataCache`), THEN THE Home_Page SHALL render it within 100 milliseconds of navigation.
3. WHEN artist data for a category is rendered from the in-memory cache, THE App SHALL refresh that data from the network in the background and update the UI when the response arrives.
4. IF the user switches between category pills on the Home_Page and the data for the selected category is already in the in-memory cache, THEN THE App SHALL render the cached category list within 100 milliseconds without displaying a loading state.
5. THE Service_Worker SHALL use a stale-while-revalidate strategy for static assets, returning the cached version immediately while fetching an update in the background.
6. WHEN the Service_Worker intercepts a request to the Songs or Artists API endpoints and the device is online, THE Service_Worker SHALL fetch from the network and update the cache with the response.
7. IF the device is offline when a Songs or Artists API request is intercepted, THEN THE Service_Worker SHALL return the cached API response; IF no cached response exists, THE Service_Worker SHALL return an empty collection response.
8. THE App SHALL preconnect to the Supabase hostname via a `<link rel="preconnect">` tag in the document `<head>` to reduce TLS handshake latency on first API calls.
9. THE App SHALL prefetch DNS for the Supabase hostname via a `<link rel="dns-prefetch">` tag in the document `<head>`.
10. THE App SHALL use `sessionStorage` to ensure the background song prefetch runs at most once per browser session so that repeated page navigations do not re-fetch all songs from the API.
11. WHEN the App is installed as a PWA and launched in standalone mode, THE App SHALL serve the Home_Page navigation response from the Service_Worker cache so the page shell is displayed without issuing a network request.

---

### Requirement 7: Song Playback and Queue Management

**User Story:** As a user, I want to play songs, navigate between tracks, seek within a track, and control volume, so that I have a full-featured music playback experience.

#### Acceptance Criteria

1. WHEN a user taps a song, THE Player_Context SHALL set that song as the current song, update the audio source, and begin playback immediately.
2. WHEN a song finishes playing and the queue is non-empty, THE Player_Context SHALL automatically advance to the next song in the queue without user interaction.
3. WHEN a user taps the next-track button and the queue is non-empty, THE Player_Context SHALL advance to the next song in the queue.
4. WHEN a user taps the next-track button and the queue is empty, THE Player_Context SHALL take no action and the current song SHALL remain unchanged.
5. WHEN a user taps the previous-track button and the current playback time is greater than 3 seconds, THE Player_Context SHALL seek the current song back to 0 seconds.
6. WHEN a user taps the previous-track button and the current playback time is 3 seconds or less, THE Player_Context SHALL take no action and the current song and playback time SHALL remain unchanged.
7. WHEN a user adjusts the seek slider, THE Player_Context SHALL update the audio element's `currentTime` to the selected position, clamped to the range [0, song duration].
8. WHEN a user adjusts the volume control, THE Player_Context SHALL update the audio element's volume to the selected value in the range [0.0, 1.0] and persist the new volume value to `sessionStorage`.
9. WHILE a song is playing, THE Mini_Player SHALL display the song title, artist name, and play/pause and next-track controls at the bottom of the screen.
10. THE Player_Context SHALL persist the currently playing song identity and volume to `sessionStorage` so that a page refresh restores the song and volume without requiring the user to reselect.

---

### Requirement 8: Admin Song and Artist Management

**User Story:** As an Admin, I want to upload songs and manage artists through a protected dashboard, so that the content library stays up to date without requiring code changes.

#### Acceptance Criteria

1. WHEN an Admin submits a matching email and password on the Admin Login page (`/admin/login`), THE App SHALL issue an `admin_token` JWT cookie (HttpOnly, expiring after 8 hours) and redirect the Admin to the Admin Dashboard (`/admin/dashboard`).
2. WHEN an unauthenticated request reaches any `/admin/*` route, or the `admin_token` cookie is expired or invalid, THE App SHALL respond with a redirect to `/admin/login`.
3. WHEN an Admin uploads a song file (in `.mp3`, `.m4a`, `.ogg`, or `.wav` format) via the Admin Dashboard along with the required metadata (title, artist, category, language), THE App SHALL store the audio file in the Supabase `audio` storage bucket and atomically create a corresponding record in the `songs` table; IF either operation fails, THEN neither the file nor the record SHALL be persisted.
4. WHEN an Admin uploads an image file (in `.jpg`, `.jpeg`, `.png`, or `.webp` format) for an artist, THE App SHALL store the image in the Supabase `images` storage bucket and update the artist record with the new `image_url`; IF an unsupported format is uploaded, THEN THE App SHALL reject the upload with a descriptive error message.
5. WHILE an Admin is on the Dashboard, THE App SHALL list all pending user registrations ordered by registration date (oldest first) and allow the Admin to approve or reject each registration.
6. WHEN an Admin approves a user registration, THE App SHALL update the user's `status` to `approved` and set the `approved_at` timestamp in the `app_users` table.
7. WHEN an Admin rejects a user registration, THE App SHALL update the user's `status` to `rejected` and set the `rejected_at` timestamp in the `app_users` table.
8. IF an uploaded audio file exceeds 50 MB, THEN THE App SHALL reject the upload and return a descriptive error message to the Admin.
9. IF an uploaded image file exceeds 10 MB, THEN THE App SHALL reject the upload and return a descriptive error message to the Admin.

---

### Requirement 9: Theme and Language Support

**User Story:** As a user, I want to switch between light and dark themes and see labels in my preferred language, so that the app feels comfortable to use in any environment.

#### Acceptance Criteria

1. THE App SHALL support three theme modes: `light`, `dark`, and `system` (follows the OS preference via `prefers-color-scheme`).
2. WHEN a user selects a theme from the theme picker, THE App SHALL apply the selected theme within one rendering cycle and persist the choice to `localStorage`.
3. WHEN the user's OS switches between light and dark mode while the `system` theme is active, THE App SHALL update the rendered theme to match within one rendering cycle.
4. THE App SHALL support five display languages: Afaan Oromo, English, Amharic, Sidama, and Arabic.
5. WHEN a user changes the display language in Settings, THE App SHALL update all UI labels, section headings, and navigation text to the selected language without requiring a page reload, and SHALL persist the choice to `localStorage`.
6. WHEN a user visits the App for the first time with no persisted preferences, THE App SHALL apply the `system` theme and the Afaan Oromo language as the default values.
