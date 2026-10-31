"""Run AI service test suite."""
import sys
import os

# Add apps/ai-service to path
sys.path.insert(0, os.path.dirname(__file__))

from tests.test_ai import (
    test_anomaly_detection_normal_series,
    test_anomaly_detection_spike,
    test_anomaly_detection_insufficient_data,
    test_load_optimization_greedy_shedding,
    test_load_optimization_already_under_limit,
    test_power_prediction_iso_format
)

def run():
    tests = [
        ("Anomaly Detection: Normal Series", test_anomaly_detection_normal_series),
        ("Anomaly Detection: Power Spike", test_anomaly_detection_spike),
        ("Anomaly Detection: Insufficient Data", test_anomaly_detection_insufficient_data),
        ("Load Optimization: Greedy Shedding", test_load_optimization_greedy_shedding),
        ("Load Optimization: Already Under Limit", test_load_optimization_already_under_limit),
        ("Power Prediction: ISO Timestamp Format", test_power_prediction_iso_format),
    ]

    passed = 0
    print("=" * 60)
    print("Running AI Service Unit Tests (Python 3.14)")
    print("=" * 60)

    for name, fn in tests:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name} - {e}")

    print("=" * 60)
    print(f"Results: {passed}/{len(tests)} passed")
    print("=" * 60)

    if passed != len(tests):
        sys.exit(1)

if __name__ == "__main__":
    run()
