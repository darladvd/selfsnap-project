# SelfSnap — Product Overview

SelfSnap is a browser-based photo booth that captures a 4-shot photo strip, composes it onto a decorative frame, and lets users download or share the final image.

## Core Principles

- **Privacy-first**: No images are uploaded or stored server-side. All photo data lives in the browser session only.
- **WYSIWYG framing**: The booth preview uses the exact same layout math as the final composed image.
- **No retakes**: Captures are sequential and timer-based, mimicking a real photo booth experience.
- **Mobile-first**: Designed primarily for mobile selfie use, but works on desktop.

## User Flow

1. Landing → Start
2. Settings → Select frame, filter (none/bw/sepia), timer duration
3. Booth → 4 timed captures shown in a 2×2 grid preview
4. Result → Final composed image with frame, branding, and date; download or share via Web Share API

## Data Model

- Settings and captured shots are passed between views via `sessionStorage`.
- Frames are fetched from a backend API (`/frames`) and stored in DynamoDB.
- The final image is composed entirely client-side using HTML Canvas.
