"""Backend tests for per-product Key Highlights + Size Guide (StoreX)."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = "https://ecommerce-preview-45.preview.emergentagent.com"
ADMIN_EMAIL = "admin@storex.com"
ADMIN_PASSWORD = "Admin@1234"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    tok = data.get("token") or data.get("data", {}).get("token")
    assert tok, f"No token in login response: {data}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def category_and_brand(admin_headers):
    cats = requests.get(f"{BASE_URL}/api/admin/categories", headers=admin_headers).json()
    brands = requests.get(f"{BASE_URL}/api/admin/brands", headers=admin_headers).json()
    cat_list = cats.get("data", {}).get("categories", [])
    brand_list = brands.get("data", {}).get("brands", [])
    assert cat_list and brand_list, "Missing categories/brands"
    return cat_list[0]["id"], brand_list[0]["id"]


# ── Product WITH attributes ─────────────────────────────────────────
def test_get_product_with_attributes():
    r = requests.get(f"{BASE_URL}/api/products/air-runner-sneakers-test")
    assert r.status_code == 200
    p = r.json()["data"]["product"]
    kh = p["keyHighlights"]
    assert isinstance(kh, list) and len(kh) == 4
    labels = {h["label"] for h in kh}
    assert {"Sole Material", "Upper Material", "Closure", "Country of Origin"} <= labels
    sg = p["sizeGuide"]
    assert sg["columns"] == ["UK", "US", "EU", "Foot Length (cm)"]
    assert len(sg["rows"]) >= 1


# ── Product WITHOUT attributes ──────────────────────────────────────
def test_get_product_without_attributes():
    r = requests.get(f"{BASE_URL}/api/products/essential-cotton-tee")
    assert r.status_code == 200
    p = r.json()["data"]["product"]
    assert p.get("keyHighlights") in (None, [], {})
    assert p.get("sizeGuide") in (None, {}, [])


# ── Admin login works ───────────────────────────────────────────────
def test_admin_login(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 10


# ── Create product with attributes ──────────────────────────────────
@pytest.fixture(scope="module")
def created_product(admin_headers, category_and_brand):
    cat_id, brand_id = category_and_brand
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "name": f"TEST Attr Product {uniq}",
        "slug": f"test-attr-product-{uniq}",
        "price": 999,
        "description": "test",
        "categoryId": cat_id,
        "brandId": brand_id,
        "inventory": {"quantity": 5, "lowStockThreshold": 2},
        "images": [{"url": "https://images.unsplash.com/photo-1"}],
        "keyHighlights": [
            {"label": "Fabric", "value": "Cotton"},
            {"label": "Fit", "value": "Regular"},
            {"label": "", "value": "should-be-filtered"},
        ],
        "sizeGuide": {
            "columns": ["Size", "Chest", "Length"],
            "rows": [["S", "36", "26"], ["M", "38", "27"]],
        },
    }
    r = requests.post(f"{BASE_URL}/api/admin/products",
                      headers=admin_headers, json=payload)
    assert r.status_code == 201, r.text
    prod = r.json()["data"]["product"]
    assert prod["slug"] == payload["slug"]
    yield prod, payload
    # teardown
    requests.delete(f"{BASE_URL}/api/admin/products/{prod['id']}",
                    headers=admin_headers)


def test_create_persists_attributes(created_product):
    prod, payload = created_product
    # Verify persistence via public GET
    r = requests.get(f"{BASE_URL}/api/products/{payload['slug']}")
    assert r.status_code == 200
    p = r.json()["data"]["product"]
    kh = p["keyHighlights"]
    assert isinstance(kh, list) and len(kh) == 2  # empty-label row filtered
    assert {h["label"] for h in kh} == {"Fabric", "Fit"}
    sg = p["sizeGuide"]
    assert sg["columns"] == ["Size", "Chest", "Length"]
    assert len(sg["rows"]) == 2


# ── PATCH updates attributes ────────────────────────────────────────
def test_patch_updates_attributes(admin_headers, created_product):
    prod, payload = created_product
    upd = {
        "keyHighlights": [
            {"label": "Fabric", "value": "Linen"},
            {"label": "Care", "value": "Machine Wash"},
        ],
        "sizeGuide": {
            "columns": ["UK", "US", "EU", "Foot Length (cm)"],
            "rows": [["6", "7", "40", "25"]],
        },
    }
    r = requests.patch(f"{BASE_URL}/api/admin/products/{prod['id']}",
                       headers=admin_headers, json=upd)
    assert r.status_code == 200, r.text
    # Verify
    r = requests.get(f"{BASE_URL}/api/products/{payload['slug']}")
    p = r.json()["data"]["product"]
    kh = p["keyHighlights"]
    assert {h["label"] for h in kh} == {"Fabric", "Care"}
    assert p["sizeGuide"]["columns"] == ["UK", "US", "EU", "Foot Length (cm)"]


# ── PATCH can clear attributes (null) ───────────────────────────────
def test_patch_clears_attributes(admin_headers, created_product):
    prod, payload = created_product
    r = requests.patch(
        f"{BASE_URL}/api/admin/products/{prod['id']}",
        headers=admin_headers,
        json={"keyHighlights": [], "sizeGuide": None},
    )
    assert r.status_code == 200, r.text
    r = requests.get(f"{BASE_URL}/api/products/{payload['slug']}")
    p = r.json()["data"]["product"]
    # Empty highlights -> null (per controller: cleanHighlights would be [] filtered from []=empty; store as null)
    assert p.get("keyHighlights") in (None, [])
    assert p.get("sizeGuide") in (None, {})


# ── Regression: cart add with size still works ─────────────────────
def test_cart_add_with_size_regression():
    guest = requests.post(f"{BASE_URL}/api/auth/guest")
    assert guest.status_code in (200, 201), guest.text
    gdata = guest.json()
    tok = gdata.get("token") or gdata.get("data", {}).get("token")
    assert tok
    # Get any product id
    prods = requests.get(f"{BASE_URL}/api/products?limit=1").json()["data"]["products"]
    pid = prods[0]["id"]
    r = requests.post(
        f"{BASE_URL}/api/cart",
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
        json={"productId": pid, "quantity": 1, "size": "M"},
    )
    assert r.status_code in (200, 201), r.text
