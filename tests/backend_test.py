"""StoreX Ecommerce backend API tests"""
import os
import time
import pytest
import requests

BASE = "https://cart-checkout-205.preview.emergentagent.com/api"
USER = {"email": "user@storex.com", "password": "User@1234"}
ADMIN = {"email": "admin@storex.com", "password": "Admin@1234"}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()

@pytest.fixture(scope="session")
def user_token(s):
    r = s.post(f"{BASE}/auth/login", json=USER, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    tok = (d.get("data") or d).get("token") or d.get("token")
    assert tok
    return tok

@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{BASE}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    tok = (d.get("data") or d).get("token") or d.get("token")
    assert tok
    return tok

def uh(t): return {"Authorization": f"Bearer {t}"}


# ---------- health ----------
def test_health(s):
    r = s.get(f"{BASE}/health", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


# ---------- auth ----------
def test_register_new_user(s):
    email = f"TEST_user_{int(time.time())}@example.com"
    r = s.post(f"{BASE}/auth/register", json={
        "email": email, "password": "TestPass@123",
        "firstName": "T", "lastName": "U", "phone": "9999999999"
    }, timeout=15)
    assert r.status_code in (200, 201), r.text
    d = r.json().get("data") or r.json()
    assert "token" in d and "user" in d
    assert d["user"]["email"] == email

def test_login_user(user_token):
    assert isinstance(user_token, str) and len(user_token) > 10

def test_login_invalid(s):
    r = s.post(f"{BASE}/auth/login", json={"email": "user@storex.com", "password": "wrong"}, timeout=15)
    assert r.status_code == 401

def test_me(s, user_token):
    r = s.get(f"{BASE}/auth/me", headers=uh(user_token), timeout=15)
    assert r.status_code == 200
    d = r.json().get("data") or r.json()
    u = d.get("user") or d
    assert u["email"] == USER["email"]


# ---------- products ----------
def test_products_list(s):
    r = s.get(f"{BASE}/products", timeout=15)
    assert r.status_code == 200
    d = r.json().get("data") or r.json()
    prods = d.get("products") or d.get("items") or d
    assert isinstance(prods, list) and len(prods) > 0
    # store slug for later
    pytest.first_slug = prods[0].get("slug")
    pytest.first_id = prods[0].get("id")

def test_products_search(s):
    r = s.get(f"{BASE}/products?search=shirt", timeout=15)
    assert r.status_code == 200

def test_products_category(s):
    r = s.get(f"{BASE}/products?category=apparel", timeout=15)
    assert r.status_code == 200

def test_products_sort(s):
    r = s.get(f"{BASE}/products?sort=price-asc", timeout=15)
    assert r.status_code == 200

def test_product_detail(s):
    slug = getattr(pytest, "first_slug", None)
    if not slug:
        pytest.skip("no slug")
    r = s.get(f"{BASE}/products/{slug}", timeout=15)
    assert r.status_code == 200
    d = r.json().get("data") or r.json()
    p = d.get("product") or d
    assert p.get("slug") == slug


# ---------- cart ----------
def test_cart_flow(s, user_token):
    h = uh(user_token)
    # clear first
    s.delete(f"{BASE}/cart/clear", headers=h, timeout=15)
    pid = getattr(pytest, "first_id", None)
    assert pid, "no product id"
    r = s.post(f"{BASE}/cart", headers=h, json={"productId": pid, "quantity": 1}, timeout=15)
    assert r.status_code in (200, 201), r.text
    r = s.get(f"{BASE}/cart", headers=h, timeout=15)
    assert r.status_code == 200
    d = r.json().get("data") or r.json()
    items = d.get("items") or (d.get("cart") or {}).get("items") or []
    assert len(items) >= 1
    item_id = items[0].get("id")
    pytest.cart_item_id = item_id
    # update qty
    r = s.patch(f"{BASE}/cart/{item_id}", headers=h, json={"quantity": 2}, timeout=15)
    assert r.status_code == 200, r.text
    # remove
    r = s.delete(f"{BASE}/cart/{item_id}", headers=h, timeout=15)
    assert r.status_code in (200, 204)


# ---------- wishlist ----------
def test_wishlist_flow(s, user_token):
    h = uh(user_token)
    pid = getattr(pytest, "first_id", None)
    r = s.post(f"{BASE}/wishlist", headers=h, json={"productId": pid}, timeout=15)
    assert r.status_code in (200, 201, 409), r.text
    r = s.get(f"{BASE}/wishlist", headers=h, timeout=15)
    assert r.status_code == 200
    r = s.get(f"{BASE}/wishlist/check/{pid}", headers=h, timeout=15)
    assert r.status_code == 200
    r = s.delete(f"{BASE}/wishlist/{pid}", headers=h, timeout=15)
    assert r.status_code in (200, 204)


# ---------- coupons ----------
def test_coupon_validate(s, user_token):
    h = uh(user_token)
    r = s.post(f"{BASE}/coupons/validate", headers=h,
               json={"code": "WELCOME10", "subtotal": 1000}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json().get("data") or r.json()
    assert d.get("discount") or d.get("discountAmount") or d.get("coupon")


# ---------- orders COD ----------
def test_create_cod_order(s, user_token):
    h = uh(user_token)
    pid = getattr(pytest, "first_id", None)
    # add item
    s.delete(f"{BASE}/cart/clear", headers=h, timeout=15)
    r = s.post(f"{BASE}/cart", headers=h, json={"productId": pid, "quantity": 1}, timeout=15)
    assert r.status_code in (200, 201), r.text
    # create order
    payload = {
        "paymentMethod": "CASH_ON_DELIVERY",
        "couponCode": "WELCOME10",
        "firstName": "Test", "lastName": "User", "phone": "9999999999",
        "addressLine1": "123 Test St", "city": "Mumbai",
        "state": "MH", "postalCode": "400001", "country": "IN"
    }
    r = s.post(f"{BASE}/orders", headers=h, json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    d = r.json().get("data") or r.json()
    order = d.get("order") or d
    assert order.get("status") in ("CONFIRMED", "PENDING", "confirmed")
    assert order.get("total") or order.get("totalAmount")
    pytest.order_id = order.get("id")

def test_my_orders(s, user_token):
    r = s.get(f"{BASE}/orders/my-orders", headers=uh(user_token), timeout=15)
    assert r.status_code == 200

def test_get_order(s, user_token):
    oid = getattr(pytest, "order_id", None)
    if not oid:
        pytest.skip("no order id")
    r = s.get(f"{BASE}/orders/{oid}", headers=uh(user_token), timeout=15)
    assert r.status_code == 200


# ---------- Razorpay ----------
def test_razorpay_create_order(s, user_token):
    h = uh(user_token)
    pid = getattr(pytest, "first_id", None)
    s.delete(f"{BASE}/cart/clear", headers=h, timeout=15)
    s.post(f"{BASE}/cart", headers=h, json={"productId": pid, "quantity": 1}, timeout=15)
    payload = {
        "couponCode": "WELCOME10",
        "firstName": "Test", "lastName": "User", "phone": "9999999999",
        "addressLine1": "123 Test St", "city": "Mumbai",
        "state": "MH", "postalCode": "400001", "country": "IN"
    }
    r = s.post(f"{BASE}/payments/create-razorpay-order", headers=h, json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    d = r.json().get("data") or r.json()
    assert d.get("orderId") or d.get("order_id") or d.get("id"), f"no order_id in {d}"
    assert d.get("key") or d.get("keyId"), f"no key in {d}"
    assert d.get("amount") is not None


# ---------- reviews ----------
def test_reviews_for_product(s):
    pid = getattr(pytest, "first_id", None)
    r = s.get(f"{BASE}/reviews/product/{pid}", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json().get("data") or r.json()
    assert "reviews" in d or "avgRating" in d or isinstance(d, list)

def test_can_review(s, user_token):
    pid = getattr(pytest, "first_id", None)
    r = s.get(f"{BASE}/reviews/can-review/{pid}", headers=uh(user_token), timeout=15)
    assert r.status_code == 200


# ---------- admin ----------
def test_admin_stats(s, admin_token):
    r = s.get(f"{BASE}/admin/stats", headers=uh(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json().get("data") or r.json()
    stats = d.get("stats") or d
    for k in ["totalProducts", "totalOrders", "totalUsers", "totalRevenue"]:
        assert k in stats, f"missing {k}"
    assert "recentOrders" in d
    assert "lowStockProducts" in d

def test_admin_orders(s, admin_token):
    r = s.get(f"{BASE}/admin/orders?page=1&limit=10", headers=uh(admin_token), timeout=15)
    assert r.status_code == 200

def test_admin_inventory(s, admin_token):
    r = s.get(f"{BASE}/admin/inventory", headers=uh(admin_token), timeout=15)
    assert r.status_code == 200

def test_admin_customers(s, admin_token):
    r = s.get(f"{BASE}/admin/customers", headers=uh(admin_token), timeout=15)
    assert r.status_code == 200

def test_rbac_non_admin_forbidden(s, user_token):
    r = s.get(f"{BASE}/admin/stats", headers=uh(user_token), timeout=15)
    assert r.status_code == 403

def test_admin_update_order_status(s, admin_token):
    r = s.get(f"{BASE}/admin/orders?page=1&limit=1", headers=uh(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json().get("data") or r.json()
    orders = d.get("orders") or d.get("items") or []
    if not orders:
        pytest.skip("no orders")
    oid = orders[0]["id"]
    r = s.patch(f"{BASE}/admin/orders/{oid}/status", headers=uh(admin_token),
                json={"status": "PROCESSING"}, timeout=15)
    assert r.status_code == 200, r.text

def test_admin_create_product(s, admin_token):
    # get an existing category & brand from products list
    r0 = s.get(f"{BASE}/products?limit=1", timeout=15)
    p0 = ((r0.json().get("data") or r0.json()).get("products") or [])[0]
    category_id = (p0.get("category") or {}).get("id") or p0.get("categoryId")
    brand_id = (p0.get("brand") or {}).get("id") or p0.get("brandId")
    if not (category_id and brand_id):
        pytest.skip("no category/brand ids visible")
    ts = int(time.time())
    payload = {
        "name": f"TEST_Prod_{ts}",
        "slug": f"test-prod-{ts}",
        "description": "test",
        "price": 999,
        "categoryId": category_id,
        "brandId": brand_id,
        "sku": f"TEST-SKU-{ts}",
        "inventory": {"quantity": 10, "lowStockThreshold": 2}
    }
    r = s.post(f"{BASE}/admin/products", headers=uh(admin_token), json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
