/**
 * Audio Linguist - AI-Powered Audio Splitter
 * Client-side audio processing with WebAssembly Whisper integration
 */

class AudioLinguist {
  //
  // Initializes the AudioLinguist class with default properties.
  // Sets up audio processing context, buffers, and UI tracking variables.
  //
  constructor() {
    this.audioContext = null;
    this.audioBuffer = null;
    this.segments = [];
    this.whisperModel = null;
    this.whisperPipeline = null;
    this.isProcessing = false;
    this.startTime = null;
    this.dragCounter = 0;

    // Processing settings - simplified for Whisper-first approach
    this.settings = {
      minSegmentDuration: 2.0, // Minimum duration for a valid segment
      numberPattern: /^\d+$/, // Pattern to identify segment numbers
    };

    // UI elements cache
    this.statusElement = document.getElementById("statusMessage");

    this.init();
  }
  //
  // Initializes the application by setting up event listeners, controls,
  // and loading the Whisper AI model.
  //
  init() {
    console.log("🚀 AudioLinguist initializing...");
    this.setupEventListeners();
    this.setupSettingsControls();
    this.loadWhisperModel();
  }
  //
  // Sets up all DOM event listeners for drag and drop functionality,
  // file selection, and process button clicks.
  //
  setupEventListeners() {
    console.log("🎧 Setting up event listeners...");
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("audioFile");

    if (!uploadArea) {
      console.error("❌ Upload area not found!");
      return;
    }
    if (!fileInput) {
      console.error("❌ File input not found!");
      return;
    }

    // Prevent default drag behaviors
    document.addEventListener("dragenter", (e) => e.preventDefault());
    document.addEventListener("dragover", (e) => e.preventDefault());
    document.addEventListener("dragleave", (e) => e.preventDefault());
    document.addEventListener("drop", (e) => e.preventDefault());

    // Bind handler methods to ensure correct 'this' context
    this.handleDragEnter = this.handleDragEnter.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleFileSelect = this.handleFileSelect.bind(this);

    // Drag and drop functionality
    uploadArea.addEventListener("dragenter", this.handleDragEnter);
    uploadArea.addEventListener("dragover", this.handleDragOver);
    uploadArea.addEventListener("dragleave", this.handleDragLeave);
    uploadArea.addEventListener("drop", this.handleDrop);

    // File input change
    fileInput.addEventListener("change", this.handleFileSelect);

    // Click to upload
    uploadArea.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("browse-btn") ||
        e.target.closest(".browse-btn")
      ) {
        return;
      }
      fileInput.click();
    });

    // Browse button
    const browseBtn = document.querySelector(".browse-btn");
    if (browseBtn) {
      browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // Process button
    const processBtn = document.getElementById("processBtn");
    if (processBtn) {
      processBtn.addEventListener("click", () => this.processAudio());
    } else {
      console.error("❌ Process button not found!");
    }
  }
  //
  // Initializes UI controls for adjusting settings like minimum segment duration.
  // Connects UI slider elements to their corresponding settings values.
  //
  setupSettingsControls() {
    const minSegmentDuration = document.getElementById("minSegmentDuration");
    const segmentTime = document.getElementById("segmentTime");

    if (minSegmentDuration && segmentTime) {
      minSegmentDuration.addEventListener("input", (e) => {
        this.settings.minSegmentDuration = parseFloat(e.target.value);
        segmentTime.textContent = e.target.value + "s";
      });
    }
  } //
  // Updates the status message in the UI with proper formatting and icons.
  // Handles different status types: info, success, error, and warning.
  //  //
  // Updates the status message displayed to the user in the UI.
  // Handles different status types (info, success, error, warning) with appropriate styling.
  //
  updateStatus(message, type = "info") {
    console.log(`[${type.toUpperCase()}] ${message}`);

    if (this.statusElement) {
      this.statusElement.textContent = message;

      // Remove all status classes and add the current one
      this.statusElement.classList.remove(
        "info",
        "success",
        "error",
        "warning"
      );
      this.statusElement.classList.add(type);

      // Update status icon
      const statusIcon = document.getElementById("statusIcon");
      if (statusIcon) {
        // Change icon based on status type
        statusIcon.className =
          type === "info"
            ? "fas fa-info-circle"
            : type === "success"
            ? "fas fa-check-circle"
            : type === "error"
            ? "fas fa-exclamation-circle"
            : "fas fa-exclamation-triangle"; // warning
      }

      // Make sure the status is visible
      this.statusElement.style.display = "block";
    } else {
      // Log warning if status element not found
      console.warn(
        "Status element not found, could not display message:",
        message
      );
    }
  }
  // Event Handlers
  //
  // Handles the drag enter event when a file is dragged into the upload area.
  // Prevents default browser behavior and applies visual feedback.
  //
  handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter++;
    const uploadArea = document.getElementById("uploadArea");
    if (uploadArea) {
      uploadArea.classList.add("drag-over");
    }
  }
  //
  // Handles the drag over event to allow for file drop operations.
  // Prevents default browser behavior that would block dropping.
  //
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  //
  // Handles the drag leave event when a file is dragged out of the upload area.
  // Tracks multiple drag events to prevent flickering of visual feedback.
  //
  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter--;
    if (this.dragCounter === 0) {
      const uploadArea = document.getElementById("uploadArea");
      if (uploadArea) {
        uploadArea.classList.remove("drag-over");
      }
    }
    return false;
  }
  //
  // Handles the file drop event when a file is dropped into the upload area.
  // Processes the dropped audio file and resets drag counter.
  //
  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    this.dragCounter = 0;
    const uploadArea = document.getElementById("uploadArea");
    if (uploadArea) {
      uploadArea.classList.remove("drag-over");
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
    return false;
  }
  //
  // Handles files selected through the file input element.
  // Passes the selected audio file to the processing function.
  //
  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  } //
  // Validates and processes a selected audio file.
  // Updates UI with file info and initiates 16kHz mono conversion.
  //
  processFile(file) {
    // Make sure we have a valid audio file
    const validTypes = [
      "audio/wav",
      "audio/mp3",
      "audio/mpeg",
      "audio/ogg",
      "audio/m4a",
    ];
    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(wav|mp3|ogg|m4a)$/i)
    ) {
      this.updateStatus(
        "Please select a valid audio file (WAV, MP3, M4A, OGG).",
        "error"
      );
      return;
    }

    // Update UI to show the selected file
    const fileInfo = document.getElementById("fileInfo");
    if (fileInfo) {
      fileInfo.textContent = `File: ${file.name} (${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)} MB)`;
    }

    // Store the file for processing
    this.audioFile = file;
    this.updateStatus(
      `File "${file.name}" selected. Starting conversion to 16kHz mono...`,
      "info"
    );

    // Start processing the file immediately to convert to 16kHz mono
    this.convertAudioTo16kMono();

    // Show status section
    const statusSection = document.getElementById("statusSection");
    if (statusSection) {
      statusSection.style.display = "block";
    }

    // Show controls section
    const controlsSection = document.getElementById("controlsSection");
    if (controlsSection) {
      controlsSection.style.display = "block";
    }
  } //
  // Converts audio file to 16kHz mono format required by Whisper AI.
  // Handles downmixing to mono and resampling with visual progress feedback.
  //
  async convertAudioTo16kMono() {
    try {
      // Show conversion progress UI
      const conversionProgress = document.getElementById("conversionProgress");
      const progressBar = document.getElementById("conversionProgressBar");
      const statusIcon = document.getElementById("statusIcon");

      if (conversionProgress) conversionProgress.style.display = "block";
      if (statusIcon) statusIcon.className = "fas fa-spinner fa-spin";

      // Initialize audio context if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      if (progressBar) progressBar.style.width = "20%";

      // Convert file to audio buffer
      const arrayBuffer = await this.readFileAsArrayBuffer(this.audioFile);

      if (progressBar) progressBar.style.width = "40%";

      const originalBuffer = await this.audioContext.decodeAudioData(
        arrayBuffer
      );

      if (progressBar) progressBar.style.width = "60%";

      // Check if already mono 16kHz
      if (
        originalBuffer.numberOfChannels === 1 &&
        originalBuffer.sampleRate === 16000
      ) {
        this.audioBuffer = originalBuffer;
        if (progressBar) progressBar.style.width = "100%";
        if (statusIcon) statusIcon.className = "fas fa-check-circle";
        setTimeout(() => {
          if (conversionProgress) conversionProgress.style.display = "none";
        }, 1000);
        this.updateStatus(
          `File "${this.audioFile.name}" is already mono 16kHz. Ready to process.`,
          "success"
        );
        return;
      }

      this.updateStatus(
        `Converting audio: ${originalBuffer.numberOfChannels} channel(s) at ${originalBuffer.sampleRate}Hz to mono 16kHz...`,
        "info"
      );

      // Downmix to mono first
      const monoBuffer = this.audioContext.createBuffer(
        1,
        originalBuffer.length,
        originalBuffer.sampleRate
      );
      const monoData = monoBuffer.getChannelData(0);

      if (originalBuffer.numberOfChannels === 1) {
        // Copy mono data
        const sourceData = originalBuffer.getChannelData(0);
        for (let i = 0; i < originalBuffer.length; i++) {
          monoData[i] = sourceData[i];

          // Update progress bar every 5% of the way
          if (i % Math.floor(originalBuffer.length / 20) === 0 && progressBar) {
            progressBar.style.width = `${
              60 + (i / originalBuffer.length) * 20
            }%`;
          }
        }
      } else {
        // Downmix to mono
        for (let i = 0; i < originalBuffer.length; i++) {
          let sum = 0;
          for (let ch = 0; ch < originalBuffer.numberOfChannels; ch++) {
            sum += originalBuffer.getChannelData(ch)[i];
          }
          monoData[i] = sum / originalBuffer.numberOfChannels;

          // Update progress bar every 5% of the way
          if (i % Math.floor(originalBuffer.length / 20) === 0 && progressBar) {
            progressBar.style.width = `${
              60 + (i / originalBuffer.length) * 20
            }%`;
          }
        }
      }

      if (progressBar) progressBar.style.width = "80%";

      // Resample to 16kHz if needed
      if (originalBuffer.sampleRate !== 16000) {
        const offlineContext = new OfflineAudioContext(
          1,
          Math.ceil((monoBuffer.length * 16000) / monoBuffer.sampleRate),
          16000
        );

        const source = offlineContext.createBufferSource();
        source.buffer = monoBuffer;
        source.connect(offlineContext.destination);
        source.start(0);

        const resampledBuffer = await offlineContext.startRendering();

        // Store the resampled buffer
        this.audioBuffer = resampledBuffer;

        if (progressBar) progressBar.style.width = "100%";
        if (statusIcon) statusIcon.className = "fas fa-check-circle";
        setTimeout(() => {
          if (conversionProgress) conversionProgress.style.display = "none";
        }, 1000);

        this.updateStatus(
          `File "${this.audioFile.name}" converted to mono 16kHz. Ready to process.`,
          "success"
        );
      } else {
        // Already at 16kHz, just use the mono buffer
        this.audioBuffer = monoBuffer;

        if (progressBar) progressBar.style.width = "100%";
        if (statusIcon) statusIcon.className = "fas fa-check-circle";
        setTimeout(() => {
          if (conversionProgress) conversionProgress.style.display = "none";
        }, 1000);

        this.updateStatus(
          `File "${this.audioFile.name}" converted to mono. Ready to process.`,
          "success"
        );
      }
    } catch (error) {
      console.error("❌ Error converting audio:", error);

      // Update UI to show error
      const statusIcon = document.getElementById("statusIcon");
      const conversionProgress = document.getElementById("conversionProgress");
      const progressBar = document.getElementById("conversionProgressBar");

      if (statusIcon) statusIcon.className = "fas fa-exclamation-circle";
      if (progressBar) progressBar.style.width = "100%";
      if (progressBar) progressBar.style.background = "#ef4444"; // Error color

      setTimeout(() => {
        if (conversionProgress) conversionProgress.style.display = "none";
      }, 2000);

      this.updateStatus(`Error converting audio: ${error.message}`, "error");
    }
  } //
  // Main audio processing function that orchestrates transcription and segmentation.
  // Performs validation, transcription, segment identification, and result display.
  //
  async processAudio() {
    if (!this.audioFile) {
      this.updateStatus("Please select an audio file first.", "error");
      return;
    }

    if (this.isProcessing) {
      this.updateStatus("Processing already in progress.", "warning");
      return;
    }

    if (!this.audioBuffer) {
      this.updateStatus(
        "Audio is still being converted. Please wait.",
        "warning"
      );
      return;
    }

    try {
      this.isProcessing = true;
      this.startTime = Date.now();
      this.updateStatus("Processing audio file...", "info");

      // Use AI to transcribe and find segments
      this.updateStatus("Transcribing audio...", "info");
      const transcription = await this.transcribeEntireAudio();

      // Find segments based on numbered patterns
      this.updateStatus("Identifying segments...", "info");
      const segments = this.findSegmentsByNumberPattern(transcription);

      // Extract segments from the audio
      this.updateStatus("Extracting segments...", "info");
      this.segments = await this.extractSegmentsFromTimestamps(segments);

      // Display results
      const duration = (Date.now() - this.startTime) / 1000;
      this.updateStatus(
        `Finished processing! ${
          this.segments.length
        } segments extracted in ${duration.toFixed(1)}s`,
        "success"
      );
      this.displayResults();
    } catch (error) {
      console.error("❌ Error processing audio:", error);
      this.updateStatus(`Error processing audio: ${error.message}`, "error");
    } finally {
      this.isProcessing = false;
    }
  }
  //
  // Reads a File object as an ArrayBuffer for audio processing.
  // Returns a Promise that resolves with the file's binary data.
  //
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
  //
  // Formats a seconds value into a readable MM:SS time format.
  // Handles padding of seconds with leading zeros for consistent display.
  //
  formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }
  //
  // Loads the Whisper AI model from the transformers.js library.
  // Shows loading status and handles initialization of the speech recognition pipeline.
  //
  async loadWhisperModel() {
    try {
      // Wait for transformers library to be available
      while (!window.transformers) {
        console.log("⏳ Waiting for transformers library...");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.updateStatus("🔄 Downloading Whisper AI model (39MB)...", "info");
      console.log("🔄 Loading Whisper tiny model...");

      // Show loading messages
      const statusInterval = setInterval(() => {
        const messages = [
          "📥 Downloading Whisper model...",
          "🔧 Initializing WebAssembly...",
          "🧠 Loading neural network weights...",
          "⚡ Optimizing for your device...",
        ];
        const randomMessage =
          messages[Math.floor(Math.random() * messages.length)];
        this.updateStatus(
          randomMessage + " (This may take 1-2 minutes)",
          "info"
        );
      }, 3000);

      // Load the Whisper tiny model
      this.whisperPipeline = await window.transformers.pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        {
          dtype: "fp32",
          device: "wasm",
          cache_dir: ".whisper-cache",
        }
      );
      clearInterval(statusInterval);
      this.whisperModel = {
        loaded: true,
        pipeline: this.whisperPipeline,
      };
      this.updateStatus(
        "🎉 Real AI model loaded! Ready for 16kHz mono audio processing.",
        "success"
      );
      console.log("✅ Whisper tiny model loaded successfully for 16kHz audio");
    } catch (error) {
      console.error("⚠️ Failed to load real Whisper model:", error);
      this.updateStatus(
        "⚠️ AI model loading failed. Please refresh and try again.",
        "error"
      );
      throw error;
    }
  }

  //
  // Performs audio transcription using Whisper AI model.
  // Creates a clean copy of audio data to prevent circular references and stack overflow.
  //
  async whisperTranscription(audioData, options = {}) {
    console.log("🎤 Whisper transcription called with options:", options);
    console.log(
      "🧪 Input type:",
      Object.prototype.toString.call(audioData),
      "Length:",
      audioData.length,
      "Sample:",
      audioData.slice ? audioData.slice(0, 10) : audioData
    );
    if (!this.whisperPipeline) {
      throw new Error("Whisper pipeline not loaded");
    }

    try {
      // Create a clean copy of the Float32Array to prevent circular references
      // This is crucial to avoid stack overflow issues
      const cleanAudioData = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        cleanAudioData[i] = audioData[i];
      }

      // Process the audio in smaller chunks to avoid stack overflow
      // Audio is already at 16kHz mono at this point
      const result = await this.whisperPipeline(cleanAudioData, {
        language: "en", // Force English detection
        task: "transcribe",
        return_timestamps: "word",
        chunk_length_s: 30,
        stride_length_s: 5,
        sampling_rate: 16000, // We've already converted to 16kHz
        ...options,
      });
      console.log("🎯 Whisper result:", result);
      return result;
    } catch (error) {
      console.error("❌ Whisper transcription failed:", error);
      throw error;
    }
  } //
  // Transcribes the entire audio file with recursion prevention safeguards.
  // Prepares audio data, performs quality checks, and attempts transcription with multiple configs.
  //
  async transcribeEntireAudio() {
    // Add debug tracking to catch recursion issues
    console.log("🎤 Starting transcription of entire audio file...");
    
    // Check for an existing transcription in progress - prevent recursion
    if (this._transcriptionInProgress) {
      console.warn("🔄 Transcription already in progress, preventing recursion");
      throw new Error("Transcription recursion detected");
    }
    
    this._transcriptionInProgress = true;
    
    try {
      // Original code with recursion prevention
      if (!this._transcriptionDepth) this._transcriptionDepth = 0;
      this._transcriptionDepth++;

      // Prevent infinite recursion
      if (this._transcriptionDepth > 2) {
        this._transcriptionDepth = 0;
        throw new Error(
          "Maximum transcription depth reached - prevented potential infinite recursion"
        );
      }

      console.log("🎤 Transcribing entire audio file with Whisper...");

      // Audio is already converted to mono 16kHz during upload
      const audioData = this.audioBuffer.getChannelData(0);
      
      // Create a clean copy of audio data to prevent circular references
      const cleanAudioData = new Float32Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        cleanAudioData[i] = audioData[i];
      }

      console.log("📊 Audio data ready for Whisper:", {
        sampleRate: 16000,
        duration: cleanAudioData.length / 16000,
        samples: cleanAudioData.length,
        channels: 1,
      });

      if (this.whisperPipeline) {
        console.log("🎤 Calling Whisper pipeline directly..."); 
        // Check audio quality
        const audioStats = {
          minValue: Math.min(...cleanAudioData.slice(0, 10000)), // Sample first 10k samples to avoid stack issues
          maxValue: Math.max(...cleanAudioData.slice(0, 10000)),
          sampleRate: 16000,
          duration: cleanAudioData.length / 16000,
        };
        console.log("🔍 Audio quality check:", audioStats);
        
        try {
          const configs = [
            {
              name: "Config 1: English with word timestamps",
              options: {
                language: "en",
                task: "transcribe",
                return_timestamps: "word",
                chunk_length_s: 30,
                stride_length_s: 5,
                sampling_rate: 16000, // Audio is already resampled to 16kHz
              },
            },
          ];
          for (const config of configs) {
            console.log(`🧪 Trying ${config.name}...`);
            try {
              // Pass the already resampled 16kHz mono Float32Array to Whisper pipeline
              const result = await this.whisperTranscription(
                cleanAudioData,
                config.options
              );
              console.log("\n🎯 === WHISPER FULL RESPONSE ===");
              console.log(`✅ ${config.name} result:`, result);
              console.log("📝 Full transcription text:", result.text);
              console.log("📊 Response structure:", {
                hasText: !!result.text,
                hasChunks: !!result.chunks,
                hasWords: !!result.words,
                chunkCount: result.chunks?.length || 0,
                wordCount: result.words?.length || 0,
              });
              if (result.chunks && result.chunks.length > 0) {
                console.log("\n📋 CHUNKS DETAILS:");
                result.chunks.forEach((chunk, i) => {
                  console.log(`  Chunk ${i}:`, {
                    text: chunk.text,
                    timestamp: chunk.timestamp,
                    duration: chunk.timestamp
                      ? (chunk.timestamp[1] - chunk.timestamp[0]).toFixed(2) +
                        "s"
                      : "unknown",
                  });
                });
              }
              console.log("\n🔍 Raw result object:", result);
              console.log("=== END WHISPER RESPONSE ===\n");
              if (result.text && result.text.trim().length > 0) {
                console.log(`🎉 Success with ${config.name}!`);
                this._transcriptionDepth--; // Decrement depth counter on success
                return result;
              } else {
                console.log(
                  `⚠️ ${config.name} returned empty text, trying next config...`
                );
              }
            } catch (configError) {
              console.log(`❌ ${config.name} failed:`, configError.message);
            }
          } // If all configs failed, return empty result
          console.warn(
            "⚠️ All Whisper configurations failed or returned empty results"
          );
          this._transcriptionDepth--;
          return { text: "", chunks: [] };
        } catch (error) {
          console.error("❌ Whisper pipeline failed:", error);
          this._transcriptionDepth--;
          throw error;
        }
      } else {
        console.error("❌ Whisper pipeline not loaded!");
        this._transcriptionDepth--;
        throw new Error("Whisper pipeline not available");
      }
    } catch (err) {
      console.error("❌ transcribeEntireAudio top-level error:", err);
      this._transcriptionDepth = 0; // Reset on error
      throw err;
    } finally {
      this._transcriptionInProgress = false; // Always clear flag
    }
  }
  //
  // Analyzes transcription to find numbered segments for language learning content.
  // Identifies numbers like "951" and groups subsequent words into content segments.
  //
  findSegmentsByNumberPattern(transcription) {
    console.log("🔍 Finding segments by number patterns in transcription...");

    const words = transcription.chunks || [];
    const segments = [];

    // Look for English number patterns (like "951", "952", etc.)
    const englishNumberPattern = /^\d+$/; // Match pure numbers like "951"

    let currentSegment = null;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const cleanText = word.text.trim();
      const isEnglishNumber = englishNumberPattern.test(cleanText);

      console.log(`Word ${i}: "${cleanText}" - isNumber: ${isEnglishNumber}`);

      if (isEnglishNumber) {
        // End previous segment if it exists
        if (
          currentSegment &&
          currentSegment.endTime - currentSegment.startTime >=
            this.settings.minSegmentDuration
        ) {
          segments.push(currentSegment);
          console.log(
            `✅ Added segment: ${currentSegment.text} (${currentSegment.startTime}s - ${currentSegment.endTime}s)`
          );
        }

        // Start new segment with this number
        currentSegment = {
          startTime: word.timestamp[0],
          endTime: word.timestamp[1],
          words: [word],
          text: cleanText,
          number: parseInt(cleanText),
        };
        console.log(`🆕 Started new segment with number: ${cleanText}`);
      } else {
        // Non-number word - add to current segment if we have one
        if (currentSegment) {
          const timeSinceSegmentStart =
            word.timestamp[0] - currentSegment.startTime;

          // Add word to segment if it's within reasonable time (e.g., 10 seconds)
          if (timeSinceSegmentStart < 10.0) {
            currentSegment.endTime = word.timestamp[1];
            currentSegment.words.push(word);
            currentSegment.text += " " + cleanText;
            console.log(`➕ Added "${cleanText}" to current segment`);
          } else {
            // Too far from segment start - end current segment
            if (
              currentSegment.endTime - currentSegment.startTime >=
              this.settings.minSegmentDuration
            ) {
              segments.push(currentSegment);
              console.log(
                `✅ Added segment: ${currentSegment.text} (${currentSegment.startTime}s - ${currentSegment.endTime}s)`
              );
            }
            currentSegment = null;
          }
        }
      }
    }

    // Don't forget the last segment
    if (
      currentSegment &&
      currentSegment.endTime - currentSegment.startTime >=
        this.settings.minSegmentDuration
    ) {
      segments.push(currentSegment);
      console.log(
        `✅ Added final segment: ${currentSegment.text} (${currentSegment.startTime}s - ${currentSegment.endTime}s)`
      );
    }

    console.log(`📊 Found ${segments.length} potential segments`);
    return segments;
  }
  
  //
  // Extracts audio segments from the main audio buffer based on timestamps.
  // Creates separate audio buffers for each detected segment for playback and download.
  //
  async extractSegmentsFromTimestamps(segments) {
    console.log(
      `✂️ Extracting ${segments.length} audio segments based on Whisper timestamps...`
    );

    const audioSegments = [];
    const sampleRate = this.audioBuffer.sampleRate;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const startSample = Math.floor(segment.startTime * sampleRate);
      const endSample = Math.floor(segment.endTime * sampleRate);
      const duration = segment.endTime - segment.startTime;

      // Extract audio data
      const segmentLength = endSample - startSample;
      const segmentBuffer = this.audioContext.createBuffer(
        this.audioBuffer.numberOfChannels,
        segmentLength,
        sampleRate
      );

      for (
        let channel = 0;
        channel < this.audioBuffer.numberOfChannels;
        channel++
      ) {
        const channelData = this.audioBuffer.getChannelData(channel);
        const segmentChannelData = segmentBuffer.getChannelData(channel);

        for (let sample = 0; sample < segmentLength; sample++) {
          const sourceIndex = startSample + sample;
          if (sourceIndex < channelData.length) {
            segmentChannelData[sample] = channelData[sourceIndex];
          }
        }
      }

      audioSegments.push({
        id: i + 1,
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: duration,
        text: segment.text,
        buffer: segmentBuffer,
        words: segment.words,
      });
    }

    return audioSegments;
  }

  //
  // Displays extracted audio segments in the UI with playback and download controls.
  // Creates HTML elements for each segment showing text, duration, and timestamps.
  //
  displayResults() {
    const resultsSection = document.getElementById("resultsSection");
    const segmentsList = document.getElementById("segmentsContainer");

    if (!segmentsList) {
      console.error("❌ Segments container not found!");
      return;
    }

    segmentsList.innerHTML = "";

    this.segments.forEach((segment, index) => {
      const segmentDiv = document.createElement("div");
      segmentDiv.className = "segment-card";

      segmentDiv.innerHTML = `
                <div class="segment-header">
                    <h3 class="segment-title">Segment ${segment.id}</h3>
                    <span class="segment-badge">${this.formatTime(
                      segment.duration
                    )}</span>
                </div>
                <div class="segment-info">
                    <div class="info-item">
                        <i class="fas fa-quote-left"></i>
                        <span>"${segment.text}"</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${this.formatTime(
                          segment.startTime
                        )} - ${this.formatTime(segment.endTime)}</span>
                    </div>
                </div>
                <div class="segment-actions">
                    <button class="download-btn" onclick="audioLinguist.playSegment(${index})">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <button class="download-btn" onclick="audioLinguist.downloadSegment(${index})">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;

      segmentsList.appendChild(segmentDiv);
    });

    resultsSection.style.display = "block";
  }

  //
  // Plays an extracted audio segment through the audio context.
  // Creates a buffer source node and connects it to the audio output destination.
  //
  async playSegment(index) {
    const segment = this.segments[index];
    if (!segment) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = segment.buffer;
      source.connect(this.audioContext.destination);
      source.start();

      console.log(`🔊 Playing segment ${segment.id}: "${segment.text}"`);
    } catch (error) {
      console.error("Error playing segment:", error);
      this.updateStatus(`Error playing segment: ${error.message}`, "error");
    }
  }
  //
  // Creates and downloads a WAV file for a single audio segment.
  // Converts the audio buffer to a WAV blob and triggers browser download.
  //
  async downloadSegment(index) {
    const segment = this.segments[index];
    if (!segment) return;

    try {
      // Convert buffer to WAV
      const wavBlob = this.bufferToWav(segment.buffer);

      // Create download link
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `segment_${segment.id.toString().padStart(3, "0")}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`💾 Downloaded segment ${segment.id}`);
    } catch (error) {
      console.error("Error downloading segment:", error);
      this.updateStatus(`Error downloading segment: ${error.message}`, "error");
    }
  }
  //
  // Converts an audio buffer to a WAV file format blob.
  // Creates WAV header and converts float audio samples to 16-bit PCM format.
  //
  bufferToWav(buffer) {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }
}

// Initialize the application when the page loads
let audioLinguist;
document.addEventListener("DOMContentLoaded", () => {
  audioLinguist = new AudioLinguist();
  // Make audioLinguist globally accessible for button clicks
  window.audioLinguist = audioLinguist;
});
