import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register - TaxWise Assistant",
  description: "Create a new TaxWise Assistant account.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
