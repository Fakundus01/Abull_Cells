import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAdmin, RequireAuth, RequireGuest } from "./guards";

const mockUseAuth = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function LocationEcho() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderAt(initialEntry, routes) {
  return render(<MemoryRouter initialEntries={[initialEntry]}>{routes}</MemoryRouter>);
}

beforeEach(() => {
  mockUseAuth.mockReset();
});

describe("guards", () => {
  it("RequireAuth shows loader while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loadingAuth: true });

    renderAt(
      "/perfil",
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/perfil" element={<div>Perfil</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText("Cargando tu sesion...")).toBeInTheDocument();
  });

  it("RequireAuth redirects guests to login preserving next", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, loadingAuth: false });

    renderAt(
      "/perfil?tab=seguridad#form",
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/perfil" element={<div>Perfil</div>} />
        </Route>
        <Route path="/login" element={<LocationEcho />} />
      </Routes>
    );

    expect(screen.getByTestId("location").textContent).toBe(
      "/login?next=%2Fperfil%3Ftab%3Dseguridad%23form"
    );
  });

  it("RequireAuth renders protected route when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loadingAuth: false });

    renderAt(
      "/perfil",
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/perfil" element={<div>Perfil visible</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText("Perfil visible")).toBeInTheDocument();
  });

  it("RequireGuest redirects authenticated users to sanitized next", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loadingAuth: false });

    renderAt(
      "/login?next=/checkout",
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<div>Login</div>} />
        </Route>
        <Route path="/checkout" element={<LocationEcho />} />
      </Routes>
    );

    expect(screen.getByTestId("location").textContent).toBe("/checkout");
  });

  it("RequireGuest ignores invalid external next and sends user to perfil", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, loadingAuth: false });

    renderAt(
      "/login?next=//evil.site",
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<div>Login</div>} />
        </Route>
        <Route path="/perfil" element={<LocationEcho />} />
      </Routes>
    );

    expect(screen.getByTestId("location").textContent).toBe("/perfil");
  });

  it("RequireAdmin redirects non-admin users to home", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      loadingAuth: false,
    });

    renderAt(
      "/admin",
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<div>Admin</div>} />
        </Route>
        <Route path="/" element={<LocationEcho />} />
      </Routes>
    );

    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("RequireAdmin allows admin users", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
      loadingAuth: false,
    });

    renderAt(
      "/admin",
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<div>Panel admin</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText("Panel admin")).toBeInTheDocument();
  });
});
