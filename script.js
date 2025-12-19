document.addEventListener('DOMContentLoaded', () => {

    // Force scroll to top on refresh
    if (history.scrollRestoration) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // --- Race Car Scroll Logic ---
    const car = document.getElementById('f1-car');
    const trackContainer = document.querySelector('.race-track-container');

    window.addEventListener('scroll', () => {
        // Calculate scroll percentage
        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;

        // Move car down the track
        // Max top is roughly 90vh to keep it visible
        const maxMove = window.innerHeight * 0.8;

        // Actually, let's make it travel the whole page height relative to the viewport
        // But since it's fixed, we simulate progress
        const moveRange = 80; // 10vh to 90vh
        const currentTop = 10 + (scrollPercent * moveRange);

        car.style.top = `${currentTop}vh`;

        // Optional: slight rotation based on speed?
    });

    // --- Confetti Logic ---
    const confettiBtn = document.querySelector('.confetti-trigger');
    confettiBtn.addEventListener('click', () => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#e10600', '#4e73df', '#ffbe0b']
        });
    });

    // Load Confetti Library Dynamically
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
    document.body.appendChild(script);

    // --- Intersection Observer for Animations ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
            }
        });
    }, { threshold: 0.2 });

    // Identify elements to animate
    const animatedElements = document.querySelectorAll('.content-box');

    animatedElements.forEach((el, index) => {
        // Set initial state
        el.style.opacity = '0';
        el.style.transition = 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        // Alternating slide ins
        if (index % 2 === 0) {
            el.style.transform = 'translateX(-50px) rotate(-2deg)';
        } else {
            el.style.transform = 'translateX(50px) rotate(2deg)';
        }

        observer.observe(el);
    });

    // --- Start Button Logic (F1 Sequence) ---
    const startBtn = document.querySelector('.start-flag');
    const overlay = document.getElementById('start-overlay');
    const lightUnits = document.querySelectorAll('.light-unit');
    const audio = document.getElementById('race-audio');

    if (startBtn && overlay) {
        startBtn.style.cursor = 'pointer';
        startBtn.addEventListener('click', () => {
            // 1. Show Overlay
            overlay.classList.remove('hidden');

            // 0. UNLOCK AUDIO (Mobile/Browser Policy Fix)
            // We must play() immediately within the user interaction (click)
            // Safari requires the audio to STAY playing to maintain the session.
            if (audio) {
                audio.volume = 0; // Mute initially
                audio.play().catch(e => console.log("Audio unlock failed:", e));
            }

            // Initialize Audio Context for Beeps & Engine
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            const playBeep = () => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.type = 'square';
                oscillator.frequency.value = 600; // Beep pitch
                gainNode.gain.value = 0.1; // Volume

                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                }, 150); // Beep duration
            };

            const playEngineStart = () => {
                // Buffer size for 2 seconds of noise
                const bufferSize = audioCtx.sampleRate * 2;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);

                // Fill with white noise
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                // Create nodes
                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                const filter = audioCtx.createBiquadFilter();
                const gain = audioCtx.createGain();

                // Connect graph
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);

                // Configure filter (Lowpass sweeping up)
                filter.type = 'lowpass';
                filter.Q.value = 10;
                filter.frequency.setValueAtTime(100, audioCtx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5); // Rev up
                filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 1.5); // Rev down/away

                // Configure gain envelope
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

                noise.start();
            };

            // 2. Start Sequence
            let activeLight = 0;

            // Function to turn on next pair of lights
            const sequenceInterval = setInterval(() => {
                if (activeLight < 5) {
                    // Turn on both bulbs in the unit
                    const unit = lightUnits[activeLight];
                    const bulbs = unit.querySelectorAll('.light-bulb');
                    bulbs.forEach(b => b.classList.add('on'));

                    // Play Beep
                    playBeep();

                    activeLight++;
                } else {
                    clearInterval(sequenceInterval);

                    // 3. Random delay before lights out (0.2s - 1.5s real F1 style)
                    const randomDelay = Math.random() * 1500 + 500; // 0.5s to 2s

                    setTimeout(() => {
                        // LIGHTS OUT!
                        document.querySelectorAll('.light-bulb').forEach(b => b.classList.remove('on'));

                        // Play Engine Sound
                        playEngineStart();

                        // Delay Music & Scroll until engine rev finishes (approx 1.5s)
                        // setTimeout remove requested by user

                        // Play Background Music
                        if (audio) {
                            audio.currentTime = 0; // Restart track
                            audio.volume = 0.5; // Unmute
                            // audio.play(); // Already playing
                        }

                        // UNLOCK SCROLL
                        document.body.classList.remove('scroll-locked');

                        // Hide Overlay
                        overlay.classList.add('hidden');

                        // Scroll to content
                        const target = document.getElementById('vibe');
                        if (target) target.scrollIntoView({ behavior: 'smooth' });

                    }, randomDelay);
                }
            }, 1000); // 1 second between each light
        });
    }
});
