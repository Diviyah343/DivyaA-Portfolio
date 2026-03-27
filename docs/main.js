import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

// Splash Screen
const splashScreen = document.getElementById('splash-screen');
if (splashScreen) {
    splashScreen.addEventListener('click', () => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => splashScreen.style.display = 'none', 1000);
    });
}

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xF5ECD7);

const canvas = document.getElementById("experience-canvas");
const sizes = { width: window.innerWidth, height: window.innerHeight };

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// Selective Outline System
const OUTLINE_SILHOUETTES = [
    'desk','table','shelf','lamp','lampshade',
    'cat','figurine','book','laptop','computer',
    'drawer','cabinet','monitor','cactus','pot','trophy'
];
const OUTLINE_NEVER = [
    'leg','pole','bracket','floor','wall','ceiling',
    'ground','cord','wire','keyboard','mousepad','pad','base'
];

function shouldOutline(name) {
    const n = name.toLowerCase();
    if (OUTLINE_NEVER.some(k => n.includes(k))) return false;
    if (OUTLINE_SILHOUETTES.some(k => n.includes(k))) return true;
    return false;
}

function getOutlineThickness(name) {
    const n = name.toLowerCase();
    if (n.includes('desk') || n.includes('table') || n.includes('shelf')) return 0.018;
    if (n.includes('lamp') || n.includes('cabinet') || n.includes('drawer')) return 0.014;
    return 0.011;
}

function addSketchOutline(mesh) {
    const geo = mesh.geometry.clone();
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.003);
        pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.003);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const thickness = getOutlineThickness(mesh.name);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x1a1008,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.25,
        depthWrite: false,
    });

    const outline = new THREE.Mesh(geo, mat);
    outline.scale.multiplyScalar(1 + thickness + Math.random() * 0.006);
    outline.renderOrder = -1;
    outline.userData.isOutline = true;
    mesh.add(outline);
}

// Camera
const camera = new THREE.PerspectiveCamera(18, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(30.99814, 14.0, 17.0);
camera.userDefined = true;

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableRotate = true;
controls.enableZoom = false;
controls.enablePan = false;
controls.autoRotate = false;

controls.minPolarAngle = Math.PI * 0.28;
controls.maxPolarAngle = Math.PI * 0.42;

controls.target.set(0, 6, 0);
controls.update();

// Lighting
const ambient = new THREE.AmbientLight(0xffecd2, 0.5);
scene.add(ambient);

const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.0);
sunLight.position.set(-5, 12, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.bias = -0.001;
sunLight.shadow.radius = 3;
scene.add(sunLight);

const bounce = new THREE.RectAreaLight(0xfff1d6, 1.2, 6, 4);
bounce.position.set(0, 1.1, 0);
bounce.rotation.x = -Math.PI / 2;
scene.add(bounce);

const lampLight = new THREE.PointLight(0xFF9A3C, 0.8, 25);
lampLight.position.set(8, 4, 2);
scene.add(lampLight);

const rimLight = new THREE.DirectionalLight(0xddeeff, 0.2);
rimLight.position.set(-8, 5, -8);
scene.add(rimLight);

const frontFill = new THREE.DirectionalLight(0xfff8f0, 0.3);
frontFill.position.set(0, 2, 15);
scene.add(frontFill);

// Raycaster
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let lastIntersected = null;
const intersectObjects = [];

function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}
canvas.addEventListener('pointermove', onPointerMove);

// Hover State
let hoveredMesh = null;
const HOVER_LIFT = 0.08;
const HOVER_SPEED = 0.12;

function getInteractableName(mesh) {
    const name = (mesh.name || '').toLowerCase();
    const parent = mesh.parent?.name?.toLowerCase() || '';
    const combined = name + ' ' + parent;

    if (combined.includes('laptop') || combined.includes('computer') || combined.includes('screen')) return 'laptop';
    if (combined.includes('sticky') || combined.includes('note') || combined.includes('paper')) return 'note';
    if (combined.includes('trophy') || combined.includes('cup') || combined.includes('award')) return 'trophy';
    if (combined.includes('drawer') || combined.includes('cabinet') || combined.includes('dresser')) return 'drawer';
    if (combined.includes('phone') || combined.includes('mobile')) return 'phone';
    if (combined.includes('cat') || combined.includes('figurine')) return 'cat';
    if (combined.includes('cactus') || combined.includes('plant')) return 'cactus';
    if (combined.includes('lamp') || combined.includes('light')) return 'lamp';
    if (combined.includes('book')) return 'book';
    return null;
}

