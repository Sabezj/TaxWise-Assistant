import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - TaxWise Assistant",
  description: "Log in to your TaxWise Assistant account.",
};

export default function LoginPage() {
  return <LoginForm />;
}
