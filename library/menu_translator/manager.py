"""Menu item / dish management with input validation."""

import uuid
from datetime import datetime


class MenuItemManager:
    """Validates and constructs dish records.

    Storage-agnostic: this class does not persist anything. It returns plain
    dict records that callers can write to DynamoDB or hold in memory.
    """

    VALID_CATEGORIES = (
        "Starter",
        "Main",
        "Side",
        "Dessert",
        "Drink",
        "Special",
    )

    VALID_ALLERGENS = (
        "gluten",
        "dairy",
        "egg",
        "nuts",
        "peanut",
        "soy",
        "fish",
        "shellfish",
        "sesame",
        "mustard",
        "celery",
        "sulphites",
    )

    def __init__(self):
        self._dishes = {}

    def create_dish(self, name, description, price, category, allergens=None,
                    image_url="", available=True):
        """Create a validated dish record."""
        if not name or not name.strip():
            raise ValueError("Dish name is required")
        if description is None:
            description = ""
        if not isinstance(price, (int, float)):
            raise ValueError("price must be numeric")
        if price < 0:
            raise ValueError("price cannot be negative")
        if category not in self.VALID_CATEGORIES:
            raise ValueError(
                f"category must be one of {', '.join(self.VALID_CATEGORIES)}"
            )

        normalised_allergens = []
        for a in (allergens or []):
            if a not in self.VALID_ALLERGENS:
                raise ValueError(f"unknown allergen: {a}")
            normalised_allergens.append(a)

        dish = {
            "id": str(uuid.uuid4()),
            "entityType": "dish",
            "name": name.strip(),
            "description": description.strip(),
            "price": float(price),
            "category": category,
            "allergens": normalised_allergens,
            "image_url": image_url,
            "available": bool(available),
            "created_at": datetime.utcnow().isoformat(),
        }
        self._dishes[dish["id"]] = dish
        return dish

    def update_dish(self, dish_id, **updates):
        dish = self._dishes.get(dish_id)
        if not dish:
            raise ValueError("Dish not found")

        if "category" in updates and updates["category"] not in self.VALID_CATEGORIES:
            raise ValueError("invalid category")
        if "price" in updates:
            if not isinstance(updates["price"], (int, float)) or updates["price"] < 0:
                raise ValueError("price must be non-negative number")
            updates["price"] = float(updates["price"])
        if "allergens" in updates:
            for a in updates["allergens"]:
                if a not in self.VALID_ALLERGENS:
                    raise ValueError(f"unknown allergen: {a}")

        dish.update(updates)
        dish["updated_at"] = datetime.utcnow().isoformat()
        return dish

    def get_dish(self, dish_id):
        return self._dishes.get(dish_id)

    def list_dishes(self, category=None, available_only=False):
        items = list(self._dishes.values())
        if category:
            items = [d for d in items if d["category"] == category]
        if available_only:
            items = [d for d in items if d.get("available")]
        return items

    def delete_dish(self, dish_id):
        if dish_id not in self._dishes:
            raise ValueError("Dish not found")
        del self._dishes[dish_id]
        return True

    def contains_allergen(self, dish, allergen):
        """Return True if the given dish dict lists the allergen."""
        return allergen in (dish.get("allergens") or [])
