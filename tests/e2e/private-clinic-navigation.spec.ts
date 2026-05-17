import { expect, test } from "@playwright/test";

const PRIVATE_CLINIC_BASE = "/dashboard/private-clinic";
const DISCOVER_ROUNDS = 2;

function normalizeHref(href: string): string | null {
  if (!href.startsWith(PRIVATE_CLINIC_BASE)) return null;
  const trimmed = href.split("#")[0] ?? href;
  if (!trimmed) return null;
  return trimmed;
}

test("clinic login page shows clinic branding", async ({ page }) => {
  await page.goto("/login/clinic");
  await expect(page.getByRole("heading", { name: "Clinic management" })).toBeVisible();
  await expect(page.getByText("Sign in to manage your clinic.")).toBeVisible();
});

test("private clinic navigation does not throw client exceptions", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run this navigation smoke test.");

  const uncaughtErrors: string[] = [];
  page.on("pageerror", (error) => {
    uncaughtErrors.push(`pageerror: ${error.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      uncaughtErrors.push(`console.error: ${msg.text()}`);
    }
  });

  await page.goto(
    `/login/clinic?callbackUrl=${encodeURIComponent(PRIVATE_CLINIC_BASE)}`,
  );
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(`**${PRIVATE_CLINIC_BASE}**`);
  await expect(page).toHaveURL(new RegExp(`${PRIVATE_CLINIC_BASE.replace(/\//g, "\\/")}`));

  const discovered = new Set<string>([PRIVATE_CLINIC_BASE]);
  const visited = new Set<string>();
  const queue: string[] = [PRIVATE_CLINIC_BASE];

  for (let i = 0; i < DISCOVER_ROUNDS; i += 1) {
    const snapshot = [...queue];
    for (const target of snapshot) {
      if (visited.has(target)) continue;
      visited.add(target);
      await page.goto(target);
      await page.waitForLoadState("domcontentloaded");

      const moreButton = page.getByRole("button", { name: /more|עוד/i });
      if (await moreButton.count()) {
        await moreButton.first().click();
      }

      const hrefs = await page.evaluate((basePath: string) => {
        const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
        return anchors
          .map((anchor) => anchor.getAttribute("href") ?? "")
          .filter((href) => href.startsWith(basePath));
      }, PRIVATE_CLINIC_BASE);

      for (const href of hrefs) {
        const normalized = normalizeHref(href);
        if (!normalized || discovered.has(normalized)) continue;
        discovered.add(normalized);
        queue.push(normalized);
      }
    }
  }

  for (const href of queue) {
    await page.goto(href);
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  expect.soft(uncaughtErrors, uncaughtErrors.join("\n")).toEqual([]);
});
