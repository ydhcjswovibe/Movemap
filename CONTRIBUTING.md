# Contributing to Movemap

Thanks for taking a look at Movemap. The project is still early-stage, so small,
focused contributions are the easiest to review.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5174` after the dev server starts. The dev server uses a
strict port, so stop any existing process on `5174` if Vite reports that the
port is already in use.

Supabase configuration is optional for basic UI review, but required for Google
login, cloud project saving, public share links, and audio storage. Use
`.env.example` as the starting point and see `README.md` for the Supabase SQL
setup notes.

## Available commands

```bash
npm run dev
npm run build
npm test
npm run test:browser
```

There is currently no separate lint script.

## Welcome contributions

- Documentation and onboarding improvements.
- Sample choreography templates and rehearsal examples.
- Mobile editing improvements.
- Timeline and music cue editing improvements.
- Sharing, export, and backup workflows.
- Accessibility fixes.
- Focused bug fixes with a clear reproduction path.

Please avoid broad rewrites or large refactors unless there is an issue or
discussion agreeing on the direction first.

## Issues

When opening an issue, include:

- What you expected to happen.
- What actually happened.
- Steps to reproduce the problem.
- Browser and operating system if the issue is UI-related.
- Screenshots or short screen recordings when they clarify the problem.

Feature requests are welcome. Please describe the rehearsal or choreography
workflow the feature would support.

## Pull requests

Before opening a pull request:

- Keep the change focused and reviewable.
- Run the relevant commands from the list above.
- Update documentation when behavior or setup changes.
- Avoid unsupported claims about adoption, users, or production usage.
- Explain the user-facing impact and any known limitations.

## Code style

- Follow the existing React, JavaScript, and CSS style in the repository.
- Prefer clear names over clever abstractions.
- Keep UI copy concise and practical.
- Add tests when changing shared logic, timeline behavior, sharing behavior, or
  other code with existing test coverage.
- Do not change product behavior in documentation-only pull requests.
