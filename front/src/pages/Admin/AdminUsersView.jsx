// src/components/admin/AdminUsersView.jsx
export default function AdminUsersView({
  users,
  pagedUsers,
  loadingUsers,
  usersPage,
  totalUserPages,
  pageSize,
  onPrevPage,
  onNextPage,
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
         <>
          <div className="admin-users-table modern">
            <div className="admin-users-header">
              <span>ID</span>
              <span>Nombre</span>
              <span>Email</span>
              <span>Rol</span>
            </div>

          {pagedUsers.map((u) => (
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
    <div className="admin-pagination">
            <span className="admin-muted">
              Mostrando{" "}
              <strong>{users.length === 0 ? 0 : (usersPage - 1) * pageSize + 1}</strong> –{" "}
              <strong>{Math.min(usersPage * pageSize, users.length)}</strong> de{" "}
              <strong>{users.length}</strong>
            </span>

            <div className="admin-pagination-actions">
              <button type="button" className="btn-small" onClick={onPrevPage} disabled={usersPage === 1}>
                Anterior
              </button>

              <span className="page-pill">
                {usersPage}/{totalUserPages}
              </span>

              <button
                type="button"
                className="btn-small"
                onClick={onNextPage}
                disabled={usersPage === totalUserPages}
              >
                Siguiente
              </button>
            </div>
            </div>
        </>
      )}
    </div>
  );
}
