"""Iteration 6 — Shipping Estimator, Save for Later, Guest Checkout tests."""
import os
import time
import uuid
import pytest
import requests

BASE = "https://cart-checkout-205.preview.emergentagent.com/api"
USER = {"email": "user@storex.com", "password": "User@1234"}


# ------------- helpers -------------
def _unwrap(d):
    return d.get("data", d) if isinstance(d, dict) else d


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def user_token(s):
    r = s.post(f"{BASE}/auth/login", json=USER, timeout=15)
    assert r.status_code == 200, r.text
    d = _unwrap(r.json())
    tok = d.get("token") or r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


def _get_product_id(s, slug="essential-cotton-tee"):
    r = s.get(f"{BASE}/products/{slug}", timeout=15)
    assert r.status_code == 200, r.text
    d = _unwrap(r.json())
    p = d.get("product") or d
    return p["id"]


def _get_second_product_id(s, slug="merino-wool-sweater"):
    return _get_product_id(s, slug)


# =================== Shipping Estimator ===================
class TestShippingEstimator:
    def test_metro_below_threshold_paid(self, s):
        r = s.post(f"{BASE}/shipping/estimate", json={"postalCode": "110001", "subtotal": 100}, timeout=15)
        assert r.status_code == 200, r.text
        d = _unwrap(r.json())
        assert d["cost"] == 99
        assert d["free"] is False
        assert d["zone"] == "Metro"
        assert "2" in d["etaLabel"] and "4" in d["etaLabel"]
        assert "deliveryBy" in d

    def test_metro_above_threshold_free(self, s):
        r = s.post(f"{BASE}/shipping/estimate", json={"postalCode": "400001", "subtotal": 600}, timeout=15)
        assert r.status_code == 200
        d = _unwrap(r.json())
        assert d["cost"] == 0
        assert d["free"] is True
        assert d["zone"] == "Metro"

    def test_standard_below_threshold(self, s):
        # 300xxx is not in metro prefixes
        r = s.post(f"{BASE}/shipping/estimate", json={"postalCode": "302001", "subtotal": 100}, timeout=15)
        assert r.status_code == 200
        d = _unwrap(r.json())
        assert d["cost"] == 99
        assert d["zone"] == "Standard"
        assert "4" in d["etaLabel"] and "7" in d["etaLabel"]

    def test_standard_above_threshold_free(self, s):
        r = s.post(f"{BASE}/shipping/estimate", json={"postalCode": "302001", "subtotal": 500}, timeout=15)
        assert r.status_code == 200
        d = _unwrap(r.json())
        assert d["free"] is True
        assert d["zone"] == "Standard"

    def test_invalid_pincode_short(self, s):
        r = s.post(f"{BASE}/shipping/estimate", json={"postalCode": "12345", "subtotal": 100}, timeout=15)
        assert r.status_code == 400

    def test_invalid_pincode_nondigit(self, s):
        r = s.post(f"{BASE}/shipping/estimate", json={"postalCode": "ABCDEF", "subtotal": 100}, timeout=15)
        assert r.status_code == 400


# =================== Guest Checkout ===================
class TestGuestCheckout:
    def test_guest_session_creates_user(self, s):
        r = s.post(f"{BASE}/auth/guest", timeout=15)
        assert r.status_code in (200, 201), r.text
        d = _unwrap(r.json())
        assert "token" in d
        u = d.get("user") or {}
        assert u.get("isGuest") is True
        assert "@guest.local" in (u.get("email") or "")

    def test_guest_add_to_cart_and_cod_order(self, s):
        r = s.post(f"{BASE}/auth/guest", timeout=15)
        assert r.status_code in (200, 201)
        d = _unwrap(r.json())
        token = d["token"]
        h = {"Authorization": f"Bearer {token}"}
        pid = _get_product_id(s)

        r2 = s.post(f"{BASE}/cart", json={"productId": pid, "quantity": 1}, headers=h, timeout=15)
        assert r2.status_code == 200, r2.text

        # Update guest details
        details = {
            "email": f"guest_{uuid.uuid4().hex[:10]}@example.com",
            "firstName": "Test",
            "lastName": "Guest",
            "phone": "9999999999",
        }
        r3 = s.patch(f"{BASE}/auth/guest-details", json=details, headers=h, timeout=15)
        assert r3.status_code == 200, r3.text

        # Place COD order (flat address fields)
        order_payload = {
            "paymentMethod": "CASH_ON_DELIVERY",
            "firstName": "Test",
            "lastName": "Guest",
            "phone": "9999999999",
            "addressLine1": "1 Test St",
            "city": "Mumbai",
            "state": "MH",
            "postalCode": "400001",
            "country": "IN",
        }
        r4 = s.post(f"{BASE}/orders", json=order_payload, headers=h, timeout=20)
        assert r4.status_code in (200, 201), r4.text
        od = _unwrap(r4.json())
        order = od.get("order") or od
        assert order.get("status", "").upper() == "CONFIRMED"

    def test_guest_details_email_taken_is_ignored(self, s):
        # Spec: only set real email if not taken by another account. Should not error.
        r = s.post(f"{BASE}/auth/guest", timeout=15)
        d = _unwrap(r.json())
        original_email = d["user"]["email"]
        token = d["token"]
        h = {"Authorization": f"Bearer {token}"}
        r2 = s.patch(f"{BASE}/auth/guest-details", json={"email": "user@storex.com", "firstName": "X"}, headers=h, timeout=15)
        assert r2.status_code == 200, r2.text
        u = _unwrap(r2.json())["user"]
        # Email must NOT be overwritten by taken email
        assert u["email"] != "user@storex.com"
        assert u["email"] == original_email
        assert u["firstName"] == "X"


