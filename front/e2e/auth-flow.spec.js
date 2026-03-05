import { expect, test } from "@playwright/test";

function createUser({ role = "user", email = "cliente@test.com" } = {}) {
  return {
    id: role === "admin" ? 1 : 2,
    name: role === "admin" ? "Admin Test" : "Cliente Test",
    email,
    role,
    emailVerified: true,
  };
}

async function mockApi(page, { initialUser = null } = {}) {
  let currentUser = initialUser;

  await page.route("http://127.0.0.1:9999/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me" && method === "GET") {
      if (!currentUser) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ msg: "No autenticado" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: currentUser }),
      });
      return;
    }

    if (path === "/auth/login" && method === "POST") {
      const payload = request.postDataJSON?.() || {};
      const email = String(payload.email || "cliente@test.com");
      const role = email.includes("admin") ? "admin" : "user";
      currentUser = createUser({ role, email });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: currentUser, token: "fake-token" }),
      });
      return;
    }

    if (path === "/auth/logout" && method === "POST") {
      currentUser = null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    if (path === "/users/addresses" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    if (path === "/orders/my" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orders: [] }),
      });
      return;
    }

    // Safe fallback for other requests used during route rendering.
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

test.describe("Auth flow (e2e)", () => {
  test("login redirects to next protected route", async ({ page }) => {
    await mockApi(page, { initialUser: null });

    await page.goto("/login?next=/checkout");
    await page.locator('input[type="email"]').fill("cliente@test.com");
    await page.locator('input[type="password"]').first().fill("claveSegura123");
    await page.getByRole("button", { name: /Ingresar/i }).click();

    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("guest pages redirect authenticated user to profile", async ({ page }) => {
    await mockApi(page, { initialUser: createUser({ role: "user" }) });

    await page.goto("/login");

    await expect(page).toHaveURL(/\/perfil$/);
  });

  test("admin guard redirects non-admin user to home", async ({ page }) => {
    await mockApi(page, { initialUser: createUser({ role: "user" }) });

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/$/);
  });

  test("admin guard allows admin user", async ({ page }) => {
    await mockApi(page, {
      initialUser: createUser({ role: "admin", email: "admin@test.com" }),
    });

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin$/);
  });
});
