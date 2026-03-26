from unittest.mock import patch, call


@patch("scripts.automate.app.log_action")
@patch("scripts.automate.app.run_applescript")
def test_activate_app(mock_as, mock_log):
    from scripts.automate.app import activate
    mock_as.return_value = ""
    result = activate("Finder")
    assert result["success"] is True
    assert "Finder" in mock_as.call_args.args[0]


@patch("scripts.automate.app.log_action")
@patch("pyautogui.click")
def test_click_coordinates(mock_click, mock_log):
    from scripts.automate.app import click
    result = click(100, 200)
    assert result["success"] is True
    mock_click.assert_called_once_with(100, 200)


@patch("scripts.automate.app.log_action")
@patch("scripts.automate.app.clipboard_paste")
def test_type_text(mock_paste, mock_log):
    from scripts.automate.app import type_text
    result = type_text("你好")
    assert result["success"] is True
    mock_paste.assert_called_once_with("你好")


@patch("scripts.automate.app.log_action")
@patch("pyautogui.hotkey")
def test_hotkey(mock_hk, mock_log):
    from scripts.automate.app import hotkey
    result = hotkey("command", "c")
    assert result["success"] is True
    mock_hk.assert_called_once_with("command", "c")
