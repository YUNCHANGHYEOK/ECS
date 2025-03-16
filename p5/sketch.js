let port;
let connectBtn;
let slider;
let circleColor = 'gray';
let period = 2000; // default period

function setup() {
  createCanvas(520, 300); //width, height
  background('220');

  port = createSerial(); // web serial control object

  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], 9600);
  }

  // Web serial connect button setting
  connectBtn = createButton("Connect to Arduino");
  connectBtn.position(350, 60);
  connectBtn.mousePressed(connectBtnClick);

  // Create a slider and place it at the top of the canvas.
  slider = createSlider(500, 5000, period, 10);
  slider.position(10, 10);
  slider.size(500); // Set the width of the slider
  slider.mouseReleased(changeSlider); 

  textSize(18);
  fill(0);
}

function draw() {
  let n = port.available(); 
  if (n > 0) {
    let str = port.readUntil("\n"); 
    background(220);
    fill(0);
    text("msg: " + str, 10, 200);
    
    // Check for LED ON/OFF messages
    if (str.includes("LED ON")) {
      circleColor = 'red';
    } else if (str.includes("LED OFF")) {
      circleColor = 'gray';
    }
  }

  // Draw the circle
  fill(circleColor);
  circle(100, 100, 50); // Centered circle with diameter 50

  // Change button label based on connection status
  if (!port.opened()) {
    connectBtn.html("Connect to Arduino");
  } else {
    connectBtn.html("Disconnect");
  }

  fill(0);
  text("Period: " + period, 10, 250);
}

function connectBtnClick() {
  if (!port.opened()) {
    port.open(9600);
  } else {
    port.close();
  }
}

function changeSlider() {
  period = String(slider.value());
  port.write(period + "\n");
}
