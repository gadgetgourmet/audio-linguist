/**
 * Audio Linguist - AI-Powered Audio Splitter
 * Client-side audio processing with WebAssembly Whisper integration
 */

class AudioLinguist {
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
            minSegmentDuration: 2.0,  // Minimum duration for a valid segment
            numberPattern: /^\d+$/    // Pattern to identify segment numbers
        };
        
        this.init();
    }

    init() {
        console.log('🚀 AudioLinguist initializing...');
        this.setupEventListeners();
        this.setupSettingsControls();
        this.loadWhisperModel();
    }

    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('audioFile');

        if (!uploadArea) {
            console.error('❌ Upload area not found!');
            return;
        }
        if (!fileInput) {
            console.error('❌ File input not found!');
            return;
        }

        // Prevent default drag behaviors
        document.addEventListener('dragenter', (e) => e.preventDefault());
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('dragleave', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());

        // Defensive: Check all handler methods before binding
        const handlerNames = [
            'handleDragEnter', 'handleDragOver', 'handleDragLeave', 'handleDrop', 'handleFileSelect'
        ];
        for (const name of handlerNames) {
            if (typeof this[name] !== 'function') {
                console.error(`❌ Handler method '${name}' is missing or not a function!`);
                return;
            }
        }

        // Drag and drop functionality
        uploadArea.addEventListener('dragenter', this.handleDragEnter.bind(this));
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // File input change
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Click to upload
        uploadArea.addEventListener('click', (e) => {
            if (e.target.classList.contains('browse-btn') || e.target.closest('.browse-btn')) {
                return;
            }
            fileInput.click();
        });

        // Browse button
        const browseBtn = document.querySelector('.browse-btn');
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        // Process button
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.addEventListener('click', () => this.processAudio());
        } else {
            console.error('❌ Process button not found!');
        }
    }

    setupSettingsControls() {
        const minSegmentDuration = document.getElementById('minSegmentDuration');
        const segmentTime = document.getElementById('segmentTime');

        if (minSegmentDuration && segmentTime) {
            minSegmentDuration.addEventListener('input', (e) => {
                this.settings.minSegmentDuration = parseFloat(e.target.value);
                segmentTime.textContent = e.target.value + 's';
            });
        }
    }

    async loadWhisperModel() {
        try {
            // Wait for transformers library to be available
            while (!window.transformers) {
                console.log('⏳ Waiting for transformers library...');
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.updateStatus('🔄 Downloading Whisper AI model (39MB)...', 'info');
            console.log('🔄 Loading Whisper tiny model...');
            
            // Show loading messages
            const statusInterval = setInterval(() => {
                const messages = [
                    '📥 Downloading Whisper model...',
                    '🔧 Initializing WebAssembly...',
                    '🧠 Loading neural network weights...',
                    '⚡ Optimizing for your device...'
                ];
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                this.updateStatus(randomMessage + ' (This may take 1-2 minutes)', 'info');
            }, 3000);
            
            // Load the Whisper tiny model
            this.whisperPipeline = await window.transformers.pipeline(
                'automatic-speech-recognition',
                'Xenova/whisper-tiny',
                {
                    dtype: 'fp32',
                    device: 'wasm',
                    cache_dir: '.whisper-cache'
                }
            );
              clearInterval(statusInterval);
            this.whisperModel = {
                loaded: true,
                pipeline: this.whisperPipeline
            };
              this.updateStatus('🎉 Real AI model loaded! Ready for English speech recognition.', 'success');
            console.log('✅ Whisper tiny model loaded successfully');
        } catch (error) {
            console.error('⚠️ Failed to load real Whisper model:', error);
            this.updateStatus('⚠️ AI model loading failed. Please refresh and try again.', 'error');
            throw error;
        }
    }
    
    async whisperTranscription(audioData, options = {}) {
        console.log('🎤 Whisper transcription called with options:', options);
        console.log('🧪 Input type:', Object.prototype.toString.call(audioData), 'Length:', audioData.length, 'Sample:', audioData.slice ? audioData.slice(0, 10) : audioData);
        if (!this.whisperPipeline) {
            throw new Error('Whisper pipeline not loaded');
        }
        try {
            const result = await this.whisperPipeline(audioData, {
                language: 'en',  // Force English detection
                task: 'transcribe',
                return_timestamps: 'word',
                chunk_length_s: 30,
                stride_length_s: 5,
                ...options
            });
            console.log('🎯 Whisper result:', result);
            return result;
        } catch (error) {
            console.error('❌ Whisper transcription failed:', error);
            throw error;
        }
    }

    // Utility: Resample Float32Array to 16kHz mono
    async resampleTo16kMono(audioBuffer) {
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * 16000), 16000);
        // Create buffer source
        const bufferSource = offlineCtx.createBufferSource();
        // Convert to mono if needed
        let monoBuffer;
        if (audioBuffer.numberOfChannels === 1) {
            monoBuffer = audioBuffer;
        } else {
            // Downmix stereo to mono
            monoBuffer = offlineCtx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            const mono = monoBuffer.getChannelData(0);
            for (let i = 0; i < audioBuffer.length; i++) {
                mono[i] = (left[i] + right[i]) / 2;
            }
        }
        bufferSource.buffer = monoBuffer;
        bufferSource.connect(offlineCtx.destination);
        bufferSource.start(0);
        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer.getChannelData(0);
    }

    async transcribeEntireAudio() {
        try {
            console.log('🎤 Transcribing entire audio file with Whisper...');
            // Resample to 16kHz mono Float32Array
            const audioData = await this.resampleTo16kMono(this.audioBuffer);
            console.log('📊 Audio data prepared for Whisper:', {
                sampleRate: 16000,
                duration: audioData.length / 16000,
                samples: audioData.length,
                converted: 'mono 16kHz'
            });
            if (this.whisperPipeline) {
                console.log('🎤 Calling Whisper pipeline directly...');
                // Check audio quality
                const audioStats = {
                    minValue: Math.min(...audioData),
                    maxValue: Math.max(...audioData),
                    rmsLevel: Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length),
                    nonZeroSamples: audioData.filter(x => Math.abs(x) > 0.001).length
                };
                console.log('🔍 Audio quality check:', audioStats);
                if (audioStats.rmsLevel < 0.001) {
                    console.warn('⚠️ Audio appears to be silent or very quiet!');
                    this.updateStatus('⚠️ Audio appears to be silent. Please check your audio file.', 'warning');
                }
                try {
                    const configs = [
                        {
                            name: 'Config 1: English with word timestamps',
                            options: {
                                language: 'en',
                                task: 'transcribe',
                                return_timestamps: 'word',
                                chunk_length_s: 30,
                                stride_length_s: 5
                            }
                        },
                        {
                            name: 'Config 2: English simple',
                            options: {
                                language: 'en',
                                task: 'transcribe',
                                return_timestamps: false
                            }
                        }
                    ];
                    for (const config of configs) {
                        console.log(`🧪 Trying ${config.name}...`);
                        try {
                            // Pass the 16kHz mono Float32Array to Whisper pipeline
                            const result = await this.whisperTranscription(audioData, config.options);
                            console.log('\n🎯 === WHISPER FULL RESPONSE ===');
                            console.log(`✅ ${config.name} result:`, result);
                            console.log('📝 Full transcription text:', result.text);
                            console.log('📊 Response structure:', {
                                hasText: !!result.text,
                                hasChunks: !!result.chunks,
                                hasWords: !!result.words,
                                chunkCount: result.chunks?.length || 0,
                                wordCount: result.words?.length || 0
                            });
                            if (result.chunks && result.chunks.length > 0) {
                                console.log('\n📋 CHUNKS DETAILS:');
                                result.chunks.forEach((chunk, i) => {
                                    console.log(`  Chunk ${i}:`, {
                                        text: chunk.text,
                                        timestamp: chunk.timestamp,
                                        duration: chunk.timestamp ? (chunk.timestamp[1] - chunk.timestamp[0]).toFixed(2) + 's' : 'unknown'
                                    });
                                });
                            }
                            console.log('\n🔍 Raw result object:', result);
                            console.log('=== END WHISPER RESPONSE ===\n');
                            if (result.text && result.text.trim().length > 0) {
                                console.log(`🎉 Success with ${config.name}!`);
                                return result;
                            } else {
                                console.log(`⚠️ ${config.name} returned empty text, trying next config...`);
                            }
                        } catch (configError) {
                            console.log(`❌ ${config.name} failed:`, configError.message);
                        }
                    }
                    // If all configs failed, return empty result
                    console.warn('⚠️ All Whisper configurations failed or returned empty results');
                    return { text: '', chunks: [] };
                } catch (error) {
                    console.error('❌ Whisper pipeline failed:', error);
                    throw error;
                }
            } else {
                console.error('❌ Whisper pipeline not loaded!');
                throw new Error('Whisper pipeline not available');
            }
        } catch (err) {
            console.error('❌ transcribeEntireAudio top-level error:', err);
            throw err;
        }
    }

    findSegmentsByNumberPattern(transcription) {
        console.log('🔍 Finding segments by number patterns in transcription...');
        
        const words = transcription.chunks || [];
        const segments = [];
        
        // Look for English number patterns (like "951", "952", etc.)
        const englishNumberPattern = /^\d+$/;  // Match pure numbers like "951"
        
        let currentSegment = null;
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const cleanText = word.text.trim();
            const isEnglishNumber = englishNumberPattern.test(cleanText);
            
            console.log(`Word ${i}: "${cleanText}" - isNumber: ${isEnglishNumber}`);
            
            if (isEnglishNumber) {
                // End previous segment if it exists
                if (currentSegment && currentSegment.endTime - currentSegment.startTime >= this.settings.minSegmentDuration) {
                    segments.push(currentSegment);
                    console.log(`✅ Added segment: ${currentSegment.text} (${currentSegment.startTime}s - ${currentSegment.endTime}s)`);
                }
                
                // Start new segment with this number
                currentSegment = {
                    startTime: word.timestamp[0],
                    endTime: word.timestamp[1],
                    words: [word],
                    text: cleanText,
                    number: parseInt(cleanText)
                };
                console.log(`🆕 Started new segment with number: ${cleanText}`);
            } else {
                // Non-number word - add to current segment if we have one
                if (currentSegment) {
                    const timeSinceSegmentStart = word.timestamp[0] - currentSegment.startTime;
                    
                    // Add word to segment if it's within reasonable time (e.g., 10 seconds)
                    if (timeSinceSegmentStart < 10.0) {
                        currentSegment.endTime = word.timestamp[1];
                        currentSegment.words.push(word);
                        currentSegment.text += " " + cleanText;
                        console.log(`➕ Added "${cleanText}" to current segment`);
                    } else {
                        // Too far from segment start - end current segment
                        if (currentSegment.endTime - currentSegment.startTime >= this.settings.minSegmentDuration) {
                            segments.push(currentSegment);
                            console.log(`✅ Added segment: ${currentSegment.text} (${currentSegment.startTime}s - ${currentSegment.endTime}s)`);
                        }
                        currentSegment = null;
                    }
                }
            }
        }
        
        // Don't forget the last segment
        if (currentSegment && currentSegment.endTime - currentSegment.startTime >= this.settings.minSegmentDuration) {
            segments.push(currentSegment);
            console.log(`✅ Added final segment: ${currentSegment.text} (${currentSegment.startTime}s - ${currentSegment.endTime}s)`);
        }
        
        console.log(`📊 Found ${segments.length} potential segments`);
        return segments;
    }

    async extractSegmentsFromTimestamps(segments) {
        console.log(`✂️ Extracting ${segments.length} audio segments based on Whisper timestamps...`);
        
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
            
            for (let channel = 0; channel < this.audioBuffer.numberOfChannels; channel++) {
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
                words: segment.words
            });
        }
        
        return audioSegments;
    }

    displayResults() {
        const resultsSection = document.getElementById('resultsSection');
        const segmentsList = document.getElementById('segmentsContainer');
        
        if (!segmentsList) {
            console.error('❌ Segments container not found!');
            return;
        }
        
        segmentsList.innerHTML = '';
        
        this.segments.forEach((segment, index) => {
            const segmentDiv = document.createElement('div');
            segmentDiv.className = 'segment-card';
            
            segmentDiv.innerHTML = `
                <div class="segment-header">
                    <h3 class="segment-title">Segment ${segment.id}</h3>
                    <span class="segment-badge">${this.formatTime(segment.duration)}</span>
                </div>
                <div class="segment-info">
                    <div class="info-item">
                        <i class="fas fa-quote-left"></i>
                        <span>"${segment.text}"</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${this.formatTime(segment.startTime)} - ${this.formatTime(segment.endTime)}</span>
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
        
        resultsSection.style.display = 'block';
    }

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
            console.error('Error playing segment:', error);
            this.updateStatus(`Error playing segment: ${error.message}`, 'error');
        }
    }

    async downloadSegment(index) {
        const segment = this.segments[index];
        if (!segment) return;
        
        try {
            // Convert buffer to WAV
            const wavBlob = this.bufferToWav(segment.buffer);
            
            // Create download link
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `segment_${segment.id.toString().padStart(3, '0')}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`💾 Downloaded segment ${segment.id}`);
        } catch (error) {
            console.error('Error downloading segment:', error);
            this.updateStatus(`Error downloading segment: ${error.message}`, 'error');
        }
    }

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
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Convert float samples to 16-bit PCM
        const channelData = buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
}

// Initialize the application when the page loads
let audioLinguist;
document.addEventListener('DOMContentLoaded', () => {
    audioLinguist = new AudioLinguist();
    // Make audioLinguist globally accessible for button clicks
    window.audioLinguist = audioLinguist;
});