// Popup System
const popupData = {
    laptop: {
        title: 'About Me',
        theme: 'laptop',
        content: `
            <div class="laptop-screen">
                <div class="laptop-bezel">
                    <div class="screen-scanlines"></div>
                    <div class="screen-glow"></div>
                    <div class="macos-menubar">
                        <span class="menu-apple">&#63743;</span>
                        <span class="menu-item active">Terminal</span>
                        <span class="menu-item">File</span>
                        <span class="menu-item">Edit</span>
                        <span class="menu-item">View</span>
                        <div class="menubar-right">
                            <span class="menu-status">100%</span>
                            <span class="menu-clock" id="live-clock"></span>
                        </div>
                    </div>
                    <div class="terminal-window">
                        <div class="terminal-titlebar">
                            <div class="term-dots">
                                <span class="tdot tdot-close"></span>
                                <span class="tdot tdot-min"></span>
                                <span class="tdot tdot-max"></span>
                            </div>
                            <span class="term-title">divya@portfolio &mdash; bash &mdash; 80&times;24</span>
                        </div>
                        <div class="terminal-body">
                            <div class="term-row"><span class="t-dim">Last login: Fri Jan 17 09:41:02 on ttys001</span></div>
                            <div class="term-row t-gap"></div>
                            <div class="term-row">
                                <span class="t-user">divya@portfolio</span><span class="t-sep">:</span><span class="t-path">~</span><span class="t-dollar"> $ </span><span class="t-cmd" id="cmd1"></span>
                            </div>
                            <div class="term-row t-out" id="out1" style="opacity:0">Divya Darshini A — Second Year Engineering Student</div>
                            <div class="term-row t-gap"></div>
                            <div class="term-row" id="row2" style="opacity:0">
                                <span class="t-user">divya@portfolio</span><span class="t-sep">:</span><span class="t-path">~</span><span class="t-dollar"> $ </span><span class="t-cmd" id="cmd2"></span>
                            </div>
                            <div class="term-row t-out" id="out2" style="opacity:0">From Easwari Engineering College, Chennai.</div>
                            <div class="term-row t-out" id="out2b" style="opacity:0">Passionate about becoming a software engineer.</div>
                            <div class="term-row t-gap"></div>
                            <div class="term-row" id="row3" style="opacity:0">
                                <span class="t-user">divya@portfolio</span><span class="t-sep">:</span><span class="t-path">~</span><span class="t-dollar"> $ </span><span class="t-cursor">&#9611;</span>
                            </div>
                        </div>
                    </div>
                    <div class="macos-dock">
                        <div class="dock-item" title="Finder">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect width="20" height="20" rx="4" fill="#2478CF"/><rect x="3" y="10" width="7" height="7" rx="1" fill="#fff" opacity="0.9"/><rect x="11" y="3" width="6" height="6" rx="1" fill="#fff" opacity="0.9"/><rect x="11" y="10" width="6" height="7" rx="1" fill="#fff" opacity="0.6"/><rect x="3" y="3" width="7" height="6" rx="1" fill="#fff" opacity="0.6"/></svg>
                        </div>
                        <div class="dock-item dock-active" title="Terminal">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect width="20" height="20" rx="4" fill="#1a1a1a"/><polyline points="4,7 9,10 4,13" stroke="#28CA41" stroke-width="1.5" stroke-linejoin="round" fill="none"/><line x1="10" y1="13" x2="16" y2="13" stroke="#28CA41" stroke-width="1.5"/></svg>
                        </div>
                        <div class="dock-item" title="VS Code">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect width="20" height="20" rx="4" fill="#0078d4"/><path d="M14 4L8 10l6 6V4z" fill="white" opacity="0.9"/><path d="M6 7l3 3-3 3" stroke="white" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>
                        </div>
                        <div class="dock-item" title="Chrome">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect width="20" height="20" rx="4" fill="#fff"/><circle cx="10" cy="10" r="3" fill="#4285F4"/><path d="M10 4 A6 6 0 0 1 15.2 7 L10 7 A3 3 0 0 0 7.5 8.5 Z" fill="#EA4335"/><path d="M15.2 7 A6 6 0 0 1 15.2 13 L12.6 8.5 A3 3 0 0 0 10 7 Z" fill="#FBBC04"/><path d="M15.2 13 A6 6 0 0 1 4.8 13 L7.4 8.5 A3 3 0 0 0 7.5 11.5 Z" fill="#34A853"/></svg>
                        </div>
                        <div class="dock-divider"></div>
                        <div class="dock-item" title="GitHub">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect width="20" height="20" rx="4" fill="#1a1a1a"/><path fill-rule="evenodd" clip-rule="evenodd" d="M10 3C6.686 3 4 5.686 4 9c0 2.65 1.718 4.9 4.104 5.694.3.055.41-.13.41-.29 0-.142-.005-.518-.008-1.018-1.67.363-2.023-.806-2.023-.806-.273-.694-.667-0.879-.667-.879-.545-.373.041-.365.041-.365.602.042.919.618.919.618.535.917 1.403.652 1.745.499.054-.388.21-.652.38-.802-1.333-.152-2.733-.667-2.733-2.967 0-.655.234-1.191.618-1.61-.062-.152-.268-.762.059-1.588 0 0 .504-.161 1.65.615A5.75 5.75 0 0110 6.836c.51.003 1.023.069 1.502.202 1.145-.776 1.648-.615 1.648-.615.328.826.122 1.436.06 1.588.385.42.617.955.617 1.61 0 2.306-1.403 2.813-2.739 2.962.215.185.407.55.407 1.109 0 .8-.007 1.446-.007 1.642 0 .16.108.347.413.288C14.284 13.897 16 11.648 16 9c0-3.314-2.686-6-6-6z" fill="white"/></svg>
                        </div>
                    </div>
                </div>
                <div class="laptop-chin"><div class="laptop-notch"></div></div>
            </div>`
    },
    note: {
        title: 'Skills',
        theme: 'note',
        content: `
            <div class="popup-notes">
                <div class="sticky yellow">Python &middot; Java &middot; Dart &middot; JavaScript</div>
                <div class="sticky pink">Flutter &middot; Three.js</div>
                <div class="sticky blue">HTML &middot; CSS &middot; JavaScript</div>
                <div class="sticky green">Firebase Firestore &middot; MongoDB</div>
                <div class="sticky orange">Git &middot; GitHub &middot; VS Code &middot; Eclipse &middot; Jupyter</div>
                <div class="sticky purple">Figma &middot; Blender</div>
            </div>`
    },
    book: {
        title: 'Technical Skills',
        theme: 'book',
        content: `
            <div class="skills-grid">
                <div class="skill-category">
                    <div class="skill-cat-label">Programming Languages</div>
                    <div class="skill-tags">
                        <span class="skill-tag">Python</span>
                        <span class="skill-tag">Java</span>
                        <span class="skill-tag">Dart</span>
                        <span class="skill-tag">JavaScript</span>
                    </div>
                </div>
                <div class="skill-category">
                    <div class="skill-cat-label">Web Technologies</div>
                    <div class="skill-tags">
                        <span class="skill-tag">HTML</span>
                        <span class="skill-tag">CSS</span>
                        <span class="skill-tag">JavaScript</span>
                    </div>
                </div>
                <div class="skill-category">
                    <div class="skill-cat-label">Databases</div>
                    <div class="skill-tags">
                        <span class="skill-tag">Firebase Firestore</span>
                        <span class="skill-tag">MongoDB</span>
                    </div>
                </div>
                <div class="skill-category">
                    <div class="skill-cat-label">Tools and IDEs</div>
                    <div class="skill-tags">
                        <span class="skill-tag">Git</span>
                        <span class="skill-tag">GitHub</span>
                        <span class="skill-tag">VS Code</span>
                        <span class="skill-tag">Eclipse</span>
                        <span class="skill-tag">Jupyter Notebook</span>
                    </div>
                </div>
                <div class="skill-category">
                    <div class="skill-cat-label">Frameworks and Libraries</div>
                    <div class="skill-tags">
                        <span class="skill-tag">Flutter</span>
                        <span class="skill-tag">Three.js</span>
                    </div>
                </div>
                <div class="skill-category">
                    <div class="skill-cat-label">Design</div>
                    <div class="skill-tags">
                        <span class="skill-tag">Figma</span>
                        <span class="skill-tag">Blender</span>
                    </div>
                </div>
            </div>`
    },
    trophy: {
        title: 'Achievements',
        theme: 'trophy',
        content: `
            <div class="popup-trophy">
                <div class="trophy-item gold">
                    <div class="trophy-rank">1st</div>
                    <div>
                        <p class="trophy-name">Survival Syntax Coding Competition</p>
                        <p class="trophy-detail">2nd Year &middot; College Level</p>
                    </div>
                </div>
                <div class="trophy-item silver">
                    <div class="trophy-rank">5th</div>
                    <div>
                        <p class="trophy-name">CTRL+FIX Coding Competition</p>
                        <p class="trophy-detail">1st Year &middot; College Level</p>
                    </div>
                </div>
                <div class="trophy-item finalist">
                    <div class="trophy-rank-label">Finalist</div>
                    <div>
                        <p class="trophy-name">Quantified Dilemma</p>
                        <p class="trophy-detail">IIT Madras</p>
                    </div>
                </div>
                <div class="trophy-item finalist">
                    <div class="trophy-rank-label">Finalist</div>
                    <div>
                        <p class="trophy-name">Neurohacks Hackathon</p>
                        <p class="trophy-detail">IIT Madras</p>
                    </div>
                </div>
                <div class="trophy-item bronze">
                    <div class="trophy-rank-label">Top 10/80</div>
                    <div>
                        <p class="trophy-name">Hacktrix National Hackathon</p>
                        <p class="trophy-detail">Sri Sairam Engineering College</p>
                    </div>
                </div>
                <div class="trophy-item bronze">
                    <div class="trophy-rank-label">Top 15</div>
                    <div>
                        <p class="trophy-name">Pixel Reforge Web Development Competition</p>
                        <p class="trophy-detail">CIT Chennai</p>
                    </div>
                </div>
                <div class="trophy-item mention">
                    <div class="trophy-rank-label">Round 2</div>
                    <div>
                        <p class="trophy-name">HP Power Lab 2.0 Hackathon</p>
                        <p class="trophy-detail">HP India</p>
                    </div>
                </div>
            </div>`
    },
    drawer: {
        title: 'Projects',
        theme: 'drawer',
        content: `
            <div class="popup-projects">
                <div class="project-card">
                    <p class="project-name">Wayfind</p>
                    <p class="project-tech">Flutter &middot; Firebase &middot; Dart</p>
                    <p class="project-desc">Campus navigation mobile app with role-based access for admins, professors, students, and guests. Features real-time professor availability tracking via Firebase and an interactive multi-floor campus map editor.</p>
                </div>
                <div class="project-card">
                    <p class="project-name">Interactive 3D Portfolio</p>
                    <p class="project-tech">Three.js &middot; HTML &middot; SCSS &middot; JavaScript</p>
                    <p class="project-desc">This very room. An interactive 3D portfolio built with Three.js, featuring an animated 3D environment, camera navigation, and clickable objects that reveal projects, skills, and achievements.</p>
                </div>
                <div class="project-card">
                    <p class="project-name">TremorTrack</p>
                    <p class="project-tech">HTML &middot; CSS &middot; JavaScript</p>
                    <p class="project-desc">Web-based Parkinson's tremor assessment tool implementing clinical tests including Spiral Drawing, Hold and Wait, and Finger Tapping. Classifies tremor severity through interactive pattern analysis.</p>
                </div>
            </div>`
    },
    phone: {
        title: 'Contact',
        theme: 'phone',
        content: `
            <div class="popup-contact">
                <div class="contact-info-row">
                    <div class="contact-label">Email</div>
                    <a class="contact-link email" href="mailto:divyadarshinia09b@gmail.com">
                        <span class="contact-icon">@</span> divyadarshinia09b@gmail.com
                    </a>
                </div>
                <div class="contact-info-row">
                    <div class="contact-label">GitHub</div>
                    <a class="contact-link github" href="https://github.com/" target="_blank">
                        <span class="contact-icon">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 3C6.686 3 4 5.686 4 9c0 2.65 1.718 4.9 4.104 5.694.3.055.41-.13.41-.29 0-.142-.005-.518-.008-1.018-1.67.363-2.023-.806-2.023-.806-.273-.694-.667-.879-.667-.879-.545-.373.041-.365.041-.365.602.042.919.618.919.618.535.917 1.403.652 1.745.499.054-.388.21-.652.38-.802-1.333-.152-2.733-.667-2.733-2.967 0-.655.234-1.191.618-1.61-.062-.152-.268-.762.059-1.588 0 0 .504-.161 1.65.615A5.75 5.75 0 0110 6.836c.51.003 1.023.069 1.502.202 1.145-.776 1.648-.615 1.648-.615.328.826.122 1.436.06 1.588.385.42.617.955.617 1.61 0 2.306-1.403 2.813-2.739 2.962.215.185.407.55.407 1.109 0 .8-.007 1.446-.007 1.642 0 .16.108.347.413.288C14.284 13.897 16 11.648 16 9c0-3.314-2.686-6-6-6z"/></svg>
                        </span> GitHub
                    </a>
                </div>
                <div class="contact-info-row">
                    <div class="contact-label">LinkedIn</div>
                    <a class="contact-link linkedin" href="https://linkedin.com/" target="_blank">
                        <span class="contact-icon">in</span> LinkedIn
                    </a>
                </div>
            </div>`
    }
};

