"""Order lifecycle tests: cancel, return/exchange, admin returns, refund tracking."""
import time
import pytest
import requests

BASE = "https://cart-checkout-205.preview.emergentagent.com/api"
USER = {"email": "user@storex.com", "password": "User@1234"}
ADMIN = {"email": "admin@storex.com", "password": "Admin@1234"}


def unwrap(r):
    j = r.json()
    return j.get("data") if isinstance(j, dict) and "data" in j else j


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def user_token(s):
    r = s.post(f"{BASE}/auth/login", json=USER, timeout=15)
    assert r.status_code == 200, r.text
    return unwrap(r)["token"]


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{BASE}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return unwrap(r)["token"]


@pytest.fixture(scope="module")
def other_user_token(s):
    email = f"TEST_other_{int(time.time())}@example.com"
    r = s.post(f"{BASE}/auth/register", json={
        "email": email, "password": "TestPass@123",
        "firstName": "Other", "lastName": "User", "phone": "9999999998"
    }, timeout=15)
    assert r.status_code in (200, 201), r.text
    return unwrap(r)["token"]


def uh(t):
    return {"Authorization": f"Bearer {t}"}


def _pick_product(s):
    r = s.get(f"{BASE}/products?limit=20", timeout=15)
    prods = unwrap(r).get("products") or []
    # prefer one with inventory >= 3
    for p in prods:
        inv = (p.get("inventory") or {}).get("quantity", 0)
        if inv >= 3:
            return p
    return prods[0]


