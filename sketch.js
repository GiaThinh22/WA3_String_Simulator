// ---------------- GLOBAL VARIABLES ----------------
let spring, massObj, baseObj;
let massSlider, kSlider, dampingSlider;
let running = false; // whether the simulation is running
let dragging = false; // whether the mass is being dragged
let hint = 0; // controls hint circle fading
let mode = "Beginner"; // display mode (Beginner / Intermediate / Advanced)
let displacementHistory = []; // stores displacement for graph
let maxHistory = 300; // max points in history
let totalEnergy = 0; // reference total energy
let heatEnergy = 0; // heat energy lost to damping

// ---------------- SETUP ----------------
function setup() {
  createCanvas(700, 600);
  frameRate(60);

  // Sliders for mass, spring constant k, and damping
  massSlider = createSlider(5, 15, 5, 0.1);
  massSlider.position(20, 20);

  kSlider = createSlider(0.05, 0.1, 0.1, 0.01);
  kSlider.position(20, 50);

  dampingSlider = createSlider(0.9, 0.999, 0.995, 0.001);
  dampingSlider.position(20, 80);

  // Create objects: base, spring, and mass
  baseObj = new Base(width / 2, 10);
  spring = new Spring(width / 2, 50, 200);
  updateEquilibriumLength();
  massObj = new Mass(
    spring.anchorX,
    spring.anchorY + spring.equilibriumLength,
    5
  );

  // Buttons to change display mode
  createButton("Beginner")
    .position(20, 160)
    .mousePressed(() => (mode = "Beginner"));
  createButton("Intermediate")
    .position(100, 160)
    .mousePressed(() => (mode = "Intermediate"));
  createButton("Advanced")
    .position(220, 160)
    .mousePressed(() => (mode = "Advanced"));

  // Reset button (top right)
  createButton("Reset")
    .position(width - 80, 20)
    .mousePressed(resetSimulation);
}

// ---------------- DRAW LOOP ----------------
function draw() {
  background("#81b1d6");

  // Update equilibrium each frame in case sliders move
  updateEquilibriumLength();

  // Display slider values and instructions
  noStroke();
  fill(0);
  textSize(14);
  text(`Mass: ${massSlider.value()} kg`, 160, 35);
  text(`k: ${kSlider.value()} N/m`, 160, 65);
  text(`Damping: ${dampingSlider.value()}`, 160, 95);
  text(`Mode: ${mode}`, 20, 200);
  text(`Press SPACE to start/stop`, 20, 120);
  text(`Drag the weight to set initial position`, 20, 140);

  // Show "stopped" message when paused
  if (!running) {
    push();
    textAlign(CENTER);
    textSize(30);
    fill(200, 50, 50);
    text("stopped", width / 2, height - 50);
    pop();
  }

  // Allow dragging the mass when simulation is not running
  if (!running && dragging) {
    massObj.y = constrain(mouseY, spring.anchorY + 40, 450);
    massObj.vel = 0;
  }

  // Physics update when running
  if (running) {
    let k = kSlider.value();
    let m = massSlider.value();
    let damping = dampingSlider.value();

    // use equilibriumLength as the static offset so dynamics are around that line
    let stretch = massObj.y - (spring.anchorY + spring.equilibriumLength); // spring stretch relative to equilibrium
    let force = -k * stretch; // Hooke's law centered at equilibrium
    let acc = force / m; // F = ma

    // velocity update
    let vBefore = massObj.vel + acc;
    massObj.vel = vBefore * damping; // apply damping
    massObj.y += massObj.vel; // update position

    // energy lost to damping (converted to heat)
    let dE = 0.5 * m * (vBefore * vBefore - massObj.vel * massObj.vel);
    heatEnergy += max(dE, 0);

    // add to displacement history (for graph)
    displacementHistory.push(stretch);
    if (displacementHistory.length > maxHistory) {
      displacementHistory.shift();
    }
  }

  // Draw system: base, spring, and mass
  baseObj.display();
  spring.display(massObj.y);
  massObj.display();

  // Hint green circle (when user clicks elsewhere)
  hint--;
  hint = max(hint, 0);
  push();
  noStroke();
  fill(0, 200, 0, hint * 2);
  circle(massObj.x, massObj.y, 30);
  pop();

  // Extra visuals depending on mode
  if (mode === "Intermediate" || mode === "Advanced") {
    drawDisplacementGraph(); // graph of displacement over time
    drawArrows(); // velocity & acceleration arrows
  }
  if (mode === "Advanced") {
    drawEnergy(); // energy bar chart
    drawDisplacementArrow(); // Δx arrow
  }
}

