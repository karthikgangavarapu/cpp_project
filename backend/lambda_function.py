"""Multilingual Restaurant Menu Management Platform — Lambda backend.

Single-table DynamoDB design:
  - Partition key: id (string UUID)
  - entityType: 'user' | 'restaurant' | 'dish'

Six AWS services used programmatically:
  1. AWS Lambda — this function
  2. Amazon DynamoDB — single-table store
  3. Amazon API Gateway — REST proxy integration
  4. Amazon S3 — frontend hosting + synthesised speech audio files
  5. Amazon Translate — multilingual dish descriptions
  6. Amazon Polly — text-to-speech for spoken menus
"""

import json
import os
import uuid
import hashlib
import hmac
import time
import base64
import boto3
from datetime import datetime, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

# ---------------------------------------------------------------------------
# Environment + clients
# ---------------------------------------------------------------------------

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "menumix-prod")
S3_AUDIO_BUCKET = os.environ.get("S3_AUDIO_BUCKET", "menumix-audio-karthik-2026")
REGION = os.environ.get("REGION", "eu-west-1")
JWT_SECRET = os.environ.get("JWT_SECRET", "menumix-secret-karthik-2026")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(DYNAMODB_TABLE)
translate = boto3.client("translate", region_name=REGION)
polly = boto3.client("polly", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def decimal_default(obj):
    if isinstance(obj, Decimal):
        if obj == obj.to_integral_value():
            return int(obj)
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"{type(obj).__name__} is not JSON serializable")


def response(status, body):
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=decimal_default),
    }


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


# ---------------------------------------------------------------------------
# JWT (HMAC-SHA256)
# ---------------------------------------------------------------------------

def b64u_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64u_decode(s):
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def create_token(payload):
    header = {"alg": "HS256", "typ": "JWT"}
    payload["exp"] = int(time.time()) + 86400
    segments = [
        b64u_encode(json.dumps(header).encode()),
        b64u_encode(json.dumps(payload, default=str).encode()),
    ]
    signing_input = ".".join(segments).encode()
    sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    segments.append(b64u_encode(sig))
    return ".".join(segments)


def verify_token(token):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        signing_input = f"{parts[0]}.{parts[1]}".encode()
        sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        if b64u_encode(sig) != parts[2]:
            return None
        payload = json.loads(b64u_decode(parts[1]))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def get_user_from_event(event):
    headers = event.get("headers", {}) or {}
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    token = auth[7:] if auth.startswith("Bearer ") else auth
    if not token:
        return None
    return verify_token(token)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(password):
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()
    return hashed, salt


