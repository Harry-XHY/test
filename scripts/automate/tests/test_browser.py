import pytest
from unittest.mock import AsyncMock, MagicMock, patch

pytest_plugins = ["pytest_asyncio"]


@pytest.mark.asyncio
async def test_open_url_returns_title():
    from scripts.automate.browser import open_url
    with patch("scripts.automate.browser._get_page") as mock_get:
        mock_page = AsyncMock()
        mock_page.title = AsyncMock(return_value="Example Domain")
        mock_page.url = "https://example.com"
        mock_get.return_value = (mock_page, AsyncMock())
        result = await open_url("https://example.com")
        assert result["success"] is True
        assert result["detail"]["title"] == "Example Domain"


@pytest.mark.asyncio
async def test_screenshot_saves_file():
    from scripts.automate.browser import screenshot
    with patch("scripts.automate.browser._get_page") as mock_get:
        mock_page = AsyncMock()
        mock_page.screenshot = AsyncMock()
        mock_get.return_value = (mock_page, AsyncMock())
        result = await screenshot("https://example.com", "/tmp/test.png")
        assert result["success"] is True
        mock_page.screenshot.assert_called_once()


@pytest.mark.asyncio
async def test_scrape_returns_texts():
    from scripts.automate.browser import scrape
    with patch("scripts.automate.browser._get_page") as mock_get:
        mock_page = AsyncMock()
        mock_el1 = AsyncMock()
        mock_el1.text_content = AsyncMock(return_value="Hello")
        mock_el2 = AsyncMock()
        mock_el2.text_content = AsyncMock(return_value="World")
        mock_page.query_selector_all = AsyncMock(return_value=[mock_el1, mock_el2])
        mock_get.return_value = (mock_page, AsyncMock())
        result = await scrape("https://example.com", "h1")
        assert result["success"] is True
        assert result["detail"]["texts"] == ["Hello", "World"]
