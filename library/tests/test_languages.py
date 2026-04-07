import pytest
from menu_translator import LanguagePack


@pytest.fixture
def lp():
    return LanguagePack()


def test_list_supported_has_8(lp):
    codes = lp.list_supported()
    assert len(codes) == 8
    assert "en" in codes
    assert "ar" in codes


def test_is_supported_true(lp):
    assert lp.is_supported("en") is True
    assert lp.is_supported("hi") is True


def test_is_supported_false(lp):
    assert lp.is_supported("xx") is False
    assert lp.is_supported("") is False


def test_get_english_returns_dict(lp):
    info = lp.get("en")
    assert info["native"] == "English"
    assert info["english"] == "English"
    assert info["rtl"] is False
    assert info["polly_voice"] == "Joanna"


def test_get_unsupported_raises(lp):
    with pytest.raises(ValueError, match="unsupported"):
        lp.get("klingon")


def test_get_native_name_hindi(lp):
    assert lp.get_native_name("hi") == "हिन्दी"


def test_get_native_name_chinese(lp):
    assert lp.get_native_name("zh") == "中文"


def test_get_english_name(lp):
    assert lp.get_english_name("de") == "German"
    assert lp.get_english_name("fr") == "French"


def test_is_rtl_arabic(lp):
    assert lp.is_rtl("ar") is True


def test_is_rtl_english(lp):
    assert lp.is_rtl("en") is False


def test_polly_voice_mapping(lp):
    assert lp.get_polly_voice("es") == "Lucia"
    assert lp.get_polly_voice("hi") == "Aditi"


def test_all_with_metadata_contains_code(lp):
    items = lp.all_with_metadata()
    assert len(items) == 8
    for item in items:
        assert "code" in item
        assert "native" in item
        assert "polly_voice" in item


def test_returned_dict_is_copy(lp):
    info = lp.get("en")
    info["native"] = "MUTATED"
    assert lp.get("en")["native"] == "English"


def test_italian_voice(lp):
    assert lp.get_polly_voice("it") == "Bianca"
