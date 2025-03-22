# ECS 과제 1 - Arduino Blink with p5.js Web Serial Control

## Youtube 시연 영상 (사진을 클릭하면 영상 재생)

<a href="https://youtu.be/2m6niheOZ0g">
  <img src="https://img.youtube.com/vi/2m6niheOZ0g/maxresdefault.jpg" width="600px">
</a>

---

## 개요
- 본 프로젝트는 Arduino Uno와 p5.js를 이용하여 신호등의 상태를 제어하는 시스템입니다.
- 또한 웹 UI를 통해 실시간으로 LED의 점등 시간, 밝기, 모드 등을 관리할 수 있는 시스템입니다.

---

## 주요 특징 및 기능: 
### Arduino 코드 요약 (기능 설명)

#### 📌 핵심 기능
- 신호등 제어 (LED): 빨간색, 초록색 LED가 각각 Pin 9, 10에 연결되어 있고, 이를 p5.js에서 보낸 명령에 따라 켜고 끔.
- 버튼 입력 처리: 버튼 입력을 받아 수동으로 모드 전환 가능.
- 가변저항 (Potentiometer): 아날로그 입력으로 받아 LED 밝기 조절.
- TaskScheduler 사용: `delay()` 함수 대신 비동기적으로 주기적으로 신호등 상태 전환.
- Serial 통신: p5.js에서 Web Serial로 보낸 데이터 읽고, 현재 상태에 반영.

#### 🟢 주요 흐름
- **Setup**
  - 시리얼 통신 초기화
  - LED 핀과 버튼 핀 설정
  - TaskScheduler로 주기적 작업 예약 (신호등 상태 전환)

- **Loop**
  - TaskScheduler 실행
  - Serial 입력 받기 → 특정 명령(`R`, `G`, `MODE`, `BRIGHT`) 인식해서 LED 제어

- **Interrupt**
  - 버튼 누르면 인터럽트 발생 → 현재 모드를 토글

#### 💡 핵심 포인트
> **p5.js에서 명령을 시리얼로 보내면 아두이노가 읽고 LED 상태, 밝기, 모드를 실시간으로 제어**  
> 버튼 입력으로도 하드웨어적으로 모드를 수동 변경할 수 있고, 가변저항으로 LED 밝기까지 조절 가능.

---

### p5.js 코드 요약 (기능 설명)

#### 📌 핵심 기능
- 웹 UI로 아두이노 제어: 버튼, 슬라이더, 모드 선택을 통해 LED 색상, 밝기, 모드 조정.
- Web Serial API 사용: 브라우저 → 아두이노로 실시간 시리얼 데이터 전송.
- 상태 표시: 웹 화면에서 현재 모드, 밝기, LED 상태 실시간 표시.

#### 🟢 주요 흐름
- **Setup**
  - Canvas 생성 및 UI 요소(Button, Slider, Dropdown) 배치
  - Serial 연결 버튼 → 누르면 아두이노와 시리얼 연결

- **Draw**
  - 현재 LED 상태 (Red, Green), 모드, 밝기 웹 화면에 표시
  - 아두이노로부터 들어오는 데이터 읽고 처리 가능

- **Event Handlers**
  - Red/Green 슬라이더를 움직이면: 슬라이더에 맞는 주기를 시리얼로 전송 → 아두이노에서 해당 LED 주기 변경

#### 💡 핵심 포인트
> 웹에서 직관적으로 버튼 슬라이더로 LED 상태를 조절 → Web Serial로 명령 전달 → 아두이노가 실시간으로 반영   
> Serial 연결은 Web Serial API를 사용해 크롬 브라우저에서 간편하게 가능.

---


## 하드웨어 구성 및 회로도

### 핀 구성
| 핀 번호 | 연결된 부품 | 설명 |
| --- | --- | --- |
| D9  | 빨간 LED   | PWM 제어, 밝기 조절 |
| D10 | 노란 LED   | PWM 제어, 밝기 조절 |
| D11 | 초록 LED   | PWM 제어, 밝기 조절 |
| D5  | 버튼1      | 비상 모드 |
| D6  | 버튼2      | 깜빡이 모드 |
| D7  | 버튼3      | 끄기 모드 |
| A0  | 가변저항   | LED 밝기 입력 |
| 5V/GND | 전원, 접지 | |

---

### 직접 연결한 회로

<img src="https://github.com/user-attachments/assets/033d14a0-2479-4990-b439-7b764c6d345b" width="600px">

---

### WOKWI 시뮬레이션 회로

<img src="https://github.com/user-attachments/assets/cf3a6fde-902e-4e19-87d6-eb3b5516c4b7" width="600px">


##
