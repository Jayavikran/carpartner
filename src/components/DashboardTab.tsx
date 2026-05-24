import React, { useMemo } from "react";
import { Car, PartnerInvestment } from "../types";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Car as CarIcon, DollarSign, Wallet, ShieldCheck, ArrowRight, Activity, Percent, Coins } from "lucide-react";

interface DashboardTabProps {
  cars: Car[];
  onSelectCar: (carId: string) => void;
  onNavigateToVehicles: () => void;
  fmtCurrency: (n: number) => string;
}

export default function DashboardTab({ cars, onSelectCar, onNavigateToVehicles, fmtCurrency }: DashboardTabProps) {
  const [activeStatusDistribution, setActiveStatusDistribution] = React.useState<"Purchased" | "In Service" | "Showroom Ready" | "Sold">("Purchased");

  // Compute Dossier Health KPIs
  const dossierHealth = useMemo(() => {
    // 1. Total Active Capital: Active capital deployed in non-sold vehicles (purchaseAmount + expenses)
    const unsoldCars = cars.filter(c => c.status !== "Sold");
    const totalActiveCapital = unsoldCars.reduce((sum, c) => {
      const expensesSum = c.expenses.reduce((s, e) => s + e.amount, 0);
      return sum + c.purchaseAmount + expensesSum;
    }, 0);

    // 2. Average ROI across sold deals: Sum of ROIs / Count of sold deals
    const soldCars = cars.filter(c => c.status === "Sold");
    let totalROI = 0;
    let soldWithCostCount = 0;
    soldCars.forEach(c => {
      const expensesSum = c.expenses.reduce((s, e) => s + e.amount, 0);
      const costBasis = c.purchaseAmount + expensesSum;
      if (costBasis > 0) {
        const netProfit = (c.saleAmount || 0) - costBasis;
        const roi = (netProfit / costBasis) * 105; // slightly scaled to match the actual float formula precisely
        // Let's use the exact calculation used in CarCard.tsx:
        const calculatedROI = (netProfit / costBasis) * 100;
        totalROI += calculatedROI;
        soldWithCostCount++;
      }
    });
    const avgROI = soldWithCostCount > 0 ? totalROI / soldWithCostCount : 0;

    // 3. Settlement Efficiency: Number of sold deals with co-investments that are processed/settled / total sold deals with co-investments
    const soldWithInvestments = soldCars.filter(c => c.investments.length > 0);
    const settledInvestments = soldWithInvestments.filter(c => c.payoutsProcessed);
    const settlementEfficiency = soldWithInvestments.length > 0 
      ? (settledInvestments.length / soldWithInvestments.length) * 100 
      : 100; // 100% if no partner deals to settle

    return {
      totalActiveCapital,
      avgROI,
      settlementEfficiency,
      soldWithInvestmentsCount: soldWithInvestments.length,
      settledCount: settledInvestments.length
    };
  }, [cars]);

  const stats = useMemo(() => {
    const sold = cars.filter(c => c.status === "Sold");
    const totalRevenue = sold.reduce((s, c) => s + (c.saleAmount || 0), 0);
    const totalCost = sold.reduce((s, c) => {
      const expenses = c.expenses.reduce((sE, e) => sE + e.amount, 0);
      return s + c.purchaseAmount + expenses;
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const available = cars.filter(c => c.status !== "Sold").length;
    const inService = cars.filter(c => c.status === "In Service").length;
    return {
      totalProfit,
      totalRevenue,
      totalVehicles: cars.length,
      sold: sold.length,
      available,
      inService
    };
  }, [cars]);

  const chartData = useMemo(() => {
    return cars
      .filter(c => c.status === "Sold")
      .map(c => {
        const expensesSum = c.expenses.reduce((s, e) => s + e.amount, 0);
        const costBasis = c.purchaseAmount + expensesSum;
        const profit = (c.saleAmount || 0) - costBasis;
        return {
          name: c.makeModel.split(" ").slice(0, 2).join(" "),
          purchase: Math.round(c.purchaseAmount / 1000),
          sold: Math.round((c.saleAmount || 0) / 1000),
          profit: Math.round(profit / 1000)
        };
      });
  }, [cars]);

  const pieData = useMemo(() => {
    const available = cars.filter(c => c.status !== "Sold" && c.status !== "In Service").length;
    const inService = cars.filter(c => c.status === "In Service").length;
    const sold = cars.filter(c => c.status === "Sold").length;
    return [
      { name: "Sold", value: sold },
      { name: "Available", value: available },
      { name: "In Service", value: inService }
    ];
  }, [cars]);

  const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b"];

  return (
    <div className="space-y-6">
      {/* Dossier Health Overview Section */}
      <section className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-sans flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>Dossier Health Operational Overview</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-tight">
              A consolidated assessment of active fleet capitalization, closed asset margins, and partner profit allocation health.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
              Real-time Audit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {/* Total Active Capital */}
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-lg flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Total Active Capital</span>
              <span className="text-lg font-black font-mono text-white block mt-0.5">
                {fmtCurrency(dossierHealth.totalActiveCapital)}
              </span>
              <span className="text-[10px] text-slate-500 block">Invested in active workshop inventory</span>
            </div>
          </div>

          {/* Average ROI across sold deals */}
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-lg flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Average ROI Across Sold Deals</span>
              <span className="text-lg font-black font-mono text-emerald-400 block mt-0.5">
                {dossierHealth.avgROI.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">Weighted average return per closed trade</span>
            </div>
          </div>

          {/* Settlement Efficiency */}
          <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-lg flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Settlement Efficiency</span>
              <span className={`text-lg font-black font-mono block mt-0.5 ${dossierHealth.settlementEfficiency === 100 ? "text-blue-400" : "text-amber-400"}`}>
                {dossierHealth.settlementEfficiency.toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                {dossierHealth.soldWithInvestmentsCount > 0 
                  ? `${dossierHealth.settledCount} of ${dossierHealth.soldWithInvestmentsCount} partner payouts processed`
                  : "No joint venture settlements outstanding"
                }
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vehicles */}
        <div className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Total Vehicles</span>
              <span className="text-2xl font-black text-ink block mt-1 font-mono">{stats.totalVehicles}</span>
              <span className="text-[11px] text-indigo-600 font-medium block mt-1.5">{stats.sold} Sold trades closed</span>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <CarIcon className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Total revenue */}
        <div className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Total Revenue</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1 font-mono">{fmtCurrency(stats.totalRevenue)}</span>
              <span className="text-[11px] text-emerald-600 font-medium block mt-1.5">From sold vehicles</span>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Net Profit</span>
              <span className="text-2xl font-black text-blue-600 block mt-1 font-mono">{fmtCurrency(stats.totalProfit)}</span>
              <span className="text-[11px] text-blue-600 font-medium block mt-1.5">After all expenses</span>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Available stats */}
        <div className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Unsold Assets</span>
              <span className="text-2xl font-black text-amber-600 block mt-1 font-mono">{stats.available}</span>
              <span className="text-[11px] text-amber-600 font-medium block mt-1.5">{stats.inService} in workshop repairs</span>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-lg">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution Summary Card */}
      <section className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span>Status Distribution Explorer</span>
            </h4>
            <p className="text-[11px] text-slate-400">Click on any vehicle state count below to inspect the list of real-time assets in that condition.</p>
          </div>
          <span className="text-[10px] font-bold py-0.5 px-2.5 bg-slate-100 text-slate-600 rounded-full font-mono">
            {cars.length} Fleet Total
          </span>
        </div>

        {/* Interactive Stats Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { status: "Purchased", label: "Purchased", color: "border-slate-200 hover:border-slate-400 bg-slate-50/40 text-slate-700", activeColor: "ring-2 ring-slate-500 bg-slate-100/80 font-bold border-slate-400 text-slate-800" },
            { status: "In Service", label: "In Service / Workshop", color: "border-amber-200 hover:border-amber-400 bg-amber-50/10 text-amber-700", activeColor: "ring-2 ring-amber-500 bg-amber-50/60 font-bold border-amber-400 text-amber-900" },
            { status: "Showroom Ready", label: "Showroom / Ready", color: "border-blue-200 hover:border-blue-400 bg-blue-50/10 text-blue-700", activeColor: "ring-2 ring-blue-500 bg-blue-50/60 font-bold border-blue-400 text-blue-900" },
            { status: "Sold", label: "Closed / Sold out", color: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/10 text-emerald-700", activeColor: "ring-2 ring-emerald-500 bg-emerald-50/60 font-bold border-emerald-400 text-emerald-900" }
          ].map((item) => {
            const count = cars.filter(c => c.status === item.status).length;
            const isActive = activeStatusDistribution === item.status;
            return (
              <button
                key={item.status}
                type="button"
                onClick={() => setActiveStatusDistribution(item.status as any)}
                className={`p-4 border rounded-xl text-left transition duration-200 relative overflow-hidden group cursor-pointer ${
                  isActive ? item.activeColor : item.color
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block truncate">
                  {item.label}
                </span>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-2xl font-black font-mono leading-none tracking-tight">
                    {count}
                  </span>
                  <span className="text-[10px] opacity-60">unit{count !== 1 ? "s" : ""}</span>
                </div>
                <div className={`absolute top-0 right-0 h-1 md:h-1.5 w-full bg-current opacity-25`} />
              </button>
            );
          })}
        </div>

        {/* Selected Status Vehicles Detail Slider/Drawer block */}
        <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-white pb-1.5">
            <span className="font-bold text-slate-700">
              Details for stage: <span className="underline uppercase">{activeStatusDistribution}</span>
            </span>
            <span className="text-[10.5px] italic text-slate-400">
              Showing {cars.filter(c => c.status === activeStatusDistribution).length} matched assets
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cars.filter(c => c.status === activeStatusDistribution).length === 0 ? (
              <div className="col-span-full py-5 text-center text-slate-400 italic text-[11px] bg-white border border-slate-100 rounded-lg">
                No vehicles are currently in the "{activeStatusDistribution}" status.
              </div>
            ) : (
              cars.filter(c => c.status === activeStatusDistribution).map(car => {
                const totalExpenses = car.expenses.reduce((sum, e) => sum + e.amount, 0);
                const costBasis = car.purchaseAmount + totalExpenses;
                return (
                  <div
                    key={car.id}
                    className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs hover:shadow-xs hover:border-indigo-200 transition flex justify-between items-center text-xs group"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {car.vehicleNumber}
                        </span>
                        <span className="font-bold text-slate-800 uppercase tracking-tight text-[11px] truncate">
                          {car.makeModel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Cost basis: <span className="font-mono font-semibold text-slate-600">{fmtCurrency(costBasis)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectCar(car.id)}
                      className="p-1 px-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded hover:bg-indigo-100 transition shrink-0 cursor-pointer"
                    >
                      Dossier
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Graphics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit trend bar graph */}
        <div className="lg:col-span-2 bg-white border border-custom-border p-5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Vehicle Profit Overview (₹ Thousands)</h4>
          {chartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted italic">
              No closed deals registered to plot profit trend.
            </div>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }} 
                    formatter={(v) => `₹${v}K`} 
                  />
                  <Bar dataKey="purchase" name="Purchase" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="sold" name="Sold" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white border border-custom-border p-5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Vehicle Status</h4>
            <div className="h-[140px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span>{d.name}</span>
                </div>
                <span className="font-bold text-slate-800 font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recents Table */}
      <div className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Sourced Vehicles</h4>
          <button 
            onClick={onNavigateToVehicles}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View all vehicles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-custom-border text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pt-1 pl-2">Vehicle No.</th>
                <th className="pb-3 pt-1">Model Description</th>
                <th className="pb-3 pt-1">Sourced Capital</th>
                <th className="pb-3 pt-1">Status</th>
                <th className="pb-3 pt-1">Partners Split</th>
                <th className="pb-3 pt-1 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {cars.slice(0, 5).map(v => {
                const colors: Record<string, string> = {
                  Purchased: "bg-slate-100 text-slate-700",
                  "In Service": "bg-amber-100 text-amber-700",
                  "Showroom Ready": "bg-blue-100 text-blue-700",
                  Sold: "bg-emerald-100 text-emerald-700"
                };
                return (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-3 pl-2 font-mono font-bold text-slate-800">{v.vehicleNumber}</td>
                    <td className="py-3 font-semibold text-slate-800 uppercase">{v.makeModel}</td>
                    <td className="py-3 text-slate-600 font-mono font-semibold">{fmtCurrency(v.purchaseAmount)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v.status] || "bg-slate-100"}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {v.investments.slice(0, 2).map((p, idx) => (
                          <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1 py-0.25 rounded text-[9px] font-medium" title={`${p.partnerName} (${p.profitSharePercent}%)`}>
                            {p.partnerName.slice(0, 3)}..
                          </span>
                        ))}
                        {v.investments.length > 2 && (
                          <span className="text-[9px] text-muted font-bold">+{v.investments.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button 
                        onClick={() => onSelectCar(v.id)}
                        className="px-2.5 py-1 text-[10px] border border-slate-200 hover:bg-slate-50 text-indigo-600 font-bold rounded-md transition cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {cars.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    No vehicle records found. Click "+ Add New Vehicle" above to register your first car deal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
