// src/components/admin/AdminUsersView.jsx
export default function AdminUsersView({
  users,
  loadingUsers,
  onReload,
  icons,
  cardAnimateClass = "",
}) {
  const { ShieldCheck, Loader2 } = icons;

  return (
    <div className={`admin-card ${cardAnimateClass}`} style={{ marginTop: 16 }}>
      <div className="admin-card-header">
        <h2 className="admin-card-title">
          <ShieldCheck size={18} className="icon" /> Usuarios
        </h2>

        <button
          type="button"
          className="btn-small btn-icon"
          onClick={onReload}
          disabled={loadingUsers}
        >
          {loadingUsers ? (
            <>
              <Loader2 size={16} className="icon spin" /> Cargando...
            </>
          ) : (
            "Actualizar"
          )}
        </button>
      </div>

      {loadingUsers ? (
        <p className="admin-muted">
          <Loader2 size={16} className="icon spin" /> Cargando usuarios...
        </p>
      ) : users.length === 0 ? (
        <p className="admin-muted">No hay usuarios para mostrar.</p>
      ) : (
        <div className="admin-users-table modern">
          <div className="admin-users-header">
            <span>ID</span>
            <span>Nombre</span>
            <span>Email</span>
            <span>Rol</span>
          </div>

          {users.map((u) => (
            <div key={u.id} className="admin-users-row">
              <span className="cell-muted">#{u.id}</span>
              <span className="cell-strong">{u.name}</span>
              <span className="cell-muted">{u.email}</span>
              <span>
                <span className={`role-pill ${u.role === "admin" ? "admin" : "user"}`}>
                  {u.role}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
