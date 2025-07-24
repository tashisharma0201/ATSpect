import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Upload,
  History,
  Rocket,
  BarChart3,
  RefreshCw,
} from "lucide-react"

// --- Reusable NavLink Component ---
const NavLink = ({ to, children, onClick }) => {
  const { pathname } = useLocation()
  const isActive = pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
        isActive
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  )
}

// --- Main Navbar Component ---
const Navbar = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate("/auth")
      closeMobileMenu()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Refresh the whole page
  const handleRefresh = () => {
    window.location.reload()
  }

  const navLinks = (
    <>
      <NavLink to="/" onClick={closeMobileMenu}>
        <LayoutDashboard size={16} /> Dashboard
      </NavLink>
      <NavLink to="/upload" onClick={closeMobileMenu}>
        <Upload size={16} /> Upload Resume
      </NavLink>
      <NavLink to="/submissions" onClick={closeMobileMenu}>
        <History size={16} /> Submissions
      </NavLink>
      <NavLink to="/insights" onClick={closeMobileMenu}>
        <BarChart3 size={16} /> Insights
      </NavLink>
    </>
  )

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2">
            <Rocket className="text-indigo-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ATSpect
            </span>
          </Link>

          {/* Desktop Navigation & Refresh Button */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex gap-1">{navLinks}</div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-600 transition-colors text-sm font-medium"
              aria-label="Refresh page"
              type="button"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            {user && (
              <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <User size={16} />
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                </span>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  aria-label="Log Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Refresh Button (visible on mobile too) */}
          <button
            onClick={handleRefresh}
            className="md:hidden flex items-center gap-1 mr-2 px-2 py-1 rounded-md border border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-600 transition-colors text-sm font-medium"
            aria-label="Refresh page"
            type="button"
          >
            <RefreshCw size={20} />
          </button>

          {/* Toggle Menu (Mobile) */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown (simple, no overlay, no scroll) */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="flex flex-col py-2">{navLinks}</div>

            {user && (
              <div className="pt-4 border-t border-slate-200 flex flex-col space-y-3 px-4 pb-4">
                <div className="flex items-center gap-2 text-slate-600 text-sm">
                  <User size={16} />
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar
