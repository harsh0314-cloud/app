"""Payment hardening tests: verify idempotency, webhook signature, invoice PDF, COD regression."""
import os, time, hmac, hashlib, json, uuid
import pytest
import requests

BASE = "https://cart-checkout-205.preview.emergentagent.com/api"
USER = {"email": "user@storex.com", "password": "User@1234"}
ADMIN = {"email": "admin@storex.com", "password": "Admin@1234"}
RZP_SECRET = "gCgfL7A44B6P6zUo4bxaakhQ"
WEBHOOK_SECRET = "whsec_storex_local_test_secret_9f2b"


def _login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json().get("data") or r.json()
    return d.get("token") or d["user"]["token"]


@pytest.fixture(scope="module")
def user_tok():
    return _login(USER["email"], USER["password"])


@pytest.fixture(scope="module")
def admin_tok():
    return _login(ADMIN["email"], ADMIN["password"])


@pytest.fixture(scope="module")
def user2_tok():
    """Register a fresh second user to test non-owner invoice access."""
    email = f"TEST_owner_{int(time.time())}_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{BASE}/auth/register", json={
        "email": email, "password": "TestPass@123",
        "firstName": "Test", "lastName": "Owner", "phone": "9999999999"
    }, timeout=15)
    assert r.status_code in (200, 201), r.text
    d = r.json().get("data") or r.json()
    return d["token"]


def uh(t): return {"Authorization": f"Bearer {t}"}


def _get_stock_product():
    """Return the first product that has inventory > 3."""
    r = requests.get(f"{BASE}/products?limit=50", timeout=15)
    d = r.json().get("data") or r.json()
    prods = d.get("products") or d
    for p in prods:
        inv = p.get("inventory") or {}
        qty = inv.get("quantity") if isinstance(inv, dict) else 0
        if qty and qty > 3:
            return p
    # fallback
    return prods[0]


def _add_to_cart(tok, product_id, qty=1):
    h = uh(tok)
    requests.delete(f"{BASE}/cart/clear", headers=h, timeout=15)
    r = requests.post(f"{BASE}/cart", headers=h, json={"productId": product_id, "quantity": qty}, timeout=15)
    assert r.status_code in (200, 201), r.text


def _create_rzp_order(tok):
    h = uh(tok)
    payload = {
        "firstName": "Test", "lastName": "User", "phone": "9999999999",
        "addressLine1": "123 Test St", "city": "Mumbai",
        "state": "MH", "postalCode": "400001", "country": "IN"
    }
    r = requests.post(f"{BASE}/payments/create-razorpay-order", headers=h, json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    d = r.json().get("data") or r.json()
    return d  # has orderId (internal) and order_id (razorpay)


def _create_cod_order(tok):
    h = uh(tok)
    payload = {
        "paymentMethod": "CASH_ON_DELIVERY",
        "couponCode": "WELCOME10",
        "firstName": "Test", "lastName": "User", "phone": "9999999999",
        "addressLine1": "123 Test St", "city": "Mumbai",
        "state": "MH", "postalCode": "400001", "country": "IN"
    }
    r = requests.post(f"{BASE}/orders", headers=h, json=payload, timeout=30)
    return r


def _get_inventory(product_id, admin_tok):
    """Fetch product detail (public) to get inventory quantity."""
    r = requests.get(f"{BASE}/products?limit=100", timeout=15)
    d = r.json().get("data") or r.json()
    prods = d.get("products") or d
    for p in prods:
        if p.get("id") == product_id:
            inv = p.get("inventory") or {}
            return inv.get("quantity")
    return None


def _sign(secret, body):
    return hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()


# ============ Duplicate Payment Protection ============

def test_verify_idempotency_and_signature(user_tok, admin_tok):
    p = _get_stock_product()
    _add_to_cart(user_tok, p["id"], qty=1)
    inv_before = _get_inventory(p["id"], admin_tok)

    rzp = _create_rzp_order(user_tok)
    internal_order_id = rzp["orderId"]
    rzp_order_id = rzp["order_id"]
    fake_payment_id = f"pay_test_{uuid.uuid4().hex[:14]}"
    sig = _sign(RZP_SECRET, f"{rzp_order_id}|{fake_payment_id}")

    body = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": fake_payment_id,
        "razorpay_signature": sig,
        "orderId": internal_order_id
    }
    r1 = requests.post(f"{BASE}/payments/verify-razorpay", headers=uh(user_tok), json=body, timeout=20)
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1.get("status") == "success"

    # 2nd call - should be idempotent
    r2 = requests.post(f"{BASE}/payments/verify-razorpay", headers=uh(user_tok), json=body, timeout=20)
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2.get("status") == "success"
    assert "already" in (d2.get("message") or "").lower()

    inv_after = _get_inventory(p["id"], admin_tok)
    assert inv_after == inv_before - 1, f"Inventory decremented more than once: before={inv_before} after={inv_after}"


