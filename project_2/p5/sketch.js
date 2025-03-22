let port;
let connectBtn;
let redSlider, yellowSlider, greenSlider, brightnessSlider;
let redState = 0, yellowState = 0, greenState = 0;
let modeIndicator = "NORMAL";
let brightness = 0;

let handPose, video, hands = [];

let selectedSlider = null; // 현재 선택된 슬라이더
let selectedSliderName = ""; // 선택된 슬라이더 이름 (RED, YELLOW, GREEN)

let leftHandDetected = false;
let rightHandDetected = false;


let isConnected = false; // 연결 여부 상태 변수 추가


const videoWidth = 640;
const videoHeight = 480;
const uiWidth = 400;
const canvasWidth = videoWidth + uiWidth;
const canvasHeight = videoHeight;

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  background(220);

  initSerial(); // 시리얼 통신 초기화
  setupUI(); // UI 요소 설정
  setupHandPose(); // HandPose 설정
  setInterval(checkGesture, 100); // 손 제스처 자주 체크
}

function initSerial() {
  port = createSerial();
  console.log("Serial 객체 생성됨");

  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], 9600);
    console.log("자동으로 포트 연결됨");
    isConnected = true;  // 자동 연결되면 상태 true
  } else {
    console.log("사용 가능한 포트가 없습니다.");
    isConnected = false;
  }
}





// UI 요소 설정
function setupUI() {
  let baseX = videoWidth + 50;
  let sliderWidth = 200;

  connectBtn = createButton("🔌 Connect");
  connectBtn.position(baseX, 70);
  connectBtn.mousePressed(connectBtnClick);

  redSlider = createSlider(500, 5000, 2000, 10);
  redSlider.position(baseX, 110);
  redSlider.style('width', sliderWidth + 'px');
  redSlider.mouseReleased(() => changeSignalTime("R", redSlider.value()));

  yellowSlider = createSlider(500, 5000, 500, 10);
  yellowSlider.position(baseX, 150);
  yellowSlider.style('width', sliderWidth + 'px');
  yellowSlider.mouseReleased(() => changeSignalTime("Y", yellowSlider.value()));

  greenSlider = createSlider(500, 5000, 2000, 10);
  greenSlider.position(baseX, 190);
  greenSlider.style('width', sliderWidth + 'px');
  greenSlider.mouseReleased(() => changeSignalTime("G", greenSlider.value()));

  brightnessSlider = createSlider(0, 255, 100, 5);
  brightnessSlider.position(baseX, 230);
  brightnessSlider.style('width', sliderWidth + 'px');

  let resetBtn = createButton("🔄 Reset LED 주기");
  resetBtn.position(baseX + 50, 270);
  
  resetBtn.mousePressed(resetSliders);
}




function resetSliders() {
  // 초기 값 세팅
  redSlider.value(2000);
  yellowSlider.value(500);
  greenSlider.value(2000);

  // 아두이노로 전송
  changeSignalTime("R", 2000);
  changeSignalTime("Y", 500);
  changeSignalTime("G", 2000);

  console.log(">>> LED 주기 원상 복구 완료");
}



// HandPose 설정
function setupHandPose() {
  //웹캠으로부터 실시간 영상을 가져오고 나서서 좌우반전 처리
  video = createCapture(VIDEO, { flipped: true }); 
  video.size(videoWidth, videoHeight);
  video.hide();
  handPose.detectStart(video, gotHands);
}

