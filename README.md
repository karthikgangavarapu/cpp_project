# MenuMix — Multilingual Restaurant Menu Management Platform

A cloud-native web application for restaurants that serve diners from every corner of the world. Restaurant owners maintain a single English master menu; diners browse it in eight languages — and can even tap a speaker icon to hear any dish described aloud in their own language.

## Features
- **Sign in and browse** — diners log in and browse a catalogue of restaurants
- **One-tap language switch** — menus instantly re-render in English, Spanish, French, German, Italian, Hindi, Chinese, or Arabic
- **Voice playback via Amazon Polly** — every dish has a speaker icon; tap it to hear the dish name and description in the selected language
- **Admin dashboard** — restaurant owners (admin role) add, edit, and delete dishes with category, allergens, and price
- **Translation caching** — the first request to `/dishes/{id}/translate?lang=es` calls Amazon Translate and caches the result on the DynamoDB item, so repeat requests never re-hit the Translate API

## 6 AWS Services
1. **AWS Lambda** — Python 3.11 serverless backend
2. **Amazon DynamoDB** — single-table store (users, restaurants, dishes)
3. **Amazon API Gateway** — REST API with `{proxy+}` integration
4. **Amazon S3** — static frontend hosting and synthesised speech audio
5. **Amazon Translate** ⭐ — multilingual dish descriptions
6. **Amazon Polly** ⭐ — text-to-speech voice narration

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS v3
- **Backend:** Python 3.11 Lambda with `boto3`
- **Database:** DynamoDB (`id` partition key + `entityType` field, single-table)
- **CI/CD:** GitHub Actions, two standard secrets only (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- **Library:** `menu-translator-nci` on PyPI

## Demo Credentials
Seeded automatically by CI/CD on first deploy:
- **Admin Chef:** `admin@karthik.com / admin123`
- **Diner:** `user@karthik.com / user123`

Plus one sample restaurant (*Sapore di Roma*) with ten Italian dishes, ready to browse in all eight languages.

## Project Structure
```
.
├── backend/                 # Lambda function + seed script
│   ├── lambda_function.py
│   └── seed.py
├── frontend/                # React + Vite SPA
│   └── src/pages/           # Login, Register, Restaurants, Menu, Admin
├── library/                 # menu-translator-nci PyPI package
│   ├── menu_translator/     # MenuItemManager, LanguagePack, PriceFormatter
│   └── tests/               # 57 unit tests
├── karthik_cpp/             # IEEE LaTeX report + architecture diagram
└── .github/workflows/       # GitHub Actions deploy.yml
```

## Author
Gangavarpu Karthik · Student ID 25160052 · National College of Ireland