def test_verify_invalid_signature(user_tok):
    p = _get_stock_product()
    _add_to_cart(user_tok, p["id"], qty=1)
    rzp = _create_rzp_order(user_tok)
    body = {
        "razorpay_order_id": rzp["order_id"],
        "razorpay_payment_id": f"pay_bad_{uuid.uuid4().hex[:8]}",
        "razorpay_signature": "0" * 64,
        "orderId": rzp["orderId"]
    }
    r = requests.post(f"{BASE}/payments/verify-razorpay", headers=uh(user_tok), json=body, timeout=20)
    assert r.status_code == 400, r.text


# ============ Webhook ============

def test_webhook_missing_signature(user_tok):
    r = requests.post(f"{BASE}/payments/webhook", data=json.dumps({"event": "payment.captured"}),
                      headers={"Content-Type": "application/json"}, timeout=15)
    assert r.status_code == 400


def test_webhook_invalid_signature(user_tok):
    body = json.dumps({"event": "payment.captured"})
    r = requests.post(f"{BASE}/payments/webhook", data=body,
                      headers={"Content-Type": "application/json", "x-razorpay-signature": "deadbeef"}, timeout=15)
    assert r.status_code == 400


def test_webhook_valid_confirms_and_is_idempotent(user_tok, admin_tok):
    p = _get_stock_product()
    _add_to_cart(user_tok, p["id"], qty=1)
    inv_before = _get_inventory(p["id"], admin_tok)

    rzp = _create_rzp_order(user_tok)
    internal_order_id = rzp["orderId"]
    fake_payment_id = f"pay_wh_{uuid.uuid4().hex[:14]}"

    event = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": fake_payment_id,
                    "order_id": rzp["order_id"],
                    "notes": {"orderId": internal_order_id}
                }
            }
        }
    }
    body = json.dumps(event)
    sig = _sign(WEBHOOK_SECRET, body)
    headers = {"Content-Type": "application/json", "x-razorpay-signature": sig}

    r1 = requests.post(f"{BASE}/payments/webhook", data=body, headers=headers, timeout=20)
    assert r1.status_code == 200, r1.text

    # Verify order confirmed
    r_ord = requests.get(f"{BASE}/orders/{internal_order_id}", headers=uh(user_tok), timeout=15)
    assert r_ord.status_code == 200
    d = r_ord.json().get("data") or r_ord.json()
    order = d.get("order") or d
    assert order.get("status") == "CONFIRMED"

    inv_mid = _get_inventory(p["id"], admin_tok)
    assert inv_mid == inv_before - 1

    # Fire same webhook again -> must NOT double-decrement
    r2 = requests.post(f"{BASE}/payments/webhook", data=body, headers=headers, timeout=20)
    assert r2.status_code == 200
    inv_after = _get_inventory(p["id"], admin_tok)
    assert inv_after == inv_before - 1, f"Webhook double-fire decremented twice: before={inv_before} after={inv_after}"


# ============ Invoice PDF ============

@pytest.fixture(scope="module")
def cod_order_id(user_tok):
    p = _get_stock_product()
    _add_to_cart(user_tok, p["id"], qty=1)
    r = _create_cod_order(user_tok)
    assert r.status_code in (200, 201), r.text
    d = r.json().get("data") or r.json()
    order = d.get("order") or d
    return order["id"]


def test_invoice_owner_success(user_tok, cod_order_id):
    r = requests.get(f"{BASE}/orders/{cod_order_id}/invoice", headers=uh(user_tok), timeout=20)
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF"
    assert len(r.content) > 500


def test_invoice_admin_can_fetch_any(admin_tok, cod_order_id):
    r = requests.get(f"{BASE}/orders/{cod_order_id}/invoice", headers=uh(admin_tok), timeout=20)
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"


def test_invoice_non_owner_forbidden(user2_tok, cod_order_id):
    r = requests.get(f"{BASE}/orders/{cod_order_id}/invoice", headers=uh(user2_tok), timeout=20)
    assert r.status_code == 404, f"Expected 404 for non-owner, got {r.status_code}: {r.text[:200]}"


def test_invoice_unauthenticated(cod_order_id):
    r = requests.get(f"{BASE}/orders/{cod_order_id}/invoice", timeout=15)
    assert r.status_code == 401


# ============ COD regression (back-to-back) ============

def test_cod_backtoback(user_tok):
    p = _get_stock_product()
    for i in range(3):
        _add_to_cart(user_tok, p["id"], qty=1)
        r = _create_cod_order(user_tok)
        assert r.status_code in (200, 201), f"iteration {i} failed: {r.status_code} {r.text[:300]}"
        d = r.json().get("data") or r.json()
        order = d.get("order") or d
        assert order.get("status") in ("CONFIRMED", "confirmed")
        assert (order.get("total") or order.get("totalAmount"))
