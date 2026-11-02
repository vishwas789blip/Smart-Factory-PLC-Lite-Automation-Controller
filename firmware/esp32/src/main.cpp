/**
 * @file main.cpp
 * @brief Smart Factory PLC-Lite Edge Controller Firmware
 * @author BTech IoT Team (HCLTech Curriculum Project P_180)
 * @version 2.1.0-hcltech
 * 
 * Hardware: ESP32 DevKit v1 + Multi-Sensor Shield + 4-Channel Relay Module
 * Protocols: MQTT (HiveMQ), HTTP, Wi-Fi 802.11 b/g/n, I2C
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <esp_task_wdt.h>
#include "config.h"

// Hardware instances
DHT dht(PIN_DHT22, DHT22);
Adafruit_SSD1306 display(128, 64, &Wire, -1);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Moving average circular buffers for sensor noise filtering
float tempBuffer[MOVING_AVG_SAMPLES] = {0};
float vibeBuffer[MOVING_AVG_SAMPLES] = {0};
float currentBuffer[MOVING_AVG_SAMPLES] = {0};
int filterIndex = 0;
bool bufferFilled = false;

// Actuator states
bool stateFan = false;
bool stateConveyor = true;
bool stateValve = false;

// Timers
unsigned long lastTelemetryTime = 0;
unsigned long lastDisplayTime = 0;
unsigned long lastWifiRetryTime = 0;

// Function Prototypes
void setupHardware();
void setupWiFi();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void readSensors(float &temp, float &humidity, float &vibration, float &current, float &gas);
float calculateMovingAverage(float* buffer, float newValue);
void checkEdgeSafetyInterlocks(float temp, float vibe, float current);
void publishTelemetry(float temp, float hum, float vibe, float curr, float gas);
void publishAlert(const char* type, const char* message, const char* severity, float value, float threshold);
void updateOLED(float temp, float vibe, bool mqttOk);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("\n========================================================"));
  Serial.println(F("  SMART FACTORY PLC-LITE CONTROLLER (HCLTECH ED.)      "));
  Serial.println(F("  Firmware: v2.1.0 | Target: ESP32-WROOM-32             "));
  Serial.println(F("========================================================"));

  // Initialize Hardware Peripherals
  setupHardware();

  // Initialize Watchdog Timer (15 seconds timeout)
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = WATCHDOG_TIMEOUT_SEC * 1000,
    .idle_core_mask = (1 << 0),
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL); // Add current task to WDT

  // Initialize Network Connections
  setupWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1024);

  Serial.println(F("[SYSTEM] Initialization Complete. Entering Main Loop."));
}

void loop() {
  // Feed Watchdog Timer
  esp_task_wdt_reset();

  // Maintain WiFi Connection
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_LED_STATUS, LOW);
    if (millis() - lastWifiRetryTime > 5000) {
      lastWifiRetryTime = millis();
      Serial.println(F("[WIFI] Reconnecting to network..."));
      WiFi.reconnect();
    }
  } else {
    // Maintain MQTT Broker Connection
    if (!mqttClient.connected()) {
      digitalWrite(PIN_LED_STATUS, LOW);
      reconnectMQTT();
    } else {
      digitalWrite(PIN_LED_STATUS, HIGH);
      mqttClient.loop();
    }
  }

  // Sample sensors, compute moving average, and publish telemetry
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    float rawTemp, rawHum, rawVibe, rawCurr, rawGas;
    readSensors(rawTemp, rawHum, rawVibe, rawCurr, rawGas);

    // Apply 10-sample moving average filter to remove electronic jitter
    float filteredTemp = calculateMovingAverage(tempBuffer, rawTemp);
    float filteredVibe = calculateMovingAverage(vibeBuffer, rawVibe);
    float filteredCurr = calculateMovingAverage(currentBuffer, rawCurr);

    // Execute edge-side safety interlocks (Autonomous response)
    checkEdgeSafetyInterlocks(filteredTemp, filteredVibe, filteredCurr);

    // Publish telemetry over MQTT
    if (mqttClient.connected()) {
      publishTelemetry(filteredTemp, rawHum, filteredVibe, filteredCurr, rawGas);
    }

    // Refresh Local OLED SCADA Screen every 1 second
    updateOLED(filteredTemp, filteredVibe, mqttClient.connected());
  }
}

// ========================================================
// Peripherals Initialization
// ========================================================
void setupHardware() {
  // Actuator Relays (Active LOW for standard industrial relay boards)
  pinMode(PIN_RELAY_FAN, OUTPUT);
  pinMode(PIN_RELAY_CONVEYOR, OUTPUT);
  pinMode(PIN_RELAY_VALVE, OUTPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // Initial State: Safe Default
  digitalWrite(PIN_RELAY_FAN, HIGH);      // OFF
  digitalWrite(PIN_RELAY_CONVEYOR, LOW);  // ON (Conveyor running)
  digitalWrite(PIN_RELAY_VALVE, HIGH);    // CLOSED
  digitalWrite(PIN_LED_STATUS, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Sensors
  dht.begin();
  pinMode(PIN_MQ135, INPUT);
  pinMode(PIN_VIBRATION, INPUT);
  pinMode(PIN_CURRENT_ACS712, INPUT);

  // Initialize I2C OLED
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(F("PLC-LITE BOOTING..."));
    display.println(F("Firmware: v2.1.0"));
    display.println(F("HCLTech Project P_180"));
    display.display();
  }
}

// ========================================================
// Wi-Fi Connection Management
// ========================================================
void setupWiFi() {
  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 8000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! IP: %s | RSSI: %d dBm\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println(F("\n[WIFI] Connection pending. Retrying in background loop."));
  }
}

// ========================================================
// MQTT Connection Management with LWT
// ========================================================
void reconnectMQTT() {
  static unsigned long lastConnectAttempt = 0;
  if (millis() - lastConnectAttempt < 4000) return;
  lastConnectAttempt = millis();

  Serial.printf("[MQTT] Connecting to %s:%d...\n", MQTT_BROKER, MQTT_PORT);

  // Last Will and Testament (LWT) payload for fault detection
  StaticJsonDocument<128> lwtDoc;
  lwtDoc["deviceId"] = DEVICE_ID;
  lwtDoc["status"] = "OFFLINE";
  lwtDoc["reason"] = "Connection Loss / Power Cycle";
  char lwtBuffer[128];
  serializeJson(lwtDoc, lwtBuffer);

  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS, TOPIC_STATUS, 1, true, lwtBuffer)) {
    Serial.println(F("[MQTT] Broker Connected!"));

    // Publish online status retained
    StaticJsonDocument<128> statusDoc;
    statusDoc["deviceId"] = DEVICE_ID;
    statusDoc["status"] = "ONLINE";
    statusDoc["firmware"] = FIRMWARE_VERSION;
    statusDoc["ip"] = WiFi.localIP().toString();
    char statusBuf[128];
    serializeJson(statusDoc, statusBuf);
    mqttClient.publish(TOPIC_STATUS, statusBuf, true);

    // Subscribe to actuator control commands
    mqttClient.subscribe(TOPIC_CONTROL, 1);
    Serial.printf("[MQTT] Subscribed to %s\n", TOPIC_CONTROL);
  } else {
    Serial.printf("[MQTT] Connection failed, rc=%d. Will retry in 4s.\n", mqttClient.state());
  }
}

// ========================================================
// MQTT Command Callback Handler
// ========================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
    return;
  }

  const char* action = doc["action"]; // "TURN_ON" | "TURN_OFF" | "SET_VALUE"
  const char* target = doc["target"]; // "FAN" | "CONVEYOR" | "VALVE"

  Serial.printf("[CMD] Received: Target=%s Action=%s\n", target, action);

  if (strcmp(target, "FAN") == 0) {
    stateFan = (strcmp(action, "TURN_ON") == 0);
    digitalWrite(PIN_RELAY_FAN, stateFan ? LOW : HIGH); // Active LOW
  } else if (strcmp(target, "CONVEYOR") == 0) {
    stateConveyor = (strcmp(action, "TURN_ON") == 0);
    digitalWrite(PIN_RELAY_CONVEYOR, stateConveyor ? LOW : HIGH);
  } else if (strcmp(target, "VALVE") == 0) {
    stateValve = (strcmp(action, "TURN_ON") == 0);
    digitalWrite(PIN_RELAY_VALVE, stateValve ? LOW : HIGH);
  }
}

// ========================================================
// Sensor Reading & Calibration
// ========================================================
void readSensors(float &temp, float &humidity, float &vibration, float &current, float &gas) {
  // 1. Temperature & Humidity from DHT22
  temp = dht.readTemperature();
  humidity = dht.readHumidity();
  if (isnan(temp)) temp = 28.5f; // Fallback safe reading
  if (isnan(humidity)) humidity = 55.0f;

  // 2. Vibration from Analog Accelerometer / Piezo (0-4095 ADC)
  int rawVibe = analogRead(PIN_VIBRATION);
  // Convert 12-bit ADC reading to RMS velocity in mm/s (0.0 - 10.0 mm/s)
  vibration = (rawVibe / 4095.0f) * 10.0f;

  // 3. Current from ACS712-30A (Sensitivity = 66 mV / A, VCC = 3.3V ADC mapped)
  int rawCurr = analogRead(PIN_CURRENT_ACS712);
  float voltage = (rawCurr / 4095.0f) * 3.3f;
  current = abs((voltage - 1.65f) / 0.066f); // Bi-directional Hall-effect zero offset

  // 4. Gas / Air Quality from MQ-135
  int rawGas = analogRead(PIN_MQ135);
  gas = (rawGas / 4095.0f) * 1000.0f; // Scale to approximate PPM
}

// ========================================================
// 10-Sample Moving Average Filter
// ========================================================
float calculateMovingAverage(float* buffer, float newValue) {
  buffer[filterIndex] = newValue;
  float sum = 0.0f;
  int count = bufferFilled ? MOVING_AVG_SAMPLES : (filterIndex + 1);
  for (int i = 0; i < count; i++) {
    sum += buffer[i];
  }
  return sum / count;
}

// ========================================================
// Edge-Side Safety Logic & Threshold Checking
// ========================================================
void checkEdgeSafetyInterlocks(float temp, float vibe, float current) {
  filterIndex = (filterIndex + 1) % MOVING_AVG_SAMPLES;
  if (filterIndex == 0) bufferFilled = true;

  // 1. High Temperature Emergency Interlock
  if (temp > THRESHOLD_TEMP_ALERT) {
    if (!stateFan) {
      Serial.println(F("[SAFETY] Over-temperature detected! Triggering Auxiliary Cooling Fan autonomously."));
      stateFan = true;
      digitalWrite(PIN_RELAY_FAN, LOW); // Turn on fan
      digitalWrite(PIN_BUZZER, HIGH);   // Sound warning
      publishAlert("OVER_TEMPERATURE", "Edge Controller triggered auxiliary fan", "HIGH", temp, THRESHOLD_TEMP_ALERT);
    }
  } else if (temp < (THRESHOLD_TEMP_ALERT - 5.0f) && stateFan) {
    // 5-degree hysteresis
    stateFan = false;
    digitalWrite(PIN_RELAY_FAN, HIGH);
    digitalWrite(PIN_BUZZER, LOW);
  }

  // 2. High Vibration Anomaly Interlock (Predictive Maintenance)
  if (vibe > THRESHOLD_VIBE_ALERT) {
    Serial.println(F("[SAFETY] Excessive Machine Vibration! Halting Conveyor to prevent mechanical failure."));
    stateConveyor = false;
    digitalWrite(PIN_RELAY_CONVEYOR, HIGH); // Shut down motor
    publishAlert("HIGH_VIBRATION", "Excessive mechanical oscillation detected", "CRITICAL", vibe, THRESHOLD_VIBE_ALERT);
  }
}

// ========================================================
// MQTT Telemetry Publishing
// ========================================================
void publishTelemetry(float temp, float hum, float vibe, float curr, float gas) {
  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();

  JsonObject readings = doc.createNestedObject("readings");
  readings["temperature"] = round(temp * 10.0f) / 10.0f;
  readings["humidity"] = round(hum * 10.0f) / 10.0f;
  readings["vibration"] = round(vibe * 100.0f) / 100.0f;
  readings["current"] = round(curr * 100.0f) / 100.0f;
  readings["airQuality"] = round(gas * 10.0f) / 10.0f;

  JsonObject actuators = doc.createNestedObject("actuators");
  actuators["fan"] = stateFan ? "RUNNING" : "STOPPED";
  actuators["conveyor"] = stateConveyor ? "RUNNING" : "STOPPED";
  actuators["valve"] = stateValve ? "OPEN" : "CLOSED";

  char jsonBuf[512];
  serializeJson(doc, jsonBuf);
  mqttClient.publish(TOPIC_TELEMETRY, jsonBuf);
}

void publishAlert(const char* type, const char* message, const char* severity, float value, float threshold) {
  if (!mqttClient.connected()) return;
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["type"] = type;
  doc["message"] = message;
  doc["severity"] = severity;
  doc["value"] = value;
  doc["threshold"] = threshold;
  doc["timestamp"] = millis();

  char alertBuf[256];
  serializeJson(doc, alertBuf);
  mqttClient.publish(TOPIC_ALERTS, alertBuf);
}

// ========================================================
// OLED Display Status Renderer
// ========================================================
void updateOLED(float temp, float vibe, bool mqttOk) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);

  // Status Bar
  display.printf("PLC-LITE  MQTT:%s\n", mqttOk ? "OK" : "ERR");
  display.drawLine(0, 9, 128, 9, SSD1306_WHITE);

  // Live Metrics
  display.setCursor(0, 14);
  display.printf("Temp: %.1f C\n", temp);
  display.printf("Vibe: %.2f mm/s\n", vibe);
  display.printf("Fan : %s\n", stateFan ? "ON" : "OFF");
  display.printf("Line: %s\n", stateConveyor ? "RUNNING" : "STOPPED");

  // Bottom Status
  display.setCursor(0, 54);
  display.printf("IP: %s", WiFi.localIP().toString().c_str());
  display.display();
}