// ---------------- RESET FUNCTION ----------------
function resetSimulation() {
  // reset sliders to default values
  massSlider.value(5);
  kSlider.value(0.1);
  dampingSlider.value(0.995);

  // reset simulation state
  running = false;
  dragging = false;
  displacementHistory = [];
  heatEnergy = 0;
  totalEnergy = 0;

  // reset equilibrium and mass position & velocity
  updateEquilibriumLength();
  massObj = new Mass(
    spring.anchorX,
    spring.anchorY + spring.equilibriumLength,
    5
  );
}

// ---------------- ENERGY FUNCTIONS ----------------
function computeCurrentEnergy() {
  // Compute KE, spring PE, and gravitational PE
  let m = massSlider.value();
  let k = kSlider.value();
  let g = 9.81;

  // ensure we have a sensible centre Y to use
  let centerY =
    massObj.centerY !== undefined
      ? massObj.centerY
      : massObj.y + massObj.size / 2;

  // stretch relative to the natural (unstretched) spring length (in pixels),
  // convert to meters using the same pixel→meter scale used elsewhere (40 px = 1 m)
  let stretchPixels = massObj.y - (spring.anchorY + spring.restLength);
  let stretchMeters = stretchPixels / 40;

  let v = massObj.vel;

  // KE, elastic PE (using meters), gravitational PE (height in meters)
  let KE = 0.5 * m * v * v;
  let scaleFactor = 200; // arbitrary factor to make bars visible
  let PEe = 0.5 * k * stretchMeters * stretchMeters * scaleFactor;

  let PEg = m * g * ((500 - centerY) / 40); // pixel → meter scale (same as before)
  return { KE, PEe, PEg };
}

function drawEnergy() {
  // Draw stacked energy bars
  let { KE, PEe, PEg } = computeCurrentEnergy();
  let Heat = heatEnergy;

  let barWidth = 30;
  let maxBarHeight = 330;
  let maxEnergy = 3000;
  let energyScale = maxBarHeight / maxEnergy;

  push();
  translate(50, 210);

  // helper to draw one bar
  function drawBar(x, val, col, label) {
    let h = val * energyScale;
    h = min(h, maxBarHeight);
    fill(col);
    rect(x, maxBarHeight - h, barWidth, h);
    fill(0);
    textSize(12);
    text(label, x + 3, maxBarHeight + 15);
  }

  // individual energy bars
  drawBar(0, KE, "red", "KE");
  drawBar(60, PEg, "blue", "PE(grav)");
  drawBar(120, PEe, "green", "PE(elas)");
  drawBar(180, Heat, "orange", "Heat");
  drawBar(240, totalEnergy, "purple", "Total");

  // axis with tick marks
  stroke(0);
  line(-20, 0, -20, maxBarHeight);
  for (let j = 0; j <= maxEnergy; j += 250) {
    let y = maxBarHeight - j * energyScale;
    stroke(0);
    line(-25, y, -15, y);
    noStroke();
    fill(0);
    textSize(10);
    text(j, -45, y + 3);
  }
  pop();
}

// ---------------- OTHER VISUALS ----------------
function drawDisplacementGraph() {
  // Draw displacement vs time graph
  push();
  translate(430, 490);

  // axes
  stroke(0);
  strokeWeight(0.5);
  line(0, 0, 0, -100);
  line(0, 0, 250, 0);

  // y-axis ticks and labels
  fill(0);
  textSize(11);
  for (let i = -100; i <= 0; i += 25) {
    line(-5, i, 5, i);
    text(Math.round(map(i, -100, 0, -200, 200)), -30, i + 3);
  }

  // displacement curve
  noFill();
  stroke("blue");
  beginShape();
  for (let i = 0; i < displacementHistory.length; i++) {
    let x = map(i, 0, maxHistory, 0, 250);
    let y = map(displacementHistory[i], -200, 200, 100, 0);
    vertex(x, -y);
  }
  endShape();

  // labels
  noStroke();
  fill(0);
  text("Displacement vs Time", 70, -110);
  text("Time (frames)", 100, 30);
  rotate(-PI / 2);
  text("Displacement (px)", -10, -40);
  pop();
}

function drawDisplacementArrow() {
  // Draw arrow showing displacement Δx
  let restY = spring.anchorY + spring.equilibriumLength;

  push();
  stroke("brown");
  strokeWeight(2);
  line(massObj.x + 60, restY, massObj.x + 100, restY);

  stroke("purple");
  strokeWeight(3);
  line(massObj.x + 80, restY, massObj.x + 80, massObj.y);
  fill("purple");
  noStroke();
  text("Δx", massObj.x + 90, (restY + massObj.y) / 2);
  pop();
}

