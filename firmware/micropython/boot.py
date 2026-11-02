# boot.py -- executed on ESP32 boot-up
import esp
import gc
import network
import time

esp.osdebug(None)
gc.collect()

WIFI_SSID = "SmartFactory_WLAN"
WIFI_PASS = "Factory@Secure2026"

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("[BOOT] Connecting to Wi-Fi...")
        wlan.connect(WIFI_SSID, WIFI_PASS)
        timeout = 10
        while not wlan.isconnected() and timeout > 0:
            time.sleep(1)
            timeout -= 1
    if wlan.isconnected():
        print("[BOOT] Wi-Fi Connected. IP:", wlan.ifconfig()[0])
    else:
        print("[BOOT] Wi-Fi Connection Pending.")

connect_wifi()
