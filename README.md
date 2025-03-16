# Arduino Blink with p5.js Web Serial Control

## Arduino
- Task1: Turn the LED on periodically. The period is controlled by serial input.
- Task2: Turn the LED off, initiated by Task1 after 200ms delay
- Task3: Check the serial input and apply the value, if any, to the period
- These three tasks reports their actions to the serial port.

## p5.js
- Monitors the serial messages from Arduino via Web Serial interface.
- The received messages are shown on the canvas.
- LED ON detected in the message --> Red circle
- LED OFF detected in the message --> Gray circle
- Slider is used to control the period of LED blink by sending the value through serial port.
