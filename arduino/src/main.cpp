#include <Arduino.h>
#include <TaskScheduler.h>
#include "PinChangeInterrupt.h"

// 기본 신호등 주기 (밀리초)
int RED_TIME = 2000;
int YELLOW_TIME = 500;
int GREEN_TIME = 2000;
int GREEN_BLINK = 1000;

// LED 핀 번호
const int RED_LED = 9;
const int YELLOW_LED = 10;
const int GREEN_LED = 11;

// 버튼 핀 번호
const int BTN_EMERGENCY = 5;
const int BTN_OFF_MODE = 7;
const int BTN_BLINK_MODE = 6;

// 가변저항 핀 번호
const int POT_PIN = A0;

// 상태 변수
volatile bool isEmergency = false; // 비상 신호등 모드
volatile bool isOffMode = false; // 신호등 끄기 모드
volatile bool isBlinkMode = false; // 깜빡이 모드
unsigned long lastBlinkTime = 0; // 깜빡임 시간 기록
bool blinkState = false; // 깜빡임 상태
int brightness = 0; // 가변저항 값 저장

unsigned long lastButtonPressTime = 0; // 디바운싱용 변수


// 함수 원형 선언
bool redOE();
void redOD();
bool yellow1OE();
void yellow1OD();
bool greenOE();
void greenOD();
bool greenBlinkOE();
void greenBlinkCB();
void greenBlinkOD();
bool yellow2OE();
void yellow2OD();

void buttonISR(); // 버튼 인터럽트 처리
void offModeISR(); // 끄기 모드 ISR
void blinkModeISR(); // 깜빡이 모드 ISR

void potChangeISR(); // 가변저항 값 변화 감지 ISR
void updateBrightness(); // 가변저항 값 업데이트

// TaskScheduler 객체 생성
Scheduler ts;

// Task 객체 생성
Task red(RED_TIME, TASK_ONCE, NULL, &ts, false, redOE, redOD);
Task yellow1(YELLOW_TIME, TASK_ONCE, NULL, &ts, false, yellow1OE, yellow1OD);
Task green(GREEN_TIME, TASK_ONCE, NULL, &ts, false, greenOE, greenOD);
Task greenBlink(167, 6, greenBlinkCB, &ts, false, greenBlinkOE, greenBlinkOD);
Task yellow2(YELLOW_TIME, TASK_ONCE, NULL, &ts, false, yellow2OE, yellow2OD);
Task updateBrightnessTask(10, TASK_FOREVER, updateBrightness, &ts, true); // 10ms마다 밝기 갱신

void setup() {
  Serial.begin(9600); // 시리얼 통신 초기화
  pinMode(RED_LED, OUTPUT); // 핀 모드를 OUTPUT으로로 설정
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BTN_EMERGENCY, INPUT_PULLUP); // 내부 풀업 저항 사용(버튼이 눌리면 LOW, 떼면 HIGH)
  pinMode(BTN_OFF_MODE, INPUT_PULLUP);
  pinMode(BTN_BLINK_MODE, INPUT_PULLUP);

  attachPCINT(digitalPinToPCINT(BTN_EMERGENCY), buttonISR, CHANGE); // 버튼 인터럽트 설정(버튼이 눌리거나 떼어질 때 인터럽트 발생)
  attachPCINT(digitalPinToPCINT(BTN_OFF_MODE), offModeISR, CHANGE);
  attachPCINT(digitalPinToPCINT(BTN_BLINK_MODE), blinkModeISR, CHANGE);

  red.restartDelayed(); // Task 시작
}

// 가변저항 값 주기적 업데이트
void updateBrightness() {
  brightness = map(analogRead(POT_PIN), 0, 1023, 0, 255); // 가변저항 값 읽어서 0~255로 변환

  //현재 실행 중인 LED Task에 즉시 적용
  if (red.isEnabled()) {
    analogWrite(RED_LED, brightness);
  }
  if (yellow1.isEnabled() || yellow2.isEnabled()) {
    analogWrite(YELLOW_LED, brightness);
  }
  if (green.isEnabled()) {
    analogWrite(GREEN_LED, brightness);
  }
  if (greenBlink.isEnabled()) {
    //깜빡이는 경우에도도 현재 상태(blinkState)에 따라 밝기 적용
    analogWrite(GREEN_LED, blinkState ? brightness : 0);
  }
}

// Task 실행 함수 (각 LED 점등 및 소등)
bool redOE() { analogWrite(RED_LED, brightness); return true; } //현재 가변저항값 적용하여 LED ON
void redOD() { analogWrite(RED_LED, 0); yellow1.restartDelayed(); } //빨간색 LED 소등 후 다음 Task 실행

bool yellow1OE() { analogWrite(YELLOW_LED, brightness); return true; }
void yellow1OD() { analogWrite(YELLOW_LED, 0); green.restartDelayed(); }

bool greenOE() { analogWrite(GREEN_LED, brightness); return true; }
void greenOD() { analogWrite(GREEN_LED, 0); greenBlink.restartDelayed(); }

bool greenBlinkOE() { return true; }

