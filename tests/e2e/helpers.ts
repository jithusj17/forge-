import { expect, type Page } from "@playwright/test";

/**
 * Next.js (Cache Components) keeps recently visited routes mounted but hidden, and
 * briefly holds the previous copy during a refresh, so text queries target visible nodes.
 */
export const visibleText = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });

/** The visible preview iframe for version n. */
export const preview = (page: Page, n: number) => page.locator(`iframe[title="Preview v${n}"]`).filter({ visible: true });

/** From the landing page: use a suggestion, sign in as guest, wait for v1 to finish. */
export async function createChatAsGuest(page: Page, chip = "Task List") {
  await page.goto("/");
  await page.getByRole("button", { name: chip }).click();
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/chat\/[A-Za-z0-9]+$/);
  await expect(visibleText(page, /Worked for/)).toBeVisible({ timeout: 30_000 });
  return page.url();
}
