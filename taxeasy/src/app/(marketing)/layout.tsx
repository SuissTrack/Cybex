import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🇨🇭</span>
            <span className="font-bold text-xl text-blue-600">TaxEasy</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">
              Comment ça marche
            </a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">
              Tarifs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Commencer gratuit
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🇨🇭</span>
                <span className="font-bold text-white text-lg">TaxEasy</span>
              </div>
              <p className="text-sm leading-relaxed">
                La déclaration d&apos;impôt genevoise simplifiée.
                Conforme au guide AFC-GE 2025.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Comment ça marche</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Conditions d&apos;utilisation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mentions légales</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@taxeasy.ch" className="hover:text-white transition-colors">support@taxeasy.ch</a></li>
                <li>
                  <a
                    href="https://ge.ch/taxes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    AFC-GE officiel ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
            <p>© {new Date().getFullYear()} TaxEasy. Tous droits réservés.</p>
            <p className="text-gray-500 text-xs">
              TaxEasy est un outil d&apos;aide à la déclaration. L&apos;AFC-GE reste l&apos;autorité fiscale compétente.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
