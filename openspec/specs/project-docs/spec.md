## Purpose

Keeps DESIGN.md and README.md as living entry points describing the project's architecture and workflows.

## Requirements

### Requirement: Design document exists
The repository SHALL contain a `DESIGN.md` at its root that captures the product vision and architecture.

#### Scenario: Design document present
- **WHEN** the repository is inspected at its root
- **THEN** a `DESIGN.md` file exists

#### Scenario: Design document covers required topics
- **WHEN** `DESIGN.md` is read
- **THEN** it SHALL cover: product vision and positioning, design principles, UI layout, the two-process architecture, the PTY/terminal stack decision (including why Alacritty is not embedded), and the technology stack with versions

### Requirement: Readme exists
The repository SHALL contain a `README.md` at its root that explains the project and how to run it.

#### Scenario: Readme present
- **WHEN** the repository is inspected at its root
- **THEN** a `README.md` file exists

#### Scenario: Readme covers project basics
- **WHEN** `README.md` is read
- **THEN** it SHALL state the project purpose, the stack, and the commands to install dependencies, run the dev build, and build a production bundle

### Requirement: Agent guidelines exist
The repository SHALL contain an `AGENTS.md` at its root that documents project-local agentic workflow conventions.

#### Scenario: Agent guidelines present
- **WHEN** the repository is inspected at its root
- **THEN** an `AGENTS.md` file exists

#### Scenario: Agent guidelines cover stack and commands
- **WHEN** `AGENTS.md` is read
- **THEN** it SHALL record the tech stack, the package manager, the commands for development and checks, and the architecture boundary (webview must not touch PTY/FS directly)

### Requirement: Git ignore file exists
The repository SHALL contain a `.gitignore` that excludes build artifacts and OS cruft.

#### Scenario: Ignore file present
- **WHEN** the repository is inspected at its root
- **THEN** a `.gitignore` file exists

#### Scenario: Common artifacts ignored
- **WHEN** the ignore rules are evaluated
- **THEN** `node_modules/`, `dist/`, `src-tauri/target/`, `src-tauri/gen/`, and `.DS_Store` SHALL be ignored
