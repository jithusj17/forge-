import { expect, test } from "@playwright/test";
import { createChatAsGuest, preview, visibleText } from "./helpers";

test("landing page: suggestion chips fill the composer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What do you want to build?" })).toBeVisible();
  const send = page.getByRole("button", { name: "Send" });
  await expect(send).toBeDisabled();
  await page.getByRole("button", { name: "Loan Calculator" }).click();
  await expect(page.getByRole("textbox", { name: "Prompt" })).toContainText("loan calculator");
  await expect(send).toBeEnabled();
});

test("sending a prompt asks to sign in; cancelling keeps the prompt", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Contact Form" }).click();
  await page.getByRole("button", { name: "Send" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Continue as guest" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: "Prompt" })).toContainText("contact form");
});

test("guest builds an app, sees code, iterates and restores a version", async ({ page }) => {
  await createChatAsGuest(page);
  await expect(preview(page, 1)).toBeAttached();

  // Preview renders the generated app inside the sandboxed frame.
  const app = preview(page, 1).contentFrame();
  await expect(app.getByRole("heading", { name: "Tasks" })).toBeVisible();

  // Code view lists the project files with highlighted source.
  await page.getByRole("tab", { name: "Show code" }).click();
  await expect(page.getByRole("navigation", { name: "Files" }).getByText("use-tasks.ts")).toBeVisible();
  await expect(page.locator(".forge-code .shiki")).toBeVisible();

  // A follow-up creates v2 of the same project.
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.click();
  await prompt.pressSequentially("Make the add button bigger");
  await prompt.press("Enter");
  await expect(preview(page, 2)).toBeAttached({ timeout: 30_000 });

  // Restoring v1 appends v3 with v1's files.
  await page.getByRole("button", { name: "Restore" }).first().click();
  await expect(visibleText(page, "Restored v1 as v3.")).toBeVisible();

  // Everything persisted: reload shows the same history.
  await page.reload();
  await expect(visibleText(page, "Restored v1 as v3.")).toBeVisible();
  await expect(preview(page, 3)).toBeAttached();
});

test("private chats are hidden; unlisted chats are read-only for others and can be duplicated", async ({ page, browser }) => {
  const url = await createChatAsGuest(page, "Contact Form");

  // Another visitor (fresh browser context, signed out) can't see a private chat.
  const visitor = await browser.newContext();
  const other = await visitor.newPage();
  await other.goto(url);
  await expect(other.getByRole("heading", { name: "Chat not found" })).toBeVisible();

  // Owner shares it as unlisted.
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("menuitem", { name: /Unlisted/ }).click();
  await expect(page.getByRole("button", { name: "Share" })).toBeEnabled();

  // Now the visitor sees a read-only view with Duplicate.
  await other.goto(url);
  await expect(visibleText(other, /You're viewing a shared chat/)).toBeVisible();
  await expect(other.getByRole("textbox", { name: "Prompt" })).toHaveCount(0);
  await other.getByRole("button", { name: "Duplicate" }).last().click();
  await other.getByRole("button", { name: "Continue as guest" }).click();
  await expect(other).not.toHaveURL(url);
  await expect(preview(other, 1)).toBeAttached();
  await expect(other.getByRole("textbox", { name: "Prompt" })).toBeVisible();
  await visitor.close();
});
