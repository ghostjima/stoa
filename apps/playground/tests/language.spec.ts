// The chrome's language: English by default, Russian from the header's
// switch, kept for the next visit. The frames keep their own language.
import { expect, test } from "@playwright/test";

test("the header's switch puts the chrome in Russian and the next visit keeps it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stoa System", level: 1 })).toBeVisible();
  await expect(page).toHaveTitle("Stoa System");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByRole("radiogroup", { name: "Playground language" }).getByRole("radio", { name: "RU" }).click();
  await expect(page.getByRole("heading", { name: "Stoa Система", level: 1 })).toBeVisible();
  await expect(page.getByText("Дизайн-система для плотных финансовых интерфейсов")).toBeVisible();
  await expect(page).toHaveTitle("Stoa Система");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  // A side panel's heading, and a tab whose label counts.
  await expect(page.getByRole("heading", { name: "Сеанс" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Переопределения (0)" })).toBeVisible();

  // The frames are not the chrome: they stay in their own language.
  await expect(page.locator('[data-frame="light-ltr"]')).toHaveAttribute("lang", "en");
  await expect(page.locator('[data-slot="1"]').getByRole("radiogroup", { name: "Предпросмотр 1: язык" })).toBeVisible();

  // Kept in this browser, not only in the URL.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stoa Система", level: 1 })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("stoa-playground-lang"))).toBe("ru");

  await page.getByRole("radiogroup", { name: "Язык песочницы" }).getByRole("radio", { name: "EN" }).click();
  await expect(page.getByRole("heading", { name: "Stoa System", level: 1 })).toBeVisible();
  await expect(page).toHaveTitle("Stoa System");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
