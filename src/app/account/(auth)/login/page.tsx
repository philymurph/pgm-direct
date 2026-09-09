import { LoginForm } from "@/components/account/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Sign in</h1>
      <LoginForm />
    </div>
  );
}