function draw() {
  background(220);

  image(video, 0, 0, videoWidth, videoHeight);

  // ==== 손 keypoints 점 + 라인 표시 ====
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];

    // 주황색 점 찍기
    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      fill(255, 165, 0); // 주황색 점
      noStroke();
      circle(videoWidth - keypoint.x, keypoint.y, 10);
    }

    // 손가락별 색상
    let fingerColors = {
      thumb: color(255, 0, 0),      // 빨강
      index: color(0, 255, 0),      // 초록
      middle: color(0, 0, 255),     // 파랑
      ring: color(255, 255, 0),     // 노랑
      pinky: color(255, 0, 255)     // 보라
    };

    // 손가락별 keypoint 분류
    let fingers = {
      thumb: [],
      index: [],
      middle: [],
      ring: [],
      pinky: []
    };

    for (let j = 0; j < hand.keypoints.length; j++) {
      let k = hand.keypoints[j];
      if (k.name.includes("thumb")) fingers.thumb.push(k);
      else if (k.name.includes("index")) fingers.index.push(k);
      else if (k.name.includes("middle")) fingers.middle.push(k);
      else if (k.name.includes("ring")) fingers.ring.push(k);
      else if (k.name.includes("pinky")) fingers.pinky.push(k);
    }

    // 손목 찾기
    let wrist = hand.keypoints.find(k => k.name === "wrist");

    // 손목 → 손가락 첫 관절 연결
    for (let finger in fingers) {
      stroke(fingerColors[finger]);
      strokeWeight(2);

      if (wrist && fingers[finger].length > 0) {
        line(videoWidth - wrist.x, wrist.y, videoWidth - fingers[finger][0].x, fingers[finger][0].y);
      }
    }

    // 손가락 관절 연결
    for (let finger in fingers) {
      let points = fingers[finger];
      stroke(fingerColors[finger]);
      strokeWeight(2);

      for (let j = 0; j < points.length - 1; j++) {
        line(videoWidth - points[j].x, points[j].y, videoWidth - points[j + 1].x, points[j + 1].y);
      }
    }
  }

  // ==== 기존 UI, LED, 모드 표시 ====
  readSerialData();
  drawUI();
  drawLED();
  drawMode();
  updateConnectButton();
  drawSliderSelectionFeedback();
  displayHandStatus();
  displayConnectionStatus(); // 연결 상태 표시 함수 호출


  // 모드 표시 (NORMAL 제외)
  if (modeIndicator !== "NORMAL") {
    textSize(20);
    textAlign(CENTER, TOP);
    textStyle(BOLD);
    stroke(0);
    strokeWeight(4); // 테두리 두껍게

    // 모드별 색상
    if (modeIndicator === "EMERGENCY") {
      fill(255, 255, 0); // 노란색
    } else if (modeIndicator === "BLINKING") {
      fill(0, 0, 255);   // 파란색
    } else if (modeIndicator === "OFF") {
      fill(255, 0, 0);   // 빨강
    }

    text(`현재 모드: ${modeIndicator}`, videoWidth / 2, 20);
    noStroke();
  }
  
}

function displayConnectionStatus() {
  textSize(16);
  fill(0);
  textAlign(LEFT, TOP);
  
  if (isConnected) {
    text("✅ Arduino 연결 중", videoWidth + 30, 30);
  } else {
    text("❌ Arduino 연결 해제됨", videoWidth + 30, 30);
  }
}



/* ========== 기능별 함수 ========== */

// 시리얼 데이터 읽기
function readSerialData() {
  let n = port.available();
  if (n > 0) {
    let str = port.readUntil("\n");

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
      brightnessSlider.value(brightness);
    }
  }
}

// 슬라이더, 텍스트 출력
function drawUI() {
  let baseX = videoWidth + 30;

  fill(240);
  stroke(180);
  rect(baseX - 20, 80, 260, 230, 15); // 높이, 폭 조정 (230)

  noStroke();
  fill(0);
  textSize(14);
  textAlign(LEFT, CENTER);

  text("🔴 RED 시간", baseX, 120 - 10);
  text("🟡 YELLOW 시간", baseX, 160 - 10);
  text("🟢 GREEN 시간", baseX, 200 - 10);
  text("💡 밝기 조절", baseX, 240 - 10);
}




// LED 원 출력
function drawLED() {
  let ledColor = color(100, 100, 100);
  if (redState > 0) ledColor = color(255, 0, 0, brightness);
  if (yellowState > 0) ledColor = color(255, 255, 0, brightness);
  if (greenState > 0) ledColor = color(0, 255, 0, brightness);

  fill(ledColor);
  circle(videoWidth + 70, 280, 30); // Reset 버튼 옆
}



