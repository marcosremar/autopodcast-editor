import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the hero section", async ({ page }) => {
    // Check main headline
    await expect(page.getByText(/Grave 2 horas/i)).toBeVisible();
    await expect(page.getByText(/Receba 30 minutos/i)).toBeVisible();

    // Check waitlist form in hero
    await expect(page.getByTestId("email-input").first()).toBeVisible();
    await expect(page.getByTestId("submit-button").first()).toBeVisible();
  });

  test("should display all main sections", async ({ page }) => {
    // Problem section
    await expect(page.getByText(/Editar podcast e exaustivo/i)).toBeVisible();

    // How it works
    await expect(page.getByText(/Como funciona/i)).toBeVisible();
    await expect(page.getByText(/Grave falando livremente/i)).toBeVisible();

    // Features
    await expect(page.getByText(/Selecao inteligente/i)).toBeVisible();

    // Comparison
    await expect(page.getByText(/Nao e so cortar silencio/i)).toBeVisible();

    // Pricing
    await expect(page.getByText(/Planos para todo tamanho/i)).toBeVisible();

    // FAQ
    await expect(page.getByText(/Perguntas frequentes/i)).toBeVisible();

    // Final CTA
    await expect(page.getByText(/Seja um dos primeiros a testar/i)).toBeVisible();
  });

  test("should allow user to join waitlist", async ({ page }) => {
    const emailInput = page.getByTestId("email-input").first();
    const submitButton = page.getByTestId("submit-button").first();

    // Fill email and submit
    await emailInput.fill("test@example.com");
    await submitButton.click();

    // Should show success message
    await expect(page.getByTestId("success-message").first()).toBeVisible();
    await expect(
      page.getByText(/Voce esta na lista/i).first()
    ).toBeVisible();
  });

  test("should show error for invalid email", async ({ page }) => {
    const emailInput = page.getByTestId("email-input").first();
    const submitButton = page.getByTestId("submit-button").first();

    // Leave email empty and submit
    await emailInput.fill("");
    await submitButton.click();

    // Should show error message
    await expect(page.getByTestId("error-message").first()).toBeVisible();
  });

  test("should toggle FAQ items", async ({ page }) => {
    // Scroll to FAQ section
    await page.getByText(/Perguntas frequentes/i).scrollIntoViewIfNeeded();

    // First FAQ should be expanded by default
    await expect(
      page.getByText(/Sim! Funciona com podcasts solo/i)
    ).toBeVisible();

    // Click second question
    await page
      .getByText(/E se a IA errar na selecao/i)
      .click();

    // Second answer should be visible
    await expect(
      page.getByText(/Voce tem controle total/i)
    ).toBeVisible();
  });

  test("should have proper SEO metadata", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/AutoPodcast/i);

    // Check meta description
    const description = await page.getAttribute(
      'meta[name="description"]',
      "content"
    );
    expect(description).toContain("podcast");
  });

  test("should be responsive", async ({ page }) => {
    // Test at mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    // Hero should still be visible
    await expect(page.getByText(/Grave 2 horas/i)).toBeVisible();

    // Form should be visible
    await expect(page.getByTestId("email-input").first()).toBeVisible();

    // Test at tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText(/Grave 2 horas/i)).toBeVisible();

    // Test at desktop size
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText(/Grave 2 horas/i)).toBeVisible();
  });
});