def verify_password(password, hashed, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex() == hashed


# ---------------------------------------------------------------------------
# Language + Polly voice mapping
# ---------------------------------------------------------------------------

SUPPORTED_LANGS = {
    "en": {"name": "English",   "polly_voice": "Joanna"},
    "es": {"name": "Spanish",   "polly_voice": "Lucia"},
    "fr": {"name": "French",    "polly_voice": "Lea"},
    "de": {"name": "German",    "polly_voice": "Vicki"},
    "it": {"name": "Italian",   "polly_voice": "Bianca"},
    "hi": {"name": "Hindi",     "polly_voice": "Aditi"},
    "zh": {"name": "Chinese",   "polly_voice": "Zhiyu"},
    "ar": {"name": "Arabic",    "polly_voice": "Zeina"},
}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def handle_register(body):
    username = (body.get("username") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not username or not email or not password:
        return response(400, {"error": "username, email and password are required"})

    existing = table.scan(
        FilterExpression=Attr("entityType").eq("user") & Attr("email").eq(email)
    ).get("Items", [])
    if existing:
        return response(409, {"error": "Email already registered"})

    hashed, salt = hash_password(password)
    user_id = str(uuid.uuid4())
    item = {
        "id": user_id,
        "entityType": "user",
        "username": username,
        "email": email,
        "password": hashed,
        "salt": salt,
        "role": body.get("role", "diner"),
        "preferred_language": body.get("preferred_language", "en"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=to_decimal(item))
    token = create_token({
        "userId": user_id,
        "email": email,
        "username": username,
        "role": item["role"],
    })
    return response(201, {
        "token": token,
        "userId": user_id,
        "username": username,
        "role": item["role"],
        "preferred_language": item["preferred_language"],
    })


def handle_login(body):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return response(400, {"error": "email and password are required"})

    items = table.scan(
        FilterExpression=Attr("entityType").eq("user") & Attr("email").eq(email)
    ).get("Items", [])
    if not items:
        return response(401, {"error": "Invalid credentials"})
    user = items[0]
    if not verify_password(password, user["password"], user["salt"]):
        return response(401, {"error": "Invalid credentials"})

    token = create_token({
        "userId": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user.get("role", "diner"),
    })
    return response(200, {
        "token": token,
        "userId": user["id"],
        "username": user["username"],
        "role": user.get("role", "diner"),
        "preferred_language": user.get("preferred_language", "en"),
    })


# ---------------------------------------------------------------------------
# Restaurants
# ---------------------------------------------------------------------------

def handle_get_restaurants():
    items = table.scan(
        FilterExpression=Attr("entityType").eq("restaurant")
    ).get("Items", [])
    return response(200, items)


def handle_get_restaurant(rest_id):
    item = table.get_item(Key={"id": rest_id}).get("Item")
    if not item or item.get("entityType") != "restaurant":
        return response(404, {"error": "Restaurant not found"})
    return response(200, item)


def handle_create_restaurant(user, body):
    if user.get("role") != "admin":
        return response(403, {"error": "Admin role required"})
    name = (body.get("name") or "").strip()
    if not name:
        return response(400, {"error": "name is required"})

    rest_id = str(uuid.uuid4())
    item = {
        "id": rest_id,
        "entityType": "restaurant",
        "name": name,
        "cuisine": body.get("cuisine", ""),
        "address": body.get("address", ""),
        "description": body.get("description", ""),
        "currency": body.get("currency", "EUR"),
        "default_language": body.get("default_language", "en"),
        "owner_id": user["userId"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=to_decimal(item))
    return response(201, item)


def handle_update_restaurant(user, rest_id, body):
    if user.get("role") != "admin":
        return response(403, {"error": "Admin role required"})
    item = table.get_item(Key={"id": rest_id}).get("Item")
    if not item or item.get("entityType") != "restaurant":
        return response(404, {"error": "Restaurant not found"})
    for field in ["name", "cuisine", "address", "description", "currency", "default_language"]:
        if field in body:
            item[field] = body[field]
    item["updated_at"] = datetime.now(timezone.utc).isoformat()
    table.put_item(Item=to_decimal(item))
    return response(200, item)


def handle_delete_restaurant(user, rest_id):
    if user.get("role") != "admin":
        return response(403, {"error": "Admin role required"})
    table.delete_item(Key={"id": rest_id})
    # Cascade delete dishes
    dishes = table.scan(
        FilterExpression=Attr("entityType").eq("dish") & Attr("restaurant_id").eq(rest_id)
    ).get("Items", [])
    for d in dishes:
        table.delete_item(Key={"id": d["id"]})
    return response(200, {"message": "Restaurant and dishes deleted"})


# ---------------------------------------------------------------------------
# Dishes
# ---------------------------------------------------------------------------

VALID_CATEGORIES = ("Starter", "Main", "Side", "Dessert", "Drink", "Special")


def handle_get_dishes(rest_id):
    items = table.scan(
        FilterExpression=Attr("entityType").eq("dish") & Attr("restaurant_id").eq(rest_id)
    ).get("Items", [])
    return response(200, items)


def handle_create_dish(user, rest_id, body):
    if user.get("role") != "admin":
        return response(403, {"error": "Admin role required"})

    name = (body.get("name") or "").strip()
    description = (body.get("description") or "").strip()
    price = body.get("price", 0)
    category = body.get("category", "Main")

    if not name:
        return response(400, {"error": "name is required"})
    if category not in VALID_CATEGORIES:
        return response(400, {"error": f"category must be one of {', '.join(VALID_CATEGORIES)}"})
    try:
        price = float(price)
    except (TypeError, ValueError):
        return response(400, {"error": "price must be numeric"})
    if price < 0:
        return response(400, {"error": "price cannot be negative"})

    dish_id = str(uuid.uuid4())
    item = {
        "id": dish_id,
        "entityType": "dish",
        "restaurant_id": rest_id,
        "name": name,
        "description": description,
        "price": price,
        "category": category,
        "allergens": body.get("allergens") or [],
        "image_url": body.get("image_url", ""),
        "available": bool(body.get("available", True)),
        "translations": {},  # populated lazily by /translate
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=to_decimal(item))
    return response(201, item)


def handle_update_dish(user, dish_id, body):
    if user.get("role") != "admin":
        return response(403, {"error": "Admin role required"})
    item = table.get_item(Key={"id": dish_id}).get("Item")
    if not item or item.get("entityType") != "dish":
        return response(404, {"error": "Dish not found"})
    for field in ["name", "description", "price", "category", "allergens", "image_url", "available"]:
        if field in body:
            item[field] = body[field]
    if "category" in body and body["category"] not in VALID_CATEGORIES:
        return response(400, {"error": "invalid category"})
    if "price" in body:
        try:
            item["price"] = float(body["price"])
        except Exception:
            return response(400, {"error": "price must be numeric"})
    # Clear cached translations if name/description changed
    if "name" in body or "description" in body:
        item["translations"] = {}
    item["updated_at"] = datetime.now(timezone.utc).isoformat()
    table.put_item(Item=to_decimal(item))
    return response(200, item)


def handle_delete_dish(user, dish_id):
    if user.get("role") != "admin":
        return response(403, {"error": "Admin role required"})
    table.delete_item(Key={"id": dish_id})
    return response(200, {"message": "Dish deleted"})


# ---------------------------------------------------------------------------
# Translate — Amazon Translate
# ---------------------------------------------------------------------------

def handle_translate_dish(dish_id, target_lang):
    """GET /dishes/{id}/translate?lang=es — translate name + description
    into the target language using Amazon Translate. Results are cached on
    the dish item so repeat requests do not re-hit the Translate API."""
    if target_lang not in SUPPORTED_LANGS:
        return response(400, {"error": f"unsupported language: {target_lang}"})

    item = table.get_item(Key={"id": dish_id}).get("Item")
    if not item or item.get("entityType") != "dish":
        return response(404, {"error": "Dish not found"})

    if target_lang == "en":
        return response(200, {
            "language": "en",
            "name": item["name"],
            "description": item.get("description", ""),
            "cached": False,
        })

    cached = item.get("translations") or {}
    if target_lang in cached:
        t = cached[target_lang]
        return response(200, {
            "language": target_lang,
            "name": t.get("name", item["name"]),
            "description": t.get("description", item.get("description", "")),
            "cached": True,
        })

    try:
        name_res = translate.translate_text(
            Text=item["name"],
            SourceLanguageCode="en",
            TargetLanguageCode=target_lang,
        )
        desc_text = item.get("description") or ""
        desc_res = None
        if desc_text:
            desc_res = translate.translate_text(
                Text=desc_text,
                SourceLanguageCode="en",
                TargetLanguageCode=target_lang,
            )

        translated = {
            "name": name_res["TranslatedText"],
            "description": desc_res["TranslatedText"] if desc_res else "",
        }
        cached[target_lang] = translated
        item["translations"] = cached
        table.put_item(Item=to_decimal(item))

        return response(200, {
            "language": target_lang,
            "name": translated["name"],
            "description": translated["description"],
            "cached": False,
        })
    except Exception as exc:
        print(f"Translate error: {exc}")
        # Graceful fallback: return the English original so the UI never
        # breaks even if the Translate service is unavailable.
        return response(200, {
            "language": target_lang,
            "name": item["name"],
            "description": item.get("description", ""),
            "cached": False,
            "fallback": True,
            "error": str(exc),
        })


# ---------------------------------------------------------------------------
# Speak — Amazon Polly text-to-speech
# ---------------------------------------------------------------------------

def handle_speak_dish(dish_id, target_lang):
    """GET /dishes/{id}/speak?lang=es — synthesise the dish description
    as MP3 audio via Amazon Polly and return a presigned S3 URL."""
    if target_lang not in SUPPORTED_LANGS:
        return response(400, {"error": f"unsupported language: {target_lang}"})

    item = table.get_item(Key={"id": dish_id}).get("Item")
    if not item or item.get("entityType") != "dish":
        return response(404, {"error": "Dish not found"})

    # Resolve the text to speak — use the cached translation if available
    cached = item.get("translations") or {}
    if target_lang == "en":
        text = f"{item['name']}. {item.get('description', '')}"
    elif target_lang in cached:
        t = cached[target_lang]
        text = f"{t.get('name', item['name'])}. {t.get('description', '')}"
    else:
        # Translate first, then speak
        try:
            name_res = translate.translate_text(
                Text=item["name"], SourceLanguageCode="en", TargetLanguageCode=target_lang,
            )
            desc_res = translate.translate_text(
                Text=item.get("description") or item["name"],
                SourceLanguageCode="en",
                TargetLanguageCode=target_lang,
            )
            text = f"{name_res['TranslatedText']}. {desc_res['TranslatedText']}"
            cached[target_lang] = {
                "name": name_res["TranslatedText"],
                "description": desc_res["TranslatedText"],
            }
            item["translations"] = cached
            table.put_item(Item=to_decimal(item))
        except Exception as exc:
            print(f"Translate failed, speaking English: {exc}")
            text = f"{item['name']}. {item.get('description', '')}"
            target_lang = "en"

    voice_id = SUPPORTED_LANGS[target_lang]["polly_voice"]

    try:
        polly_res = polly.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            Engine="standard",
        )
        audio_bytes = polly_res["AudioStream"].read()

        # Upload to S3
        key = f"audio/{dish_id}/{target_lang}-{uuid.uuid4().hex[:8]}.mp3"
        s3.put_object(
            Bucket=S3_AUDIO_BUCKET,
            Key=key,
            Body=audio_bytes,
            ContentType="audio/mpeg",
        )
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_AUDIO_BUCKET, "Key": key},
            ExpiresIn=3600,
        )
        return response(200, {
            "audio_url": url,
            "voice_id": voice_id,
            "language": target_lang,
            "text": text,
        })
    except Exception as exc:
        print(f"Polly error: {exc}")
        return response(500, {"error": f"speech synthesis failed: {exc}"})


# ---------------------------------------------------------------------------
# Languages endpoint — return the supported language list to the frontend
# ---------------------------------------------------------------------------

def handle_get_languages():
    return response(200, [
        {"code": code, **meta} for code, meta in SUPPORTED_LANGS.items()
    ])


# ---------------------------------------------------------------------------
# Main router
# ---------------------------------------------------------------------------

def lambda_handler(event, context):
    try:
        method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
        path = event.get("path") or event.get("rawPath", "")
        if path.startswith("/prod"):
            path = path[5:]
        if not path:
            path = "/"

        if method == "OPTIONS":
            return response(200, {"message": "OK"})

        qs = event.get("queryStringParameters") or {}

        body = {}
        if event.get("body"):
            try:
                body = json.loads(event["body"])
            except Exception:
                body = {}

        # Public routes
        if path == "/auth/register" and method == "POST":
            return handle_register(body)
        if path == "/auth/login" and method == "POST":
            return handle_login(body)
        if path == "/languages" and method == "GET":
            return handle_get_languages()
        if path == "/restaurants" and method == "GET":
            return handle_get_restaurants()

        parts = [p for p in path.split("/") if p]

        # Public browse endpoints (no auth)
        if len(parts) == 2 and parts[0] == "restaurants" and method == "GET":
            return handle_get_restaurant(parts[1])
        if len(parts) == 3 and parts[0] == "restaurants" and parts[2] == "dishes" and method == "GET":
            return handle_get_dishes(parts[1])
        if len(parts) == 3 and parts[0] == "dishes" and parts[2] == "translate" and method == "GET":
            return handle_translate_dish(parts[1], qs.get("lang", "en"))
        if len(parts) == 3 and parts[0] == "dishes" and parts[2] == "speak" and method == "GET":
            return handle_speak_dish(parts[1], qs.get("lang", "en"))

        # Protected routes — require JWT
        user = get_user_from_event(event)
        if not user:
            return response(401, {"error": "Unauthorized"})

        if path == "/restaurants" and method == "POST":
            return handle_create_restaurant(user, body)
        if len(parts) == 2 and parts[0] == "restaurants" and method == "PUT":
            return handle_update_restaurant(user, parts[1], body)
        if len(parts) == 2 and parts[0] == "restaurants" and method == "DELETE":
            return handle_delete_restaurant(user, parts[1])
        if len(parts) == 3 and parts[0] == "restaurants" and parts[2] == "dishes" and method == "POST":
            return handle_create_dish(user, parts[1], body)
        if len(parts) == 2 and parts[0] == "dishes" and method == "PUT":
            return handle_update_dish(user, parts[1], body)
        if len(parts) == 2 and parts[0] == "dishes" and method == "DELETE":
            return handle_delete_dish(user, parts[1])

        return response(404, {"error": "Route not found"})

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return response(500, {"error": "Internal server error", "message": str(exc)})
