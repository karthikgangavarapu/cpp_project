# menu-translator-nci

Domain library for the Multilingual Restaurant Menu Management Platform. Encapsulates the core entities of a restaurant menu system — dishes, language packs, and localised pricing — in three independent modules with no external dependencies.

## Modules

### `MenuItemManager`
Validates and manages dish records with categories, allergens, prices, and description.

```python
from menu_translator import MenuItemManager

mgr = MenuItemManager()
dish = mgr.create_dish(
    name="Margherita Pizza",
    description="Classic tomato, mozzarella, fresh basil",
    price=12.50,
    category="Main",
    allergens=["gluten", "dairy"],
)
```

### `LanguagePack`
Registry of supported display languages with ISO 639-1 codes, native names, and RTL flags. Used by both the backend (for validating translation targets) and the frontend (for building the language switcher).

```python
from menu_translator import LanguagePack

langs = LanguagePack()
langs.list_supported()              # ['en', 'es', 'fr', 'de', 'it', 'hi', 'zh', 'ar']
langs.get_native_name("hi")         # 'हिन्दी'
langs.is_rtl("ar")                  # True
```

### `PriceFormatter`
Formats prices for display in the correct currency and locale without requiring the full `babel` package.

```python
from menu_translator import PriceFormatter

fmt = PriceFormatter()
fmt.format(12.5, currency="EUR")    # '€12.50'
fmt.format(850, currency="INR")     # '₹850.00'
fmt.format(12.0, currency="USD", locale="en_US")  # '$12.00'
```

## Installation
```bash
pip install menu-translator-nci
```

## License
MIT
