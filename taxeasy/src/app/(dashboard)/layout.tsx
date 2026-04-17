import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-blue-600 text-lg">
            TaxEasy
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Déclarations
            </Link>
            <Link
              href="/documents"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Documents
            </Link>
            <Link
              href="/settings"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Paramètres
            </Link>

            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <span className="text-sm text-gray-600">{session.user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button variant="ghost" size="sm" type="submit">
                  Déconnexion
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
