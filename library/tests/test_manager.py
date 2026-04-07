import pytest
from menu_translator import MenuItemManager


@pytest.fixture
def mgr():
    return MenuItemManager()


def test_create_basic(mgr):
    d = mgr.create_dish("Margherita Pizza", "Tomato, mozzarella, basil", 12.5, "Main")
    assert d["name"] == "Margherita Pizza"
    assert d["price"] == 12.5
    assert d["category"] == "Main"
    assert d["available"] is True
    assert d["entityType"] == "dish"
    assert d["allergens"] == []


def test_create_with_allergens(mgr):
    d = mgr.create_dish("Pasta", "Egg pasta", 10, "Main", allergens=["gluten", "egg"])
    assert d["allergens"] == ["gluten", "egg"]


def test_create_empty_name_rejected(mgr):
    with pytest.raises(ValueError, match="name"):
        mgr.create_dish("", "x", 1, "Main")


def test_create_none_description_ok(mgr):
    d = mgr.create_dish("Water", None, 0, "Drink")
    assert d["description"] == ""


def test_create_negative_price_rejected(mgr):
    with pytest.raises(ValueError, match="negative"):
        mgr.create_dish("Free dish", "x", -1, "Main")


def test_create_non_numeric_price_rejected(mgr):
    with pytest.raises(ValueError, match="numeric"):
        mgr.create_dish("Dish", "x", "5", "Main")


def test_create_invalid_category_rejected(mgr):
    with pytest.raises(ValueError, match="category"):
        mgr.create_dish("Dish", "x", 1, "NotACategory")


def test_create_unknown_allergen_rejected(mgr):
    with pytest.raises(ValueError, match="allergen"):
        mgr.create_dish("Dish", "x", 1, "Main", allergens=["plutonium"])


def test_create_zero_price_allowed(mgr):
    d = mgr.create_dish("Water", "Tap water", 0, "Drink")
    assert d["price"] == 0.0


def test_create_image_url(mgr):
    d = mgr.create_dish("Burger", "x", 9, "Main", image_url="https://cdn.example.com/b.jpg")
    assert d["image_url"] == "https://cdn.example.com/b.jpg"


def test_create_available_false(mgr):
    d = mgr.create_dish("Seasonal", "x", 5, "Special", available=False)
    assert d["available"] is False


def test_update_price(mgr):
    d = mgr.create_dish("Pizza", "x", 10, "Main")
    updated = mgr.update_dish(d["id"], price=14)
    assert updated["price"] == 14.0
    assert "updated_at" in updated


def test_update_category(mgr):
    d = mgr.create_dish("Cake", "x", 5, "Dessert")
    updated = mgr.update_dish(d["id"], category="Special")
    assert updated["category"] == "Special"


def test_update_invalid_category(mgr):
    d = mgr.create_dish("Cake", "x", 5, "Dessert")
    with pytest.raises(ValueError, match="category"):
        mgr.update_dish(d["id"], category="Bogus")


def test_update_negative_price(mgr):
    d = mgr.create_dish("Cake", "x", 5, "Dessert")
    with pytest.raises(ValueError, match="price"):
        mgr.update_dish(d["id"], price=-1)


def test_update_not_found(mgr):
    with pytest.raises(ValueError, match="not found"):
        mgr.update_dish("ghost", price=10)


def test_list_all(mgr):
    mgr.create_dish("A", "x", 1, "Main")
    mgr.create_dish("B", "x", 2, "Dessert")
    assert len(mgr.list_dishes()) == 2


def test_list_by_category(mgr):
    mgr.create_dish("A", "x", 1, "Main")
    mgr.create_dish("B", "x", 2, "Dessert")
    mgr.create_dish("C", "x", 3, "Main")
    mains = mgr.list_dishes(category="Main")
    assert len(mains) == 2


def test_list_available_only(mgr):
    mgr.create_dish("A", "x", 1, "Main", available=True)
    mgr.create_dish("B", "x", 2, "Main", available=False)
    avail = mgr.list_dishes(available_only=True)
    assert len(avail) == 1
    assert avail[0]["name"] == "A"


def test_delete(mgr):
    d = mgr.create_dish("Gone", "x", 1, "Main")
    assert mgr.delete_dish(d["id"]) is True
    assert mgr.get_dish(d["id"]) is None


def test_delete_not_found(mgr):
    with pytest.raises(ValueError, match="not found"):
        mgr.delete_dish("ghost")


def test_contains_allergen(mgr):
    d = mgr.create_dish("Pasta", "x", 5, "Main", allergens=["gluten", "egg"])
    assert mgr.contains_allergen(d, "gluten") is True
    assert mgr.contains_allergen(d, "nuts") is False


def test_get_dish_returns_none_if_missing(mgr):
    assert mgr.get_dish("nope") is None
