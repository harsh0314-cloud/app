"""
StoreX backend tests — covers new features from iteration 8:
addresses, notifications, recently-viewed, admin analytics, inventory, XSS, SEO.
"""
import pytest
import requests

BASE_URL = "https://d558cfe5-5754-479f-9b3d-d01f1b4b5a8f.preview.emergentagent.com"
API = f"{BASE_URL}/api"

USER = {"email": "user@storex.com", "password": "User@1234"}
ADMIN = {"email": "admin@storex.com", "password": "Admin@1234"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["data"]["token"]


@pytest.fixture(scope="session")
def user_headers():
    return {"Authorization": f"Bearer {_login(USER)}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_headers():
    return {"Authorization": f"Bearer {_login(ADMIN)}", "Content-Type": "application/json"}


# ----- Addresses CRUD -----

class TestAddresses:
    created_id = None

    def test_list_addresses(self, user_headers):
        r = requests.get(f"{API}/users/addresses", headers=user_headers)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "success"

    def test_create_address(self, user_headers):
        payload = {
            "firstName": "TEST_John", "lastName": "Doe",
            "phone": "9999999999", "addressLine1": "123 Test Street",
            "city": "Mumbai", "state": "MH",
            "postalCode": "400001", "country": "India",
        }
        r = requests.post(f"{API}/users/addresses", headers=user_headers, json=payload)
        assert r.status_code in (200, 201), r.text
        data = r.json()["data"]
        addr = data.get("address") or data
        assert "id" in addr
        assert addr.get("firstName") == "TEST_John"
        TestAddresses.created_id = addr["id"]

    def test_set_default(self, user_headers):
        assert TestAddresses.created_id
        r = requests.patch(f"{API}/users/addresses/{TestAddresses.created_id}/default", headers=user_headers)
        assert r.status_code in (200, 204), r.text

    def test_update_address(self, user_headers):
        assert TestAddresses.created_id
        r = requests.patch(
            f"{API}/users/addresses/{TestAddresses.created_id}",
            headers=user_headers, json={"city": "Pune"},
        )
        assert r.status_code == 200, r.text
        # verify persisted
        rl = requests.get(f"{API}/users/addresses", headers=user_headers)
        addrs = rl.json()["data"]
        addrs = addrs.get("addresses", addrs) if isinstance(addrs, dict) else addrs
        found = [a for a in addrs if a["id"] == TestAddresses.created_id]
        assert found and found[0]["city"] == "Pune", found

    def test_xss_sanitization(self, user_headers):
        payload = {
            "firstName": "<script>alert(1)</script>Bad", "lastName": "Doe",
            "phone": "9999999999", "addressLine1": "1 XSS Rd",
            "city": "Delhi", "state": "DL",
            "postalCode": "110001", "country": "India",
        }
        r = requests.post(f"{API}/users/addresses", headers=user_headers, json=payload)
        assert r.status_code in (200, 201), r.text
        addr = r.json()["data"].get("address") or r.json()["data"]
        assert "<script>" not in (addr.get("firstName") or ""), addr
        if addr.get("id"):
            requests.delete(f"{API}/users/addresses/{addr['id']}", headers=user_headers)

    def test_delete_address(self, user_headers):
        assert TestAddresses.created_id
        r = requests.delete(f"{API}/users/addresses/{TestAddresses.created_id}", headers=user_headers)
        assert r.status_code in (200, 204), r.text


# ----- Notifications -----

class TestNotifications:
    def test_list_notifications(self, user_headers):
        r = requests.get(f"{API}/users/notifications", headers=user_headers)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "success"

    def test_mark_all_read(self, user_headers):
        r = requests.patch(f"{API}/users/notifications/read-all", headers=user_headers)
        assert r.status_code in (200, 204), r.text


# ----- Recently viewed -----

class TestRecentlyViewed:
    pid = None

    def test_record_view(self, user_headers):
        rp = requests.get(f"{API}/products?limit=3")
        assert rp.status_code == 200
        data = rp.json()["data"]
        products = data.get("products", data) if isinstance(data, dict) else data
        assert len(products) >= 1
        TestRecentlyViewed.pid = products[0]["id"]
        r = requests.post(
            f"{API}/users/recently-viewed",
            headers=user_headers, json={"productId": TestRecentlyViewed.pid},
        )
        assert r.status_code in (200, 201), r.text

    def test_list_recently_viewed(self, user_headers):
        r = requests.get(f"{API}/users/recently-viewed", headers=user_headers)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "success"


# ----- Admin analytics -----

class TestAdminAnalytics:
    def test_sales(self, admin_headers):
        r = requests.get(f"{API}/admin/analytics/sales?range=30d", headers=admin_headers)
        assert r.status_code == 200, r.text

    def test_revenue(self, admin_headers):
        r = requests.get(f"{API}/admin/analytics/revenue?range=30d", headers=admin_headers)
        assert r.status_code == 200, r.text

    def test_customers(self, admin_headers):
        r = requests.get(f"{API}/admin/analytics/customers?range=30d", headers=admin_headers)
        assert r.status_code == 200, r.text

    def test_low_stock(self, admin_headers):
        r = requests.get(f"{API}/admin/inventory/low-stock", headers=admin_headers)
        assert r.status_code == 200, r.text

    def test_inventory_list(self, admin_headers):
        r = requests.get(f"{API}/admin/inventory", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()["data"]
        items = data.get("inventory") or data.get("items") or data.get("products") or data
        # It should have entries - previous bug was empty list
        assert isinstance(items, list), data
        # Note: may be legitimately empty if no products, but seeded has 2
        assert len(items) >= 1, f"Inventory list still appears empty: {data}"

    def test_export_orders_csv(self, admin_headers):
        r = requests.get(f"{API}/admin/orders/export", headers=admin_headers)
        assert r.status_code == 200, r.text
        ct = r.headers.get("Content-Type", "")
        assert "csv" in ct.lower() or "text" in ct.lower(), ct


# ----- SEO -----

class TestSEO:
    def test_robots(self):
        r = requests.get(f"{BASE_URL}/robots.txt")
        assert r.status_code == 200
        assert "User-agent" in r.text or "user-agent" in r.text.lower()

    def test_sitemap(self):
        r = requests.get(f"{API}/seo/sitemap.xml")
        assert r.status_code == 200
        assert "<urlset" in r.text or "<sitemap" in r.text
