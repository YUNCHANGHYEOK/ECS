let port; // 시리얼 포트
let connectBtn; // 연결 버튼
let redSlider, yellowSlider, greenSlider, brightnessSlider;
let redState = 0, yellowState = 0, greenState = 0;
let modeIndicator = "NORMAL"; // 초기 모드
let brightness = 0; // LED 밝기 값

function setup() {

  //캔버스 크기 조정
  createCanvas(520, 400);
  background(220);

  port = createSerial();
  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], 9600);
  }


  connectBtn = createButton("Connect to Arduino");
  connectBtn.position(350, 60);
  connectBtn.mousePressed(connectBtnClick);

  //RED,YELLOW,GREEN 시간 조절 슬라이더
  redSlider = createSlider(500, 5000, 2000, 10);
  redSlider.position(10, 40);
  redSlider.mouseReleased(() => changeSignalTime("R", redSlider.value()));

  yellowSlider = createSlider(500, 5000, 500, 10);
  yellowSlider.position(10, 70);
  yellowSlider.mouseReleased(() => changeSignalTime("Y", yellowSlider.value()));

  greenSlider = createSlider(500, 5000, 2000, 10);
  greenSlider.position(10, 100);
  greenSlider.mouseReleased(() => changeSignalTime("G", greenSlider.value()));

  //밝기 조절 슬라이더 추가 (0 ~ 255)
  brightnessSlider = createSlider(0, 255, 100, 5);
  brightnessSlider.position(10, 130);

  textSize(18);
  fill(0);
}

function draw() {
  let n = port.available();
  if (n > 0) {
    let str = port.readUntil("\n");
    console.log("Received:", str); //데이터 확인용 로그 추가

    //LED 상태 정보 파싱
    let redMatch = str.match(/RED:(\d+)/);
    let yellowMatch = str.match(/YELLOW:(\d+)/);
    let greenMatch = str.match(/GREEN:(\d+)/);
    let modeMatch = str.match(/MODE:([A-Z]+)/);
    let brightnessMatch = str.match(/밝기:(\d+)/);

    if (redMatch) redState = parseInt(redMatch[1]);
    if (yellowMatch) yellowState = parseInt(yellowMatch[1]);
    if (greenMatch) greenState = parseInt(greenMatch[1]);
    if (modeMatch) modeIndicator = modeMatch[1];
    if (brightnessMatch) {
      brightness = parseInt(brightnessMatch[1]); 
      brightnessSlider.value(brightness); //슬라이더도 같이 움직이게 설정
    }

    console.log(`LED 상태: RED=${redState}, YELLOW=${yellowState}, GREEN=${greenState}, MODE=${modeIndicator}, 밝기=${brightness}`);
  }

  background(220);
  textSize(16);
  text("RED 시간", 10, 45);
  text("YELLOW 시간", 10, 75);
  text("GREEN 시간", 10, 105);
  text("밝기 조절", 10, 135);

  //LED 색상 변경에 따라 원 색상 변경
  let ledColor = color(100, 100, 100);
  if (redState > 0) ledColor = color(255, 0, 0, brightness);
  if (yellowState > 0) ledColor = color(255, 255, 0, brightness);
  if (greenState > 0) ledColor = color(0, 255, 0, brightness);

  
  //LED를 원으로 시각화화
  fill(ledColor);
  circle(200, 200, 50);

  fill(0);
  textSize(20);
  text("Mode: " + modeIndicator, 10, 250);
  text("밝기: " + brightness, 10, 280);

  if (!port.opened()) {
    connectBtn.html("Connect to Arduino");
  } else {
    connectBtn.html("Disconnect");
  }
}

//신호등 시간 변경
function changeSignalTime(color, value) {
  port.write(color + ":" + value + "\n");
}

//시리얼 포트 연결/해제
function connectBtnClick() {
  if (!port.opened()) {
    port.open(9600);
  } else {
    port.close();
  }
}