function startLaptopAnimation(popupElement) {
    // Update clock
    function tick() {
        var el = popupElement.querySelector('#live-clock');
        if (el) el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    }
    tick();
    setInterval(tick, 1000);

    // Animation functions
    function typeInto(elId, text, delay, done) {
        var el = popupElement.querySelector('#' + elId);
        if (!el) return;
        el.parentElement.style.opacity = '1';
        var i = 0;
        setTimeout(function go() {
            el.textContent = text.slice(0, ++i);
            if (i < text.length) setTimeout(go, 55 + Math.random()*40);
            else if (done) setTimeout(done, 180);
        }, delay);
    }

    function show(id, delay, done) {
        setTimeout(function(){
            var el = popupElement.querySelector('#' + id);
            if (el) { el.style.opacity = '1'; el.style.transition = 'opacity 0.2s'; }
            if (done) done();
        }, delay);
    }

    // Start the animation sequence
    typeInto('cmd1', 'whoami', 400, function(){
        show('out1', 100, function(){
            show('row2', 400, function(){
                typeInto('cmd2', 'cat about.txt', 0, function(){
                    show('out2', 100);
                    show('out2b', 300, function(){
                        show('row3', 500);
                    });
                });
            });
        });
    });
}

function showPopup(type) {
    const data = popupData[type];
    if (!data) return;

    closePopup();

    const overlay = document.createElement('div');
    overlay.className = `popup-overlay popup-${data.theme}`;
    overlay.id = 'active-popup';

    overlay.innerHTML = `
        <div class="popup-window">
            <div class="popup-header">
                <span class="popup-title">${data.title}</span>
                <button class="popup-close" onclick="closePopup()">X</button>
            </div>
            <div class="popup-body">
                ${data.content}
            </div>
        </div>`;

    document.body.appendChild(overlay);

    // close on outside click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closePopup();
    });

    requestAnimationFrame(() => {
        overlay.classList.add('popup-visible');

        // Start animation for laptop popup
        if (type === 'laptop') {
            setTimeout(() => {
                startLaptopAnimation(overlay);
            }, 500);
        }
    });
}

