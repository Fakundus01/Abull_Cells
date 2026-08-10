// src/components/admin/AdminUsersView.jsx
import { useLanguage } from "../../context/LanguageContext";
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
  const { t } = useLanguage();
  const { ShieldCheck, Loader2 } = icons;

  return (
    <div className={`admin-card ${cardAnimateClass}`} style={{ marginTop: 16 }}>
      <div className="admin-card-header">
        <h2 className="admin-card-title">
          <ShieldCheck size={18} className="icon" /> {t("admin.users.title")}
        </h2>

        <button
          type="button"
          className="btn-small btn-icon"
          onClick={onReload}
          disabled={loadingUsers}
        >
          {loadingUsers ? (
            <>
              <Loader2 size={16} className="icon spin" /> {t("admin.users.loading")}
            </>
          ) : (
            "Actualizar"
          )}
        </button>
      </div>

      {loadingUsers ? (
        <p className="admin-muted">
          <Loader2 size={16} className="icon spin" /> {t("admin.users.loadingList")}
        </p>
      ) : users.length === 0 ? (
        <p className="admin-muted">{t("admin.users.empty")}</p>
      ) : (
         <>
          <div className="admin-users-table modern">
            <div className="admin-users-header">
              <span>{t("admin.users.headers.id")}</span>
              <span>{t("admin.users.headers.name")}</span>
              <span>{t("admin.users.headers.email")}</span>
              <span>{t("admin.users.headers.role")}</span>
            </div>

          {pagedUsers.map((u) => (
              <div key={u.id} className="admin-users-row">
                <span className="cell-muted">#{u.id}</span>
                <span className="cell-strong">{u.name}</span>
                <span className="cell-muted">{u.email}</span>
                <span>
                  <span className={`role-pill ${u.role === "admin" ? "admin" : "user"}`}>
                    {u.role === "admin" ? t("admin.users.roles.admin") : t("admin.users.roles.user")}
                  </span>
                </span>
            </div>
          ))}
        </div>
    <div className="admin-pagination">
            <span className="admin-muted">
              {t("admin.pagination.showing", {
                start: users.length === 0 ? 0 : (usersPage - 1) * pageSize + 1,
                end: Math.min(usersPage * pageSize, users.length),
                total: users.length,
              })}
            </span>

            <div className="admin-pagination-actions">
              <button type="button" className="btn-small" onClick={onPrevPage} disabled={usersPage === 1}>
                {t("admin.pagination.prev")}
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
                {t("admin.pagination.next")}
              </button>
            </div>
            </div>
        </>
      )}
    </div>
  );
}
