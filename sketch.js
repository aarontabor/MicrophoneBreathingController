// In practice, these are the only objects needed for breath-controls
let controller;
let controllerSettings;

// ...However, to provide debugging output, I access fields within the controller object in this example
let mic;
let points;

// Variables used for drawing a scrolling linegraph
let xMin, xMax, yMin, yMax;

// Variables used to draw a text-based notification whenever classification event occurs
let displayText;
let fadeTimer;



function setup() {
  createCanvas(windowWidth, windowHeight);

  setupController();
  setupLineGraph();
  setupClassificationEventNotifications();
}

function setupController() {
  controllerSettings = {...defaultControllerSettings};
  // adjust settings here as necessary
  
  controller = new EventBasedController(controllerSettings); // uses defaults if omitted
}

function setupLineGraph() {
  mic = controller.microphoneStreamer.mic;
  points = new RollingWindow(10000);
  
  xMin = 0;
  xMax = 0;
  yMin = 0;
  yMax = 0.1;
}

function setupClassificationEventNotifications() {
  displayText = 'Ready...';
  fadeTimer = Date.now();
  
  ['pause', 'inhale', 'exhale', 'noise'].forEach(breathingClass => {
    controller.register(breathingClass, () => {
      displayText = breathingClass;
      fadeTimer = Date.now();
    });
  });
}

function draw() {
  clear();

  controller.update();
  points.push(mic.getLevel());
  
  drawLineGraph(25, 25, 1000, 250);
  drawClassificationText(25, 300);
  drawSettings(25, 400);  
}




function drawLineGraph(x, y, w, h) {
  drawLines(x, y, w, h);
  drawPoints(x, y, w, h);
  drawBorder(x, y, w, h);
}

function drawLines(x, y, w, h) {
  drawLine(controller.microphoneStreamer.settings.MicrophoneStreamer_InhaleThreshold, color('green'), x, y, w, h);
  drawLine(controller.microphoneStreamer.settings.MicrophoneStreamer_ExhaleThreshold, color('red'), x, y, w, h);  
}

function drawLine(_y, c, x, y, w, h) {
  let lineY = map(_y, yMin, yMax, h, 0);
  
  push();
  translate(x, y);
  fill(c);
  stroke(c);
  strokeWeight(3);
  line(0, lineY, w, lineY);
  pop();
}

function drawPoints(x, y, w, h) {
  let ps = points.timestampedValues;
  
  xMin = ps[0].t;
  xMax = ps[ps.length-1].t;
  
  push();
  translate(x, y);
  strokeWeight(5);
  stroke(0);
  fill(0);
  
  ps.forEach(({t, value}) => {
    let _x = map(t, xMin, xMax, 0, w);
    let _y = map(value, yMin, yMax, h, 0);
    point(_x, _y);
  });
  
  pop();
}

function drawBorder(x, y, w, h) {
  push();
  translate(x, y);
  fill(0, 0, 0, 0);
  stroke(128);
  strokeWeight(3);
  rect(0, 0, w, h);
}

function drawClassificationText(x, y) {
  let alpha = map(Date.now() - fadeTimer, 0, 2000, 255, 0, true);
  
  push();
  translate(x, y);
  textAlign(LEFT, TOP);
  textSize(40);
  noStroke();
  fill(0, 0, 0, alpha);
  text(displayText, 0, 0);
  pop();
  
}

function drawSettings(x, y) {
  push();
  translate(x, y);
  textAlign(LEFT, TOP);
  textSize(18);
  noStroke();
  fill(0);
  text('Settings:', 0, 0);
  text(JSON.stringify(controller.settings, null, 2), 0, 20);
  pop();
}