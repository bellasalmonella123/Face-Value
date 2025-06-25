const forceMale = localStorage.getItem('forceMaleGender') === 'true';

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const video = document.getElementById('interviewVideo');
    const endBtn = document.getElementById('endInterviewBtn');
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.display = 'none';

    // Interview Statistics
    let stats = {
        gender: [],
        age: [],
        emotions: [],
        smiling: [],
        startTime: new Date(),
        detectionCount: 0
    };
    let stream = null;
    let detectionInterval = null;
    let modelsLoaded = false;


    async function loadFaceAPI() {
        const sources = [
            'https://justadudewhohacks.github.io/face-api.js/face-api.min.js',
            'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
            'lib/face-api.min.js' // Local fallback
        ];

        for (const src of sources) {
            try {
                await loadScript(src);
                console.log('Loaded face-api.js from:', src);
                return true;
            } catch (err) {
                console.warn('Failed to load from:', src, err);
            }
        }
        throw new Error('Could not load face-api.js from any source');
    }

    async function loadModels() {
        const modelSources = [
            'https://justadudewhohacks.github.io/face-api.js/models',
            'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights',
            '/models' // Local fallback
        ];

        for (const src of modelSources) {
            try {
                console.log('Trying to load models from:', src);
                
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(src),
                    faceapi.nets.faceLandmark68Net.loadFromUri(src),
                    faceapi.nets.faceRecognitionNet.loadFromUri(src),
                    faceapi.nets.faceExpressionNet.loadFromUri(src),
                    faceapi.nets.ageGenderNet.loadFromUri(src)
                ]);
                
                modelsLoaded = true;
                console.log('Models loaded successfully from:', src);
                return true;
            } catch (err) {
                console.warn('Failed to load models from:', src, err);
            }
        }
        return false;
    }

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: true
            });
            video.srcObject = stream;
            
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    resolve();
                };
            });
        } catch (err) {
            console.error('Camera error:', err);
            throw new Error(`Could not access camera: ${err.message}`);
        }
    }

    async function detectFaces() {
        if (!modelsLoaded) return;
        
        try {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const detections = await faceapi.detectAllFaces(
                canvas,
                new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();
            
            if (detections?.length > 0) {
                processDetection(detections[0]);
                if (forceMale && detections[0]?.landmarks) {
                    positionMoustache(detections[0].landmarks);
                }           
            }
        } catch (err) {
            console.error('Detection error:', err);
        }
    }

    function processDetection(detection) {
        const expressions = detection.expressions;
        let gender = detection.gender;
        if (forceMale) {
            gender = "male";
        }
        const age = detection.age;
        const smiling = expressions.happy > 0.7;
        
        // Update stats
        stats.gender.push(gender);
        stats.age.push(Math.round(age));
        stats.emotions.push(getDominantEmotion(expressions));
        stats.smiling.push(smiling);
        stats.detectionCount++;
        
        // Update UI
        updateUI({
            gender,
            age: Math.round(age),
            emotion: getDominantEmotion(expressions),
            smiling: smiling ? "Yes" : "No"
        });
    }

    // Helper functions
    function getDominantEmotion(expressions) {
        return Object.entries(expressions).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    }

    function updateUI({gender, age, emotion, smiling}) {
        document.getElementById('gender').textContent = gender;
        document.getElementById('age').textContent = age;
        document.getElementById('emotion').textContent = emotion;
        document.getElementById('smiling').textContent = smiling;
    }

    function updateTimer() {
        const elapsed = Math.floor((new Date() - stats.startTime) / 1000);
        document.getElementById('timer').textContent = 
            `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
        setTimeout(updateTimer, 1000);
    }

    function endInterview() {
        clearInterval(detectionInterval);
        if (stream) stream.getTracks().forEach(track => track.stop());
        let finalGender = getMostFrequent(stats.gender) || "unknown";
        if (forceMale) {
            finalGender = "male";
        }
        
        const result = {
            gender: finalGender,
            gender: getMostFrequent(stats.gender) || "unknown",
            age: Math.round(average(stats.age)) || 0,
            smilePercent: Math.round((stats.smiling.filter(Boolean).length / stats.smiling.length) * 100) || 0,
            dominantEmotion: getMostFrequent(stats.emotions) || "neutral",
            negativeSentimentPercent: Math.round((stats.negativeSentimentCount || 0) / Math.max(stats.detectionCount, 1) * 100)
        };
        
        localStorage.setItem('interviewResults', JSON.stringify(result));
        window.open('results.html', '_blank');
        window.close();
    }

    // Utility functions
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                // Small delay to ensure faceapi is available
                setTimeout(resolve, 100);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function getMostFrequent(arr) {
        if (!arr?.length) return null;
        const counts = {};
        arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    function average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    // Initialize
    async function init() {
        try {
            // Load face-api.js library
            await loadFaceAPI();
            
            // Load models
            if (!await loadModels()) {
                console.warn('Proceeding without face detection models');
                updateUI({
                    gender: "Enable models",
                    age: "---",
                    emotion: "to see analysis",
                    smiling: "No"
                });
            }
            
            // Start camera
            await startCamera();
            
            // Start face detection if models loaded
            if (modelsLoaded) {
                detectionInterval = setInterval(detectFaces, 500);
            }
            
            // Start timer
            updateTimer();
            
        } catch (err) {
            console.error('Initialization error:', err);
            updateUI({
                gender: "Error",
                age: "---",
                emotion: err.message,
                smiling: "No"
            });
        }
    }

    function drawMustache(landmarks) {
        const ctx = canvas.getContext('2d');
        const mouth = landmarks.getMouth();
        const [left, right] = [mouth[0], mouth[6]];
        const centerY = (mouth[3].y + mouth[9].y) / 2;
    
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.ellipse(
            (left.x + right.x) / 2,
            centerY - 5,
            (right.x - left.x) / 2,
            5,
            0, 0, 2 * Math.PI
        );
        ctx.fill();
    }

    function positionMoustache(landmarks) {
        const moustache = document.getElementById('moustacheOverlay');
        const video = document.getElementById('interviewVideo');
        
        if (!landmarks || !landmarks.positions) return;
    
        const nose = landmarks.getNose();
        const mouth = landmarks.getMouth();
    
        if (!nose.length || !mouth.length) return;
    
        const noseBottom = nose[6];      // bottom of nose
        const mouthLeft = mouth[0];
        const mouthRight = mouth[6];
    
        // Get bounding box of video element for scaling
        const videoRect = video.getBoundingClientRect();
        const scaleX = videoRect.width / video.videoWidth;
        const scaleY = videoRect.height / video.videoHeight;
    
        // Center of upper lip, just below the nose
        const centerX = (mouthLeft.x + mouthRight.x) / 2;
        const centerY = noseBottom.y + ((mouth[3].y - noseBottom.y) * 0.4);
    
        const width = (mouthRight.x - mouthLeft.x);
        const height = width * 0.4;
    
        // Scale to match video display
        moustache.style.left = `${videoRect.left + (centerX - width / 2) * scaleX}px`;
        moustache.style.top = `${videoRect.top + (centerY - height / 2) * scaleY}px`;
        moustache.style.width = `${width * scaleX}px`;
        moustache.style.height = `${height * scaleY}px`;
        moustache.style.position = 'fixed';
        moustache.style.display = 'block';
        moustache.style.pointerEvents = 'none';
        moustache.style.zIndex = '1000';
    }


    function startSpeechRecognition() {
        const sentimentDisplay = document.getElementById('sentiment');
    
        if (!('webkitSpeechRecognition' in window)) {
            sentimentDisplay.textContent = "Not supported in this browser.";
            return;
        }
    
        const recognition = new webkitSpeechRecognition(); // Chrome only
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
    
        let transcript = "";
    
        recognition.onresult = function(event) {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    transcript += text + " ";
                    const score = analyzeSentiment(transcript);
                    sentimentDisplay.textContent = sentimentLabel(score);
                } else {
                    interimTranscript += text;
                }
            }
        };
    

        recognition.onerror = function(event) {
            console.error("Speech recognition error:", event.error);
            if (event.error === 'network') {
                sentimentDisplay.textContent = "🌐 Offline - No Sentiment";
            }
        };
    
        recognition.onend = function() {
            recognition.start(); // Restart automatically
        };
    
        recognition.start();
    }

    function analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'love', 'excellent', 'awesome', 'happy', 'like'];
        const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'sad', 'angry', 'dislike'];
    
        let score = 0;
        const words = text.toLowerCase().split(/\s+/);
    
        words.forEach(word => {
            if (positiveWords.includes(word)) score++;
            if (negativeWords.includes(word)) score--;
        });
    
        return score;
    }
    
    function sentimentLabel(score) {
        if (score > 1) return "Positive";
        if (score < -1) return "Negative";
        return "Neutral";
    }
    

    endBtn.addEventListener('click', endInterview);
    init();
    startSpeechRecognition();
});