function drawArrows() {
  // Draw velocity (blue) and acceleration (red) arrows
  push();
  strokeWeight(3);

  let x = massObj.x;
  let y = massObj.centerY;
  let vel = massObj.vel;
  let k = kSlider.value();
  let m = massSlider.value();
  let stretch = massObj.y - (spring.anchorY + spring.equilibriumLength);
  let acc = (-k * stretch) / m;

  const vScale = 10;
  const aScale = 100;
  const accMinValue = 0.05;
  const velMinValue = 0.25;

  if (abs(vel) > velMinValue) {
    stroke("blue");
    line(x, y, x, y + vel * vScale);
    fill("blue");
    triangle(
      x - 5,
      y + vel * vScale,
      x + 5,
      y + vel * vScale,
      x,
      y + vel * vScale + (vel > 0 ? 10 : -10)
    );
    noStroke();
    fill("blue");
    text("Velocity", x + 10, y + vel * vScale);
  }

  if (abs(acc) > accMinValue) {
    stroke("red");
    line(x, y, x, y + acc * aScale);
    fill("red");
    triangle(
      x - 5,
      y + acc * aScale,
      x + 5,
      y + acc * aScale,
      x,
      y + acc * aScale + (acc > 0 ? 10 : -10)
    );
    noStroke();
    fill("red");
    text("Acceleration", x + 10, y + acc * aScale);
  }

  pop();
}

// ---------------- INPUT EVENTS ----------------
function mousePressed() {
  // Click on mass to drag it
  if (
    !running &&
    dist(mouseX, mouseY, massObj.x, massObj.centerY) < massObj.size / 2
  ) {
    dragging = true;
    displacementHistory = [];
  } else if (!running) {
    hint = 120; // otherwise show green hint circle
  }
}

function mouseReleased() {
  dragging = false;
}

function keyPressed() {
  if (key === " ") {
    // toggle run state
    running = !running;
    if (running) {
      // calculate initial total energy
      let { KE, PEe, PEg } = computeCurrentEnergy();
      totalEnergy = KE + PEe + PEg;
      heatEnergy = 0; // reset heat
    }
  }
}

// ---------------- CLASSES ----------------
class Base {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  display() {
    // fixed top block that holds the spring
    push();
    rectMode(CENTER);
    stroke(0);
    strokeWeight(2);
    fill("#696969");
    rect(this.x, this.y, 100, 20);
    rect(this.x, this.y + 25, 20, 30);
    noStroke();
    fill("#696969");
    rect(this.x, this.y + 18, 18, 30);
    pop();
  }
}

class Spring {
  constructor(x, y, restLen) {
    this.anchorX = x;
    this.anchorY = y;
    this.restLength = restLen;
    this.equilibriumLength = restLen;
    this.height;
  }
  display(massY) {
    // spring as a vertical rectangle
    this.height = massY - this.anchorY;
    this.height = constrain(this.height, 30, 400);
    push();
    stroke(0);
    strokeWeight(2);
    fill(180, 180, 180, 200);
    rect(this.anchorX - 25, this.anchorY, 50, this.height);
    pop();
  }
}

class Mass {
  constructor(x, y, m) {
    this.centerY;
    this.x = x;
    this.y = y;
    this.mass = m;
    this.vel = 0;
    this.size = 40; // block size
    this.hookHeight = 20;
    this.hookWidth = 10;
  }
  display() {
    // draw hook + block
    this.centerY = this.y + this.size / 2;
    this.centerY = max(this.centerY, 100);
    push();
    stroke(0);
    fill(0);
    rect(
      this.x - this.hookWidth / 2,
      this.centerY - this.hookHeight,
      this.hookWidth,
      this.hookHeight
    );
    stroke(0);
    strokeWeight(2);
    fill("#c8c8c8");
    rect(this.x - this.size / 2, this.centerY, this.size, this.size);
    pop();
  }
}

// ---------------- NEW FUNCTION ----------------
function updateEquilibriumLength() {
  let m = massSlider.value();
  let k = kSlider.value();

  // Use a small "simulation gravity" in pixel units so the equilibrium shift
  // is reasonable for the slider ranges you chose.
  const gSim = 0.6; // pixels * (k units) scale — tweak if you want larger/smaller static sag

  // avoid division by zero and cap the stretch to a reasonable value
  let stretch = (m * gSim) / max(k, 0.0001);
  stretch = constrain(stretch, 0, 350);

  spring.equilibriumLength = spring.restLength + stretch;
}