//초록색 LED 깜빡이는 Task (GREEN_BLINK)
void greenBlinkCB() { 
  if (blinkState) {
    analogWrite(GREEN_LED, brightness);  // 가변저항 값 적용하여 ON
  } else {
    analogWrite(GREEN_LED, 0);           // OFF
  }
  blinkState = !blinkState;  // 상태 토글
}

void greenBlinkOD() { 
  digitalWrite(GREEN_LED, 0); // 깜빡임 종료 후 LED OFF
  yellow2.restartDelayed();   // 다음 yellow2 Task 실행
}

bool yellow2OE() { analogWrite(YELLOW_LED, brightness); return true; }
void yellow2OD() { analogWrite(YELLOW_LED, 0); red.restartDelayed(); }

void loop() {
  // 웹에서 받은 데이터 처리 (R, Y, G 시간 조절)
  if (Serial.available()) { // 시리얼 통신으로 데이터가 들어오면
    char command = Serial.read(); // 첫 글자를 읽음(R, Y, G 중 하나)
    int value = Serial.parseInt(); // 첫글자 뒤의 숫자(정수)를 읽음(시간 값)

    switch (command) {
      case 'R': RED_TIME = value; red.setInterval(RED_TIME); break; // R이면 RED_TIME을 value로 설정
      case 'Y': YELLOW_TIME = value; yellow1.setInterval(YELLOW_TIME); yellow2.setInterval(YELLOW_TIME); break; // Y면 YELLOW_TIME을 value로 설정
      case 'G': GREEN_TIME = value; green.setInterval(GREEN_TIME); break; // G면 GREEN_TIME을 value로 설정
    }
  }

  //LED 상태 반영(이 설정을 통해 현재 켜져있는 신호등의 색깔만 밝기 값을 유지시켜주고 나머지는 0으로 설정)
  int redState = (red.isEnabled()) ? brightness : 0;
  int yellowState = (yellow1.isEnabled() || yellow2.isEnabled()) ? brightness : 0;
  int greenState = (green.isEnabled() || greenBlink.isEnabled()) ? brightness : 0;

  //올바른 LED 상태 출력
  Serial.print("RED:"); Serial.print(redState); 
  Serial.print(",YELLOW:"); Serial.print(yellowState);
  Serial.print(",GREEN:"); Serial.print(greenState);
  Serial.print(",MODE:");

  if (isEmergency) Serial.print("EMERGENCY");
  else if (isBlinkMode) Serial.print("BLINKING");
  else if (isOffMode) Serial.print("OFF");
  else Serial.print("NORMAL");

  Serial.print(",밝기:");
  Serial.println(brightness);

  //신호등 기능 유지 + 밝기 적용
  if (isBlinkMode) {
    unsigned long currentMillis = millis(); // 현재 경과된 시간을 밀리초 단위로 반환
    if (currentMillis - lastBlinkTime >= 500) { // 500ms마다 깜빡임
      lastBlinkTime = currentMillis; // 현재 시간으로 갱신
      blinkState = !blinkState; // 깜빡임 상태 토글(on, off)
      analogWrite(RED_LED, blinkState ? brightness : 0);
      analogWrite(YELLOW_LED, blinkState ? brightness : 0);
      analogWrite(GREEN_LED, blinkState ? brightness : 0);
    }
  } else if (!isEmergency && !isOffMode) { // 비상 및 끄기 모드가 아닌 경우
    ts.execute(); // TaskScheduler 실행
  }
}

// 버튼 인터럽트 처리 (디바운싱 적용)
void buttonISR() {
  if (millis() - lastButtonPressTime < 200) return; // 200ms 이내에 두 번 이상 누르면 무시(디바운싱 효과)
  //버튼이 물리적으로 떨리는 현상을 방지지
  lastButtonPressTime = millis();

  noInterrupts(); //다른 인터럽트의 발생을 막음
  isEmergency = !isEmergency; //그 후 비상 모드 토글
  interrupts(); // 다시 활성화화

  if (isEmergency) {
    ts.disableAll();
    digitalWrite(RED_LED, HIGH);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
  } else {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
    red.restartDelayed();

    updateBrightnessTask.enable();
  }
}

void offModeISR() {
  if (millis() - lastButtonPressTime < 200) return;
  lastButtonPressTime = millis();

  noInterrupts();
  isOffMode = !isOffMode;
  interrupts();

  if (isOffMode) {
    ts.disableAll();
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
  } else {
    red.restartDelayed();

    updateBrightnessTask.enable();
  }
}

void blinkModeISR() {
  if (millis() - lastButtonPressTime < 200) return;
  lastButtonPressTime = millis();

  noInterrupts();
  isBlinkMode = !isBlinkMode;
  interrupts();

  if (isBlinkMode) {
    ts.disableAll();
    lastBlinkTime = millis();
    blinkState = true; //초기값을 true로 설정하여 첫 깜빡임에서 켜진 상태로 시작

    //모든 LED를 즉시 깜빡이게 설정
    analogWrite(RED_LED, brightness);
    analogWrite(YELLOW_LED, brightness);
    analogWrite(GREEN_LED, brightness);
  } else {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
    red.restartDelayed();

    updateBrightnessTask.enable();
  }
}
