import PrincipalLoginForm from "@/app/kepala-sekolah/login/PrincipalLoginForm";

export const metadata = {
  title: "Login Admin | SMK Nan Jaya",
  description: "Masuk ke portal admin SMK Nan Jaya.",
};

export default function AdminLoginPage() {
  return <PrincipalLoginForm role="admin" />;
}
