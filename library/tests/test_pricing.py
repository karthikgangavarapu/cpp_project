import pytest
from menu_translator import PriceFormatter


@pytest.fixture
def fmt():
    return PriceFormatter()


def test_format_eur(fmt):
    assert fmt.format(12.5, currency="EUR") == "€12.50"


def test_format_usd(fmt):
    assert fmt.format(9.99, currency="USD") == "$9.99"


def test_format_gbp(fmt):
    assert fmt.format(5, currency="GBP") == "£5.00"


def test_format_inr(fmt):
    assert fmt.format(850, currency="INR") == "₹850.00"


def test_format_jpy_no_decimals(fmt):
    assert fmt.format(1500, currency="JPY") == "¥1,500"


def test_format_cny_no_decimals(fmt):
    assert fmt.format(30, currency="CNY") == "¥30"


def test_format_thousands(fmt):
    assert fmt.format(1234.56, currency="USD") == "$1,234.56"


def test_format_large_number(fmt):
    assert fmt.format(1000000, currency="EUR") == "€1,000,000.00"


def test_format_de_locale(fmt):
    # German locale: dot thousands, comma decimals
    assert fmt.format(1234.5, locale="de_DE") == "€1.234,50"


def test_format_fr_locale(fmt):
    # French locale: space thousands, comma decimals
    assert fmt.format(1234.5, locale="fr_FR") == "€1 234,50"


def test_format_hi_locale(fmt):
    assert fmt.format(850, locale="hi_IN") == "₹850.00"


def test_format_zero(fmt):
    assert fmt.format(0, currency="EUR") == "€0.00"


def test_format_non_numeric_rejected(fmt):
    with pytest.raises(ValueError, match="numeric"):
        fmt.format("12.50", currency="EUR")


def test_get_symbol(fmt):
    assert fmt.get_symbol("EUR") == "€"
    assert fmt.get_symbol("USD") == "$"


def test_get_symbol_invalid(fmt):
    with pytest.raises(ValueError, match="unsupported"):
        fmt.get_symbol("XYZ")


def test_parse_euro(fmt):
    assert fmt.parse("€12.50") == 12.5


def test_parse_dollar_with_thousands(fmt):
    assert fmt.parse("$1,234.56") == 1234.56


def test_parse_comma_decimal(fmt):
    assert fmt.parse("12,50") == 12.5


def test_parse_invalid(fmt):
    with pytest.raises(ValueError, match="cannot parse"):
        fmt.parse("abc")


def test_parse_non_string(fmt):
    with pytest.raises(ValueError, match="str"):
        fmt.parse(12.5)