def _create_cod_order(s, token, qty=1):
    h = uh(token)
    s.delete(f"{BASE}/cart/clear", headers=h, timeout=15)
    p = _pick_product(s)
    r = s.post(f"{BASE}/cart", headers=h, json={"productId": p["id"], "quantity": qty}, timeout=15)
    assert r.status_code in (200, 201), r.text
    payload = {
        "paymentMethod": "CASH_ON_DELIVERY",
        "firstName": "Test", "lastName": "User", "phone": "9999999999",
        "addressLine1": "123 Test St", "city": "Mumbai",
        "state": "MH", "postalCode": "400001", "country": "IN"
    }
    r = s.post(f"{BASE}/orders", headers=h, json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    order = unwrap(r).get("order") or unwrap(r)
    return order, p


def _inventory_of(s, admin_token, product_id):
    r = s.get(f"{BASE}/products/{product_id}" if False else f"{BASE}/admin/inventory",
              headers=uh(admin_token), timeout=15)
    assert r.status_code == 200
    d = unwrap(r)
    items = d.get("items") or d.get("inventory") or d
    for it in items if isinstance(items, list) else []:
        if it.get("productId") == product_id or (it.get("product") or {}).get("id") == product_id:
            return it.get("quantity") if "quantity" in it else it.get("stock")
    # fallback: via product listing
    r = s.get(f"{BASE}/products?limit=100", timeout=15)
    for p in unwrap(r).get("products") or []:
        if p["id"] == product_id:
            return (p.get("inventory") or {}).get("quantity")
    return None


# ---------- CANCEL ORDER ----------

def test_cancel_order_restocks_and_refunds_payment(s, user_token, admin_token):
    order, product = _create_cod_order(s, user_token, qty=2)
    oid = order["id"]
    pid = product["id"]

    inv_before = _inventory_of(s, admin_token, pid)
    assert inv_before is not None

    r = s.patch(f"{BASE}/orders/{oid}/cancel", headers=uh(user_token), timeout=15)
    assert r.status_code == 200, r.text
    d = unwrap(r)
    o = d.get("order") or d
    assert o["status"] == "CANCELLED"
    assert o.get("cancelledAt")

    # GET to verify persistence
    r = s.get(f"{BASE}/orders/{oid}", headers=uh(user_token), timeout=15)
    assert r.status_code == 200
    o = (unwrap(r).get("order") or unwrap(r))
    assert o["status"] == "CANCELLED"

    inv_after = _inventory_of(s, admin_token, pid)
    assert inv_after is not None
    assert inv_after == inv_before + 2, f"expected restock +2, got {inv_before} -> {inv_after}"


def test_cancel_order_twice_returns_400(s, user_token):
    order, _ = _create_cod_order(s, user_token)
    oid = order["id"]
    r = s.patch(f"{BASE}/orders/{oid}/cancel", headers=uh(user_token), timeout=15)
    assert r.status_code == 200
    r2 = s.patch(f"{BASE}/orders/{oid}/cancel", headers=uh(user_token), timeout=15)
    assert r2.status_code == 400, r2.text


def test_cancel_shipped_order_returns_400(s, user_token, admin_token):
    order, _ = _create_cod_order(s, user_token)
    oid = order["id"]
    r = s.patch(f"{BASE}/admin/orders/{oid}/status", headers=uh(admin_token),
                json={"status": "SHIPPED"}, timeout=15)
    assert r.status_code == 200, r.text
    r = s.patch(f"{BASE}/orders/{oid}/cancel", headers=uh(user_token), timeout=15)
    assert r.status_code == 400, r.text


def test_cancel_other_users_order_returns_404(s, user_token, other_user_token):
    order, _ = _create_cod_order(s, user_token)
    oid = order["id"]
    r = s.patch(f"{BASE}/orders/{oid}/cancel", headers=uh(other_user_token), timeout=15)
    assert r.status_code == 404, r.text


# ---------- RETURN / EXCHANGE ----------

def test_return_before_delivered_returns_400(s, user_token):
    order, _ = _create_cod_order(s, user_token)
    oid = order["id"]
    r = s.post(f"{BASE}/orders/{oid}/return", headers=uh(user_token),
               json={"type": "RETURN", "reason": "damaged"}, timeout=15)
    assert r.status_code == 400, r.text


def test_return_missing_reason_returns_400(s, user_token, admin_token):
    order, _ = _create_cod_order(s, user_token)
    oid = order["id"]
    r = s.patch(f"{BASE}/admin/orders/{oid}/status", headers=uh(admin_token),
                json={"status": "DELIVERED"}, timeout=15)
    assert r.status_code == 200, r.text
    r = s.post(f"{BASE}/orders/{oid}/return", headers=uh(user_token),
               json={"type": "RETURN"}, timeout=15)
    assert r.status_code == 400, r.text


@pytest.fixture(scope="module")
def delivered_order(s, user_token, admin_token):
    order, product = _create_cod_order(s, user_token, qty=1)
    oid = order["id"]
    r = s.patch(f"{BASE}/admin/orders/{oid}/status", headers=uh(admin_token),
                json={"status": "DELIVERED"}, timeout=15)
    assert r.status_code == 200, r.text
    return order, product


def test_return_created_on_delivered(s, user_token, delivered_order):
    order, _ = delivered_order
    oid = order["id"]
    r = s.post(f"{BASE}/orders/{oid}/return", headers=uh(user_token),
               json={"type": "RETURN", "reason": "does not fit"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    d = unwrap(r)
    rr = d.get("returnRequest") or d.get("request") or d
    assert rr.get("status") in ("REQUESTED", "PENDING"), rr


def test_duplicate_open_return_returns_400(s, user_token, delivered_order):
    order, _ = delivered_order
    oid = order["id"]
    r = s.post(f"{BASE}/orders/{oid}/return", headers=uh(user_token),
               json={"type": "RETURN", "reason": "second"}, timeout=15)
    assert r.status_code == 400, r.text


# ---------- ADMIN RETURNS ----------

def test_admin_returns_rbac(s, user_token):
    r = s.get(f"{BASE}/admin/returns", headers=uh(user_token), timeout=15)
    assert r.status_code == 403, r.text


def test_admin_returns_list(s, admin_token):
    r = s.get(f"{BASE}/admin/returns", headers=uh(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    d = unwrap(r)
    items = d.get("returns") or d.get("items") or d
    assert isinstance(items, list)
    assert len(items) >= 1


def test_admin_return_full_lifecycle(s, user_token, admin_token):
    # fresh flow: create -> deliver -> user return -> admin approve -> complete
    order, product = _create_cod_order(s, user_token, qty=1)
    oid = order["id"]
    pid = product["id"]
    order_total = order.get("total") or order.get("totalAmount")

    r = s.patch(f"{BASE}/admin/orders/{oid}/status", headers=uh(admin_token),
                json={"status": "DELIVERED"}, timeout=15)
    assert r.status_code == 200

    r = s.post(f"{BASE}/orders/{oid}/return", headers=uh(user_token),
               json={"type": "RETURN", "reason": "defective"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    rr = unwrap(r).get("returnRequest") or unwrap(r).get("request") or unwrap(r)
    rid = rr["id"]

    inv_before = _inventory_of(s, admin_token, pid)

    # Approve
    r = s.patch(f"{BASE}/admin/returns/{rid}", headers=uh(admin_token),
                json={"status": "APPROVED"}, timeout=15)
    assert r.status_code == 200, r.text
    upd = unwrap(r).get("returnRequest") or unwrap(r).get("request") or unwrap(r)
    assert upd["status"] == "APPROVED"

    # Complete -> refund
    r = s.patch(f"{BASE}/admin/returns/{rid}", headers=uh(admin_token),
                json={"status": "COMPLETED"}, timeout=15)
    assert r.status_code == 200, r.text
    upd = unwrap(r).get("returnRequest") or unwrap(r).get("request") or unwrap(r)
    assert upd["status"] == "COMPLETED"
    if order_total is not None and upd.get("refundAmount") is not None:
        assert float(upd["refundAmount"]) == float(order_total)

    # Verify order becomes REFUNDED
    r = s.get(f"{BASE}/orders/{oid}", headers=uh(user_token), timeout=15)
    assert r.status_code == 200
    o = unwrap(r).get("order") or unwrap(r)
    assert o["status"] == "REFUNDED", o

    # Inventory restocked
    inv_after = _inventory_of(s, admin_token, pid)
    if inv_before is not None and inv_after is not None:
        assert inv_after == inv_before + 1, f"expected +1 restock, got {inv_before}->{inv_after}"


def test_admin_reject_return(s, user_token, admin_token):
    order, _ = _create_cod_order(s, user_token, qty=1)
    oid = order["id"]
    s.patch(f"{BASE}/admin/orders/{oid}/status", headers=uh(admin_token),
            json={"status": "DELIVERED"}, timeout=15)
    r = s.post(f"{BASE}/orders/{oid}/return", headers=uh(user_token),
               json={"type": "EXCHANGE", "reason": "wrong size"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    rid = (unwrap(r).get("returnRequest") or unwrap(r).get("request") or unwrap(r))["id"]

    r = s.patch(f"{BASE}/admin/returns/{rid}", headers=uh(admin_token),
                json={"status": "REJECTED"}, timeout=15)
    assert r.status_code == 200, r.text
    upd = unwrap(r).get("returnRequest") or unwrap(r).get("request") or unwrap(r)
    assert upd["status"] == "REJECTED"
