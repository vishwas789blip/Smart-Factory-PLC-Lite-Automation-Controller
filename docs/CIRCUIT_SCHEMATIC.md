# Smart Factory PLC-Lite Automation Controller
## Step 2 & 10: Circuit Schematic, Wiring & Hardware Calibration Guide
**Prepared for:** HCLTech BTech Embedded Systems & IoT Curriculum  
**EDA Software:** EasyEDA / KiCad Compatible  
**Target Hardware:** ESP32 DevKit v1 (30-Pin NodeMCU ESP-WROOM-32)  
**Version:** 1.0 | Date: November 2026  

---

### 1. Complete GPIO Pin Allocation Table

| Pin No | Pin Name | Peripheral | Hardware Component | Mode / Type | Electrical Characteristics |
|---|---|---|---|---|---|
| **P1** | **GPIO 4** | Digital I/O | **DHT22** (Temp & Humidity) | Input (Internal Pullup) | 3.3V Logic, Single-Bus Protocol |
| **P2** | **GPIO 32** | ADC1_CH4 | **ACS712-30A** (Current Sensor) | Analog Input | 12-Bit ADC (0–4095), 0–3.3V Scaled |
| **P3** | **GPIO 34** | ADC1_CH6 | **MQ-135** (Air Quality / Gas) | Analog Input | 12-Bit ADC (Input-Only Pin, No Pullup) |
| **P4** | **GPIO 35** | ADC1_CH7 | **SW-420** (Vibration / Tilt) | Analog/Digital Input | 12-Bit ADC, High-Sensitivity Piezo |
| **P5** | **GPIO 16** | Digital Output | **Relay 1: Auxiliary Fan** | Output (Active LOW) | Optocoupled 5V Relay, Inverted Logic |
| **P6** | **GPIO 17** | Digital Output | **Relay 2: Conveyor Motor**| Output (Active LOW) | Optocoupled 5V Relay, Inverted Logic |
| **P7** | **GPIO 18** | Digital Output | **Relay 3: Solenoid Valve** | Output (Active LOW) | Optocoupled 5V Relay, Inverted Logic |
| **P8** | **GPIO 19** | Digital Output | **High-Frequency Buzzer** | Output (Active HIGH) | 5V Piezo Alarm Buzzer via Transistor |
| **P9** | **GPIO 2** | On-board LED | **System Status Indicator** | Output (Active HIGH) | Blue Status LED (Solid = MQTT OK) |
| **P10**| **GPIO 21** | I2C SDA | **0.96" SSD1306 OLED** | Bidirectional Data | 3.3V Logic, 4.7kΩ Pull-up Resistors |
| **P11**| **GPIO 22** | I2C SCL | **0.96" SSD1306 OLED** | Clock Output | 400 kHz Fast I2C Clock |
| **P12**| **VIN** | Power In | **External 5V 2A DC Supply**| Power Rail | Supplies 5V to Relays, MQ-135, ACS712 |
| **P13**| **3V3** | Power Out | **ESP32 LDO Regulator** | Power Rail | Powers DHT22, SSD1306, ESP32 Core |
| **P14**| **GND** | Ground | **Common System Ground** | Ground Plane | Star-ground topology to eliminate noise |

> [!IMPORTANT]
> **Why ADC1 Pins (GPIO 32, 34, 35) Were Selected:**  
> On the ESP32, **ADC2 is shared with the Wi-Fi driver**. If analog sensors are mapped to ADC2 (GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27), any reading during active Wi-Fi transmission returns `NULL` or causes a panic reset. Mapping all analog sensors exclusively to **ADC1** guarantees 100% stable sampling even under continuous MQTT Wi-Fi streaming.

---

### 2. EasyEDA Circuit Schematic Netlist & Wiring Diagram

```
                 +--------------------------------------------------------+
                 |                 5V 2A DC POWER SUPPLY                  |
                 +-----------+--------------------------------+-----------+
                             | +5V                            | GND
                             |                                |
         +-------------------+--------------------------------+-------------------+
         |                   |                                |                   |
         |                   v                                v                   |
         |          +-----------------+              +-----------------+          |
         |          |   RELAY MODULE  |              |  MQ-135 SENSOR  |          |
         |          |  VCC: 5V        |              |  VCC: 5V        |          |
         |          |  GND: GND       |              |  GND: GND       |          |
         |          |  IN1 <- GPIO 16 |              |  AOUT-> GPIO 34 |          |
         |          |  IN2 <- GPIO 17 |              +-----------------+          |
         |          |  IN3 <- GPIO 18 |                                           |
         |          +-----------------+              +-----------------+          |
         |                                           | ACS712 CURRENT  |          |
         |                                           |  VCC: 5V        |          |
         |                                           |  GND: GND       |          |
         |                                           |  OUT -> GPIO 32 |          |
         |                                           +--------+--------+          |
         |                                                    | (Resistor Divider)|
         |                                                    v                   |
         |                 +--------------------------------------+               |
         |                 |         ESP32 DEVKIT V1              |               |
         |                 |                                      |               |
         |                 |  VIN <-------------------------------+ 5V            |
         +---------------->|  GND <-------------------------------+ GND           |
                           |  3V3 ----+                                           |
                           |          |                                           |
                           |  GPIO 4  |<-- DATA (DHT22 Temp & Humidity)           |
                           |  GPIO 35 |<-- AOUT (SW-420 Vibration Sensor)         |
                           |  GPIO 19 |---> BASE (2N2222 -> Buzzer)               |
                           |  GPIO 2  |---> STATUS LED                            |
                           |  GPIO 21 |<--> SDA (SSD1306 0.96" OLED Display)      |
                           |  GPIO 22 |----> SCL (SSD1306 0.96" OLED Display)     |
                           +--------------------------------------+               |
                                      | 3V3                   | GND               |
                                      v                       v                   |
                             +-----------------+     +-----------------+          |
                             |  DHT22 SENSOR   |     |  SSD1306 OLED   |          |
                             |  VCC: 3.3V      |     |  VCC: 3.3V      |          |
                             |  GND: GND       |     |  GND: GND       |          |
                             +-----------------+     +-----------------+          |
                                                                                  |
```

