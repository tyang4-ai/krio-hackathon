"""
Rate Limit Testing Script

Run this while the backend is running to test rate limiting.
Usage: python test_rate_limit.py
"""
import requests
import time

BASE_URL = "http://localhost:8000"


def test_endpoint(name: str, method: str, url: str, limit: int, payload: dict = None):
    """Test rate limiting on an endpoint."""
    print(f"\n{'='*50}")
    print(f"Testing: {name}")
    print(f"Endpoint: {method} {url}")
    print(f"Expected limit: {limit} requests/minute")
    print(f"{'='*50}")

    for i in range(limit + 2):
        try:
            if method == "GET":
                response = requests.get(url, timeout=5)
            else:
                response = requests.post(url, json=payload, timeout=5)

            status = response.status_code

            if status == 429:
                data = response.json()
                print(f"Request {i+1}: [OK] RATE LIMITED (429)")
                print(f"  Response: {data}")
                print(f"\n[PASS] Rate limiting is working! Blocked after {i} requests.")
                return True
            else:
                print(f"Request {i+1}: Status {status}")

        except requests.exceptions.ConnectionError:
            print(f"\n[ERROR] Cannot connect to {BASE_URL}")
            print("  Make sure the backend is running!")
            return False
        except Exception as e:
            print(f"Request {i+1}: Error - {e}")

    print(f"\n[FAIL] Rate limiting NOT triggered after {limit + 2} requests")
    return False


def main():
    print("Rate Limit Testing Script")
    print("="*50)
    print(f"Testing against: {BASE_URL}")
    print("Make sure the backend is running first!")

    # Check if server is running
    try:
        requests.get(f"{BASE_URL}/", timeout=2)
        print("[OK] Server is reachable\n")
    except:
        print("[ERROR] Cannot reach server. Start the backend first:")
        print("  cd quiz-flashcard-app/backend-python")
        print("  python main.py")
        return

    results = []

    # Test 1: Auth endpoint (5/min limit)
    results.append(test_endpoint(
        name="Auth - Google Login",
        method="POST",
        url=f"{BASE_URL}/api/auth/google",
        limit=5,
        payload={"credential": "test-token"}
    ))

    # Test 2: Health endpoint (no limit - should not be rate limited)
    print(f"\n{'='*50}")
    print("Testing: Health endpoint (no rate limit)")
    print(f"{'='*50}")
    for i in range(3):
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=5)
            print(f"Request {i+1}: Status {response.status_code}")
        except Exception as e:
            print(f"Request {i+1}: {e}")

    # Summary
    print(f"\n{'='*50}")
    print("SUMMARY")
    print(f"{'='*50}")
    if any(results):
        print("[PASS] Rate limiting is configured and working!")
    else:
        print("[FAIL] Rate limiting may not be working correctly")

    print("\nTo test other endpoints manually:")
    print("- AI Generate: POST /api/categories/1/generate-questions (10/min)")
    print("- AI Analyze: POST /api/categories/1/analyze-samples (5/min)")
    print("- Document Upload: POST /api/categories/1/documents (20/min)")


if __name__ == "__main__":
    main()
