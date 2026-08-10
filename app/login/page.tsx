import { AppDataProvider } from "@/components/app-data-provider";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <AppDataProvider><LoginForm /></AppDataProvider>;
}
