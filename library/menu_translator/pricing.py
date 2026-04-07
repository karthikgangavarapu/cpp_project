"""Localised price formatting without heavyweight locale dependencies."""


class PriceFormatter:
    """Format prices with the correct currency symbol and locale conventions.

    Supports a handful of common restaurant currencies out of the box.
    Keeps zero external dependencies (no ``babel``) so the library stays
    lightweight for Lambda deployments.
    """

    CURRENCY_SYMBOLS = {
        "EUR": "€",
        "USD": "$",
        "GBP": "£",
        "INR": "₹",
        "JPY": "¥",
        "CNY": "¥",
        "AED": "د.إ",
    }

    # Thousands separator + decimal character per locale convention.
    LOCALE_FORMAT = {
        "en_US": ("$", ",", "."),
        "en_GB": ("£", ",", "."),
        "en_IE": ("€", ",", "."),
        "fr_FR": ("€", " ", ","),
        "de_DE": ("€", ".", ","),
        "es_ES": ("€", ".", ","),
        "it_IT": ("€", ".", ","),
        "hi_IN": ("₹", ",", "."),
        "ja_JP": ("¥", ",", "."),
    }

    def get_symbol(self, currency):
        if currency not in self.CURRENCY_SYMBOLS:
            raise ValueError(f"unsupported currency: {currency}")
        return self.CURRENCY_SYMBOLS[currency]

    def format(self, amount, currency="EUR", locale=None):
        """Return a user-facing price string.

        If ``locale`` is given (e.g. ``'de_DE'``) the thousands and decimal
        separators follow that locale. Otherwise the default English style
        is used (comma thousands, dot decimal).
        """
        if not isinstance(amount, (int, float)):
            raise ValueError("amount must be numeric")

        if locale and locale in self.LOCALE_FORMAT:
            symbol, thousands, decimal_sep = self.LOCALE_FORMAT[locale]
        else:
            symbol = self.get_symbol(currency)
            thousands = ","
            decimal_sep = "."

        # JPY / CNY typically shown without decimals
        if currency in ("JPY", "CNY"):
            integer_part = int(round(amount))
            formatted = f"{integer_part:,}".replace(",", thousands)
            return f"{symbol}{formatted}"

        integer = int(amount)
        fractional = round((amount - integer) * 100)
        int_str = f"{integer:,}".replace(",", thousands)
        return f"{symbol}{int_str}{decimal_sep}{fractional:02d}"

    def parse(self, price_string):
        """Parse ``'€12.50'`` back to the numeric value 12.5."""
        if not isinstance(price_string, str):
            raise ValueError("price_string must be str")
        cleaned = "".join(c for c in price_string if c.isdigit() or c in ".,-")
        # Normalise: if the string uses comma as the decimal separator
        if cleaned.count(",") == 1 and cleaned.count(".") == 0:
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
        try:
            return float(cleaned)
        except ValueError:
            raise ValueError(f"cannot parse price: {price_string!r}")
