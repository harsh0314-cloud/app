"""New auth feature tests: forgot/reset password, email verification, refresh tokens."""
import os
import re
import time
import subprocess
import pytest
import requests

BASE = "https://cart-checkout-205.preview.emergentagent.com/api"
LOG_PATH = "/var/log/supervisor/ecom_server.out.log"
USER = {"email": "user@storex.com", "password": "User@1234"}


def _grep_latest_link(pattern):
    """Return the token from the latest matching line in the ecom_server log."""
    try:
        # Read last chunk of log to find latest link
        out = subprocess.check_output(
            ["tail", "-n", "800", LOG_PATH], text=True, stderr=subprocess.STDOUT
        )
    except Exception as e:
        pytest.skip(f"log unavailable: {e}")
    matches = re.findall(pattern, out)
    if not matches:
        return None
    return matches[-1]


def _new_email():
    return f"TEST_auth_{int(time.time()*1000)}@example.com"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# --- Registration returns refreshToken + isVerified:false ------------
class TestRegistration:
    def test_register_returns_refresh_and_unverified(self, s):
        email = _new_email()
        r = s.post(f"{BASE}/auth/register", json={
            "email": email, "password": "TestPass@123",
            "firstName": "New", "lastName": "User", "phone": "9999999999"
        }, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json().get("data") or r.json()
        assert "token" in d
        assert "refreshToken" in d, f"missing refreshToken in {d.keys()}"
        assert d["user"].get("isVerified") is False
        # Save for subsequent tests
        pytest.reg_email = email
        pytest.reg_token = d["token"]
        pytest.reg_refresh = d["refreshToken"]
        pytest.reg_user_id = d["user"].get("id")


# --- Email verification ---------------------------------------------
class TestEmailVerification:
    def test_verify_email_from_log(self, s):
        # Wait for the log line to flush
        time.sleep(1.0)
        # Log format: [email] Verification link ... ?token=<hex>
        pattern = r"\[email\][^\n]*Verification link[^\n]*token=([A-Za-z0-9\-_.]+)"
        token = _grep_latest_link(pattern)
        assert token, "verification token not found in ecom_server log"
        pytest.verify_token = token
        r = s.post(f"{BASE}/auth/verify-email", json={"token": token}, timeout=15)
        assert r.status_code == 200, r.text
        # verify user is now verified via /me
        r2 = s.get(f"{BASE}/auth/me",
                   headers={"Authorization": f"Bearer {pytest.reg_token}"}, timeout=15)
        assert r2.status_code == 200
        d = r2.json().get("data") or r2.json()
        u = d.get("user") or d
        assert u.get("isVerified") is True

    def test_verify_email_reuse_fails(self, s):
        token = getattr(pytest, "verify_token", None)
        if not token:
            pytest.skip("no token")
        r = s.post(f"{BASE}/auth/verify-email", json={"token": token}, timeout=15)
        assert r.status_code == 400, f"reuse should be 400, got {r.status_code}: {r.text}"

    def test_verify_email_invalid_token(self, s):
        r = s.post(f"{BASE}/auth/verify-email",
                   json={"token": "invalid-token-xyz-123"}, timeout=15)
        assert r.status_code == 400


# --- Forgot / Reset password ----------------------------------------
class TestForgotResetPassword:
    def test_forgot_password_no_enumeration_unknown_email(self, s):
        r = s.post(f"{BASE}/auth/forgot-password",
                   json={"email": "nonexistent_totally_TEST@example.com"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        # Should still return success message
        assert "success" in (body.get("status") or "").lower() or body.get("message")

    def test_forgot_password_known_user_returns_success(self, s):
        # Use the just-registered user
        email = getattr(pytest, "reg_email", None) or USER["email"]
        r = s.post(f"{BASE}/auth/forgot-password",
                   json={"email": email}, timeout=15)
        assert r.status_code == 200, r.text

    def test_reset_password_flow(self, s):
        # Trigger forgot-password for our test user
        email = getattr(pytest, "reg_email", None)
        if not email:
            pytest.skip("no registered user")
        r = s.post(f"{BASE}/auth/forgot-password", json={"email": email}, timeout=15)
        assert r.status_code == 200
        time.sleep(1.0)
        pattern = r"\[email\][^\n]*Password reset link[^\n]*token=([A-Za-z0-9\-_.]+)"
        token = _grep_latest_link(pattern)
        assert token, "reset token not found in ecom_server log"
        pytest.reset_token = token
        new_password = "NewPass@9876"
        r = s.post(f"{BASE}/auth/reset-password",
                   json={"token": token, "password": new_password}, timeout=15)
        assert r.status_code == 200, r.text
        pytest.new_password = new_password
        # Old password should now fail
        r2 = s.post(f"{BASE}/auth/login",
                    json={"email": email, "password": "TestPass@123"}, timeout=15)
        assert r2.status_code == 401
        # New password should work
        r3 = s.post(f"{BASE}/auth/login",
                    json={"email": email, "password": new_password}, timeout=15)
        assert r3.status_code == 200, r3.text
        d = r3.json().get("data") or r3.json()
        assert d.get("token") and d.get("refreshToken")
        pytest.post_reset_token = d["token"]
        pytest.post_reset_refresh = d["refreshToken"]

    def test_reset_password_reuse_fails(self, s):
        token = getattr(pytest, "reset_token", None)
        if not token:
            pytest.skip("no reset token")
        r = s.post(f"{BASE}/auth/reset-password",
                   json={"token": token, "password": "AnotherPass@123"}, timeout=15)
        assert r.status_code == 400, f"reuse should be 400, got {r.status_code}"


# --- Refresh token rotation & logout --------------------------------
class TestRefreshToken:
    def test_refresh_rotates_token(self, s):
        refresh = getattr(pytest, "post_reset_refresh", None) or getattr(pytest, "reg_refresh", None)
        assert refresh, "no refresh token from earlier tests"
        r = s.post(f"{BASE}/auth/refresh", json={"refreshToken": refresh}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json().get("data") or r.json()
        assert d.get("token")
        assert d.get("refreshToken")
        assert d["refreshToken"] != refresh, "refreshToken must be rotated"
        pytest.old_refresh = refresh
        pytest.new_refresh = d["refreshToken"]
        pytest.new_access = d["token"]

    def test_old_refresh_invalid_after_rotation(self, s):
        old = getattr(pytest, "old_refresh", None)
        if not old:
            pytest.skip("no rotated refresh")
        r = s.post(f"{BASE}/auth/refresh", json={"refreshToken": old}, timeout=15)
        assert r.status_code == 401, f"old refresh should be 401, got {r.status_code}: {r.text}"

    def test_logout_invalidates_refresh(self, s):
        refresh = getattr(pytest, "new_refresh", None)
        if not refresh:
            pytest.skip("no refresh")
        r = s.post(f"{BASE}/auth/logout", json={"refreshToken": refresh}, timeout=15)
        assert r.status_code in (200, 204), r.text
        # Using it again should fail
        r2 = s.post(f"{BASE}/auth/refresh", json={"refreshToken": refresh}, timeout=15)
        assert r2.status_code == 401

    def test_refresh_with_invalid_token(self, s):
        r = s.post(f"{BASE}/auth/refresh",
                   json={"refreshToken": "not-a-real-token"}, timeout=15)
        assert r.status_code == 401


# --- Backward compatibility ----------------------------------------
class TestBackwardCompatibility:
    def test_login_still_returns_token_and_now_refresh(self, s):
        r = s.post(f"{BASE}/auth/login", json=USER, timeout=15)
        assert r.status_code == 200
        d = r.json().get("data") or r.json()
        assert d.get("token")
        assert d.get("refreshToken"), "login should now include refreshToken"
        assert d.get("user", {}).get("email") == USER["email"]
