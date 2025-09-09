let spring, massObj, baseObj;
let massSlider, kSlider, dampingSlider;
let running = false;
let dragging = false;
let hint = 0;
let mode = "Beginner";
let displacementHistory = [];
let maxHistory = 300;
let totalEnergy = 0;   // initial total energy
let heatEnergy = 0;    // cumulative heat energy

function setup() {
  createCanvas(700, 600);
  frameRate(60);

  // Sliders
  massSlider = createSlider(5, 15, 5, 0.1);
  massSlider.position(20, 20);

  kSlider = createSlider(0.05, 0.1, 0.1, 0.01);
  kSlider.position(20, 50);

  dampingSlider = createSlider(0.900, 0.999, 0.995, 0.001);
  dampingSlider.position(20, 80);

  baseObj = new Base(width / 2, 10);
  spring = new Spring(width / 2, 50, 200);
  massObj = new Mass(spring.anchorX, spring.anchorY + spring.restLength, 5);

  createButton("Beginner").position(20, 160).mousePressed(() => mode = "Beginner");
  createButton("Intermediate").position(100, 160).mousePressed(() => mode = "Intermediate");
  createButton("Advanced").position(220, 160).mousePressed(() => mode = "Advanced");

  // Reset button (top right)
  createButton("Reset").position(width - 80, 20).mousePressed(resetSimulation);
}