---

### 3. Sensor Calibration & Mathematical Transformations

#### 3.1 DHT22 (Digital Temperature & Relative Humidity)
- **Principle:** Capacitive humidity sensing element + NTC thermistor with custom single-bus digital communication.
- **Conversion Equation:**
  $$\text{Temperature } (^\circ\text{C}) = \frac{\text{MSB} \times 256 + \text{LSB}}{10}$$
  $$\text{Humidity } (\% \text{ RH}) = \frac{\text{MSB} \times 256 + \text{LSB}}{10}$$
- **Firmware Calibration:** If error occurs due to long lead wires (> 1 meter), a 4.7 kΩ pull-up resistor is placed between 3.3V and DATA pin.

#### 3.2 ACS712-30A (Hall-Effect Current Sensor)
- **Principle:** Linear Hall IC with copper conduction path. Output voltage is centered at $V_{CC} / 2$ ($2.5\text{V}$ for 5V excitation) at 0 Amps.
- **Resistor Voltage Divider (5V to 3.3V):**
  To protect the ESP32 3.3V ADC, a voltage divider with $R_1 = 1.0\text{ k}\Omega$ and $R_2 = 2.0\text{ k}\Omega$ scales the output:
  $$V_{\text{ADC}} = V_{\text{sensor}} \times \frac{R_2}{R_1 + R_2} = V_{\text{sensor}} \times \frac{2}{3}$$
- **Current Transformation Equation:**
  $$I_{\text{RMS}} = \frac{|V_{\text{sensor}} - 2.50\text{V}|}{\text{Sensitivity}} = \frac{|V_{\text{sensor}} - 2.50\text{V}|}{0.066\text{ V/A}}$$

#### 3.3 SW-420 (Vibration Velocity & Severity — ISO 10816 Standard)
- **Principle:** High-sensitivity roller-ball & piezoelectric element producing voltage spikes proportional to mechanical vibration velocity.
- **Sampling & RMS Integration:**
  Raw 12-bit ADC samples ($x_i \in [0, 4095]$) are converted to velocity $v_i$ and integrated over a 100 ms window:
  $$V_{\text{RMS}} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} \left( v_i - \bar{v} \right)^2}$$
- **ISO 10816 Alarm Bands:**
  - $0.0 - 2.8\text{ mm/s}$: **Zone A/B (Good / Normal)**
  - $2.8 - 4.5\text{ mm/s}$: **Zone C (Restricted Operation / Warning)**
  - $> 4.5\text{ mm/s}$: **Zone D (Critical Vibration / Immediate Stop)**

#### 3.4 MQ-135 (Air Quality & Harmful Gas Concentration)
- **Principle:** $\text{SnO}_2$ gas-sensitive semiconductor whose surface resistance $R_s$ drops in the presence of $\text{CO}_2$, $\text{NH}_3$, or smoke.
- **Calibration Ratio:**
  $$R_s = \left( \frac{V_{CC} - V_{\text{RL}}}{V_{\text{RL}}} \right) \times R_L$$
  $$\text{PPM} = A \times \left( \frac{R_s}{R_0} \right)^B$$
  *(Where $R_0$ is sensor resistance in clean ambient air calibrated to $10.0\text{ k}\Omega$, $A = 110.47$, $B = -2.862$)*.

---

### 4. Actuator Driver & Protection Circuitry
1. **Optocoupler Isolation (PC817):**
   Industrial relay coils introduce inductive flyback spikes when switched off. The 4-channel relay board features optical isolation, separating the ESP32 3.3V logic circuit from the 5V relay electromagnetic coils.
2. **Flyback Diodes (1N4007):**
   Reverse-biased diodes are placed across each relay coil to clamp back-EMF spikes ($\Delta V = -L \frac{di}{dt}$), protecting the driving switching transistors.
3. **Active-LOW Inversion:**
   Relay coils energize when the input pin is driven **LOW (`0V`)** and de-energize when driven **HIGH (`3.3V`)**. The firmware initializes pins to `HIGH` immediately upon booting to guarantee all high-power loads remain safe during restart.
