"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSafePostAuthRedirect, navigateAfterAuth } from "@/lib/client-auth-navigation";

export function ChangePasswordForm() {
  const { changeTeacherPassword, session } = useAppData();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordFields = [
    {
      autoComplete: "current-password",
      id: "current-password",
      label: "Senha atual",
      onChange: setCurrentPassword,
      placeholder: "Digite sua senha atual",
      value: currentPassword,
    },
    {
      autoComplete: "new-password",
      id: "new-password",
      label: "Nova senha",
      onChange: setNewPassword,
      placeholder: "Use pelo menos 8 caracteres",
      value: newPassword,
    },
    {
      autoComplete: "new-password",
      id: "confirm-new-password",
      label: "Confirmar nova senha",
      onChange: setConfirmPassword,
      placeholder: "Repita a nova senha",
      value: confirmPassword,
    },
  ] as const;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await changeTeacherPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setIsSubmitting(false);
    setMessage(result.message);

    if (result.ok) {
      navigateAfterAuth(getSafePostAuthRedirect(result.redirectTo, "/dashboard"));
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] items-center justify-center px-4 py-8 lg:px-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-xl"
      >
        <Card className="overflow-hidden p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <ProvaScanLogo size="md" />
              <p className="mt-6 text-sm text-[var(--muted-foreground)]">Primeiro acesso protegido</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                Troque sua senha para continuar
              </h1>
            </div>
            <Badge tone="warning">Obrigatório</Badge>
          </div>

          <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
            {session?.nome ? `${session.nome}, ` : ""}sua conta está marcada com `trocar_senha = SIM`.
            Defina uma nova senha antes de acessar o painel.
          </p>

          <form
            className="mt-8 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            {passwordFields.map((field) => (
              <div key={field.id} className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
                <label htmlFor={field.id}>{field.label}</label>
                <div className="flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--border-strong)]">
                  <KeyRound className="mr-3 size-4 text-[var(--muted-foreground)]" />
                  <Input
                    id={field.id}
                    className="h-auto rounded-none border-0 bg-transparent px-0 shadow-none hover:translate-y-0 hover:border-0 hover:shadow-none focus:shadow-none"
                    type="password"
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button size="lg" className="mt-2 w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>

          {message ? (
            <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_64%,transparent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              {message}
            </div>
          ) : null}

          <div className="mt-6 rounded-[24px] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-5 text-[var(--accent)]" />
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                A nova senha é protegida por hash seguro no banco de dados.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

