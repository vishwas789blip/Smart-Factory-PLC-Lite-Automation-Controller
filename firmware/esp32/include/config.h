#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ==========================================
// 1. Wi-Fi & MQTT Configuration
// ==========================================
#define WIFI_SSID           "SmartFactory_WLAN"
#define WIFI_PASSWORD       "Factory@Secure2026"

// MQTT Broker (HiveMQ Cloud / Public Fallback)
#define MQTT_BROKER         "broker.hivemq.com"
#define MQTT_PORT           1883
#define MQTT_CLIENT_ID      "esp32-plc-001-hardware"
#define MQTT_USER           ""
#define MQTT_PASS           ""

// Device Identifier
#define DEVICE_ID           "plc-001"
#define FIRMWARE_VERSION    "v2.1.0-hcltech"

// MQTT Topics (Standard Contract)
#define TOPIC_TELEMETRY     "factory/telemetry/plc-001"
#define TOPIC_STATUS        "factory/status/plc-001"
#define TOPIC_CONTROL       "factory/actuator/plc-001/control"
#define TOPIC_ALERTS        "factory/alerts/plc-001"

// ==========================================
// 2. Hardware Pinout (ESP32 DevKit V1)
// ==========================================
// Sensors (Inputs)
#define PIN_DHT22           4      // Temperature & Humidity Digital Pin
#define PIN_MQ135           34     // Air Quality Gas Analog ADC1
#define PIN_VIBRATION       35     // Piezo / Vibration Analog ADC1
#define PIN_CURRENT_ACS712  32     // Current Sensor ADC1

// Actuators & Indicators (Outputs)
#define PIN_RELAY_FAN       16     // Relay 1: Auxiliary Cooling Fan
#define PIN_RELAY_CONVEYOR  17     // Relay 2: Primary Conveyor Motor
#define PIN_RELAY_VALVE     18     // Relay 3: Solenoid Pressure Valve
#define PIN_LED_STATUS      2      // On-board Status LED (Blue/Green)
#define PIN_BUZZER          19     // High-Frequency Alarm Buzzer

// I2C OLED Display (SSD1306 0.96")
#define PIN_I2C_SDA         21
#define PIN_I2C_SCL         22
#define OLED_ADDR           0x3C

// ==========================================
// 3. Edge-Computing Thresholds & Calibration
// ==========================================
#define THRESHOLD_TEMP_ALERT       75.0f   // Celsius
#define THRESHOLD_VIBE_ALERT       4.5f    // mm/s (Peak velocity)
#define THRESHOLD_CURRENT_ALERT    14.0f   // Amperes
#define THRESHOLD_GAS_ALERT        350.0f  // PPM equivalent

#define MOVING_AVG_SAMPLES         10      // Noise-suppression filter window
#define TELEMETRY_INTERVAL_MS      3000    // Telemetry publish cadence (3s)
#define WATCHDOG_TIMEOUT_SEC       15      // Hardware Watchdog Reset Timeout

#endif // CONFIG_H
