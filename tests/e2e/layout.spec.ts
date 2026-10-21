import { expect, test } from "@playwright/test";
import { createChatAsGuest, preview } from "./helpers";

test("workspace adapts: split panels on wide screens, tabs below 1280px", async ({ page }) => {
  await createChatAsGuest(page);
  const width = page.viewportSize()!.width;
  // Exactly one composer and one preview are mounted at any width.
  await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveCount(1);
  if (width >= 1280) {
    await expect(preview(page, 1)).toHaveCount(1);
    await expect(page.getByRole("tab", { name: "Chat", exact: true })).toHaveCount(0);
  } else {
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    await expect(preview(page, 1)).toHaveCount(1);
    await expect(page.getByRole("textbox", { name: "Prompt" })).toHaveCount(0);
  }
});
