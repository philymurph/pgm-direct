import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Change password
      </h2>
      <div className="mt-3">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
