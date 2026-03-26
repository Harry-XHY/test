"""Browser automation via Playwright."""

from playwright.async_api import async_playwright

from scripts.automate.utils import log_action


async def _get_page(url: str, headless: bool = False):
    """Launch browser, navigate to URL, return (page, cleanup_fn)."""
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=headless)
    page = await browser.new_page()
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)

    async def cleanup():
        await browser.close()
        await pw.stop()

    return page, cleanup


async def open_url(url: str) -> dict:
    """Open a URL and return page title."""
    try:
        page, cleanup = await _get_page(url)
        title = await page.title()
        current_url = page.url
        await cleanup()
        log_action("browser", "open_url", f"{url} → {title}")
        return {"success": True, "action": "open_url", "detail": {"title": title, "url": current_url}}
    except Exception as e:
        return {"success": False, "action": "open_url", "detail": str(e)}


async def screenshot(url: str, path: str = "screenshot.png") -> dict:
    """Take a screenshot of a web page."""
    try:
        page, cleanup = await _get_page(url)
        await page.screenshot(path=path, full_page=True)
        await cleanup()
        log_action("browser", "screenshot", f"{url} → {path}")
        return {"success": True, "action": "screenshot", "detail": {"path": path}}
    except Exception as e:
        return {"success": False, "action": "screenshot", "detail": str(e)}


async def scrape(url: str, selector: str = "body") -> dict:
    """Extract text content matching a CSS selector."""
    try:
        page, cleanup = await _get_page(url)
        elements = await page.query_selector_all(selector)
        texts = []
        for el in elements:
            text = await el.text_content()
            if text:
                texts.append(text.strip())
        await cleanup()
        log_action("browser", "scrape", f"{url} [{selector}] → {len(texts)} results")
        return {"success": True, "action": "scrape", "detail": {"texts": texts, "count": len(texts)}}
    except Exception as e:
        return {"success": False, "action": "scrape", "detail": str(e)}


async def fill_form(url: str, fields: dict, submit_selector: str = None) -> dict:
    """Fill form fields on a page. fields = {css_selector: value}."""
    try:
        page, cleanup = await _get_page(url)
        for selector, value in fields.items():
            el = await page.query_selector(selector)
            if el is None:
                await cleanup()
                return {"success": False, "action": "fill_form", "detail": f"Selector not found: {selector}"}
            tag = await el.evaluate("el => el.tagName.toLowerCase()")
            if tag == "select":
                await el.select_option(value)
            elif await el.evaluate("el => el.type") in ("checkbox", "radio"):
                if value:
                    await el.check()
                else:
                    await el.uncheck()
            else:
                await el.fill(value)
        if submit_selector:
            await page.click(submit_selector)
            await page.wait_for_load_state("domcontentloaded")
        await cleanup()
        log_action("browser", "fill_form", f"{url} → {len(fields)} fields")
        return {"success": True, "action": "fill_form", "detail": f"Filled {len(fields)} fields"}
    except Exception as e:
        return {"success": False, "action": "fill_form", "detail": str(e)}


async def run_script(url: str, script: str) -> dict:
    """Execute JavaScript on a page."""
    try:
        page, cleanup = await _get_page(url)
        result = await page.evaluate(script)
        await cleanup()
        log_action("browser", "run_script", f"{url} → script executed")
        return {"success": True, "action": "run_script", "detail": result}
    except Exception as e:
        return {"success": False, "action": "run_script", "detail": str(e)}