window.closePopup = function() {
    const popup = document.getElementById('active-popup');
    if (popup) {
        popup.classList.remove('popup-visible');
        setTimeout(() => popup.remove(), 400);
    }
};

// Click Handler
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickPointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(clickPointer, camera);
    const intersects = raycaster.intersectObjects(intersectObjects, true);

    if (intersects.length > 0) {
        const hit = intersects[0].object;
        const type = getInteractableName(hit);
        if (type) showPopup(type);
    }
});

// Model Loading
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

loader.load('./room_portfolio-v1.glb', function(glb) {
    glb.scene.traverse((child) => {
        if (child.isMesh) {
            const name = (child.name || '').toLowerCase();
            const parentName = (child.parent?.name || '').toLowerCase();
            const combined = name + ' ' + parentName;

            const mat = child.material;

            if (combined.includes('screen') || combined.includes('display') || combined.includes('monitor')) {
                child.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(0x1a1a2e),
                    roughness: 0.1, metalness: 0.0, side: THREE.DoubleSide,
                });
            } else {
                if (mat) {
                    mat.side = THREE.DoubleSide;
                    if (mat.color) {
                        const hsl = {};
                        mat.color.getHSL(hsl);
                        if (hsl.l < 0.08) {
                            mat.color.setHSL(hsl.h, hsl.s, 0.25);
                        }
                    }
                    mat.needsUpdate = true;
                }
            }

            const currentColor = child.material?.color?.clone() || new THREE.Color(0x888888);
            child.userData.originalColor = currentColor;
            child.userData.originalY = child.position.y;
            child.castShadow = true;
            child.receiveShadow = true;

            if (shouldOutline(child.name)) {
                addSketchOutline(child);
            }

            if (!child.userData.isOutline) {
                intersectObjects.push(child);
            }
        }
    });

    scene.add(glb.scene);

    const box = new THREE.Box3().setFromObject(glb.scene);
    const center = box.getCenter(new THREE.Vector3());

    controls.target.set(center.x, center.y + 1.5, center.z);

    const az = Math.atan2(
        camera.position.x - controls.target.x,
        camera.position.z - controls.target.z
    );
    controls.minAzimuthAngle = az - Math.PI * 0.25;
    controls.maxAzimuthAngle = az + Math.PI * 0.25;

    controls.update();
});

