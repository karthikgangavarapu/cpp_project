"""Seed demo users, a sample restaurant, and a menu of dishes.

Idempotent: skips items that already exist (users by email, restaurant by
name, dishes by name scoped to the restaurant).

Invoked by the CI/CD pipeline as the final step of deploy-backend.
"""

import os
import sys
import uuid
import hashlib
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

REGION = os.environ.get("REGION", "eu-west-1")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "menumix-prod")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


def to_decimal(val):
    if isinstance(val, float):
        return Decimal(str(val))
    if isinstance(val, int) and not isinstance(val, bool):
        return Decimal(str(val))
    if isinstance(val, dict):
        return {k: to_decimal(v) for k, v in val.items()}
    if isinstance(val, list):
        return [to_decimal(i) for i in val]
    return val


def hash_password(password):
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return hashed, salt


def user_exists(email):
    items = table.scan(
        FilterExpression=Attr("entityType").eq("user") & Attr("email").eq(email)
    ).get("Items", [])
    return bool(items)


def restaurant_by_name(name):
    items = table.scan(
        FilterExpression=Attr("entityType").eq("restaurant") & Attr("name").eq(name)
    ).get("Items", [])
    return items[0] if items else None


def dish_exists_in_restaurant(restaurant_id, name):
    items = table.scan(
        FilterExpression=(
            Attr("entityType").eq("dish")
            & Attr("restaurant_id").eq(restaurant_id)
            & Attr("name").eq(name)
        )
    ).get("Items", [])
    return bool(items)


def seed_user(username, email, password, role):
    if user_exists(email):
        print(f"  user {email} exists, skipping")
        return
    hashed, salt = hash_password(password)
    item = {
        "id": str(uuid.uuid4()),
        "entityType": "user",
        "username": username,
        "email": email,
        "password": hashed,
        "salt": salt,
        "role": role,
        "preferred_language": "en",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=to_decimal(item))
    print(f"  + user {email} ({role})")


def seed_restaurant():
    name = "Sapore di Roma"
    existing = restaurant_by_name(name)
    if existing:
        print(f"  restaurant '{name}' exists, skipping")
        return existing["id"]
    rest_id = str(uuid.uuid4())
    item = {
        "id": rest_id,
        "entityType": "restaurant",
        "name": name,
        "cuisine": "Italian",
        "address": "14 Capel Street, Dublin 1, Ireland",
        "description": "Authentic family-run Italian trattoria specialising in Roman classics.",
        "currency": "EUR",
        "default_language": "en",
        "owner_id": "seed-admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=to_decimal(item))
    print(f"  + restaurant '{name}'")
    return rest_id


SAMPLE_DISHES = [
    ("Bruschetta al Pomodoro", "Toasted bread topped with diced tomatoes, garlic and fresh basil", 6.50,  "Starter", ["gluten"]),
    ("Caprese Salad",          "Fresh mozzarella, tomatoes and basil with extra virgin olive oil", 8.00,  "Starter", ["dairy"]),
    ("Spaghetti Carbonara",    "Classic Roman pasta with guanciale, egg yolk and Pecorino Romano",  14.50, "Main",    ["gluten", "egg", "dairy"]),
    ("Margherita Pizza",       "San Marzano tomato, fior di latte mozzarella and basil",            12.00, "Main",    ["gluten", "dairy"]),
    ("Osso Buco",              "Slow-braised veal shank with saffron risotto and gremolata",        22.00, "Main",    ["dairy"]),
    ("Patatas al Forno",       "Roasted potatoes with rosemary, sea salt and olive oil",             5.00, "Side",    []),
    ("Tiramisu",               "Layered coffee-soaked ladyfingers with mascarpone cream",            7.50, "Dessert", ["gluten", "egg", "dairy"]),
    ("Panna Cotta",            "Vanilla bean cream dessert with wild berry compote",                 6.50, "Dessert", ["dairy"]),
    ("Chianti Classico",       "Glass of Tuscan red wine, DOCG certified",                           7.00, "Drink",   ["sulphites"]),
    ("San Pellegrino",         "Sparkling mineral water from the Italian Alps",                      3.00, "Drink",   []),
]


def seed_dishes(restaurant_id):
    for name, description, price, category, allergens in SAMPLE_DISHES:
        if dish_exists_in_restaurant(restaurant_id, name):
            print(f"  dish '{name}' exists, skipping")
            continue
        item = {
            "id": str(uuid.uuid4()),
            "entityType": "dish",
            "restaurant_id": restaurant_id,
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "allergens": allergens,
            "image_url": "",
            "available": True,
            "translations": {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        table.put_item(Item=to_decimal(item))
        print(f"  + dish '{name}' ({category}, EUR {price:.2f})")


def main():
    print(f"Seeding table '{TABLE_NAME}' in {REGION}...")
    print("Demo users:")
    seed_user("Admin Chef", "admin@karthik.com", "admin123", "admin")
    seed_user("Diner",      "user@karthik.com",  "user123",  "diner")

    print("Restaurant:")
    rest_id = seed_restaurant()

    print("Dishes:")
    seed_dishes(rest_id)

    print("Seed complete.")


if __name__ == "__main__":
    main()
