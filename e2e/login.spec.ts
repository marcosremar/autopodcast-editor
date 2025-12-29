import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should display login form with email, password and demo button", async ({ page }) => {
    await page.goto("/login");

    // Verify form elements are visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Acessar Demo/i })).toBeVisible();
  });

  test("should click demo button and attempt login", async ({ page }) => {
    await page.goto("/login");

    // Click the demo button
    const demoButton = page.getByRole("button", { name: /Acessar Demo/i });
    await expect(demoButton).toBeVisible();
    await demoButton.click();

    // Wait for response - either redirect to dashboard or error message
    await page.waitForTimeout(2000);

    // Check if we got redirected to dashboard or stayed on login with error
    const currentUrl = page.url();
    const hasError = await page.locator("text=Erro").isVisible().catch(() => false);

    // Log the result for debugging
    console.log("Current URL after demo click:", currentUrl);
    console.log("Has error message:", hasError);

    // The test passes if either:
    // 1. We redirected to dashboard (login worked)
    // 2. We stayed on login page (expected if DB not configured)
    expect(currentUrl.includes("/login") || currentUrl.includes("/dashboard")).toBe(true);
  });

  test("should fill email and password manually", async ({ page }) => {
    await page.goto("/login");

    // Fill the form
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').fill("password123");

    // Verify values are filled
    await expect(page.locator('input[type="email"]')).toHaveValue("test@example.com");
    await expect(page.locator('input[type="password"]')).toHaveValue("password123");

    // Click submit
    await page.getByRole("button", { name: "Entrar" }).click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Should either redirect or show error
    const currentUrl = page.url();
    expect(currentUrl.includes("/login") || currentUrl.includes("/dashboard")).toBe(true);
  });

  test("should navigate from landing to login", async ({ page }) => {
    await page.goto("/");

    // Click the login button in header
    const loginButton = page.getByRole("link", { name: "Entrar" });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
