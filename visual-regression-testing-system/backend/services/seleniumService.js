const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const net = require('net');
const path = require('path');

const PAGE_LOAD_TIMEOUT_MS = Number(process.env.SELENIUM_PAGE_LOAD_TIMEOUT_MS) || 15000;
const safeScreenshotPath = (folder, fileName) => path.resolve(__dirname, '..', 'screenshots', folder, fileName);

const validateWebsiteUrl = (value) => {
  if (typeof value !== 'string' || !value || value !== value.trim() || /\s/.test(value)) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase().replace(/\.$/, '');
    const ipAddress = hostname.replace(/^\[|\]$/g, '');
    if (hostname === 'localhost' || net.isIP(ipAddress)) {
      return true;
    }

    const labels = hostname.split('.');
    return labels.length > 1 && labels.every((label) => (
      label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    ));
  } catch (error) {
    return false;
  }
};

const classifyNavigationError = (error, url) => {
  const message = `${error.name || ''} ${error.code || ''} ${error.message || ''}`;
  if (/timeout|timed out|ERR_CONNECTION_TIMED_OUT/i.test(message)) {
    return {
      status: 'TIMEOUT',
      message: 'Website loading timed out',
      explanation: 'The website did not respond within the allowed time.',
      possibleReasons: ['The server is slow', 'There is a network problem', 'The website is temporarily unavailable'],
      suggestedSolution: 'Try again after some time.',
      url
    };
  }

  if (/ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_ADDRESS_UNREACHABLE|ERR_INTERNET_DISCONNECTED|ERR_PROXY_CONNECTION_FAILED|ERR_TUNNEL_CONNECTION_FAILED|ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN/i.test(message)) {
    return {
      status: 'WEBSITE_UNAVAILABLE',
      message: 'Website could not be reached',
      explanation: 'The website could not be reached. Please check whether the URL is correct.',
      possibleReasons: ['The URL is incorrect', 'The domain does not exist', 'The website server is unavailable', 'There is an internet or network problem'],
      suggestedSolution: 'Check the URL and try again.',
      url
    };
  }

  return {
    status: 'SELENIUM_ERROR',
    message: 'The browser could not complete the website check',
    explanation: error.message || 'The browser encountered an unexpected problem before the screenshot was captured.',
    possibleReasons: ['The browser session could not start', 'The website blocked automated access'],
    suggestedSolution: 'Check the website and browser setup, then try again.',
    url
  };
};

const buildChromeDriver = () => {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1280,1200');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
};

const takeScreenshotForUrl = async (url, folder, fileName) => {
  const targetPath = safeScreenshotPath(folder, fileName);
  let driver;

  try {
    driver = buildChromeDriver();
    await driver.manage().setTimeouts({ pageLoad: PAGE_LOAD_TIMEOUT_MS });
    await driver.get(url);
    await driver.wait(until.elementLocated(By.tagName('body')), PAGE_LOAD_TIMEOUT_MS);
    const browserUrl = await driver.getCurrentUrl();
    const bodyText = await driver.findElement(By.tagName('body')).getText();
    if (browserUrl.startsWith('chrome-error://') || /ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_ADDRESS_UNREACHABLE|ERR_INTERNET_DISCONNECTED/i.test(bodyText)) {
      const error = new Error(bodyText || 'The browser could not reach this website.');
      error.code = 'WEBSITE_UNAVAILABLE';
      throw error;
    }
    await driver.sleep(1000);
    const image = await driver.takeScreenshot();
    const fs = require('fs');
    fs.writeFileSync(targetPath, image, 'base64');
    return targetPath;
  } catch (error) {
    const details = classifyNavigationError(error, url);
    const classifiedError = new Error(details.message);
    Object.assign(classifiedError, details);
    throw classifiedError;
  } finally {
    if (driver) {
      await driver.quit().catch(() => {});
    }
  }
};

module.exports = {
  buildChromeDriver,
  takeScreenshotForUrl,
  safeScreenshotPath,
  validateWebsiteUrl,
  classifyNavigationError
};
