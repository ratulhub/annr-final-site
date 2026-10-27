import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession, setState, uid, useAdmin, type AdminUser } from "../admin/store";
import { confirmReauth } from "../admin/security/auth";
import { canAssignRole, PERMISSIONS, ROLE_PERMISSIONS, ROLES, type Role } from "../admin/security/permissions";
import { Card } from "../admin/ui";
import { dataSource } from "../admin/services/dataSource";
import { NAV_GROUPS } from "../admin/config/navigation";

export const Route = createFileRoute("/admin/users")({ component: Users });

const PERM_KEY = "shihiko-role-permissions";
type Level = "none" | "view" | "edit";
type Perms = Record<string, Record<string, Level>>;
const AREAS = NAV_GROUPS.map((g) => g.group).filter((g) => g !== "Overview");
const defaults = (): Perms =>
  Object.fromEntries(
    ROLES.map((r) => [
      r,
      Object.fromEntries(
        AREAS.map((a) => [
          a,
          r === "super_admin" || r === "admin"
            ? "edit"
            : r === "analytics_viewer"
              ? a === "Analytics"
                ? "view"
                : "none"
              : /Users|Security|Settings|Integrations/.test(a)
                ? "view"
                : "edit",
        ]),
      ),
    ]),
  );

function Users() {
  const s = useAdmin();
  const session = getSession();
  const actorRole: Role = session?.role ?? "super_admin";
  const actorEmail = (session?.email ?? "").toLowerCase();
  const [perms, setPerms] = useState<Perms>(defaults);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const p = dataSource.read<Perms>(PERM_KEY);
    if (p) setPerms({ ...defaults(), ...p });
  }, []);
  const set = (role: string, area: string, v: Level) => {
    const p = { ...perms, [role]: { ...perms[role], [area]: v } };
    setPerms(p);
    dataSource.write(PERM_KEY, p);
  };
  const emailOk = s.admins.every((a) => !a.email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email));

  const updateAdmin = async (i: number, patch: Partial<AdminUser>) => {
    const target = s.admins[i];
    if (!target) return;
    setMsg("");
    if (patch.role && patch.role !== target.role) {
      const isSelf = !!target.email && target.email.toLowerCase() === actorEmail;
      if (!canAssignRole(actorRole, actorEmail || "self", isSelf ? actorEmail || "self" : target.id)) {
        setMsg("Only a super_admin can assign roles, and nobody can change their own role.");
        return;
      }
      if (!(await confirmReauth("change staff role"))) return;
    }
    setState((x) => ({ ...x, admins: x.admins.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  };

  const addAdmin = async () => {
    setMsg("");
    if (actorRole !== "super_admin") {
      setMsg("Only a super_admin can add staff accounts.");
      return;
    }
    if (!(await confirmReauth("add a staff account"))) return;
    setState((x) => ({ ...x, admins: [...x.admins, { id: uid(), name: "", email: "", role: "support_agent" }] }));
  };

  const removeAdmin = async (i: number) => {
    const target = s.admins[i];
    if (!target) return;
    setMsg("");
    if (target.email && target.email.toLowerCase() === actorEmail) {
      setMsg("You cannot remove your own account.");
      return;
    }
    if (!(await confirmReauth("remove a staff account"))) return;
    setState((x) => ({ ...x, admins: x.admins.filter((_, j) => j !== i) }));
  };

  return (
    <>
      <div className="adm-top"><h1>Users & permissions</h1></div>
      <p className="adm-hint">Plan who can do what. Saved in this browser only — database enforcement lives in <code>database/sql/03_rbac.sql</code> once a backend is connected.</p>
      <Card title="Staff & admins">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th /></tr></thead>
            <tbody>
              {s.admins.map((a, i) => {
                const isSelf = !!a.email && a.email.toLowerCase() === actorEmail;
                const roleValue = (ROLES as readonly string[]).includes(a.role) ? a.role : "super_admin";
                return (
                  <tr key={a.id}>
                    <td><input value={a.name} onChange={(e) => updateAdmin(i, { name: e.target.value })} placeholder="Staff name" /></td>
                    <td><input value={a.email} onChange={(e) => updateAdmin(i, { email: e.target.value })} placeholder="staff@annr.com" /></td>
                    <td>
                      <select value={roleValue} disabled={isSelf} onChange={(e) => updateAdmin(i, { role: e.target.value })} aria-label={`Role for ${a.name || a.email || "user"}`}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="adm-btn danger sm" disabled={isSelf} title={isSelf ? "Cannot remove your own account" : "Remove"} onClick={() => removeAdmin(i)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="adm-row" style={{ marginTop: 10 }}>
            <button className="adm-btn ghost" onClick={addAdmin}>+ Add</button>
          </div>
        </div>
        {!emailOk && <div className="adm-err" style={{ marginTop: 8 }}>One of the emails is not valid.</div>}
        {msg && <div className="adm-err" style={{ marginTop: 8 }}>{msg}</div>}
      </Card>
      <Card title="Role permissions" action={<button className="adm-btn ghost sm" onClick={() => confirm("Reset permissions to defaults?") && (setPerms(defaults()), dataSource.clear(PERM_KEY))}>Reset</button>}>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Area</th>{ROLES.map((r) => <th key={r} style={{ fontSize: 9 }}>{r.replace("_", " ")}</th>)}</tr></thead><tbody>
          {AREAS.map((a) => <tr key={a}><td>{a}</td>{ROLES.map((r) => <td key={r}>
            <select value={perms[r]?.[a] || "none"} disabled={r === "super_admin"} onChange={(e) => set(r, a, e.target.value as Level)} aria-label={`${r} ${a}`}>
              <option value="none">No access</option><option value="view">View</option><option value="edit">Edit</option></select></td>)}</tr>)}
        </tbody></table></div>
        <p className="adm-hint">super_admin always has full access ({PERMISSIONS.length} permissions in <code>public.role_permissions</code>; {ROLE_PERMISSIONS.admin.length} for admin).</p>
      </Card>
    </>
  );
}
