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

    // Updated sound profiles with more variety
    const soundProfiles = [
        { name: 'Kick Deep', frequency: 80, type: 'sine', decay: 0.2, gain: 0.45 },
        { name: 'Kick Punchy', frequency: 120, type: 'sine', decay: 0.15, gain: 0.4 },
        { name: 'Snare Crisp', frequency: 300, type: 'square', decay: 0.08, gain: 0.28 },
        { name: 'Snare Brush', frequency: 450, type: 'noise', decay: 0.1, gain: 0.15 }, // Noise type needs special handling if implemented, for now, square.
        { name: 'Snare Rimshot', frequency: 700, type: 'triangle', decay: 0.07, gain: 0.3 },
        { name: 'HiHat Closed', frequency: 3500, type: 'triangle', decay: 0.03, gain: 0.08 }, // Higher freq, very short
        { name: 'HiHat Open', frequency: 3000, type: 'triangle', decay: 0.3, gain: 0.07 },
        { name: 'HiHat Pedal', frequency: 2500, type: 'sawtooth', decay: 0.05, gain: 0.06 },
        { name: 'Cymbal Crash', frequency: 4000, type: 'sawtooth', decay: 0.8, gain: 0.1 }, // Longer, brighter
        { name: 'Cymbal Ride Ping', frequency: 4500, type: 'triangle', decay: 0.5, gain: 0.09 },
        { name: 'Cymbal Bell', frequency: 2000, type: 'square', decay: 0.6, gain: 0.12 },
        { name: 'Tom Low', frequency: 120, type: 'sine', decay: 0.25, gain: 0.3 },
        { name: 'Tom Mid', frequency: 180, type: 'sine', decay: 0.2, gain: 0.28 },
        { name: 'Click Sharp', frequency: 1500, type: 'sawtooth', decay: 0.05, gain: 0.12 },
        { name: 'Wood Block', frequency: 900, type: 'square', decay: 0.06, gain: 0.2 }
    ];
    // For 'noise' type, a proper implementation would use a BufferSourceNode with white noise.
    // For simplicity, I'll keep them as basic oscillator types. If 'noise' is selected, it will use 'square'.


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
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                console.log("AudioContext resumed successfully.");
                audioInitialized = true;
            }).catch(e => console.error("Error resuming AudioContext:", e));
        } else if (audioCtx.state === 'running') {
            audioInitialized = true;
        }
    }

    function playHitSound(layerIndex) {
        if (!audioCtx || !audioInitialized || audioCtx.state !== 'running') return;
        if (appState.isGlobalMute) return;

        const layer = appState.layers[layerIndex];
        if (!layer || typeof layer.soundProfileIndex === 'undefined') return;

        const isAnySoloed = appState.layers.some(l => l.isSoloed);

        if (isAnySoloed) {
            if (!layer.isSoloed || layer.isMuted) return;
        } else {
            if (layer.isMuted) return;
        }

        let profile = soundProfiles[layer.soundProfileIndex % soundProfiles.length];
        // Basic fallback if 'noise' is specified but not implemented with BufferSourceNode
        let oscType = profile.type === 'noise' ? 'square' : profile.type;

        const now = audioCtx.currentTime;
        const oscillator = audioCtx.createOscillator();
        oscillator.type = oscType;
        oscillator.frequency.setValueAtTime(profile.frequency, now);
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(profile.gain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.decay);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(now);
        oscillator.stop(now + profile.decay + 0.05);
    }

    let appState = {
        patternName: 'MyZenRhythm', // Updated default name
        bpm: 100, // Slightly slower default for zen
        beatsPerCycle: 8,
        layers: [],
        currentBeatTime: 0,
        lastFrameTime: performance.now(),
        dotPopStates: {},
        isGlobalMute: false,
        dotBaseSizeFactor: 0.007, // Slightly smaller for cleaner look
        dotPopMagnitude: 1.4      // Slightly less aggressive pop
    };

    const MAX_POP_DURATION = 0.15;

    function resizeCanvas() {
        const panelWidth = controlsPanel.classList.contains('open') ? controlsPanel.offsetWidth : 0;
        const availableWidth = window.innerWidth - panelWidth;
        const availableHeight = window.innerHeight;
        const size = Math.min(availableWidth, availableHeight) * 0.95; // Keep canvas filling space nicely
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
        const maxRadius = canvas.width * 0.42; // Slightly extend max radius for visual balance
        const radiusStep = appState.layers.length > 1 ? (maxRadius - baseRadius) / (appState.layers.length -1) : 0;
        const handLength = maxRadius * 1.05; // Hand slightly shorter relative to maxRadius
        const dotBaseSize = Math.max(2, canvas.width * appState.dotBaseSizeFactor); // Min dot size 2

        // Faint guiding circles for layers
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() + '50'; // Use CSS var with alpha
        ctx.lineWidth = 0.5; // Thinner lines
        for(let i=0; i < appState.layers.length; i++) {
            const r = baseRadius + i * radiusStep;
            if (r <= maxRadius + 2) { // Draw slightly beyond maxRadius for visual completeness
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
        // Use accent color from CSS variables for the hand
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();
        ctx.lineWidth = Math.max(1.5, canvas.width * 0.004); // Thinner hand
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
        muteAllBtn.textContent = appState.isGlobalMute ? "Unmute All Sounds" : "Mute All Sounds"; // Text more explicit
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
    
    // Predefined harmonious colors for new layers, fitting the zen theme
    const defaultLayerColors = [
        "#76ABAE", // accent-primary
        "#A2D2D2", // accent-active
        "#BBE2E2", 
        "#D4F0F0",
        "#adc178", // Muted olive green
        "#dde5b6", // Light muted olive
        "#f0ead2"  // Parchment / cream
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
            color: getNextDefaultColor(), // Use a predefined color
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
        if (newValue > 0 && newValue <= 64) { // Max subdivision limit
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
            event.target.value = appState.layers[index].subdivisions; // Revert if invalid
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

    // getRandomColor not used anymore for default layers, but kept if user uses color picker.
    // function getRandomColor() { ... } 

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
            appState.layers = patternData.layers ? patternData.layers.map((l, index) => ({
                ...l,
                id: l.id || Date.now() + index,
                subdivisions: l.subdivisions || 4,
                soundProfileIndex: typeof l.soundProfileIndex !== 'undefined' ? l.soundProfileIndex : index % soundProfiles.length,
                isMuted: l.isMuted || false,
                isSoloed: l.isSoloed || false,
                color: l.color || getNextDefaultColor() // Ensure color if loading older pattern
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
        setTimeout(resizeCanvas, 100); // Delay for layout to settle
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
        else e.target.value = appState.bpm; // Revert if invalid
        appState.currentBeatTime = 0;
        draw();
    });
    beatsPerCycleInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (val >=1 && val <= 64) appState.beatsPerCycle = val;
        else e.target.value = appState.beatsPerCycle; // Revert if invalid
        appState.currentBeatTime = 0;
        draw();
    });

    dotBaseSizeFactorInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
         if (val >= 0.001 && val <= 0.05) appState.dotBaseSizeFactor = val;
         else e.target.value = appState.dotBaseSizeFactor; // Revert
        draw();
    });
    dotPopMagnitudeInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (val >= 1.0 && val <= 5.0) appState.dotPopMagnitude = val;
        else e.target.value = appState.dotPopMagnitude; // Revert
        draw();
    });

    fullscreenBtn.addEventListener('click', () => {
        initAudioByUserGesture();
        toggleFullscreen();
    });
    window.addEventListener('resize', resizeCanvas);

    function init() {
        loadPatternList();
        if (appState.layers.length === 0) {
            // Add a default layer with the new color scheme
             handleAddLayer(); // This will use getNextDefaultColor
             if(appState.layers.length > 0){ // Ensure layer was added
                appState.layers[0].subdivisions = 8;
                appState.layers[0].activeElements = [true,false,true,false,true,false,true,false];
             }
        }
        
        patternNameInput.value = appState.patternName;
        mainRegisterInput.value = appState.bpm;
        beatsPerCycleInput.value = appState.beatsPerCycle;
        
        dotBaseSizeFactorInput.value = appState.dotBaseSizeFactor;
        dotPopMagnitudeInput.value = appState.dotPopMagnitude;
        
        renderLayersControls(); // Render controls based on potentially modified appState
        resizeCanvas();
        requestAnimationFrame(update);
    }

    init();
});