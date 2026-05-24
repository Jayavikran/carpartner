import React, { useMemo, useState } from "react";
import { Car, Partner } from "../types";
import { UserCheck, Award, Briefcase, Landmark, Search, X, Check, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

interface PartnersTabProps {
  cars: Car[];
  partners?: Partner[];
  onRefreshPartners?: () => void;
  fmtCurrency: (n: number) => string;
}

export default function PartnersTab({ cars, partners = [], onRefreshPartners, fmtCurrency }: PartnersTabProps) {
  // Search filter state and logic
  const [partnerSearchText, setPartnerSearchText] = useState("");

  // Compute unified partner metrics merging database wallets with active deal records
  const partnerMetricsMap = useMemo(() => {
    const list: Record<string, {
      id: string;
      name: string;
      walletBalance: number;
      totalInvested: number;
      profitEarned: number;
      vehicleCount: number;
      activeCount: number;
    }> = {};

    // Initialize with database partners
    partners.forEach(p => {
      list[p.name.trim().toLowerCase()] = {
        id: p.id,
        name: p.name,
        walletBalance: p.walletBalance,
        totalInvested: 0,
        profitEarned: 0,
        vehicleCount: 0,
        activeCount: 0
      };
    });

    // Populate with historical and active deal metrics
    cars.forEach(car => {
      const expensesSum = car.expenses.reduce((s, e) => s + e.amount, 0);
      const costBasis = car.purchaseAmount + expensesSum;
      const isSold = car.status === "Sold";
      const totalProfit = isSold ? (car.saleAmount || 0) - costBasis : 0;

      car.investments.forEach(inv => {
        const key = inv.partnerName.trim().toLowerCase();
        if (!list[key]) {
          // Fallback handle for unregistered historical records
          list[key] = {
            id: `unlisted-${inv.partnerName}`,
            name: inv.partnerName,
            walletBalance: 0,
            totalInvested: 0,
            profitEarned: 0,
            vehicleCount: 0,
            activeCount: 0
          };
        }
        list[key].totalInvested += inv.investedAmount;
        list[key].vehicleCount += 1;
        if (!isSold) {
          list[key].activeCount += 1;
        } else {
          // Add profit share amount
          const profitShare = (totalProfit * inv.profitSharePercent) / 100;
          if (profitShare > 0) {
            list[key].profitEarned += profitShare;
          }
        }
      });
    });

    return Object.values(list);
  }, [cars, partners]);

  // Extract list of names for search / table column headers
  const activePartnerNames = useMemo(() => {
    return partnerMetricsMap.map(p => p.name);
  }, [partnerMetricsMap]);

  const filteredPartnerMetrics = useMemo(() => {
    if (!partnerSearchText.trim()) return partnerMetricsMap;
    const q = partnerSearchText.toLowerCase();
    return partnerMetricsMap.filter(p => p.name.toLowerCase().includes(q));
  }, [partnerMetricsMap, partnerSearchText]);

  // In-line wallet transactions configuration
  const [adjustingPartnerId, setAdjustingPartnerId] = useState<string | null>(null);
  const [adjustActionType, setAdjustActionType] = useState<"deposit" | "withdraw">("deposit");
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustError, setAdjustError] = useState("");
  const [isAdjustingSubmitting, setIsAdjustingSubmitting] = useState(false);

  // Colors arrays for design signature accents
  const colors = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#ef4444"];

  return (
    <div className="space-y-6" id="partners-section">
      {/* Dynamic Partner Search Feature */}
      <div className="bg-white border border-custom-border rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dealership Partners Base</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Filter the operating partners list, check balance wallets, or adjust individual capital ledgers.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={partnerSearchText}
            onChange={(e) => setPartnerSearchText(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-custom-border rounded-lg text-xs font-sans text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            placeholder="Search partners by name..."
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          {partnerSearchText && (
            <button
              onClick={() => setPartnerSearchText("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-650 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartnerMetrics.map((p, i) => {
          const color = colors[i % colors.length];
          const roiStr = p.totalInvested > 0 ? ((p.profitEarned / p.totalInvested) * 100).toFixed(1) : "0.0";
          const isSelectedForWalletEdit = adjustingPartnerId === p.id;

          return (
            <div key={p.name} className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative overflow-hidden transition-all hover:border-slate-350">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10" style={{ backgroundColor: color }} />
              
              <div className="flex items-center gap-3.5 mb-4">
                <div 
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-lg shadow-sm"
                  style={{ 
                    backgroundColor: `${color}15`, 
                    borderColor: `${color}40`, 
                    color: color 
                  }}
                >
                  {p.name[0] || "P"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink uppercase tracking-tight">{p.name}</h4>
                  <p className="text-[10px] text-muted font-mono">Operations Shareholder</p>
                </div>
              </div>

              {/* WALLET BALANCE HERO METRIC */}
              <div className="mb-4 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/60 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-sans font-bold text-indigo-500 uppercase tracking-wide flex items-center gap-1">
                    <Wallet className="h-3 w-3 shrink-0" />
                    Ledger Wallet Balance
                  </span>
                  <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                    {fmtCurrency(p.walletBalance)}
                  </span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setAdjustActionType("deposit");
                      setAdjustingPartnerId(p.id);
                      setAdjustAmount(0);
                      setAdjustError("");
                    }}
                    className="p-1 px-2 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[9.5px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                    title="Deposit money into partner's wallet"
                  >
                    <ArrowDownLeft className="h-3 w-3" />
                    In
                  </button>
                  <button
                    onClick={() => {
                      setAdjustActionType("withdraw");
                      setAdjustingPartnerId(p.id);
                      setAdjustAmount(0);
                      setAdjustError("");
                    }}
                    className="p-1 px-2 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-105 rounded text-[9.5px] font-bold transition-all flex items-center gap-0.5 cursor-pointer"
                    title="Withdraw money from partner's wallet"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Out
                  </button>
                </div>
              </div>

              {/* IN-LINE TRANSACTION INTERACTIVE DIALOG CONTAINER */}
              {isSelectedForWalletEdit && (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 animate-fade-in">
                  <div className="font-bold text-slate-500 uppercase tracking-tight text-[10px] flex justify-between items-center">
                    <span className={adjustActionType === "deposit" ? "text-emerald-700 font-semibold" : "text-indigo-700 font-semibold"}>
                      {adjustActionType === "deposit" ? "📥 Deposit Funds" : "📤 Withdraw Funds"}
                    </span>
                    <button onClick={() => setAdjustingPartnerId(null)} className="text-slate-400 hover:text-rose-500 font-bold text-[11px] px-1 cursor-pointer">
                      Close
                    </button>
                  </div>
                  {adjustError && <p className="text-[10px] text-rose-600 font-bold leading-tight">{adjustError}</p>}
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={adjustAmount || ""}
                      onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value)))}
                      className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold focus:outline-indigo-500"
                      placeholder="Enter amount (₹)"
                    />
                    <button
                      onClick={async () => {
                        if (adjustAmount <= 0) {
                          setAdjustError("Specify amount greater than zero.");
                          return;
                        }
                        if (adjustActionType === "withdraw" && adjustAmount > p.walletBalance) {
                          setAdjustError(`Insufficient funds. Max: ${fmtCurrency(p.walletBalance)}`);
                          return;
                        }
                        try {
                          setIsAdjustingSubmitting(true);
                          setAdjustError("");
                          const res = await fetch("/api/partners/adjust-wallet", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              partnerName: p.name,
                              type: adjustActionType,
                              amount: adjustAmount
                            })
                          });
                          if (!res.ok) {
                            const errData = await res.json();
                            throw new Error(errData.error || "Server transaction rejected.");
                          }
                          onRefreshPartners?.();
                          setAdjustingPartnerId(null);
                        } catch (err: any) {
                          setAdjustError(err.message || "Network transaction failure.");
                        } finally {
                          setIsAdjustingSubmitting(false);
                        }
                      }}
                      disabled={isAdjustingSubmitting}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] active:scale-95 duration-100 disabled:opacity-50 cursor-pointer"
                    >
                      {isAdjustingSubmitting ? "Syncing..." : "Confirm"}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-bg rounded-lg p-2.5 border border-custom-border">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Active Invested</span>
                  <span className="text-[13px] font-bold text-ink font-mono mt-0.5 block">{fmtCurrency(p.totalInvested)}</span>
                </div>
                <div className="bg-bg rounded-lg p-2.5 border border-custom-border">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Profit Payouts</span>
                  <span className="text-[13px] font-bold text-emerald-600 font-mono mt-0.5 block">{fmtCurrency(Math.round(p.profitEarned))}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-custom-border text-slate-500">
                <span>{p.vehicleCount} deals • {p.activeCount} active</span>
                <span 
                  className="px-2 py-0.5 rounded text-[11px] font-black uppercase text-indigo-700 tracking-wider"
                  style={{ backgroundColor: `${color}15`, color: color }}
                >
                  Yield ROI {roiStr}%
                </span>
              </div>
            </div>
          );
        })}
        {filteredPartnerMetrics.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 italic bg-white border border-custom-border rounded-xl">
            {partnerSearchText.trim() ? "No partners found matching search criteria." : "No active database partners registered yet."}
          </div>
        )}
      </div>

      {/* Partner Investment spreadsheet breakdown */}
      <div className="bg-white border border-custom-border rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Partner Investment Share Sheet</h4>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-custom-border text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pt-1 pl-2 font-semibold">Vehicle No.</th>
                <th className="pb-3 pt-1 font-semibold">Model</th>
                {activePartnerNames.map(p => (
                  <th key={p} className="pb-3 pt-1 text-center font-bold">{p}</th>
                ))}
                <th className="pb-3 pt-1 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {cars.map(v => {
                const colors: Record<string, string> = {
                  Purchased: "bg-slate-100 text-slate-700",
                  "In Service": "bg-amber-105 text-amber-700",
                  "Showroom Ready": "bg-blue-105 text-blue-700 bg-blue-50/50",
                  Sold: "bg-emerald-100 text-emerald-700"
                };
                return (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-3 pl-2 font-mono font-bold text-slate-850">{v.vehicleNumber}</td>
                    <td className="py-3 font-semibold text-slate-800 uppercase max-w-[150px] truncate">{v.makeModel.split(" ").slice(0, 3).join(" ")}</td>
                    
                    {activePartnerNames.map(name => {
                      const share = v.investments.find(inv => inv.partnerName.trim().toLowerCase() === name.trim().toLowerCase());
                      return (
                        <td key={name} className="py-3 text-center">
                          {share ? (
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                              {share.profitSharePercent}%
                            </span>
                          ) : (
                            <span className="text-slate-300 font-sans">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3 text-right pr-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors[v.status] || "bg-slate-100"}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {cars.length === 0 && (
                <tr>
                  <td colSpan={activePartnerNames.length + 3} className="text-center py-6 text-slate-400 italic">
                    No active vehicle data.
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
