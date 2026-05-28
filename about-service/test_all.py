import sys
import requests

# Ask for output filename exactly as required.
filename = input("filename=")

# Define service base URLs exactly as required variable names.
a = "http://localhost:3001"
b = "http://localhost:3002"
c = "http://localhost:3003"
d = "http://localhost:3004"

# Redirect stdout to the requested output file.
sys.stdout = open(filename, "w", encoding="utf-8")

# Print the base URLs.
print(f"a={a}")
print(f"b={b}")
print(f"c={c}")
print(f"d={d}")


# Print all required response parts.
def print_result(url, data):
    # Print URL and all required request-response details.
    print("url:", url)
    print("data.status_code:", data.status_code)
    print("data.content:", data.content)
    print("data.text:", data.text)
    print("data.json():", data.json())


# Test 1 - GET {d}/api/about
print("\n=== Test 1 — GET /api/about ===")
try:
    url = f"{d}/api/about"
    data = requests.get(url)
    print_result(url, data)
except Exception as e:
    print("problem", e)

# Test 2 - GET {c}/api/report/?id=123123&year=2026&month=1
print("\n=== Test 2 — GET /api/report/?id=123123&year=2026&month=1 ===")
try:
    url = f"{c}/api/report/?id=123123&year=2026&month=1"
    data = requests.get(url)
    print_result(url, data)
except Exception as e:
    print("problem", e)

# Test 3 - POST {c}/api/add/ with required body
print("\n=== Test 3 — POST /api/add/ ===")
try:
    url = f"{c}/api/add/"
    body = {
        "userid": 123123,
        "description": "milk 9",
        "category": "food",
        "sum": 8
    }
    data = requests.post(url, json=body)
    print_result(url, data)
except Exception as e:
    print("problem", e)

# Test 4 - GET {c}/api/report/?id=123123&year=2026&month=5
print("\n=== Test 4 — GET /api/report/?id=123123&year=2026&month=5 ===")
try:
    url = f"{c}/api/report/?id=123123&year=2026&month=5"
    data = requests.get(url)
    print_result(url, data)
except Exception as e:
    print("problem", e)

# Test 5 - GET {b}/api/users/123123
print("\n=== Test 5 — GET /api/users/123123 ===")
try:
    url = f"{b}/api/users/123123"
    data = requests.get(url)
    print_result(url, data)
except Exception as e:
    print("problem", e)

# Test 6 - GET {b}/api/users
print("\n=== Test 6 — GET /api/users ===")
try:
    url = f"{b}/api/users"
    data = requests.get(url)
    print_result(url, data)
except Exception as e:
    print("problem", e)

# Test 7 - GET {a}/api/logs
print("\n=== Test 7 — GET /api/logs ===")
try:
    url = f"{a}/api/logs"
    data = requests.get(url)
    print_result(url, data)
except Exception as e:
    print("problem", e)
