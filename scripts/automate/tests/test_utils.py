import os
import json
from datetime import date
from unittest.mock import patch, MagicMock


def test_ensure_logs_dir_creates_directory(tmp_path):
    from scripts.automate.utils import ensure_logs_dir
    logs_dir = tmp_path / "logs"
    ensure_logs_dir(str(logs_dir))
    assert logs_dir.exists()


def test_ensure_logs_dir_idempotent(tmp_path):
    from scripts.automate.utils import ensure_logs_dir
    logs_dir = tmp_path / "logs"
    ensure_logs_dir(str(logs_dir))
    ensure_logs_dir(str(logs_dir))  # should not raise
    assert logs_dir.exists()


def test_log_action_writes_to_file(tmp_path):
    from scripts.automate.utils import log_action
    log_file = tmp_path / f"{date.today()}.log"
    log_action("wechat", "send_message", "sent to 张三", logs_dir=str(tmp_path))
    assert log_file.exists()
    content = log_file.read_text()
    assert "wechat" in content
    assert "send_message" in content
    assert "张三" in content


@patch("pyperclip.copy")
@patch("pyperclip.paste", return_value="original_clipboard")
@patch("pyautogui.hotkey")
def test_clipboard_paste_saves_and_restores(mock_hotkey, mock_paste, mock_copy):
    from scripts.automate.utils import clipboard_paste
    clipboard_paste("测试文本")
    # Should: save original → copy new text → paste → restore original
    assert mock_paste.call_count == 1
    calls = mock_copy.call_args_list
    assert calls[0].args[0] == "测试文本"
    assert calls[1].args[0] == "original_clipboard"
    mock_hotkey.assert_called_once_with("command", "v")


def test_take_screenshot_returns_path(tmp_path):
    from scripts.automate.utils import take_screenshot
    with patch("pyautogui.screenshot") as mock_ss:
        mock_img = MagicMock()
        mock_ss.return_value = mock_img
        path = take_screenshot(str(tmp_path / "test.png"))
        assert path == str(tmp_path / "test.png")
        mock_img.save.assert_called_once_with(str(tmp_path / "test.png"))


@patch("pyautogui.locateOnScreen", return_value=(100, 200, 50, 50))
def test_wait_for_image_found(mock_locate):
    from scripts.automate.utils import wait_for_image
    result = wait_for_image("test.png", timeout=5)
    assert result == (100, 200, 50, 50)


@patch("pyautogui.locateOnScreen", return_value=None)
def test_wait_for_image_timeout(mock_locate):
    from scripts.automate.utils import wait_for_image
    result = wait_for_image("test.png", timeout=1)
    assert result is None
