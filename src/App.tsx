import React, { useState, useEffect, useMemo } from "react";
import { Car, PartnerInvestment, CarStatus, Partner } from "./types";
import AddCarModal from "./components/AddCarModal";
import CarDetailModal from "./components/CarDetailModal";
import StatementPrintView from "./components/StatementPrintView";

// Tab imports
import DashboardTab from "./components/DashboardTab";
import VehiclesTab from "./components/VehiclesTab";
import PartnersTab from "./components/PartnersTab";
import ExpensesTab from "./components/ExpensesTab";
import ReportsTab from "./components/ReportsTab";

import { 
  Car as CarIcon, 
  Plus, 
  Layers, 
  Sun, 
  Moon, 
  BarChart3, 
  Users, 
  FileText, 
  Wallet,
  Activity,
  X,
  LogOut,
  KeyRound,
  ShieldCheck
} from "lucide-react";

export default function App() {
  const [cars, setCars] = useState<Car[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState("");

  const [theme, setTheme] = useState<"light" | "dark" | string>(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Modals state
  const [view, setView] = useState<"dashboard" | "vehicles" | "partners" | "expenses" | "reports">("dashboard");
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [printCar, setPrintCar] = useState<Car | null>(null);
  const [printCars, setPrintCars] = useState<Car[] | null>(null);
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);

  // Admin access state engine
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem("isAdminActive") === "true";
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleAdminLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminPasswordInput === "admin" || adminPasswordInput === "admin123" || adminPasswordInput === "dealership2026") {
      setIsAdmin(true);
      localStorage.setItem("isAdminActive", "true");
      setShowAdminLoginModal(false);
      setAdminPasswordInput("");
      setAdminError("");
    } else {
      setAdminError("Invalid administrator passcode. Hint: Use 'admin123'.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("isAdminActive");
  };

  // Site-wide Authentication Gate State Engine
  const [isSiteAuthenticated, setIsSiteAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("site_authenticated") === "true";
  });
  const [siteUsernameInput, setSiteUsernameInput] = useState("");
  const [sitePasswordInput, setSitePasswordInput] = useState("");
  const [siteAuthError, setSiteAuthError] = useState("");

  const handleSiteLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = siteUsernameInput.trim().toLowerCase();
    const p = sitePasswordInput;

    if (
      (u === "admin" && (p === "admin" || p === "admin123")) ||
      (u === "partner" && (p === "partner" || p === "partner123"))
    ) {
      setIsSiteAuthenticated(true);
      localStorage.setItem("site_authenticated", "true");
      if (u === "admin") {
        setIsAdmin(true);
        localStorage.setItem("isAdminActive", "true");
      }
      setSiteUsernameInput("");
      setSitePasswordInput("");
      setSiteAuthError("");
    } else {
      setSiteAuthError("Invalid username or password credentials. Please verify and retry.");
    }
  };

  const handleSiteLogout = () => {
    setIsSiteAuthenticated(false);
    localStorage.removeItem("site_authenticated");
    handleAdminLogout();
  };

  // Fetch cars on load
  const fetchCars = async () => {
    setIsLoading(true);
    setNetworkError("");
    try {
      const res = await fetch("/api/cars");
      if (!res.ok) throw new Error("Could not pull vehicle list from database server.");
      const data = await res.json();
      setCars(data);
    } catch (err: any) {
      console.error(err);
      setNetworkError(err.message || "Could not reach portfolio server.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/partners");
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch (err) {
      console.error("Error fetching partners wallet:", err);
    }
  };

  useEffect(() => {
    fetchCars();
    fetchPartners();
  }, []);

  // Compute number of pending co-investor payouts globally
  const overduePayoutsCount = useMemo(() => {
    return cars.filter(c => c.status === "Sold" && c.investments.length > 0 && !c.payoutsProcessed).length;
  }, [cars]);

  // CRUD Operations
  const handleCreateCar = async (carFields: Partial<Car>) => {
    try {
      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(carFields)
      });
      if (!res.ok) throw new Error("Server rejected create instruction.");
      await fetchCars();
      await fetchPartners();
      setIsAddCarOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to create car deal folder.");
    }
  };

  const handleUpdateCarFields = async (carId: string, updatedFields: Partial<Car>) => {
    try {
      const res = await fetch(`/api/cars/${carId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (!res.ok) throw new Error("Server rejected dossier update.");
      
      // Update in memory list
      const updatedCar = await res.json();
      setCars(prev => prev.map(c => c.id === carId ? updatedCar : c));
      await fetchPartners();
    } catch (err: any) {
      alert(err.message || "Failed to sync fields.");
    }
  };

  const handleDeleteCar = async (carId: string) => {
    try {
      const res = await fetch(`/api/cars/${carId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete vehicle file.");
      
      setCars(prev => prev.filter(c => c.id !== carId));
      await fetchPartners();
      if (selectedCarId === carId) setSelectedCarId(null);
    } catch (err: any) {
      alert(err.message || "Deletion failed.");
    }
  };

  // Extract all unique partners across the ecosystem for filter items
  const allUniquePartners = useMemo(() => {
    const list = new Set<string>();
    cars.forEach(c => {
      c.investments.forEach(inv => {
        if (inv.partnerName.trim()) {
          list.add(inv.partnerName.trim());
        }
      });
    });
    // Fallback default partner list if empty
    if (list.size === 0) {
      return ["Rajesh S.", "Amit Patel", "Vikram Shah"];
    }
    return Array.from(list);
  }, [cars]);

  // Find active car detail
  const currentDetailsCar = cars.find(c => c.id === selectedCarId);

  // Quick UI trigger for advisor tab inside detail modal
  const handleOpenAiAdvisorTab = (car: Car) => {
    setSelectedCarId(car.id);
    // Give state time to open then toggle tab
    setTimeout(() => {
      const detailTabButton = document.querySelector('[key="ai-advisor"]') as HTMLButtonElement;
      if (detailTabButton) detailTabButton.click();
    }, 150);
  };

  if (!isSiteAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white relative overflow-hidden select-none">
        {/* Decorative ambient background lights */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 relative overflow-hidden z-10 animate-fade-in">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-650 border border-indigo-400/25 text-white shadow-xl shadow-indigo-950/50 mb-4 animate-pulse">
              <CarIcon className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">CarPartner Pro</h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Joint Equity Platform Entry Gate</p>
          </div>

          <form onSubmit={handleSiteLoginSubmit} className="space-y-5">
            {siteAuthError && (
              <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ {siteAuthError}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Username Group ID
              </label>
              <input
                type="text"
                required
                placeholder="Enter username (e.g. admin, partner)"
                value={siteUsernameInput}
                onChange={(e) => setSiteUsernameInput(e.target.value)}
                className="w-full px-4 py-3 text-xs bg-slate-950 border border-slate-800 rounded-xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 transition"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                System Password / Lock Key
              </label>
              <input
                type="password"
                required
                placeholder="Enter system password"
                value={sitePasswordInput}
                onChange={(e) => setSitePasswordInput(e.target.value)}
                className="w-full px-4 py-3 text-xs bg-slate-950 border border-slate-800 rounded-xl font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-indigo-950 transition active:scale-95 duration-100 cursor-pointer text-center"
            >
              Authorize & Enter System
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col no-print select-none">
      
      {/* Top Navigation */}
      <header className="bg-white border-b border-custom-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo Group */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-accent rounded-lg text-white flex items-center justify-center font-black text-sm">
                CP
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-ink">CarPartner Pro</h1>
                <p className="text-[10px] text-muted font-sans leading-none mt-0.5">Joint Equity Platform</p>
              </div>
            </div>

            {/* Quick Actions Groups: Theme Switcher & Admin State & Procure Trigger */}
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <button
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg select-none transition cursor-pointer"
                  title="Click to logout Administrator session"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Admin Session</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAdminError("");
                    setShowAdminLoginModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border border-slate-250 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-lg select-none transition cursor-pointer"
                  title="Unlock Administrator privileges"
                >
                  <span>🔒 Guest</span>
                </button>
              )}

              <button
                onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
                className="p-2 rounded-lg border border-custom-border bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 cursor-pointer transition active:scale-95"
                title="Toggle visual system theme"
              >
                {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-500 animate-pulse" />}
              </button>

              <button
                onClick={handleSiteLogout}
                className="p-2 rounded-lg border border-custom-border bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer transition active:scale-95"
                title="Lock Application and Sign Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>

              <button
                onClick={() => {
                  if (!isAdmin) {
                    setAdminError("Please authenticate as Administrator to register new inventory.");
                    setShowAdminLoginModal(true);
                  } else {
                    setIsAddCarOpen(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 bg-ink hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                + Add New Vehicle
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block px-3 mb-2">Management</span>
            <button
              onClick={() => setView("dashboard")}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer transition-all ${
                view === "dashboard"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-muted hover:text-ink hover:bg-slate-100/50"
              }`}
            >
              <Layers className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setView("vehicles")}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium text-xs flex items-center justify-between cursor-pointer transition-all ${
                view === "vehicles"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-muted hover:text-ink hover:bg-slate-100/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <CarIcon className="h-4 w-4" />
                <span>Vehicles</span>
              </div>
              {overduePayoutsCount > 0 && (
                <span className="h-4 px-1.5 min-w-4 bg-rose-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center font-mono leading-none animate-pulse">
                  {overduePayoutsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setView("partners")}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer transition-all ${
                view === "partners"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-muted hover:text-ink hover:bg-slate-100/50"
              }`}
            >
              <Users className="h-4 w-4" />
              Partners
            </button>
            <button
              onClick={() => setView("expenses")}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer transition-all ${
                view === "expenses"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-muted hover:text-ink hover:bg-slate-100/50"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Expenses
            </button>
            <button
              onClick={() => setView("reports")}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-medium text-xs flex items-center gap-2 cursor-pointer transition-all ${
                view === "reports"
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-muted hover:text-ink hover:bg-slate-100/50"
              }`}
            >
              <FileText className="h-4 w-4" />
              Reports
            </button>
          </div>

          {/* System Status info block from Design HTML */}
          <div className="mt-auto p-4 bg-slate-100 rounded-xl border border-custom-border space-y-1.5">
            <span className="text-xs font-semibold block text-slate-800">System Status</span>
            <p className="text-[11px] text-muted leading-tight">Cloud Sync: Active</p>
            <div className="text-[10px] text-slate-600 border-t border-slate-200/60 pt-1.5 flex flex-col gap-0.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Access Privileges</span>
              <span className={`font-extrabold uppercase ${isAdmin ? "text-emerald-700" : "text-amber-600 font-semibold"}`}>
                {isAdmin ? "🔒 Administrator" : "🔑 Guest Operator"}
              </span>
            </div>
          </div>
        </aside>

        {/* Dashboard Grid & Lists container */}
        <main className="flex-1 space-y-6 min-w-0">
          
          {/* Mobile responsive selection row bar */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-2 border-b border-custom-border no-scrollbar">
            {[
              { id: "dashboard", label: "Dashboard", Icon: Layers },
              { id: "vehicles", label: "Vehicles", Icon: CarIcon },
              { id: "partners", label: "Partners", Icon: Users },
              { id: "expenses", label: "Expenses", Icon: Wallet },
              { id: "reports", label: "Reports", Icon: FileText }
            ].map(item => {
              const SelectedIcon = item.Icon;
              const isSelected = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 duration-150 ${
                    isSelected 
                      ? "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] border-transparent" 
                      : "bg-white border border-custom-border text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <SelectedIcon className={`h-3.5 w-3.5 ${isSelected ? "text-white animate-pulse" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                  {item.id === "vehicles" && overduePayoutsCount > 0 && (
                    <span className="h-4 px-1 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center font-mono leading-none">
                      {overduePayoutsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {networkError && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between gap-4 text-xs">
              <span className="text-rose-700 font-semibold">{networkError}</span>
              <button onClick={fetchCars} className="px-3 py-1 bg-white border border-rose-200 rounded-lg hover:bg-slate-50 text-rose-700 font-bold">
                Retry Sync
              </button>
            </div>
          )}

          {/* Router Tabs Views */}
          {view === "dashboard" && (
            <DashboardTab 
              cars={cars} 
              onSelectCar={setSelectedCarId} 
              onNavigateToVehicles={() => setView("vehicles")}
              fmtCurrency={(n) => "₹" + Number(n).toLocaleString("en-IN")}
            />
          )}

          {view === "vehicles" && (
            <VehiclesTab 
              cars={cars} 
              isLoading={isLoading} 
              onRefresh={fetchCars} 
              onSelectCar={setSelectedCarId} 
              onDeleteCar={handleDeleteCar} 
              onOpenAdvisor={handleOpenAiAdvisorTab} 
              onTriggerPrint={setPrintCar} 
              onUpdateCar={handleUpdateCarFields}
              allPartners={allUniquePartners}
              isAdmin={isAdmin}
              onTriggerAdminLogin={() => {
                setAdminError("");
                setShowAdminLoginModal(true);
              }}
            />
          )}

          {view === "partners" && (
            <PartnersTab 
              cars={cars} 
              partners={partners}
              onRefreshPartners={fetchPartners}
              fmtCurrency={(n) => "₹" + Number(n).toLocaleString("en-IN")}
            />
          )}

          {view === "expenses" && (
            <ExpensesTab 
              cars={cars} 
              fmtCurrency={(n) => "₹" + Number(n).toLocaleString("en-IN")}
            />
          )}

          {view === "reports" && (
            <ReportsTab 
              cars={cars} 
              allPartners={allUniquePartners} 
              onTriggerPrint={setPrintCar} 
              onTriggerBulkPrint={setPrintCars}
              fmtCurrency={(n) => "₹" + Number(n).toLocaleString("en-IN")}
            />
          )}

        </main>
      </div>

      {/* Footer information bar */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-8 text-center text-xs text-slate-400">
        <p>© 2026 Dealership Operations Suite • Car Partner Management Application.</p>
        <p className="mt-1 text-[11px] text-slate-300">Formally calibrated printouts mapped to A4 boundaries.</p>
      </footer>

      {/* MODAL 1: ADD PROCUREMENT */}
      {isAddCarOpen && (
        <AddCarModal
          partners={partners}
          onRefreshPartners={fetchPartners}
          onClose={() => setIsAddCarOpen(false)}
          onSubmit={handleCreateCar}
        />
      )}

      {/* MODAL 2: CAR DETAILS dossier */}
      {selectedCarId && currentDetailsCar && (
        <CarDetailModal
          car={currentDetailsCar}
          partners={partners}
          onRefreshPartners={fetchPartners}
          onClose={() => setSelectedCarId(null)}
          onUpdateCar={handleUpdateCarFields}
          onTriggerPrint={(c) => setPrintCar(c)}
        />
      )}

      {/* MODAL 3: PRINT SHEET (Native A4 print and layout target) */}
      {printCar && (
        <StatementPrintView
          car={printCar}
          onClose={() => setPrintCar(null)}
        />
      )}

      {printCars && (
        <StatementPrintView
          cars={printCars}
          onClose={() => setPrintCars(null)}
        />
      )}

      {/* ADMIN LOGIN MODAL */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden text-slate-800 dark:text-slate-200">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  🔐 Administrative Authorization
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">CarPartner Pro Ledger Gate</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminLoginModal(false);
                  setAdminPasswordInput("");
                  setAdminError("");
                }}
                className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="mt-4 space-y-4">
              {adminError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs font-semibold border border-rose-150 animate-pulse">
                  {adminError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Enter Administrator Password / Lock Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="Insert authorization passcode..."
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-850 rounded-lg text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <p className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold mt-2 bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded">
                  💡 Hint: Use the password <span className="underline select-all font-mono">admin123</span> to verify full administrative functions instantly.
                </p>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLoginModal(false);
                    setAdminPasswordInput("");
                    setAdminError("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer flex-1 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs transition cursor-pointer flex-1 text-center"
                >
                  Unlock Admin State
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
