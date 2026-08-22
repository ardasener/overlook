## Purpose

Publishes a landing page for the project via GitHub Pages.

## Requirements

### Requirement: Landing page
The website SHALL provide a landing page with the app identity, a features summary, and download links for all supported platforms.

#### Scenario: Hero shows the app identity
- **WHEN** the site is opened
- **THEN** the landing page SHALL show the app icon, the name "Overlook", and a short tagline

#### Scenario: Download links for all platforms
- **WHEN** the landing page is shown
- **THEN** it SHALL link to the latest GitHub release for macOS, Linux, and Windows (a single link to the releases page is sufficient per platform)

#### Scenario: Features section
- **WHEN** the landing page is shown
- **THEN** it SHALL summarize the app's key features as static content

### Requirement: Theme
The site SHALL use the RicoUI Starter's `minimal-mono` theme as the default and SHALL support light and dark modes.

#### Scenario: Minimal mono default
- **WHEN** the site loads
- **THEN** the default color theme SHALL be `minimal-mono`

#### Scenario: Light/dark toggle
- **WHEN** the user toggles the theme
- **THEN** the site SHALL switch between light and dark appearances

#### Scenario: No multi-theme switcher
- **WHEN** the site is shown
- **THEN** the user SHALL be able to choose between light and dark only, not among multiple color themes

### Requirement: GitHub Pages deployment
The site SHALL be deployed to GitHub Pages at `ardasener.github.io/overlook/` automatically when the `main` branch is updated.

#### Scenario: Push to main deploys
- **WHEN** a change is pushed to `main`
- **THEN** the site SHALL be rebuilt and deployed to GitHub Pages

#### Scenario: Site served under /overlook/
- **WHEN** the deployed site is visited
- **THEN** it SHALL be available at `ardasener.github.io/overlook/`
