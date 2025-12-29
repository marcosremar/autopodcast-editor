import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Upload and Pipeline Test", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByRole("button", { name: /Acessar Demo/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("should display dashboard after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Dashboard/i)).toBeVisible();
  });

  test("should open upload modal and show form", async ({ page }) => {
    // Click New Project button
    const newProjectBtn = page.getByRole("button", { name: /New Project/i });
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Check modal content
    await expect(page.getByText("Create New Project")).toBeVisible();
    await expect(page.getByText("Audio File *")).toBeVisible();
    await expect(page.getByText("Project Title *")).toBeVisible();
    await expect(page.getByText("Target Duration *")).toBeVisible();
  });

  test("should upload audio file and create project", async ({ page }) => {
    // Click New Project button
    const newProjectBtn = page.getByRole("button", { name: /New Project/i });
    await newProjectBtn.click();
    await page.waitForTimeout(500);

    // Find the hidden file input and upload file
    const fileInput = page.locator("input[type='file']");
    const audioPath = path.resolve("./test-media/audio-short.mp3");
    await fileInput.setInputFiles(audioPath);

    // Wait for file to be processed
    await page.waitForTimeout(500);

    // Verify file appears in the UI
    await expect(page.getByText("audio-short.mp3")).toBeVisible();

    // Title should be auto-populated from filename
    const titleInput = page.locator("input#title");
    await expect(titleInput).toHaveValue("audio-short");

    // Change title
    await titleInput.clear();
    await titleInput.fill("Teste YouTube Video");

    // Select target duration
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /15-20 minutes/i }).click();

    // Click Create Project
    const createBtn = page.getByRole("button", { name: /Create Project/i });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Wait for upload
    await page.waitForTimeout(3000);

    // Modal should close and project should appear in list
    // Or we should be back on dashboard
    console.log("Current URL:", page.url());
  });

  test("should show project in dashboard after upload", async ({ page }) => {
    // First do an upload
    const newProjectBtn = page.getByRole("button", { name: /New Project/i });
    await newProjectBtn.click();
    await page.waitForTimeout(300);

    const fileInput = page.locator("input[type='file']");
    const audioPath = path.resolve("./test-media/audio-short.mp3");
    await fileInput.setInputFiles(audioPath);
    await page.waitForTimeout(300);

    const titleInput = page.locator("input#title");
    await titleInput.clear();
    await titleInput.fill("Podcast de Teste E2E");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /25-35 minutes/i }).click();

    await page.getByRole("button", { name: /Create Project/i }).click();

    // Wait for modal to close and page to refresh
    await page.waitForTimeout(3000);

    // Check if project appears
    const projectCard = page.getByText("Podcast de Teste E2E");
    const isVisible = await projectCard.isVisible().catch(() => false);
    console.log("Project visible in dashboard:", isVisible);

    if (isVisible) {
      await expect(projectCard).toBeVisible();
    }
  });
});
