# Studio One — Professional Master Capture

This is a specialized, standalone browser tool designed to capture high-fidelity system audio from your Mac without using a microphone.

## Key Features
- **Lossless WAV Encoding**: Built-in professional encoder produces macOS-compatible `.wav` files (PCM 16-bit, 44.1kHz Stereo).
- **Direct System Capture**: Uses the Screen Capture API to pull audio directly from your computer's output.
- **Multicolor Visualizer**: High-refresh spectrum analyzer with "cooled down" headroom (capped at 55% height) to prevent visual clipping.
- **Master Quality**: No compression, no artifacts.

## How to Use
1. **Launch**: Open [studio-one-master-edition.html](./studio-one-master-edition.html) in Chrome or any modern browser.
2. **Link Audio**: Click the **"Link Computer Audio"** button.
3. **Select Source**: 
   - A browser popup will appear.
   - Choose a Tab, Window, or your Entire Screen.
   - **IMPORTANT**: Ensure the **"Share Audio"** checkbox at the bottom left of the popup is checked.
4. **Levels**: You should see the multicolored visualizer dancing. If it's too quiet, check your system volume.
5. **Record**: Hit **Record** when ready.
6. **Stop & Save**: Hit **Stop** to immediately finalize the file and trigger a download to your Mac.

## Maintenance
The source code is contained entirely within the HTML file. No external dependencies or internet connection required for operation.
