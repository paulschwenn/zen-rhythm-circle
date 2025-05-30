document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('rhythmCanvas');
    const ctx = canvas.getContext('2d');

    // Controls Elements
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

    const soundProfiles = [
        { name: 'Kick', frequency: 100, type: 'sine', decay: 0.15, gain: 0.4 },
        { name: 'Snare Basic', frequency: 250, type: 'square', decay: 0.1, gain: 0.25 },
        { name: 'Snare Tight', frequency: 350, type: 'square', decay: 0.07, gain: 0.22 },
        { name: 'Snare Rim', frequency: 600, type: 'triangle', decay: 0.06, gain: 0.28 },
        { name: 'HiHat Closed', frequency: 800, type: 'triangle', decay: 0.04, gain: 0.15 }, // Made tighter
        { name: 'HiHat Open', frequency: 750, type: 'triangle', decay: 0.25, gain: 0.12 },
        { name: 'HiHat Pedal', frequency: 600, type: 'sawtooth', decay: 0.04, gain: 0.1 },
        { name: 'Cymbal Crash', frequency: 1000, type: 'sawtooth', decay: 0.7, gain: 0.18 },
        { name: 'Cymbal Ride', frequency: 1500, type: 'triangle', decay: 0.4, gain: 0.15 },
        { name: 'Tom 1', frequency: 150, type: 'sine', decay: 0.2, gain: 0.35 },
        { name: 'Tom 2', frequency: 330, type: 'square', decay: 0.12, gain: 0.2 },
        { name: 'Click', frequency: 1200, type: 'sawtooth', decay: 0.07, gain: 0.1 },
    ];

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

        const profile = soundProfiles[layer.soundProfileIndex % soundProfiles.length];
        const now = audioCtx.currentTime;
        const oscillator = audioCtx.createOscillator();
        oscillator.type = profile.type;
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
        patternName: 'MyRhythm',
        bpm: 120,
        beatsPerCycle: 8,
        layers: [],
        currentBeatTime: 0,
        lastFrameTime: performance.now(),
        dotPopStates: {},
        isGlobalMute: false,
        dotBaseSizeFactor: 0.008,
        dotPopMagnitude: 1.5
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
        const maxRadius = canvas.width * 0.4;
        const radiusStep = appState.layers.length > 1 ? (maxRadius - baseRadius) / (appState.layers.length -1) : 0;
        const handLength = maxRadius * 1.1;
        const dotBaseSize = Math.max(3, canvas.width * appState.dotBaseSizeFactor);

        ctx.strokeStyle = 'rgba(0, 198, 255, 0.1)';
        ctx.lineWidth = 1;
        for(let i=0; i < appState.layers.length; i++) {
            const r = baseRadius + i * radiusStep;
            if (r <= maxRadius) {
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
        ctx.strokeStyle = '#00c6ff';
        ctx.lineWidth = Math.max(2, canvas.width * 0.005);
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
        muteAllBtn.textContent = appState.isGlobalMute ? "Unmute All" : "Mute All Sounds";
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

    function handleAddLayer() {
        const newLayer = {
            id: Date.now(),
            subdivisions: 4,
            activeElements: [true, false, true, false],
            color: getRandomColor(),
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
        if (newValue > 0) {
            appState.layers[index].subdivisions = newValue;
            const currentActive = appState.layers[index].activeElements;
            const newActive = [];
            for (let i = 0; i < newValue; i++) {
                newActive.push(i < currentActive.length ? currentActive[i] : false);
            }
            appState.layers[index].activeElements = newActive;
            updateLayerElementButtons(index);
            draw();
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
        muteAllBtn.textContent = appState.isGlobalMute ? "Unmute All" : "Mute All Sounds";
    }

    function getRandomColor() {
        const r = Math.floor(Math.random() * 200 + 55);
        const g = Math.floor(Math.random() * 200 + 55);
        const b = Math.floor(Math.random() * 200 + 55);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    function saveCurrentPattern() {
        const name = patternNameInput.value.trim();
        if (!name) {
            alert("Please enter a pattern name.");
            return;
        }
        appState.patternName = name; // Make sure pattern name in appState is also up-to-date
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
        loadPatternList(); // Refresh dropdown
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
            
            appState.bpm = patternData.bpm;
            appState.beatsPerCycle = patternData.beatsPerCycle;
            appState.layers = patternData.layers.map((l, index) => ({
                ...l,
                id: l.id || Date.now() + index, // Ensure ID for older patterns
                subdivisions: l.subdivisions || 4, // Default if missing
                soundProfileIndex: typeof l.soundProfileIndex !== 'undefined' ? l.soundProfileIndex : index % soundProfiles.length,
                isMuted: l.isMuted || false,
                isSoloed: l.isSoloed || false
            }));
            appState.patternName = name; // Set loaded pattern name to appState

            // Load visual settings with defaults if not present in pattern data
            appState.dotBaseSizeFactor = patternData.dotBaseSizeFactor || 0.008;
            appState.dotPopMagnitude = patternData.dotPopMagnitude || 1.5;

            // Update UI elements
            patternNameInput.value = appState.patternName; // Reflect loaded pattern name
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
        // Only update appState.patternName if you intend for it to change *before* saving.
        // If patternNameInput is just a field for naming on save, this line could be removed.
        // For now, let's assume it reflects the current working name.
        appState.patternName = e.target.value; 
    });
    savePatternBtn.addEventListener('click', saveCurrentPattern);
    loadPatternBtn.addEventListener('click', loadSelectedPattern);
    deletePatternBtn.addEventListener('click', deleteSelectedPattern);

    mainRegisterInput.addEventListener('change', (e) => {
        appState.bpm = parseInt(e.target.value);
        appState.currentBeatTime = 0;
        draw();
    });
    beatsPerCycleInput.addEventListener('change', (e) => {
        appState.beatsPerCycle = parseInt(e.target.value);
        appState.currentBeatTime = 0;
        draw();
    });

    dotBaseSizeFactorInput.addEventListener('change', (e) => {
        appState.dotBaseSizeFactor = parseFloat(e.target.value);
        draw();
    });
    dotPopMagnitudeInput.addEventListener('change', (e) => {
        appState.dotPopMagnitude = parseFloat(e.target.value);
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
            const defaultLayer = {
                id: Date.now(),
                subdivisions: 8,
                activeElements: [true,false,true,false,true,false,true,false],
                color: '#39FF14',
                soundProfileIndex: 0,
                isMuted: false,
                isSoloed: false
            };
            appState.layers.push(defaultLayer);
        }
        
        patternNameInput.value = appState.patternName; // Set initial pattern name from default appState
        mainRegisterInput.value = appState.bpm;
        beatsPerCycleInput.value = appState.beatsPerCycle;
        
        dotBaseSizeFactorInput.value = appState.dotBaseSizeFactor;
        dotPopMagnitudeInput.value = appState.dotPopMagnitude;
        
        renderLayersControls();
        resizeCanvas();
        requestAnimationFrame(update);
    }

    init();
});