import { RegisterForm } from "@/components/account/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Create an account</h1>
      <RegisterForm />
    </div>
  );
}