# =================== Save for Later ===================
class TestSaveForLater:
    def _clear_cart(self, s, headers):
        try:
            s.delete(f"{BASE}/cart/clear", headers=headers, timeout=15)
        except Exception:
            pass

    def test_toggle_and_get_flag(self, s, user_headers):
        self._clear_cart(s, user_headers)
        pid = _get_product_id(s)
        r = s.post(f"{BASE}/cart", json={"productId": pid, "quantity": 1}, headers=user_headers, timeout=15)
        assert r.status_code == 200

        rc = s.get(f"{BASE}/cart", headers=user_headers, timeout=15)
        assert rc.status_code == 200
        cart = _unwrap(rc.json())["cart"]
        items = cart["items"]
        assert len(items) >= 1
        item = items[0]
        assert "savedForLater" in item
        assert item["savedForLater"] is False

        rs = s.patch(f"{BASE}/cart/{item['id']}/save", headers=user_headers, timeout=15)
        assert rs.status_code == 200
        assert _unwrap(rs.json())["savedForLater"] is True

        rc2 = s.get(f"{BASE}/cart", headers=user_headers, timeout=15)
        cart2 = _unwrap(rc2.json())["cart"]
        it2 = next(i for i in cart2["items"] if i["id"] == item["id"])
        assert it2["savedForLater"] is True

        # Toggle back
        rs2 = s.patch(f"{BASE}/cart/{item['id']}/save", headers=user_headers, timeout=15)
        assert rs2.status_code == 200
        assert _unwrap(rs2.json())["savedForLater"] is False

    def test_order_skips_saved_items_and_retains(self, s, user_headers):
        self._clear_cart(s, user_headers)
        pid1 = _get_product_id(s, "essential-cotton-tee")
        pid2 = _get_second_product_id(s, "tailored-chino-trousers")

        assert s.post(f"{BASE}/cart", json={"productId": pid1, "quantity": 1}, headers=user_headers).status_code == 200
        assert s.post(f"{BASE}/cart", json={"productId": pid2, "quantity": 1}, headers=user_headers).status_code == 200

        cart = _unwrap(s.get(f"{BASE}/cart", headers=user_headers).json())["cart"]
        assert len(cart["items"]) == 2
        item_to_save = next(i for i in cart["items"] if i["productId"] == pid2)
        assert s.patch(f"{BASE}/cart/{item_to_save['id']}/save", headers=user_headers).status_code == 200

        # Place COD order - should only include the active item
        payload = {
            "paymentMethod": "CASH_ON_DELIVERY",
            "firstName": "User", "lastName": "T", "phone": "9999999999",
            "addressLine1": "1 Test", "city": "Mumbai", "state": "MH",
            "postalCode": "400001", "country": "IN",
        }
        r = s.post(f"{BASE}/orders", json=payload, headers=user_headers, timeout=20)
        assert r.status_code in (200, 201), r.text

        # After order, saved item should still be in cart
        cart2 = _unwrap(s.get(f"{BASE}/cart", headers=user_headers).json())["cart"]
        remaining_ids = [i["productId"] for i in cart2["items"]]
        assert pid2 in remaining_ids, f"Saved item was removed! Remaining: {remaining_ids}"
        assert pid1 not in remaining_ids, "Active item was not cleared after order"
        # And it should still be flagged saved
        saved_item = next(i for i in cart2["items"] if i["productId"] == pid2)
        assert saved_item["savedForLater"] is True

    def test_all_saved_blocks_order(self, s, user_headers):
        self._clear_cart(s, user_headers)
        pid = _get_product_id(s)
        s.post(f"{BASE}/cart", json={"productId": pid, "quantity": 1}, headers=user_headers)
        cart = _unwrap(s.get(f"{BASE}/cart", headers=user_headers).json())["cart"]
        item = cart["items"][0]
        s.patch(f"{BASE}/cart/{item['id']}/save", headers=user_headers)

        payload = {
            "paymentMethod": "CASH_ON_DELIVERY",
            "firstName": "User", "lastName": "T", "phone": "9999999999",
            "addressLine1": "1 Test", "city": "Mumbai", "state": "MH",
            "postalCode": "400001", "country": "IN",
        }
        r = s.post(f"{BASE}/orders", json=payload, headers=user_headers, timeout=20)
        assert r.status_code == 400, f"Expected 400 when all items saved, got {r.status_code}: {r.text}"

        # Cleanup: unsave for future tests
        s.patch(f"{BASE}/cart/{item['id']}/save", headers=user_headers)
        s.delete(f"{BASE}/cart/clear", headers=user_headers)
