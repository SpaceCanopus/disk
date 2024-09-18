const particleCount = 30000;  // Number of particles
const G = 10;                 // Gravitational constant (increased for stronger gravity)
const M_star = 20;          // Mass of the central protostar (increased for stronger gravity)
const dt = 0.1;             // Time step (decreased for better accuracy)

// Create the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);  // Black background

// Create the camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 0, 800);  // Set the camera back to see the entire cloud
camera.lookAt(0, 0, 0);

// Create the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create the particle material
const particleMaterial = new THREE.PointsMaterial({
  color: 0xffffff,  // White particles
  size: 0.5,          // Small particles
  transparent: true,
  opacity: 0.7,
});

// Function to create uniformly distributed random points in a sphere
function getRandomPointInSphere(maxRadius) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;      // Angle in xy-plane
  const phi = Math.acos(2 * v - 1);   // Angle from z-axis
  const r = Math.cbrt(Math.random()) * maxRadius;  // Cube root for uniform volume distribution

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  return { x, y, z };
}

// Set initial positions and velocities for particles
const positions = new Float32Array(particleCount * 3);
const velocities = new Float32Array(particleCount * 3);  // To store particle velocities
const maxRadius = 200;  // Maximum radius for the particle cloud (increased for better visualization)

// Simulate the collapse of 5% of particles to form the protostar
const protostarParticleCount = Math.floor(particleCount * 0.05);
const diskParticleCount = particleCount - protostarParticleCount;

for (let i = 0; i < particleCount; i++) {
  if (i < protostarParticleCount) {
    // Particles collapsing into the protostar at the origin
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    // No initial velocity
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;
  } else {
    const { x, y, z } = getRandomPointInSphere(maxRadius);

    // Remaining particles form the accretion disk
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Calculate the distance from the origin (r) in the xy-plane
    const r = Math.sqrt(x * x + y * y);  // Distance in the xy-plane

    // Avoid division by zero for particles near the origin
    if (r > 0) {
      // Calculate the velocity needed for a stable orbit (Keplerian motion)
      const velocity = Math.sqrt((G * M_star) / r);  // Orbital speed based on distance from the center

      // Set the tangential velocity for orbit around the z-axis
      velocities[i * 3] = -y * velocity / r;  // x-velocity
      velocities[i * 3 + 1] = x * velocity / r;  // y-velocity

      // Introduce small random z-velocity for disk thickness
      velocities[i * 3 + 2] = (Math.random() - 0.5) * velocity * 0.0000000001;  // Adjust the multiplier for thickness
    } else {
      // Particles at the center don't move
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }
  }
}

// Assign positions and velocities to geometry
const particles = new THREE.BufferGeometry();
particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

// Create Points object for the particle system
const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

// Create the protostar mesh at the origin
const protostarGeometry = new THREE.SphereGeometry(5, 32, 32);
const protostarMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color
const protostar = new THREE.Mesh(protostarGeometry, protostarMaterial);
scene.add(protostar);

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Function to apply gravity and update positions
function applyGravityAndUpdatePositions() {
  const positions = particleSystem.geometry.attributes.position.array;
  const velocities = particleSystem.geometry.attributes.velocity.array;

  for (let i = protostarParticleCount; i < particleCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    const distance = Math.sqrt(x * x + y * y + z * z);  // Distance from the origin

    if (distance > 0) {
      // Calculate acceleration due to gravity
      const distanceCubed = distance * distance * distance;
      const factor = - (G * M_star) / distanceCubed;

      // Acceleration components
      const ax = factor * x;
      const ay = factor * y;
      const az = factor * z;

      // Update velocities
      velocities[i * 3] += ax * dt;
      velocities[i * 3 + 1] += ay * dt;
      velocities[i * 3 + 2] += az * dt;

      // Update particle positions based on velocities
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
    }
  }

  // Mark the geometry as needing an update
  particleSystem.geometry.attributes.position.needsUpdate = true;
}

// Function to animate particles
function animateParticles() {
  applyGravityAndUpdatePositions();
}

// Function to render the scene
function animate() {
  requestAnimationFrame(animate);

  // Update particles
  animateParticles();

  // Update the camera controls for smooth interactions
  controls.update();

  renderer.render(scene, camera);
}

// Add OrbitControls to move the camera
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;  // Smoother movement
controls.dampingFactor = 0.05;
controls.minDistance = 100;
controls.maxDistance = 1600;

animate();
