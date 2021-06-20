import * as THREE from '/build/three.module.js';
import {OrbitControls} from '/jsm/controls/OrbitControls.js';
import Stats from '/jsm/libs/stats.module.js';
import {RenderPass} from '/jsm/postprocessing/RenderPass.js'
import {EffectComposer} from '/jsm/postprocessing/EffectComposer.js'
import {UnrealBloomPass} from '/jsm/postprocessing/UnrealBloomPass.js'
import {GlitchPass} from '/jsm/postprocessing/GlitchPass.js';

let cube;

// Audio Variables
let listener, sound, audioLoader, audioAnalyser, arrayOfBars;

// Post Processing
let composer;

const params = {
    exposure: 1,
    bloomStrength: 1.3,
    bloomThreshold: 0,
    bloomRadius: 0.3
};

function createAudio(){
    // create an AudioListener and add it to the camera
    listener = new THREE.AudioListener();
    camera.add( listener );

    // create a global audio source
    sound = new THREE.Audio( listener );

    // load a sound and set it as the Audio object's buffer
    audioLoader = new THREE.AudioLoader();
    audioLoader.load( 'sounds/enjoy-yourself.mp3', function( buffer ) {
        sound.setBuffer( buffer );
        sound.setLoop( true );
        sound.setVolume( 0.6 );
        sound.play();
    });

    // create an AudioAnalyser, passing in the sound and desired fftSize
    audioAnalyser = new THREE.AudioAnalyser( sound, 128 );
}

function createBars(){
    const numberOfBars = audioAnalyser.analyser.frequencyBinCount;
    const colorOfBars = 0x0000ff;
    arrayOfBars = [];

    let increment;
    for (increment = 0; increment < numberOfBars; increment++) {

        // Create bars
        const geometry = new THREE.BoxGeometry( 0.035, 0.035, 0.035 );
        const material = new THREE.MeshStandardMaterial( { color: 0x6b03fc } );
        cube = new THREE.Mesh( geometry, material );


        // Set position of bars
        const initialBarPosition = numberOfBars/2 * 0.10 * -1;
        cube.position.x = initialBarPosition;
        cube.position.x += 0.10 * increment;

        arrayOfBars.push( cube );
        //console.log(arrayOfBars);

        // Add it to the scene
        scene.add( cube );
    }
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3.5;

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Geometry
const starFieldGeometry = new THREE.BufferGeometry;
const particlesCount = 5000;

const posArray = new Float32Array(particlesCount * 3)

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 10
}

// Materials
starFieldGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
const starFieldMaterial = new THREE.PointsMaterial({
    size: 0.005,
})

// Geometry
const starFieldMesh = new THREE.Points(starFieldGeometry, starFieldMaterial);
scene.add(starFieldMesh);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}, false);

// Lights

const pointLight = new THREE.PointLight( 0xffffff, 1);
camera.add( pointLight );

const ambientLight = new THREE.PointLight( 0xffffff, 1);
ambientLight.position.x = 0;
ambientLight.position.y = 0;
ambientLight.position.z = 3;
scene.add( ambientLight ); 

// Stats
const stats = Stats();
document.body.appendChild(stats.dom);

// Post Processing
const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth / window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;

composer = new EffectComposer( renderer );
composer.renderToScreen = true;
composer.addPass( renderScene );
composer.addPass( bloomPass );

// Clocks
const clock = new THREE.Clock();
clock.autoStart = false;

var animate = function () {
    requestAnimationFrame(animate);

    // Starfield slow rotation
    starFieldMesh.rotation.y += 0.0005;

    // Bar Graph Animation
    let audioData = new Float32Array(audioAnalyser.analyser.frequencyBinCount);
    audioAnalyser.analyser.getFloatFrequencyData(audioData);
    arrayOfBars.forEach((value, index) => {
        value.scale.y = audioData[index] + 85 * 1;
    })

    // Bloom Bass Effect
    if (audioData[0] > -20 && bloomPass.strength < 5) {
        bloomPass.strength += bloomPass.strength * (audioData[0] * -0.01);
        //camera.fov -= 0.5; OLD
        camera.fov -= (audioData[0] * -0.05)
        camera.updateProjectionMatrix();
        starFieldMesh.rotation.y -= (audioData[0] * -0.001);
    }
    if (audioData[0] < -19 && bloomPass.strength > 1.3) {
        bloomPass.strength -= bloomPass.strength * (audioData[0] * -0.0015);
        if(camera.fov < 75){
            //camera.fov += 0.25; OLD
            camera.fov += (audioData[0] * -0.025)
            camera.updateProjectionMatrix();
        }
    }

    controls.update();
    composer.render();
    //render();
    stats.update();
};

function render() {
    renderer.render(scene, camera);
}

createAudio();

createBars();

animate();