// 모드, 밝기 표시
function drawMode() {
  let baseX = videoWidth + 100;
  textSize(18);
  textAlign(LEFT, TOP);

  // 모드 색상 원
  let modeColor;
  if (modeIndicator === "NORMAL") modeColor = color(0);
  else if (modeIndicator === "OFF") modeColor = color(255, 0, 0);
  else if (modeIndicator === "BLINKING") modeColor = color(0, 0, 255);
  else if (modeIndicator === "EMERGENCY") modeColor = color(255, 165, 0);
  else modeColor = color(100);

  fill(modeColor);
  circle(baseX - 40, 360, 20);

  // 모드 텍스트
  fill(0);
  let modeText = "Mode: " + modeIndicator;
  text(modeText, baseX - 10, 350);

  // 밝기 텍스트
  text("밝기: " + brightness, baseX, 380);

  // 모드가 NORMAL이 아니면 박스 표시
  if (modeIndicator !== "NORMAL") {
    let boxWidth = textWidth(modeText) + 10; // 글씨 길이에 맞게 + 약간 패딩
    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    rect(baseX - 15, 348, boxWidth, 30, 5); // 정확히 글씨 길이 맞춤
    noStroke();
  }
}




// 연결 버튼 상태 업데이트
function updateConnectButton() {
  if (!port.opened()) {
    connectBtn.html("Connect to Arduino");
  } else {
    connectBtn.html("Disconnect");
  }
}

// 신호등 시간 변경
function changeSignalTime(color, value) {
  port.write(color + ":" + value + "\n");
  console.log("보낸 값:", color + ":" + value);
}

//시리얼 포트 연결/해제
function connectBtnClick() {
  if (!port.opened()) { 
    // 연결 안 돼 있을 때 열기
    port.open(9600);
    isConnected = true;
    console.log("포트 연결됨");
  } else {
    // 연결돼 있을 때 닫기
    port.close();
    isConnected = false;
    console.log("포트 연결 해제됨");
  }
}



// HandPose 손 인식 콜백
function gotHands(results) {
  hands = results;
}

let currentMode = "NORMAL"; // 초기 상태 NORMAL

function updateMode(newMode) {
  port.write("MODE:" + newMode + "\n");
  currentMode = newMode;
  modeIndicator = newMode;
  console.log(">>> 현재 모드: " + newMode);
}

function checkGesture() {
  leftHandDetected = false;
  rightHandDetected = false;
  let leftExtendedFingers = 0;
  let rightExtendedFingers = 0;
  let rightIndexTip = null;
  let rightIndexPIP = null;

  // =========================
  // 손 감지 루프
  // =========================
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    let actualHand = (hand.handedness === "Left") ? "Right" : "Left";

    // 왼손 처리
    // y축 기준으로 tip(끝)이 pip(중간)보다 10px 이상 위에 있으면 펼쳐진 것으로 판단
    //엄지는 접혀있거나 각도에 따라 인식이 어려워 제외
    if (actualHand === "Left") {
      leftHandDetected = true;
      let fingers = ["index", "middle", "ring", "pinky"];
      leftExtendedFingers = 0;
      fingers.forEach(finger => {
        let tip = hand.keypoints.find(k => k.name === `${finger}_finger_tip`);
        let pip = hand.keypoints.find(k => k.name === `${finger}_finger_pip`);
        if (tip && pip && tip.y < pip.y - 10) {
          leftExtendedFingers++;
        }
      });

      // 슬라이더 선택
      if (leftExtendedFingers === 1) {
        selectedSlider = redSlider;
        selectedSliderName = "RED";
      } else if (leftExtendedFingers === 2) {
        selectedSlider = yellowSlider;
        selectedSliderName = "YELLOW";
      } else if (leftExtendedFingers === 3) {
        selectedSlider = greenSlider;
        selectedSliderName = "GREEN";
      } else {
        selectedSlider = null;
        selectedSliderName = "";
      }
    }

    // 오른손 처리
    if (actualHand === "Right") {
      rightHandDetected = true;
      let fingers = ["thumb", "index", "middle", "ring", "pinky"];
      rightExtendedFingers = 0;

      fingers.forEach(finger => {
        let tip = hand.keypoints.find(k => k.name === `${finger}_finger_tip`);
        let pip = hand.keypoints.find(k => k.name === `${finger}_finger_pip`);
        if (tip && pip && tip.y < pip.y - 10) {
          rightExtendedFingers++;
        }
      });

      rightIndexTip = hand.keypoints.find(k => k.name === "index_finger_tip");
      rightIndexPIP = hand.keypoints.find(k => k.name === "index_finger_pip");
    }
  }

  // =========================
  // 양손 감지 → NORMAL 강제 복귀
  // =========================
  if (leftHandDetected && rightHandDetected && currentMode !== "NORMAL") {
    updateMode("NORMAL");
  }

  // =========================
  // 모드 변경 → 오른손만 감지될 때만
  // =========================
  if (rightHandDetected && !leftHandDetected) {
    if (rightExtendedFingers === 4 && currentMode !== "BLINKING") {
      updateMode("BLINKING");
    } else if (rightExtendedFingers === 3 && currentMode !== "EMERGENCY") {
      updateMode("EMERGENCY");
    } else if (rightExtendedFingers === 2 && currentMode !== "OFF") {
      updateMode("OFF");
    } 
    // 5개 펼치거나, 0~1개 → NORMAL
    else if ((rightExtendedFingers === 5 || rightExtendedFingers <= 1) && currentMode !== "NORMAL") {
      updateMode("NORMAL");
    }
  }
  

  // =========================
  // 양손 모두 감지 안됐을 때 → NORMAL 복귀
  // (이미 양손 조건 위에서 체크했으니, 양손 모두 감지 안 됨 처리만)
  // =========================
  if (!leftHandDetected && !rightHandDetected && currentMode !== "NORMAL") {
    updateMode("NORMAL");
  }

  // =========================
  // 슬라이더 조절은 양손 감지 시에만
  // =========================
  if (selectedSlider && leftHandDetected && rightHandDetected) {
    if (rightIndexTip && rightIndexPIP) {
      let prevValue = selectedSlider.value();

      if (rightIndexTip.y < rightIndexPIP.y - 20) {
        selectedSlider.value(selectedSlider.value() + 50);
      } else if (rightIndexTip.y > rightIndexPIP.y + 20) {
        selectedSlider.value(selectedSlider.value() - 50);
      }

      if (selectedSlider.value() !== prevValue) {
        if (selectedSlider === redSlider) {
          changeSignalTime("R", redSlider.value());
        } else if (selectedSlider === yellowSlider) {
          changeSignalTime("Y", yellowSlider.value());
        } else if (selectedSlider === greenSlider) {
          changeSignalTime("G", greenSlider.value());
        }
      }
    }
  }
}



