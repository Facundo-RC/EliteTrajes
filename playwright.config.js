import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:4173/',
        trace: 'on-first-retry',
        // Para usar un Chrome ya instalado en vez del que descarga Playwright.
        launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
    },
    projects: [
        { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
        { name: 'celular', use: { ...devices['Pixel 7'] } }
    ],
    webServer: {
        command: 'npx http-server . -p 4173 -s -c-1',
        url: 'http://localhost:4173/index.html',
        reuseExistingServer: !process.env.CI
    }
});
