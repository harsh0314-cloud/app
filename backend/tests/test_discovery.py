"""Tests for product discovery: related, FBT, suggestions, slug 404."""
import os
import requests
import pytest

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://cart-checkout-205.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"

SLUG = "merino-wool-sweater"


def unwrap(r):
    assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
    j = r.json()
    assert j.get("status") == "success", j
    return j["data"]


# Related products
def test_related_returns_up_to_4():
    data = unwrap(requests.get(f"{API}/products/{SLUG}/related", timeout=20))
    prods = data["products"]
    assert isinstance(prods, list)
    assert 1 <= len(prods) <= 4
    slugs = [p["slug"] for p in prods]
    assert SLUG not in slugs
    # verify fields
    for p in prods:
        assert p.get("isActive") is True
        assert "name" in p and "price" in p


def test_related_404_on_bad_slug():
    r = requests.get(f"{API}/products/does-not-exist-xyz/related", timeout=20)
    assert r.status_code == 404, r.text[:200]


# FBT
def test_fbt_returns_up_to_3():
    data = unwrap(requests.get(f"{API}/products/{SLUG}/frequently-bought-together", timeout=20))
    prods = data["products"]
    assert isinstance(prods, list)
    assert len(prods) <= 3
    slugs = [p["slug"] for p in prods]
    assert SLUG not in slugs


def test_fbt_404_bad_slug():
    r = requests.get(f"{API}/products/nope-xyz/frequently-bought-together", timeout=20)
    assert r.status_code == 404


# Suggestions
def test_suggestions_empty_q():
    data = unwrap(requests.get(f"{API}/products/suggestions?q=", timeout=20))
    assert data["suggestions"] == []


def test_suggestions_wool():
    data = unwrap(requests.get(f"{API}/products/suggestions?q=wool", timeout=20))
    s = data["suggestions"]
    assert len(s) >= 1
    names = [x["name"].lower() for x in s]
    assert any("wool" in n for n in names) or any("merino" in n for n in names)
    # each item shape
    for item in s:
        for f in ("id", "name", "slug", "price", "category", "images"):
            assert f in item


def test_suggestions_case_insensitive():
    d1 = unwrap(requests.get(f"{API}/products/suggestions?q=WOOL", timeout=20))
    d2 = unwrap(requests.get(f"{API}/products/suggestions?q=wool", timeout=20))
    assert len(d1["suggestions"]) == len(d2["suggestions"])


def test_suggestions_max_6():
    data = unwrap(requests.get(f"{API}/products/suggestions?q=e", timeout=20))
    assert len(data["suggestions"]) <= 6


# product-by-slug 404 (previously crashed with ReferenceError)
def test_product_by_bad_slug_returns_404_not_500():
    r = requests.get(f"{API}/products/definitely-not-real-slug-zzz", timeout=20)
    assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text[:200]}"


def test_product_by_good_slug():
    data = unwrap(requests.get(f"{API}/products/{SLUG}", timeout=20))
    assert data["product"]["slug"] == SLUG