// 선택된 슬라이더 강조 표시
function drawSliderSelectionFeedback() {
  strokeWeight(3);
  noFill();
  stroke(0, 255, 255);

  let boxX = videoWidth + 45;
  let boxWidth = 210; // 슬라이더 width + padding 감안
  let boxHeight = 30;

  if (selectedSlider === redSlider) {
    rect(boxX, 95, boxWidth, boxHeight);
  } else if (selectedSlider === yellowSlider) {
    rect(boxX, 135, boxWidth, boxHeight);
  } else if (selectedSlider === greenSlider) {
    rect(boxX, 175, boxWidth, boxHeight);
  }

  noStroke();
}


// 손 상태 표시
function displayHandStatus() {
  if (!leftHandDetected && !rightHandDetected) {
    return;
  }

  textSize(26);
  textAlign(CENTER);
  textStyle(BOLD); // 글씨 두껍게!

  stroke(0); // 검은 테두리
  strokeWeight(3); // 테두리 두께 살짝 더 두껍게

  fill(255); // 흰색 글씨
  if (leftHandDetected && rightHandDetected) {
    text("양손 감지됨", videoWidth / 2, 50);
  } else if (leftHandDetected) {
    text("왼손 감지됨", videoWidth / 2, 50);
  } else if (rightHandDetected) {
    text("오른손 감지됨", videoWidth / 2, 50);
  }

  noStroke(); // 다음 UI 영향 없도록 해제

  // 선택된 슬라이더 이름 표시 (그대로 유지)
  if (selectedSliderName !== "" && leftHandDetected) {
    textSize(20);
    textStyle(BOLD);
    stroke(0);
    strokeWeight(2);

    if (selectedSliderName === "RED") fill(255, 0, 0);
    else if (selectedSliderName === "YELLOW") fill(255, 255, 0);
    else if (selectedSliderName === "GREEN") fill(0, 255, 0);
    text(`현재 조절: ${selectedSliderName} LED`, videoWidth / 2, 90);

    noStroke();
  }
}

