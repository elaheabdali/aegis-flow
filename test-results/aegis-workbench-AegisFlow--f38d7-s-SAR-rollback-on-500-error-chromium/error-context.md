# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aegis-workbench.spec.ts >> AegisFlow Telemetry Workbench E2E >> freezes stream on inspection, logs PII reveal, and verifies SAR rollback on 500 error
- Location: e2e\aegis-workbench.spec.ts:30:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\noavaran\AppData\Local\ms-playwright\chromium_headless_shell-1255\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```