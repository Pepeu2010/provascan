"use client";

import { useEffect, useState } from "react";
import { KeyRound, Pencil, RotateCcw, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ManagedUser = { id: string; nome: string; email: string; perfil: "admin" | "vice_diretor" | "coordenador" | "professor"; ativo: string; trocar_senha: string };
type Role = ManagedUser["perfil"];

const roles: Array<{ value: Role; label: string }> = [
  { value: "professor", label: "Professor" },
  { value: "coordenador", label: "Coordenador" },
  { value: "vice_diretor", label: "Vice-diretor" },
  { value: "admin", label: "Admin" },
];

function roleLabel(role: Role) { return roles.find((item) => item.value === role)?.label ?? role; }
function roleTone(role: Role) { return role === "admin" ? "accent" as const : role === "vice_diretor" ? "warning" as const : "neutral" as const; }

async function readBody(response: Response) {
  return await response.json() as { error?: string; message?: string; users?: ManagedUser[] };
}

export function UserManagementPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [access, setAccess] = useState("");
  const [role, setRole] = useState<Role>("professor");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar as pessoas.");
      setUsers(body.users ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar as pessoas."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // Initial load only; later refreshes are explicit user actions.
  }, []);

  const create = async () => {
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: name, acesso: access, perfil: role, senhaTemporaria: temporaryPassword }) });
      const body = await readBody(response);
      if (!response.ok) throw new Error(body.error || "Não foi possível cadastrar esta pessoa.");
      setMessage(body.message || "Pessoa cadastrada."); setName(""); setAccess(""); setRole("professor"); setTemporaryPassword(""); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar esta pessoa."); }
  };

  return <Card className="p-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3"><Badge tone="accent">Administração de pessoas</Badge><Badge tone="neutral">{users.length} cadastros</Badge></div>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Equipe e acessos</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">Cadastre quem chega, edite dados e perfis, encerre acessos e recupere MFA. Desativar preserva o histórico de provas e bloqueia a conta imediatamente.</p>
      </div>
      <Button variant="secondary" onClick={() => void load()} disabled={loading}><RotateCcw className="size-4" />Atualizar</Button>
    </div>

    <div className="mt-6 rounded-[22px] border border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_5%,var(--surface))] p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><UserPlus className="size-4 text-[var(--accent)]" />Cadastrar nova pessoa</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" /><Input value={access} onChange={(event) => setAccess(event.target.value)} placeholder="Acesso ou e-mail" autoComplete="off" /><Select value={role} onChange={(event) => setRole(event.target.value as Role)}>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select><Input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="Senha temporária" autoComplete="new-password" /></div>
      <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">A senha precisa ter 10 caracteres, letra e número. A pessoa deverá trocá-la no primeiro acesso e configurar MFA.</p>
      <Button className="mt-4" disabled={!name.trim() || !access.trim() || !temporaryPassword} onClick={() => void create()}><UserPlus className="size-4" />Cadastrar pessoa</Button>
    </div>

    <div className="mt-5 grid gap-3">
      {loading ? <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">Carregando equipe...</div> : null}
      {!loading && !users.length ? <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">Nenhuma pessoa cadastrada.</div> : null}
      {users.map((user) => <ManagedUserCard key={user.id} user={user} currentUserId={currentUserId} onChanged={async (nextMessage) => { setMessage(nextMessage); await load(); }} />)}
    </div>
    {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]" role="status">{message}</p> : null}
  </Card>;
}

function ManagedUserCard({ user, currentUserId, onChanged }: { user: ManagedUser; currentUserId: string; onChanged: (message: string) => Promise<void> }) {
  const [name, setName] = useState(user.nome); const [access, setAccess] = useState(user.email); const [role, setRole] = useState<Role>(user.perfil); const [busy, setBusy] = useState(false); const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const self = user.id === currentUserId;
  const active = user.ativo.toUpperCase() === "SIM";
  const request = async (body: Record<string, unknown>) => {
    setBusy(true);
    try { const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await readBody(response); if (!response.ok) throw new Error(result.error || "Não foi possível atualizar esta pessoa."); await onChanged(result.message || "Dados atualizados."); }
    catch (error) { await onChanged(error instanceof Error ? error.message : "Não foi possível atualizar esta pessoa."); }
    finally { setBusy(false); setConfirmDeactivate(false); }
  };
  return <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-base font-semibold text-[var(--foreground)]">{user.nome}</p><Badge tone={active ? "success" : "error"}>{active ? "Ativo" : "Desativado"}</Badge><Badge tone={roleTone(user.perfil)}>{roleLabel(user.perfil)}</Badge>{self ? <Badge tone="neutral">Sua conta</Badge> : null}</div><p className="mt-2 text-sm text-[var(--muted-foreground)]">{user.email} · {user.trocar_senha.toUpperCase() === "SIM" ? "troca de senha pendente" : "senha regular"}</p></div>{!self ? <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => void request({ action: "reset-mfa" })}><KeyRound className="size-4" />Resetar MFA</Button>{active ? <Button variant={confirmDeactivate ? "danger" : "ghost"} disabled={busy} onClick={() => confirmDeactivate ? void request({ action: "set-active", active: false }) : setConfirmDeactivate(true)}>{confirmDeactivate ? <><ShieldOff className="size-4" />Confirmar desativação</> : <><ShieldOff className="size-4" />Desativar</>}</Button> : <Button disabled={busy} onClick={() => void request({ action: "set-active", active: true })}><ShieldCheck className="size-4" />Reativar</Button>}</div> : null}</div>{!self ? <details className="mt-4 border-t border-[var(--border)] pt-4"><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><Pencil className="size-4 text-[var(--accent)]" />Editar dados e perfil</summary><div className="mt-4 grid gap-3 md:grid-cols-3"><Input value={name} onChange={(event) => setName(event.target.value)} aria-label={`Nome de ${user.nome}`} /><Input value={access} onChange={(event) => setAccess(event.target.value)} aria-label={`Acesso de ${user.nome}`} /><Select value={role} onChange={(event) => setRole(event.target.value as Role)} aria-label={`Perfil de ${user.nome}`}>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></div><Button className="mt-3" variant="secondary" loading={busy} onClick={() => void request({ action: "update", nome: name, acesso: access, perfil: role })}><Pencil className="size-4" />Salvar alterações</Button></details> : null}</div>;
}
