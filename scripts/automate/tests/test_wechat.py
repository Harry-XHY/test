import time
from unittest.mock import patch, call, MagicMock


@patch("scripts.automate.wechat._do_send")
@patch("scripts.automate.utils.run_applescript")
def test_send_message_activates_wechat(mock_as, mock_send):
    from scripts.automate.wechat import send_message
    mock_send.return_value = {"success": True, "action": "send_message", "detail": "Sent"}
    result = send_message("张三", "你好", confirm=False)
    assert any("WeChat" in str(c) or "微信" in str(c) for c in mock_as.call_args_list)


@patch("scripts.automate.wechat._do_send")
@patch("scripts.automate.utils.run_applescript")
def test_send_message_returns_success(mock_as, mock_send):
    from scripts.automate.wechat import send_message
    mock_send.return_value = {"success": True, "action": "send_message", "detail": "Sent to 张三"}
    result = send_message("张三", "你好", confirm=False)
    assert result["success"] is True


@patch("scripts.automate.utils.run_applescript", side_effect=RuntimeError("WeChat not running"))
def test_send_message_wechat_not_running(mock_as):
    from scripts.automate.wechat import send_message
    result = send_message("张三", "你好", confirm=False)
    assert result["success"] is False
    assert "not running" in result["detail"].lower() or "未运行" in result["detail"]
