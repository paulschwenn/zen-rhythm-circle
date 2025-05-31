// script.js
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('rhythmCanvas');
    const ctx = canvas.getContext('2d');

    const menuIcon = document.getElementById('menu-icon');
    const controlsPanel = document.getElementById('controls-panel');
    const patternNameInput = document.getElementById('patternName');
    const savePatternBtn = document.getElementById('savePattern');
    const loadPatternSelect = document.getElementById('loadPatternSelect');
    const loadPatternBtn = document.getElementById('loadPattern');
    const deletePatternBtn = document.getElementById('deletePattern');
    const mainRegisterInput = document.getElementById('mainRegister');
    const beatsPerCycleInput = document.getElementById('beatsPerCycle');
    const muteAllBtn = document.getElementById('muteAllBtn');
    const layersContainer = document.getElementById('layersContainer');
    const addLayerBtn = document.getElementById('addLayerBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    const dotBaseSizeFactorInput = document.getElementById('dotBaseSizeFactorInput');
    const dotPopMagnitudeInput = document.getElementById('dotPopMagnitudeInput');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    let audioCtx = null;
    let audioInitialized = false;
    let masterGainNode = null;
    let whiteNoiseBuffer = null;

    // --- NEW ADVANCED SOUND PROFILES ---
    const soundProfiles = [
        // KICKS
        {
            name: 'Kick Deep',
            components: [{
                type: 'oscillator', oscType: 'sine', initialFrequency: 150,
                pitchEnvelope: { attackTime: 0.001, decayTime: 0.05, targetFrequency: 40, sustainLevel:0, releaseTime:0 },
                gainEnvelope: { attackTime: 0.005, decayTime: 0.15, sustainLevel: 0, releaseTime: 0.1, peakGain: 0.8 }
            },{
                type: 'oscillator', oscType: 'triangle', initialFrequency: 600, // Click
                gainEnvelope: { attackTime: 0.001, decayTime: 0.01, sustainLevel: 0, releaseTime: 0.01, peakGain: 0.2 }
            }],
            overallDuration: 0.3
        },
        {
            name: 'Kick Punchy',
            components: [{
                type: 'oscillator', oscType: 'sine', initialFrequency: 160,
                pitchEnvelope: { attackTime: 0.001, decayTime: 0.03, targetFrequency: 60, sustainLevel:0, releaseTime:0 },
                gainEnvelope: { attackTime: 0.002, decayTime: 0.1, sustainLevel: 0, releaseTime: 0.05, peakGain: 0.75 }
            },{
                type: 'noise', noiseType: 'white',
                filter: { type: 'lowpass', initialFrequency: 1000, q: 1 },
                gainEnvelope: { attackTime: 0.001, decayTime: 0.005, sustainLevel: 0, releaseTime: 0.005, peakGain: 0.15 }
            }],
            overallDuration: 0.2
        },

        // SNARES
        {
            name: 'Snare Crisp',
            components: [{ 
                type: 'oscillator', oscType: 'triangle', initialFrequency: 200,
                gainEnvelope: { attackTime: 0.001, decayTime: 0.08, sustainLevel: 0, releaseTime: 0.05, peakGain: 0.5 }
            },{ 
                type: 'noise', noiseType: 'white',
                filter: { type: 'bandpass', initialFrequency: 2500, q: 0.8 },
                gainEnvelope: { attackTime: 0.001, decayTime: 0.12, sustainLevel: 0, releaseTime: 0.05, peakGain: 0.45 }
            }],
            overallDuration: 0.25
        },
        {
            name: 'Snare Brush',
            components: [{
                type: 'noise', noiseType: 'white',
                filter: { type: 'highpass', initialFrequency: 1500, q: 0.7 },
                gainEnvelope: { attackTime: 0.01, decayTime: 0.15, sustainLevel: 0.1, releaseTime: 0.1, peakGain: 0.3 }
            }],
            overallDuration: 0.3
        },
         {
            name: 'Snare Rimshot',
            components: [{ 
                type: 'oscillator', oscType: 'sawtooth', initialFrequency: 400,
                pitchEnvelope: { attackTime: 0, decayTime: 0.01, targetFrequency: 350, sustainLevel:0, releaseTime:0 },
                gainEnvelope: { attackTime: 0.001, decayTime: 0.03, sustainLevel: 0, releaseTime: 0.02, peakGain: 0.6 }
            },{ 
                type: 'oscillator', oscType: 'square', initialFrequency: 1200,
                gainEnvelope: { attackTime: 0.001, decayTime: 0.01, sustainLevel: 0, releaseTime: 0.01, peakGain: 0.3 }
            }],
            overallDuration: 0.1
        },

        // HI-HATS
        {
            name: 'HiHat Closed',
            components: [{
                type: 'noise', noiseType: 'white',
                filter: { type: 'highpass', initialFrequency: 7000, q: 0.5 },
                gainEnvelope: { attackTime: 0.001, decayTime: 0.025, sustainLevel: 0, releaseTime: 0.02, peakGain: 0.2 }
            }],
            overallDuration: 0.05
        },
        {
            name: 'HiHat Open',
            components: [{
                type: 'noise', noiseType: 'white',
                filter: { type: 'highpass', initialFrequency: 6000, q: 0.6 },
                gainEnvelope: { attackTime: 0.002, decayTime: 0.2, sustainLevel: 0.05, releaseTime: 0.15, peakGain: 0.18 }
            }],
            overallDuration: 0.4
        },
        {
            name: 'HiHat Pedal',
            components: [{
                type: 'noise', noiseType: 'white',
                filter: { type: 'bandpass', initialFrequency: 4000, q: 1 },
                gainEnvelope: { attackTime: 0.005, decayTime: 0.04, sustainLevel: 0, releaseTime: 0.03, peakGain: 0.15 }
            }],
            overallDuration: 0.08
        },

        // CYMBALS (Simplified - real cymbals are very complex)
        {
            name: 'Cymbal Crash (Sim.)',
            components: [{
                type: 'noise', noiseType: 'white',
                filter: { 
                    type: 'bandpass', initialFrequency: 7000, q: 0.5,
                    filterEnvelope: { attackTime: 0.01, decayTime: 0.6, targetFrequency: 2000, startFrequency: 7000 }
                },
                gainEnvelope: { attackTime: 0.01, decayTime: 0.8, sustainLevel: 0.1, releaseTime: 0.5, peakGain: 0.25 }
            }],
            overallDuration: 1.5
        },
         {
            name: 'Cymbal Ride Ping (Sim.)',
            components: [
                { 
                    type: 'oscillator', oscType: 'square', initialFrequency: 1200,
                    gainEnvelope: { attackTime: 0.002, decayTime: 0.3, sustainLevel: 0.1, releaseTime: 0.2, peakGain: 0.15 }
                },
                {
                    type: 'oscillator', oscType: 'square', initialFrequency: 1200 * 1.5, // A fifth higher
                    gainEnvelope: { attackTime: 0.002, decayTime: 0.25, sustainLevel: 0.05, releaseTime: 0.15, peakGain: 0.1 }
                },
                { 
                    type: 'noise', noiseType: 'white',
                    filter: { type: 'highpass', initialFrequency: 4000, q: 0.8 },
                    gainEnvelope: { attackTime: 0.005, decayTime: 0.4, sustainLevel: 0, releaseTime: 0.3, peakGain: 0.08 }
                }
            ],
            overallDuration: 0.8
        },
         {
            name: 'Cymbal Bell',
            components: [{
                type: 'oscillator', oscType: 'triangle', initialFrequency: 880,
                gainEnvelope: { attackTime: 0.005, decayTime: 0.5, sustainLevel: 0.2, releaseTime: 0.3, peakGain: 0.2 }
            },{
                type: 'oscillator', oscType: 'sine', initialFrequency: 880 * 1.505, // Detuned fifth
                gainEnvelope: { attackTime: 0.005, decayTime: 0.45, sustainLevel: 0.15, releaseTime: 0.25, peakGain: 0.15 }
            }],
            overallDuration: 1.0
        },

        // TOMS
        {
            name: 'Tom Low',
            components: [{
                type: 'oscillator', oscType: 'sine', initialFrequency: 120,
                pitchEnvelope: { attackTime: 0.001, decayTime: 0.1, targetFrequency: 70, sustainLevel:0, releaseTime:0 },
                gainEnvelope: { attackTime: 0.005, decayTime: 0.25, sustainLevel: 0, releaseTime: 0.1, peakGain: 0.6 }
            }],
            overallDuration: 0.4
        },
        {
            name: 'Tom Mid',
            components: [{
                type: 'oscillator', oscType: 'sine', initialFrequency: 180,
                pitchEnvelope: { attackTime: 0.001, decayTime: 0.08, targetFrequency: 100, sustainLevel:0, releaseTime:0 },
                gainEnvelope: { attackTime: 0.005, decayTime: 0.2, sustainLevel: 0, releaseTime: 0.1, peakGain: 0.55 }
            }],
            overallDuration: 0.35
        },

        // MISC
        {
            name: 'Click Sharp',
            components: [{
                type: 'oscillator', oscType: 'triangle', initialFrequency: 1500,
                gainEnvelope: { attackTime: 0.001, decayTime: 0.01, sustainLevel: 0, releaseTime: 0.01, peakGain: 0.3 }
            }],
            overallDuration: 0.03
        },
        {
            name: 'Wood Block',
            components: [{
                type: 'oscillator', oscType: 'sine', initialFrequency: 900,
                pitchEnvelope: { attackTime: 0, decayTime: 0.005, targetFrequency: 850, sustainLevel:0, releaseTime:0 },
                gainEnvelope: { attackTime: 0.002, decayTime: 0.05, sustainLevel: 0, releaseTime: 0.03, peakGain: 0.4 }
            }],
            overallDuration: 0.1
        }
    ];
    // --- END NEW SOUND PROFILES ---

    function createWhiteNoiseBuffer() {
        if (!audioCtx || whiteNoiseBuffer) return;
        const bufferSize = 2 * audioCtx.sampleRate; // 2 seconds of noise
        whiteNoiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = whiteNoiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1; // Generate white noise samples: -1 to +1
        }
        console.log("White noise buffer created.");
    }

    function initAudioByUserGesture() {
        if (audioInitialized && audioCtx && audioCtx.state === 'running') return;
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser", e);
                return;
            }
        }

        const setupAudioNodes = () => {
            if (!masterGainNode) {
                masterGainNode = audioCtx.createGain();
                masterGainNode.gain.value = 0.6; // Master volume (0.0 to 1.0) - adjust as needed
                masterGainNode.connect(audioCtx.destination);
                createWhiteNoiseBuffer();
            }
        };

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log("AudioContext resumed successfully.");
                audioInitialized = true;
                setupAudioNodes();
            }).catch(e => console.error("Error resuming AudioContext:", e));
        } else if (audioCtx.state === 'running') {
            audioInitialized = true;
            setupAudioNodes();
        }
    }

    function playHitSound(layerIndex) {
        if (!audioCtx || !audioInitialized || audioCtx.state !== 'running' || !masterGainNode) return;
        if (appState.isGlobalMute) return;

        const layer = appState.layers[layerIndex];
        if (!layer || typeof layer.soundProfileIndex === 'undefined') return;

        const isAnySoloed = appState.layers.some(l => l.isSoloed);
        if (isAnySoloed) {
            if (!layer.isSoloed || layer.isMuted) return;
        } else {
            if (layer.isMuted) return;
        }

        const profile = soundProfiles[layer.soundProfileIndex % soundProfiles.length];
        if (!profile || !profile.components) return;

        const now = audioCtx.currentTime;

        profile.components.forEach(comp => {
            let sourceNode;
            let compGainNode = audioCtx.createGain();
            let previousNodeForSource = compGainNode; // Node that source connects to (gain or filter)

            // 1. Create Source Node (Oscillator or Noise)
            if (comp.type === 'oscillator') {
                sourceNode = audioCtx.createOscillator();
                sourceNode.type = comp.oscType || 'sine';
                const initialFreq = comp.initialFrequency || 440;
                sourceNode.frequency.setValueAtTime(initialFreq, now);

                if (comp.pitchEnvelope) {
                    const pe = comp.pitchEnvelope;
                    const freqParam = sourceNode.frequency;
                    const attackStartTime = now + (pe.attackDelay || 0); // Optional delay for attack
                    const attackEndTime = attackStartTime + (pe.attackTime || 0);
                    const decayEndTime = attackEndTime + (pe.decayTime || 0);
                    
                    // Start from a specific frequency if defined, else initialFreq
                    freqParam.setValueAtTime(pe.startFrequency !== undefined ? pe.startFrequency : initialFreq, attackStartTime);
                    if (pe.attackTime > 0) {
                         freqParam.linearRampToValueAtTime(initialFreq, attackEndTime);
                    }
                   
                    if (pe.decayTime > 0 && pe.targetFrequency !== undefined) {
                        freqParam.exponentialRampToValueAtTime(
                            Math.max(0.01, pe.targetFrequency), // Frequency cannot be 0 for exp ramp
                            decayEndTime
                        );
                    }
                    // Sustain/Release for pitch could be added if needed
                }
            } else if (comp.type === 'noise' && whiteNoiseBuffer) {
                sourceNode = audioCtx.createBufferSource();
                sourceNode.buffer = whiteNoiseBuffer;
                sourceNode.loop = true;
            } else {
                console.warn('Unknown component type or noise buffer not ready:', comp.type);
                return; 
            }

            // 2. Apply Filter if defined
            if (comp.filter) {
                const filterNode = audioCtx.createBiquadFilter();
                filterNode.type = comp.filter.type || 'lowpass';
                const initialFilterFreq = comp.filter.initialFrequency || audioCtx.sampleRate / 2;
                filterNode.frequency.setValueAtTime(initialFilterFreq, now);
                filterNode.Q.setValueAtTime(comp.filter.q || 1, now);

                if (comp.filter.filterEnvelope) {
                    const fe = comp.filter.filterEnvelope;
                    const filterFreqParam = filterNode.frequency;
                    const attackStartTime = now + (fe.attackDelay || 0);
                    const attackEndTime = attackStartTime + (fe.attackTime || 0);
                    const decayEndTime = attackEndTime + (fe.decayTime || 0);

                    filterFreqParam.setValueAtTime(fe.startFrequency !== undefined ? fe.startFrequency : initialFilterFreq, attackStartTime);
                     if (fe.attackTime > 0) {
                        filterFreqParam.linearRampToValueAtTime(initialFilterFreq, attackEndTime);
                    }
                    if (fe.decayTime > 0 && fe.targetFrequency !== undefined) {
                        filterFreqParam.exponentialRampToValueAtTime(
                            Math.max(20, fe.targetFrequency), // Min filter freq 20Hz
                            decayEndTime
                        );
                    }
                    // Sustain/Release for filter could be added
                }
                filterNode.connect(compGainNode); 
                previousNodeForSource = filterNode; // Source will connect to filter then to gain
            }

            // 3. Apply Gain Envelope
            const ge = comp.gainEnvelope;
            const gainParam = compGainNode.gain;
            const peakGain = ge.peakGain || 0.5;
            const attackStartTime = now + (ge.attackDelay || 0);
            const attackEndTime = attackStartTime + (ge.attackTime || 0.001); // Min attack time
            const decayEndTime = attackEndTime + (ge.decayTime || 0.01); // Min decay time
            const sustainLevel = Math.max(0.0001, (ge.sustainLevel || 0) * peakGain);
            
            gainParam.setValueAtTime(0, now); // Start silent
            gainParam.linearRampToValueAtTime(peakGain, attackEndTime);
            gainParam.exponentialRampToValueAtTime(sustainLevel, decayEndTime);

            // Schedule release
            const releaseStartTime = decayEndTime + (ge.sustainDuration || 0); // sustainDuration is optional
            const releaseEndTime = releaseStartTime + (ge.releaseTime || 0.01); // Min release
            gainParam.setValueAtTime(sustainLevel, releaseStartTime); // Hold sustain
            gainParam.exponentialRampToValueAtTime(0.0001, releaseEndTime);
            
            // 4. Connect nodes: source -> (filter) -> compGainNode -> masterGainNode
            sourceNode.connect(previousNodeForSource);
            compGainNode.connect(masterGainNode);

            // 5. Start source and schedule stop
            sourceNode.start(attackStartTime); // Can use attackStartTime if attackDelay is used
            const stopTime = releaseEndTime + 0.05; // Stop shortly after envelope finishes
            
            try {
                sourceNode.stop(stopTime);
            } catch (e) {
                // Safari might throw if stop time is in the past due to very short sounds/timing issues
                // console.warn("Error scheduling stop, possibly already past:", e.message);
                // try to stop immediately if it failed
                try { sourceNode.stop(now + 0.01); } catch (e2) {}
            }
        });
    }


    let appState = {
        patternName: 'MyZenRhythm',
        bpm: 100,
        beatsPerCycle: 8,
        layers: [],
        currentBeatTime: 0,
        lastFrameTime: performance.now(),
        dotPopStates: {},
        isGlobalMute: false,
        dotBaseSizeFactor: 0.015, // Default size updated to 0.015
        dotPopMagnitude: 1.4      // Slightly less aggressive pop
    };

    const MAX_POP_DURATION = 0.15;

    function resizeCanvas() {
        const panelWidth = controlsPanel.classList.contains('open') ? controlsPanel.offsetWidth : 0;
        const availableWidth = window.innerWidth - panelWidth;
        const availableHeight = window.innerHeight;
        const size = Math.min(availableWidth, availableHeight) * 0.95;
        canvas.width = size;
        canvas.height = size;
        canvas.style.marginLeft = (panelWidth > 0 && availableWidth > size) ? `${panelWidth}px` : '0px';
        draw();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = canvas.width * 0.1;
        const maxRadius = canvas.width * 0.42;
        const radiusStep = appState.layers.length > 1 ? (maxRadius - baseRadius) / (appState.layers.length -1) : 0;
        const handLength = maxRadius * 1.05;
        const dotBaseSize = Math.max(2, canvas.width * appState.dotBaseSizeFactor);

        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() + '50';
        ctx.lineWidth = 0.5;
        for(let i=0; i < appState.layers.length; i++) {
            const r = baseRadius + i * radiusStep;
            if (r <= maxRadius + 2) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        appState.layers.forEach((layer, layerIdx) => {
            const layerRadius = baseRadius + layerIdx * radiusStep;
            if (layerRadius > maxRadius + 1) return;

            for (let i = 0; i < layer.subdivisions; i++) {
                if (layer.activeElements[i]) {
                    const angle = (i / layer.subdivisions) * Math.PI * 2 - Math.PI / 2;
                    let currentDotSize = dotBaseSize;
                    const popKey = `${layerIdx}-${i}`;
                    if (appState.dotPopStates[popKey] && appState.dotPopStates[popKey] > 0) {
                        const popProgress = appState.dotPopStates[popKey] / MAX_POP_DURATION;
                        currentDotSize *= (1 + (appState.dotPopMagnitude - 1) * Math.sin(popProgress * Math.PI));
                    }
                    const x = centerX + layerRadius * Math.cos(angle);
                    const y = centerY + layerRadius * Math.sin(angle);
                    ctx.beginPath();
                    ctx.arc(x, y, currentDotSize, 0, Math.PI * 2);
                    ctx.fillStyle = layer.color;
                    ctx.fill();
                }
            }
        });

        const cycleDuration = (60 / appState.bpm) * appState.beatsPerCycle;
        const handAngle = (appState.currentBeatTime / cycleDuration) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + handLength * Math.cos(handAngle),
            centerY + handLength * Math.sin(handAngle)
        );
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();
        ctx.lineWidth = Math.max(1.5, canvas.width * 0.004);
        ctx.stroke();
    }

    function update(timestamp) {
        const deltaTime = (timestamp - appState.lastFrameTime) / 1000;
        appState.lastFrameTime = timestamp;
        const cycleDuration = (60 / appState.bpm) * appState.beatsPerCycle;
        appState.currentBeatTime = (appState.currentBeatTime + deltaTime) % cycleDuration;

        for (const key in appState.dotPopStates) {
            if (appState.dotPopStates[key] > 0) {
                appState.dotPopStates[key] -= deltaTime;
                if (appState.dotPopStates[key] <= 0) delete appState.dotPopStates[key];
            }
        }
        
        appState.layers.forEach((layer, layerIdx) => {
            if (layer.subdivisions === 0) return;
            for (let i = 0; i < layer.subdivisions; i++) {
                if (layer.activeElements[i]) {
                    const elementHitTime = (i / layer.subdivisions) * cycleDuration;
                    const prevHandTime = (appState.currentBeatTime - deltaTime + cycleDuration) % cycleDuration;
                    let hit = false;
                    if (prevHandTime <= appState.currentBeatTime) {
                        if (elementHitTime >= prevHandTime && elementHitTime < appState.currentBeatTime) hit = true;
                    } else {
                        if (elementHitTime >= prevHandTime || elementHitTime < appState.currentBeatTime) hit = true;
                    }
                    if (hit) {
                         appState.dotPopStates[`${layerIdx}-${i}`] = MAX_POP_DURATION;
                         playHitSound(layerIdx);
                    }
                }
            }
        });
        draw();
        requestAnimationFrame(update);
    }

    function toggleMenu() {
        menuIcon.classList.toggle('open');
        controlsPanel.classList.toggle('open');
        resizeCanvas();
    }

    function renderLayersControls() {
        layersContainer.innerHTML = '';
        appState.layers.forEach((layer, index) => {
            const layerItem = document.createElement('div');
            layerItem.classList.add('layer-item');

            let soundOptionsHtml = '';
            soundProfiles.forEach((profile, profileIndex) => {
                soundOptionsHtml += `<option value="${profileIndex}" ${layer.soundProfileIndex === profileIndex ? 'selected' : ''}>${profile.name}</option>`;
            });

            layerItem.innerHTML = `
                <div class="control-group">
                    <label for="layerSubdivisions-${index}">Subdivisions per Beat:</label>
                    <input type="number" id="layerSubdivisions-${index}" value="${layer.subdivisions}" min="1" max="64" data-index="${index}">
                </div>
                <div class="control-group">
                    <label for="layerSound-${index}">Sound:</label>
                    <select id="layerSound-${index}" data-index="${index}">
                        ${soundOptionsHtml}
                    </select>
                </div>
                <div class="control-group">
                    <label for="layerColor-${index}">Color:</label>
                    <input type="color" id="layerColor-${index}" value="${layer.color}" data-index="${index}">
                </div>
                <label>Active Elements:</label>
                <div class="layer-elements" id="layerElements-${index}">
                    ${renderLayerElementButtons(layer, index)}
                </div>
                <div class="layer-actions">
                    <button class="mute-layer-btn ${layer.isMuted ? 'active' : ''}" data-index="${index}">Mute</button>
                    <button class="solo-layer-btn ${layer.isSoloed ? 'active' : ''}" data-index="${index}">Solo</button>
                </div>
                <button class="remove-layer-btn" data-index="${index}">Remove Layer</button>
            `;
            layersContainer.appendChild(layerItem);

            document.getElementById(`layerSubdivisions-${index}`).addEventListener('change', handleLayerSubdivisionsChange);
            document.getElementById(`layerSound-${index}`).addEventListener('change', handleLayerSoundChange);
            document.getElementById(`layerColor-${index}`).addEventListener('change', handleLayerColorChange);
            layerItem.querySelector('.remove-layer-btn').addEventListener('click', handleRemoveLayer);
            layerItem.querySelector('.mute-layer-btn').addEventListener('click', handleMuteLayer);
            layerItem.querySelector('.solo-layer-btn').addEventListener('click', handleSoloLayer);
            
            layerItem.querySelectorAll(`#layerElements-${index} button`).forEach(btn => {
                btn.addEventListener('click', handleLayerElementToggle);
            });
        });
        muteAllBtn.classList.toggle('active', appState.isGlobalMute);
        muteAllBtn.textContent = appState.isGlobalMute ? "Unmute All Sounds" : "Mute All Sounds";
        resizeCanvas();
    }

    function renderLayerElementButtons(layer, layerIndex) {
        let buttonsHtml = '';
        for (let i = 0; i < layer.subdivisions; i++) {
            buttonsHtml += `<button class="${layer.activeElements[i] ? 'active' : ''}" data-layer-index="${layerIndex}" data-el-index="${i}">${i + 1}</button>`;
        }
        return buttonsHtml;
    }
    
    function updateLayerElementButtons(layerIndex) {
        const layer = appState.layers[layerIndex];
        const container = document.getElementById(`layerElements-${layerIndex}`);
        if (container) {
            container.innerHTML = renderLayerElementButtons(layer, layerIndex);
            container.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', handleLayerElementToggle);
            });
        }
    }
    
    const defaultLayerColors = [
        "#76ABAE", "#A2D2D2", "#BBE2E2", "#D4F0F0",
        "#adc178", "#dde5b6", "#f0ead2"
    ];
    let lastColorIndex = -1;

    function getNextDefaultColor() {
        lastColorIndex = (lastColorIndex + 1) % defaultLayerColors.length;
        return defaultLayerColors[lastColorIndex];
    }

    function handleAddLayer() {
        const newLayer = {
            id: Date.now(),
            subdivisions: 4,
            activeElements: [true, false, true, false],
            color: getNextDefaultColor(),
            soundProfileIndex: appState.layers.length % soundProfiles.length,
            isMuted: false,
            isSoloed: false
        };
        while (newLayer.activeElements.length < newLayer.subdivisions) newLayer.activeElements.push(false);
        newLayer.activeElements.length = newLayer.subdivisions; 
        appState.layers.push(newLayer);
        renderLayersControls();
    }

    function handleRemoveLayer(event) {
        const index = parseInt(event.target.dataset.index);
        appState.layers.splice(index, 1);
        renderLayersControls();
    }

    function handleLayerSubdivisionsChange(event) {
        const index = parseInt(event.target.dataset.index);
        const newValue = parseInt(event.target.value);
        if (newValue > 0 && newValue <= 64) {
            appState.layers[index].subdivisions = newValue;
            const currentActive = appState.layers[index].activeElements;
            const newActive = [];
            for (let i = 0; i < newValue; i++) {
                newActive.push(i < currentActive.length ? currentActive[i] : false);
            }
            appState.layers[index].activeElements = newActive;
            updateLayerElementButtons(index);
            draw();
        } else {
            event.target.value = appState.layers[index].subdivisions;
        }
    }
    
    function handleLayerColorChange(event) {
        const index = parseInt(event.target.dataset.index);
        appState.layers[index].color = event.target.value;
        draw();
    }

    function handleLayerSoundChange(event) {
        const index = parseInt(event.target.dataset.index);
        appState.layers[index].soundProfileIndex = parseInt(event.target.value);
    }

    function handleLayerElementToggle(event) {
        const layerIndex = parseInt(event.target.dataset.layerIndex);
        const elIndex = parseInt(event.target.dataset.elIndex);
        appState.layers[layerIndex].activeElements[elIndex] = !appState.layers[layerIndex].activeElements[elIndex];
        event.target.classList.toggle('active');
        draw();
    }

    function handleMuteLayer(event) {
        const index = parseInt(event.target.dataset.index);
        const layer = appState.layers[index];
        layer.isMuted = !layer.isMuted;
        if (layer.isMuted) {
            layer.isSoloed = false;
        }
        renderLayersControls();
    }

    function handleSoloLayer(event) {
        const index = parseInt(event.target.dataset.index);
        const currentlySoloed = appState.layers[index].isSoloed;

        if (currentlySoloed) {
            appState.layers[index].isSoloed = false;
        } else {
            appState.layers.forEach((l, i) => {
                l.isSoloed = (i === index);
                if (i === index) {
                    l.isMuted = false;
                }
            });
        }
        renderLayersControls();
    }
    
    function handleMuteAll() {
        appState.isGlobalMute = !appState.isGlobalMute;
        muteAllBtn.classList.toggle('active', appState.isGlobalMute);
        muteAllBtn.textContent = appState.isGlobalMute ? "Unmute All Sounds" : "Mute All Sounds";
    }

    function saveCurrentPattern() {
        const name = patternNameInput.value.trim();
        if (!name) {
            alert("Please enter a pattern name.");
            return;
        }
        appState.patternName = name;
        const patterns = JSON.parse(localStorage.getItem('rhythmPatterns') || '{}');
        patterns[name] = {
            bpm: appState.bpm,
            beatsPerCycle: appState.beatsPerCycle,
            layers: appState.layers.map(l => ({
                subdivisions: l.subdivisions,
                activeElements: [...l.activeElements],
                color: l.color,
                soundProfileIndex: l.soundProfileIndex,
                isMuted: l.isMuted,
                isSoloed: l.isSoloed
            })),
            dotBaseSizeFactor: appState.dotBaseSizeFactor,
            dotPopMagnitude: appState.dotPopMagnitude
        };
        localStorage.setItem('rhythmPatterns', JSON.stringify(patterns));
        loadPatternList();
        alert(`Pattern "${name}" saved!`);
    }

    function loadPatternList() {
        const patterns = JSON.parse(localStorage.getItem('rhythmPatterns') || '{}');
        loadPatternSelect.innerHTML = '<option value="">-- Select Pattern --</option>';
        Object.keys(patterns).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            loadPatternSelect.appendChild(option);
        });
    }

    function loadSelectedPattern() {
        const name = loadPatternSelect.value;
        if (!name) return;
        const patterns = JSON.parse(localStorage.getItem('rhythmPatterns') || '{}');
        if (patterns[name]) {
            const patternData = patterns[name];
            
            appState.bpm = patternData.bpm || 100;
            appState.beatsPerCycle = patternData.beatsPerCycle || 8;
            // Ensure soundProfileIndex is valid if loading older patterns or if list changes
            appState.layers = patternData.layers ? patternData.layers.map((l, index) => ({
                ...l,
                id: l.id || Date.now() + index,
                subdivisions: l.subdivisions || 4,
                soundProfileIndex: (typeof l.soundProfileIndex !== 'undefined' && l.soundProfileIndex < soundProfiles.length) 
                                    ? l.soundProfileIndex 
                                    : index % soundProfiles.length,
                isMuted: l.isMuted || false,
                isSoloed: l.isSoloed || false,
                color: l.color || getNextDefaultColor()
            })) : [];
            appState.patternName = name;

            appState.dotBaseSizeFactor = patternData.dotBaseSizeFactor || 0.007;
            appState.dotPopMagnitude = patternData.dotPopMagnitude || 1.4;

            patternNameInput.value = appState.patternName;
            mainRegisterInput.value = appState.bpm;
            beatsPerCycleInput.value = appState.beatsPerCycle;
            
            dotBaseSizeFactorInput.value = appState.dotBaseSizeFactor;
            dotPopMagnitudeInput.value = appState.dotPopMagnitude;

            renderLayersControls();
            draw();
            alert(`Pattern "${name}" loaded!`);
        }
    }

    function deleteSelectedPattern() {
        const name = loadPatternSelect.value;
        if (!name) {
            alert("Select a pattern to delete.");
            return;
        }
        if (confirm(`Are you sure you want to delete pattern "${name}"?`)) {
            const patterns = JSON.parse(localStorage.getItem('rhythmPatterns') || '{}');
            delete patterns[name];
            localStorage.setItem('rhythmPatterns', JSON.stringify(patterns));
            loadPatternList();
            alert(`Pattern "${name}" deleted.`);
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
                .catch(err => console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    document.addEventListener('fullscreenchange', () => {
        setTimeout(resizeCanvas, 100);
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    menuIcon.addEventListener('click', () => {
        initAudioByUserGesture();
        toggleMenu();
    });
    addLayerBtn.addEventListener('click', () => {
        initAudioByUserGesture();
        handleAddLayer();
    });
    muteAllBtn.addEventListener('click', handleMuteAll);
    
    patternNameInput.addEventListener('change', (e) => {
        appState.patternName = e.target.value; 
    });
    savePatternBtn.addEventListener('click', saveCurrentPattern);
    loadPatternBtn.addEventListener('click', loadSelectedPattern);
    deletePatternBtn.addEventListener('click', deleteSelectedPattern);

    mainRegisterInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (val >= 20 && val <=300) appState.bpm = val;
        else e.target.value = appState.bpm;
        appState.currentBeatTime = 0;
        draw();
    });
    beatsPerCycleInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (val >=1 && val <= 64) appState.beatsPerCycle = val;
        else e.target.value = appState.beatsPerCycle;
        appState.currentBeatTime = 0;
        draw();
    });


    dotBaseSizeFactorInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (val >= 0.001 && val <= 0.05) {
            appState.dotBaseSizeFactor = val;
            // Save pattern if name is set
            if (patternNameInput.value.trim()) {
                saveCurrentPattern();
            }
            draw();
        } else {
            e.target.value = appState.dotBaseSizeFactor;
        }
    });
    dotPopMagnitudeInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (val >= 1.0 && val <= 5.0) {
            appState.dotPopMagnitude = val;
            if (patternNameInput.value.trim()) {
                saveCurrentPattern();
            }
            draw();
        } else {
            e.target.value = appState.dotPopMagnitude;
        }
    });

    fullscreenBtn.addEventListener('click', () => {
        initAudioByUserGesture();
        toggleFullscreen();
    });
    window.addEventListener('resize', resizeCanvas);

    function init() {
        loadPatternList();
        if (appState.layers.length === 0) {
             handleAddLayer();
             if(appState.layers.length > 0){
                appState.layers[0].subdivisions = 8;
                appState.layers[0].activeElements = [true,false,true,false,true,false,true,false];
                // Ensure the first layer uses a good default sound, e.g., 'Kick Deep' (index 0)
                appState.layers[0].soundProfileIndex = 0; 
             }
        }
        
        patternNameInput.value = appState.patternName;
        mainRegisterInput.value = appState.bpm;
        beatsPerCycleInput.value = appState.beatsPerCycle;
        
        dotBaseSizeFactorInput.value = appState.dotBaseSizeFactor;
        dotPopMagnitudeInput.value = appState.dotPopMagnitude;
        
        renderLayersControls();
        resizeCanvas();
        requestAnimationFrame(update);

        // Attempt to initialize audio on load if user interaction is not strictly required by browser yet
        // This might not work in all browsers without a prior user gesture on the page.
        // initAudioByUserGesture(); 
        // Better to rely on first click (menu, add layer, etc.)
    }

    init();
});