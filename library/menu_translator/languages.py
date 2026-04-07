"""Supported display languages registry."""


class LanguagePack:
    """Registry of supported UI / menu display languages.

    Each entry stores an ISO 639-1 code, the native name of the language,
    the English name, a right-to-left flag, and the Amazon Polly voice
    identifier used for the text-to-speech ``/speak`` endpoint.
    """

    LANGUAGES = {
        "en": {"native": "English",    "english": "English",    "rtl": False, "polly_voice": "Joanna"},
        "es": {"native": "Español",    "english": "Spanish",    "rtl": False, "polly_voice": "Lucia"},
        "fr": {"native": "Français",   "english": "French",     "rtl": False, "polly_voice": "Lea"},
        "de": {"native": "Deutsch",    "english": "German",     "rtl": False, "polly_voice": "Vicki"},
        "it": {"native": "Italiano",   "english": "Italian",    "rtl": False, "polly_voice": "Bianca"},
        "hi": {"native": "हिन्दी",      "english": "Hindi",      "rtl": False, "polly_voice": "Aditi"},
        "zh": {"native": "中文",        "english": "Chinese",    "rtl": False, "polly_voice": "Zhiyu"},
        "ar": {"native": "العربية",    "english": "Arabic",     "rtl": True,  "polly_voice": "Zeina"},
    }

    def list_supported(self):
        return list(self.LANGUAGES.keys())

    def is_supported(self, code):
        return code in self.LANGUAGES

    def get(self, code):
        if code not in self.LANGUAGES:
            raise ValueError(f"unsupported language: {code}")
        return dict(self.LANGUAGES[code])

    def get_native_name(self, code):
        return self.get(code)["native"]

    def get_english_name(self, code):
        return self.get(code)["english"]

    def is_rtl(self, code):
        return self.get(code)["rtl"]

    def get_polly_voice(self, code):
        return self.get(code)["polly_voice"]

    def all_with_metadata(self):
        """Return list of dicts with code + metadata — used by the frontend
        language switcher to render flags/names without hard-coding."""
        return [{"code": c, **v} for c, v in self.LANGUAGES.items()]