function draw() {
  background("#81b1d6");
  noStroke();
  fill(0);
  textSize(14);
  text(`Mass: ${massSlider.value()} kg`, 160, 35);
  text(`k: ${kSlider.value()} N/m`, 160, 65);
  text(`Damping: ${dampingSlider.value()}`, 160, 95);
  text(`Mode: ${mode}`, 20, 200);
  text(`Press SPACE to start/stop`, 20, 120);
  text(`Drag the weight to set initial position`, 20, 140);

  if (!running) {
    push();
    textAlign(CENTER);
    textSize(30);
    fill(200, 50, 50);
    text('stopped', width / 2, height - 50);
    pop();
  }

  if (!running && dragging) {
    massObj.y = constrain(mouseY, spring.anchorY + 40, 450);
    massObj.vel = 0;
  }

  if (running) {
    let k = kSlider.value();
    let m = massSlider.value();
    let damping = dampingSlider.value();

    let stretch = massObj.y - (spring.anchorY + spring.restLength);
    let force = -k * stretch;
    let acc = force / m;

    // velocity before damping
    let vBefore = massObj.vel + acc;
    // apply damping
    massObj.vel = vBefore * damping;
    massObj.y += massObj.vel;

    // track heat energy from damping loss
    let dE = 0.5 * m * (vBefore*vBefore - massObj.vel*massObj.vel);
    heatEnergy += max(dE, 0);

    displacementHistory.push(stretch);
    if (displacementHistory.length > maxHistory) {
      displacementHistory.shift();
    }
  }

  baseObj.display();
  spring.display(massObj.y);
  massObj.display();

  let T = TWO_PI * sqrt(massSlider.value() / kSlider.value());
  fill(0);
  textSize(16);
  text(`Theoretical Period: ${T.toFixed(2)} s`, 20, height - 20);

  hint--;
  hint = max(hint, 0);
  push();
  noStroke();
  fill(0, 200, 0, hint * 2);
  circle(massObj.x, massObj.y, 30);
  pop();

  if (mode === "Intermediate" || mode === "Advanced") {
    drawDisplacementGraph();
    drawArrows();
  }
  if (mode === "Advanced") {
    drawEnergy();
    drawDisplacementArrow();
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

  // reset mass position & velocity
  massObj = new Mass(spring.anchorX, spring.anchorY + spring.restLength, 5);
}

// ---------------- ENERGY FUNCTIONS ----------------
function computeCurrentEnergy() {
  let m = massSlider.value();
  let k = kSlider.value();
  let g = 9.81;

  let stretch = abs(spring.restLength - (massObj.centerY-massObj.size));
  let v = massObj.vel;

  let KE = 0.5 * m * v * v;
  let PEe = 0.5 * k * stretch * stretch;
  let PEg = m * g * (500-massObj.centerY+massObj.size)/40; 
  // 40 px = 1 m
  return { KE, PEe, PEg };
}

function drawEnergy() {
  let { KE, PEe, PEg } = computeCurrentEnergy();
  let Heat = heatEnergy;

  let barWidth = 30;
  let maxBarHeight = 330;

  let maxEnergy = 3000;
  let energyScale = maxBarHeight / maxEnergy;

  push();
  translate(50, 210);

  function drawBar(x, val, col, label) {
    let h = val * energyScale;
    h = min(h, maxBarHeight);
    fill(col);
    rect(x, maxBarHeight - h, barWidth, h);
    fill(0);
    textSize(12);
    text(label, x + 3, maxBarHeight + 15);
  }

  drawBar(0, KE, "red", "KE");
  drawBar(60, PEg, "blue", "PE(grav)");
  drawBar(120, PEe, "green", "PE(elas)");
  drawBar(180, Heat, "orange", "Heat");
  drawBar(240, totalEnergy, "purple", "Total");

  // y-axis with ticks every 250 J
  stroke(0);
  line(-20, 0, -20, maxBarHeight);
  for (let j = 0; j <= maxEnergy; j += 250) {
    let y = maxBarHeight - j * energyScale;
    stroke(0);
    line(-25, y, -15, y); // tick mark
    noStroke();
    fill(0);
    textSize(10);
    text(j, -45, y + 3);
  }

  pop();
}

// ---------------- OTHER VISUALS ----------------
function drawDisplacementGraph() {
  push();
  translate(430, 490);

  // Draw axes
  stroke(0);
  strokeWeight(0.5);
  line(0, 0, 0, -100); // y-axis
  line(0, 0, 250, 0);  // x-axis

  // y-axis ticks and labels
  fill(0);
  textSize(11);
  for (let i = -100; i <= 0; i += 25) {
    line(-5, i, 5, i);
    text(Math.round(map(i, -100, 0, -200, 200)), -30, i + 3);
  }

  // Draw displacement curve
  noFill();
  stroke("blue");
  beginShape();
  for (let i = 0; i < displacementHistory.length; i++) {
    let x = map(i, 0, maxHistory, 0, 250);
    let y = map(displacementHistory[i], -200, 200, 100, 0);
    vertex(x, -y);
  }
  endShape();

  // Labels
  noStroke();
  fill(0);
  text("Displacement vs Time", 70, -110);
  text("Time (frames)", 100, 30);
  rotate(-PI / 2);
  text("Displacement (px)", -10, -40);
  pop();
}

function drawDisplacementArrow() {
  let restY = spring.anchorY + spring.restLength;

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
  push();
  strokeWeight(3);

  let x = massObj.x;
  let y = massObj.centerY;
  let vel = massObj.vel;
  let k = kSlider.value();
  let m = massSlider.value();
  let stretch = massObj.y - (spring.anchorY + spring.restLength);
  let acc = -k * stretch / m;

  const vScale = 10;
  const aScale = 100;
  const accMinValue = 0.05;
  const velMinValue = 0.25;

  if (abs(vel) > velMinValue) {
    stroke("blue");
    line(x, y, x, y + vel * vScale);
    fill("blue");
    triangle(x - 5, y + vel * vScale, x + 5, y + vel * vScale, x, y + vel * vScale + (vel > 0 ? 10 : -10));
    noStroke();
    fill("blue");
    text("Velocity", x + 10, y + vel * vScale);
  }

  if (abs(acc) > accMinValue) {
    stroke("red");
    line(x, y, x, y + acc * aScale);
    fill("red");
    triangle(x - 5, y + acc * aScale, x + 5, y + acc * aScale, x, y + acc * aScale + (acc > 0 ? 10 : -10));
    noStroke();
    fill("red");
    text("Acceleration", x + 10, y + acc * aScale);
  }

  pop();
}

// ---------------- INPUT EVENTS ----------------
function mousePressed() {
  if (!running && dist(mouseX, mouseY, massObj.x, massObj.centerY) < massObj.size / 2) {
    dragging = true;
    displacementHistory = [];
  } else if (!running) {
    hint = 120;
  }
}

function mouseReleased() {
  dragging = false;
}

function keyPressed() {
  if (key === " ") {
    running = !running;
    if (running) {
      let { KE, PEe, PEg } = computeCurrentEnergy();
      totalEnergy = KE + PEe + PEg;
      heatEnergy = 0; // reset heat on start
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
    this.height;
  }
  display(massY) {
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
    this.size = 40;
    this.hookHeight = 20;
    this.hookWidth = 10;
  }
  display() {
    this.centerY = this.y + this.size / 2;
    this.centerY = max(this.centerY, 100);
    push();
    stroke(0);
    fill(0);
    rect(this.x - this.hookWidth / 2, this.centerY - this.hookHeight, this.hookWidth, this.hookHeight);
    stroke(0);
    strokeWeight(2);
    fill("#c8c8c8");
    rect(this.x - this.size / 2, this.centerY, this.size, this.size);
    pop();
  }
}
