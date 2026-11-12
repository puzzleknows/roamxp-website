/**
 * Simulated environments for /get/ routing QA.
 * Simulation ≠ proof of native App Store / Play opening on physical devices.
 */

const DEVICES = [
  {
    id: "iphone_safari",
    label: "iPhone Safari",
    expect: "ios",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 }
  },
  {
    id: "iphone_chrome",
    label: "iPhone Chrome",
    expect: "ios",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 }
  },
  {
    id: "ipad_safari",
    label: "iPad Safari",
    expect: "ios",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 820, height: 1180 }
  },
  {
    id: "ipados_desktop_class",
    label: "iPadOS desktop-class UA",
    expect: "ios",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    isMobile: false,
    hasTouch: true,
    viewport: { width: 1024, height: 1366 },
    // Critical: ordinary Mac stays desktop; iPadOS needs maxTouchPoints > 1
    platformOverride: "MacIntel",
    maxTouchPoints: 5
  },
  {
    id: "android_chrome",
    label: "Android Chrome",
    expect: "android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 412, height: 915 }
  },
  {
    id: "samsung_internet",
    label: "Samsung Internet",
    expect: "android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/110.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 412, height: 915 }
  },
  {
    id: "instagram_ios",
    label: "Instagram in-app (iOS)",
    expect: "go",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.0.0",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 }
  },
  {
    id: "tiktok_android",
    label: "TikTok in-app (Android)",
    expect: "go",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 TikTok 32.0.0",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 412, height: 915 }
  },
  {
    id: "youtube_android",
    label: "YouTube in-app (Android)",
    expect: "go",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 YouTube/19.0.0",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 412, height: 915 }
  },
  {
    id: "facebook_ios",
    label: "Facebook in-app (iOS)",
    expect: "go",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.0.0]",
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 }
  },
  {
    id: "macos_safari",
    label: "macOS Safari",
    expect: "go",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    isMobile: false,
    hasTouch: false,
    viewport: { width: 1440, height: 900 },
    platformOverride: "MacIntel",
    maxTouchPoints: 0
  },
  {
    id: "windows_chrome",
    label: "Windows Chrome",
    expect: "go",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    isMobile: false,
    hasTouch: false,
    viewport: { width: 1440, height: 900 }
  },
  {
    id: "unknown_ua",
    label: "Unknown user agent",
    expect: "go",
    userAgent: "StrangeBot/1.0",
    isMobile: false,
    hasTouch: false,
    viewport: { width: 1280, height: 800 }
  }
];

module.exports = { DEVICES };
