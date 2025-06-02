# Audio Linguist - AI-Powered Audio Splitter

A modern, client-side web application for automatically splitting audio files containing numbered language learning content.

## Features

- **🤖 AI-Powered**: Uses advanced speech recognition to identify numbered segments
- **🔒 Privacy-First**: All processing happens locally in your browser
- **🎛️ Customizable**: Adjustable sensitivity settings for different audio types
- **📱 Responsive**: Works on desktop, tablet, and mobile devices
- **⚡ Fast**: Efficient audio processing with real-time progress tracking
- **📦 Bulk Download**: Download all segments as individual files or in a ZIP archive

## How It Works

1. **Upload Audio**: Drag and drop or browse for your WAV, MP3, M4A, or OGG file
2. **Auto-Detection**: The app analyzes silence patterns to identify segment boundaries
3. **AI Transcription**: Each segment is processed to extract the spoken number and content
4. **Smart Naming**: Files are automatically named based on the detected numbers (e.g., "101.wav", "102.wav")
5. **Download**: Get individual segments or download all as a convenient ZIP file

## Supported Formats

- **Input**: WAV, MP3, M4A, OGG
- **Output**: WAV format for maximum compatibility

## Usage

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
2. Upload your audio file
3. Adjust processing settings if needed:
   - **Silence Threshold**: How quiet audio needs to be to count as silence
   - **Min Silence Duration**: Minimum silence length to split segments
   - **Min Segment Duration**: Minimum length for a valid segment
4. Click "Process Audio" and wait for AI analysis
5. Review and download your segments

## Technical Details

- **Client-Side Processing**: No server required, works offline after loading
- **Web Audio API**: High-quality audio processing in the browser
- **WebAssembly Ready**: Prepared for integration with Whisper.cpp for enhanced accuracy
- **Modern JavaScript**: ES6+ features with fallbacks for older browsers

## JavaScript Implementation (audio-splitter.js)

The `audio-splitter.js` file implements the core functionality through the `AudioLinguist` class:

1. **Audio Loading**: Uses Web Audio API to load and decode audio files
2. **Whisper Integration**: 
   - Loads the Whisper model via transformers.js in WebAssembly
   - Processes audio in 16kHz mono format required by Whisper
   - Handles transcription with word-level timestamps
3. **Segment Detection**:
   - Analyzes transcription to find numbered segments (e.g., "951", "952")
   - Groups words belonging to the same segment based on timestamps
4. **Audio Extraction**:
   - Uses timestamps to extract precise audio segments from the source file
   - Creates individual audio buffers for each segment
5. **User Interface**:
   - Displays segments with text, duration, and playback controls
   - Provides download options for individual segments
   - Shows progress and status updates during processing

The application uses a non-blocking approach with async/await pattern to keep the UI responsive during intensive operations like audio processing and AI transcription.

## Browser Compatibility

- Chrome 66+ (recommended)
- Firefox 60+
- Safari 12+
- Edge 79+

## Demo Audio

Place your test audio file in the `audio/` folder. The app will work with any audio file containing:
- Spoken numbers in English (e.g., "101", "102", "103")
- Followed by phrases in any language
- Clear silence gaps between segments

## Development

To enhance the app:

1. **Add Real Whisper Integration**: Replace the simulation with actual Whisper.cpp WebAssembly
2. **Cloud API Support**: Add options for cloud-based transcription services
3. **More Audio Formats**: Extend support for additional input/output formats
4. **Custom Models**: Allow users to load their own speech recognition models

## License

This project is open source and available under the MIT License.

---

**Note**: This application prioritizes privacy by processing all audio locally in your browser. Your audio files never leave your device.