// Resize
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    const delta = clock.getDelta();

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(intersectObjects, true);

    if (lastIntersected) {
        if (lastIntersected.userData.originalColor) {
            lastIntersected.material.color.copy(lastIntersected.userData.originalColor);
        }
        const origY = lastIntersected.userData.originalY ?? 0;
        lastIntersected.position.y += (origY - lastIntersected.position.y) * HOVER_SPEED;
        if (Math.abs(lastIntersected.position.y - origY) < 0.001) {
            lastIntersected.position.y = origY;
            lastIntersected = null;
        }
    }

    if (intersects.length > 0) {
        const hit = intersects[0].object;
        const type = getInteractableName(hit);

        if (hit && hit.material && hit.userData.originalColor && type) {
            hit.material.color.setHSL(
                ...hit.userData.originalColor.getHSL({}).h !== undefined
                    ? (() => {
                        const hsl = {};
                        hit.userData.originalColor.getHSL(hsl);
                        return [hsl.h, Math.min(hsl.s * 1.3, 1), Math.min(hsl.l * 1.25, 0.95)];
                    })()
                    : [0, 0, 0.9]
            );

            const targetY = (hit.userData.originalY ?? hit.position.y) + HOVER_LIFT;
            hit.position.y += (targetY - hit.position.y) * HOVER_SPEED;

            canvas.style.cursor = 'pointer';
            lastIntersected = hit;
        }
    } else {
        canvas.style.cursor = 'default';
    }

    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);