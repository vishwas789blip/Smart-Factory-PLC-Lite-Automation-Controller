# main.py -- MicroPython Smart Factory PLC-Lite Edge Controller
# HCLTech Embedded Systems & IoT Curriculum Project
import time
import json
import machine
from machine import Pin, ADC
import dht

# Pin Configurations
PIN_DHT = Pin(4)
PIN_RELAY_FAN = Pin(16, Pin.OUT, value=1)       # Active LOW (1 = OFF)
PIN_RELAY_CONVEYOR = Pin(17, Pin.OUT, value=0)  # Active LOW (0 = ON)
PIN_LED = Pin(2, Pin.OUT, value=0)
ADC_VIBE = ADC(Pin(35))
ADC_VIBE.atten(ADC.ATTN_11DB)
ADC_CURR = ADC(Pin(32))
ADC_CURR.atten(ADC.ATTN_11DB)

dht_sensor = dht.DHT22(PIN_DHT)

# MQTT Settings
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
CLIENT_ID = "esp32-mpy-plc-001"
TOPIC_TELEMETRY = "factory/telemetry/plc-001"
TOPIC_CONTROL = "factory/actuator/plc-001/control"
TOPIC_STATUS = "factory/status/plc-001"

# Moving Average Buffer
WINDOW_SIZE = 10
vibe_history = []
temp_history = []

def moving_average(history, new_val):
    history.append(new_val)
    if len(history) > WINDOW_SIZE:
        history.pop(0)
    return sum(history) / len(history)

def on_message(topic, msg):
    try:
        data = json.loads(msg.decode())
        target = data.get("target")
        action = data.get("action")
        print(f"[CMD] Target: {target}, Action: {action}")
        if target == "FAN":
            PIN_RELAY_FAN.value(0 if action == "TURN_ON" else 1)
        elif target == "CONVEYOR":
            PIN_RELAY_CONVEYOR.value(0 if action == "TURN_ON" else 1)
    except Exception as e:
        print("[ERR] Parse error:", e)

def main():
    print("[SYSTEM] Starting MicroPython PLC-Lite Loop...")
    from umqtt.simple import MQTTClient
    client = MQTTClient(CLIENT_ID, MQTT_BROKER, port=MQTT_PORT)
    client.set_callback(on_message)

    try:
        client.connect()
        client.subscribe(TOPIC_CONTROL)
        print("[MQTT] Connected & Subscribed to", TOPIC_CONTROL)
        PIN_LED.value(1)
    except Exception as e:
        print("[MQTT] Connection failed, running in autonomous local mode:", e)

    while True:
        try:
            try:
                client.check_msg()
            except:
                pass

            # Read Sensors
            try:
                dht_sensor.measure()
                raw_temp = dht_sensor.temperature()
                raw_hum = dht_sensor.humidity()
            except:
                raw_temp = 28.0
                raw_hum = 55.0

            raw_vibe = (ADC_VIBE.read() / 4095.0) * 10.0
            raw_curr = abs(((ADC_CURR.read() / 4095.0) * 3.3 - 1.65) / 0.066)

            filtered_temp = moving_average(temp_history, raw_temp)
            filtered_vibe = moving_average(vibe_history, raw_vibe)

            # Edge Safety Interlocks
            if filtered_temp > 75.0:
                print("[EDGE ALERT] Over-temperature! Turning fan ON")
                PIN_RELAY_FAN.value(0)
            elif filtered_temp < 70.0:
                PIN_RELAY_FAN.value(1)

            if filtered_vibe > 4.5:
                print("[EDGE ALERT] High vibration! Stopping conveyor")
                PIN_RELAY_CONVEYOR.value(1)

            payload = {
                "deviceId": "plc-001",
                "timestamp": time.time(),
                "readings": {
                    "temperature": round(filtered_temp, 1),
                    "humidity": round(raw_hum, 1),
                    "vibration": round(filtered_vibe, 2),
                    "current": round(raw_curr, 2)
                },
                "actuators": {
                    "fan": "RUNNING" if PIN_RELAY_FAN.value() == 0 else "STOPPED",
                    "conveyor": "RUNNING" if PIN_RELAY_CONVEYOR.value() == 0 else "STOPPED"
                }
            }

            try:
                client.publish(TOPIC_TELEMETRY, json.dumps(payload))
            except:
                pass

            time.sleep(3)
        except Exception as e:
            print("[LOOP ERR]", e)
            time.sleep(2)

if __name__ == "__main__":
    main()
