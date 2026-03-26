import json
import pytest
from unittest.mock import patch, MagicMock


def test_parse_wechat_send():
    from scripts.automate.router import parse_intent
    result = parse_intent("给媳妇发微信 你在干嘛")
    assert result["module"] == "wechat"
    assert result["action"] == "send_message"
    assert result["params"]["contact"] == "媳妇"
    assert result["params"]["message"] == "你在干嘛"


def test_parse_wechat_send_alt_format():
    from scripts.automate.router import parse_intent
    result = parse_intent("微信发给老板 明天开会")
    assert result["module"] == "wechat"
    assert result["params"]["contact"] == "老板"
    assert result["params"]["message"] == "明天开会"


def test_parse_browser_open():
    from scripts.automate.router import parse_intent
    result = parse_intent("打开网页 https://baidu.com")
    assert result["module"] == "browser"
    assert result["action"] == "open_url"
    assert "baidu.com" in result["params"]["url"]


def test_parse_browser_screenshot():
    from scripts.automate.router import parse_intent
    result = parse_intent("截图 https://example.com")
    assert result["module"] == "browser"
    assert result["action"] == "screenshot"


def test_parse_app_open():
    from scripts.automate.router import parse_intent
    result = parse_intent("打开 Finder")
    assert result["module"] == "app"
    assert result["action"] == "activate"
    assert result["params"]["app_name"] == "Finder"


def test_parse_unknown_returns_none():
    from scripts.automate.router import parse_intent
    result = parse_intent("今天天气怎么样")
    assert result is None


def test_wechat_priority_over_app():
    from scripts.automate.router import parse_intent
    result = parse_intent("给媳妇发微信 在吗")
    assert result["module"] == "wechat"


def test_contact_alias_resolution():
    from scripts.automate.router import resolve_contact
    with patch("builtins.open", MagicMock()):
        with patch("json.load", return_value={"媳妇": "张三"}):
            assert resolve_contact("媳妇") == "张三"


def test_contact_alias_passthrough():
    from scripts.automate.router import resolve_contact
    with patch("builtins.open", MagicMock()):
        with patch("json.load", return_value={"媳妇": "张三"}):
            assert resolve_contact("王五") == "王五"
