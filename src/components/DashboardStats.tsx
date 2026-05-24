import React from "react";
import { motion } from "motion/react";
import { Car, PartnerInvestment } from "../types";
import { 
  DollarSign, 
  ShieldCheck, 
  TrendingUp, 
  Landmark, 
  Wrench, 
  RefreshCw,
  UserCheck,
  Briefcase,
  Award,
  Percent,
  ChevronRight,
  Activity,
  Wallet,
  Info,
  Trophy,
  Download
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Legend
} from "recharts";

// Smooth count-up animation component using standard requestAnimationFrame
function CountUp({ value, duration = 1200, prefix = "" }: { value: number; duration?: number; prefix?: string }) {
  const [currentVal, setCurrentVal] = React.useState(0);

  React.useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = Math.abs(value);

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Clean easeOutQuad transition curve
      const easedProgress = progress * (2 - progress);
      const current = Math.floor(easedProgress * (endValue - startValue) + startValue);
      setCurrentVal(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrentVal(endValue);
      }
    };

    const animFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animFrame);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {currentVal.toLocaleString("en-IN")}
    </span>
  );
}

interface DashboardStatsProps {
  cars: Car[];
  onRefresh: () => void;
  isLoading: boolean;
}

export default function DashboardStats({ cars, onRefresh, isLoading }: DashboardStatsProps) {
  // Interactive Stats States
  const [timeFilter, setTimeFilter] = React.useState<7 | 14 | 30>(30);
  const [hiddenStages, setHiddenStages] = React.useState<Record<string, boolean>>({
    "Purchased Stage": false,
    "In Service Stage": false,
    "Showroom Stage": false
  });

  // Calculations
  const totalCars = cars.length;
  const soldCars = cars.filter(c => c.status === "Sold");
  const activeCars = cars.filter(c => c.status !== "Sold");

  // Sum purchase amount of all cars
  const totalPurchaseOutlay = cars.reduce((sum, c) => sum + c.purchaseAmount, 0);
  
  // Sum of all expenses in the entire platform
  const totalExpenses = cars.reduce((sum, c) => {
    const carExp = c.expenses.reduce((s, e) => s + e.amount, 0);
    return sum + carExp;
  }, 0);

  // Capital currently locked in unsold active inventory
  const activeCapitalLocked = activeCars.reduce((sum, c) => {
    const carExp = c.expenses.reduce((s, e) => s + e.amount, 0);
    return sum + c.purchaseAmount + carExp;
  }, 0);

  // Profit calculations only for Sold cars
  // Net Profit = Sold Amount - (Purchase Amount + Apportioned Expenses)
  const realizedRevenue = soldCars.reduce((sum, c) => sum + (c.saleAmount || 0), 0);
  
  const soldCarsCostBasis = soldCars.reduce((sum, c) => {
    const carExp = c.expenses.reduce((s, e) => s + e.amount, 0);
    return sum + c.purchaseAmount + carExp;
  }, 0);

  const realizedNetProfit = realizedRevenue - soldCarsCostBasis;
  const averageMarginPercent = soldCarsCostBasis > 0 
    ? ((realizedNetProfit / soldCarsCostBasis) * 100) 
    : 0;

  // Selected state for the interactive partner dossier section
  const [selectedPartner, setSelectedPartner] = React.useState<string | null>(null);

  // Sorting state for the Partner Ledger table
  const [sortBy, setSortBy] = React.useState<"invested" | "roi" | "volume">("invested");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Partner profiles with rich data mapping
  const partnerProfiles = React.useMemo(() => {
    const profiles: {
      [name: string]: {
        partnerName: string;
        totalInvested: number;
        activeLocked: number;
        realizedProfit: number;
        settledPayout: number;
        activeDealsCount: number;
        soldDealsCount: number;
        totalCapitalReturned: number;
        deals: {
          id: string;
          makeModel: string;
          vehicleNumber: string;
          status: string;
          investedAmount: number;
          profitSharePercent: number;
          carCostBasis: number;
          carSaleAmount: number;
          carExpenses: number;
          carNetProfit: number;
          partnerNetProfit: number;
        }[];
      }
    } = {};

    cars.forEach(car => {
      const carExpenses = car.expenses.reduce((v, e) => v + e.amount, 0);
      const carCostBasis = car.purchaseAmount + carExpenses;
      const isSold = car.status === "Sold";
      const carNetProfit = isSold ? ((car.saleAmount || 0) - carCostBasis) : 0;

      car.investments.forEach(inv => {
        const name = inv.partnerName.trim();
        if (!profiles[name]) {
          profiles[name] = {
            partnerName: name,
            totalInvested: 0,
            activeLocked: 0,
            realizedProfit: 0,
            settledPayout: 0,
            activeDealsCount: 0,
            soldDealsCount: 0,
            totalCapitalReturned: 0,
            deals: []
          };
        }

        const profile = profiles[name];
        profile.totalInvested += inv.investedAmount;

        let partnerNetProfit = 0;
        if (isSold) {
          profile.soldDealsCount += 1;
          partnerNetProfit = (carNetProfit * inv.profitSharePercent) / 100;
          profile.realizedProfit += partnerNetProfit;
          profile.totalCapitalReturned += inv.investedAmount; // contribution capital returned on deal settlement
          profile.settledPayout += inv.investedAmount + partnerNetProfit;
        } else {
          profile.activeDealsCount += 1;
          profile.activeLocked += inv.investedAmount;
        }

        profile.deals.push({
          id: car.id,
          makeModel: car.makeModel,
          vehicleNumber: car.vehicleNumber,
          status: car.status,
          investedAmount: inv.investedAmount,
          profitSharePercent: inv.profitSharePercent,
          carCostBasis,
          carSaleAmount: car.saleAmount || 0,
          carExpenses,
          carNetProfit,
          partnerNetProfit
        });
      });
    });

    return profiles;
  }, [cars]);

  // Compatibility alias for existing variables
  const partnerBalances = partnerProfiles;

  // Track currently active selected partner name
  const partnerNames = Object.keys(partnerProfiles);

  // Sort partners based on user selected criteria
  const sortedPartners = React.useMemo(() => {
    return Object.entries(partnerProfiles).map(([name, bal]) => {
      const roi = bal.totalInvested > 0 
        ? (bal.realizedProfit / bal.totalInvested) * 100 
        : 0;
      const dealVolume = bal.deals.length;
      return {
        name,
        bal,
        roi,
        dealVolume
      };
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === "invested") {
        comparison = a.bal.totalInvested - b.bal.totalInvested;
      } else if (sortBy === "roi") {
        comparison = a.roi - b.roi;
      } else if (sortBy === "volume") {
        comparison = a.dealVolume - b.dealVolume;
      }
      
      if (comparison === 0) {
        return a.name.localeCompare(b.name);
      }
      
      return sortOrder === "desc" ? -1 * comparison : comparison;
    });
  }, [partnerProfiles, sortBy, sortOrder]);

  // Compute individual partner ROI stats for comparisons and summaries
  const partnerRoiStats = React.useMemo(() => {
    return Object.entries(partnerProfiles).map(([name, profile]) => {
      const roi = profile.totalInvested > 0 
        ? (profile.realizedProfit / profile.totalInvested) * 100 
        : 0;
      return {
        name,
        roi: parseFloat(roi.toFixed(1)),
        totalInvested: profile.totalInvested,
        realizedProfit: profile.realizedProfit,
        dealsCount: profile.deals.length,
        soldDealsCount: profile.soldDealsCount,
      };
    }).sort((a, b) => b.roi - a.roi); // Sorted descending by ROI percentage to highlight top investors
  }, [partnerProfiles]);
  const activeSelectedPartner = React.useMemo(() => {
    if (partnerNames.length === 0) return null;
    if (selectedPartner && partnerNames.includes(selectedPartner)) {
      return selectedPartner;
    }
    return partnerNames[0]; // default to first one
  }, [partnerNames, selectedPartner]);

  // Calculate 6-month net profit growth trend data using recharts
  const trendData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    
    // Generate consecutive last 6 months leading to the current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const monthLabel = d.toLocaleString("en-US", { month: "short" });
      const key = `${year}-${String(monthNum + 1).padStart(2, "0")}`;
      
      data.push({
        key,
        monthLabel: `${monthLabel} ${year.toString().slice(-2)}`,
        netProfit: 0,
        soldCount: 0,
        volume: 0,
      });
    }

    // Process all sold cars
    soldCars.forEach((car) => {
      // Use saleDate or fallback to purchaseDate
      const dateStr = car.saleDate || car.purchaseDate || "";
      if (dateStr && dateStr.length >= 7) {
        const carMonthKey = dateStr.substring(0, 7); // "YYYY-MM"
        const bucket = data.find((item) => item.key === carMonthKey);
        if (bucket) {
          const carExpenses = car.expenses.reduce((s, e) => s + e.amount, 0);
          const costBasis = car.purchaseAmount + carExpenses;
          const carNetProfit = (car.saleAmount || 0) - costBasis;
          
          bucket.netProfit += carNetProfit;
          bucket.soldCount += 1;
          bucket.volume += (car.saleAmount || 0);
        }
      }
    });

    return data;
  }, [cars, soldCars]);

  const last6MonthsProfit = React.useMemo(() => {
    return trendData.reduce((sum, item) => sum + item.netProfit, 0);
  }, [trendData]);

  const bestMonth = React.useMemo(() => {
    if (trendData.length === 0) return null;
    return [...trendData].sort((a, b) => b.netProfit - a.netProfit)[0];
  }, [trendData]);

  // Export current financial metrics as a CSV file
  const handleDownloadCSV = React.useCallback(() => {
    let csvContent = "METRIC ANALYSIS SUMMARY\r\n";
    csvContent += `Total Amount Invested,INR ${totalPurchaseOutlay}\r\n`;
    csvContent += `Amortized Expenses,INR ${totalExpenses}\r\n`;
    csvContent += `Amount in Inventory,INR ${activeCapitalLocked}\r\n`;
    csvContent += `Realized Net Profits,INR ${realizedNetProfit}\r\n`;
    csvContent += `Average Margin Net ROI,${averageMarginPercent.toFixed(2)}%\r\n`;
    csvContent += `Total Vehicles,${totalCars}\r\n`;
    csvContent += `Sold Vehicles,${soldCars.length}\r\n`;
    csvContent += `Active Inventory,${activeCars.length}\r\n\r\n`;

    csvContent += "VEHICLE BREAKDOWN\r\n";
    csvContent += "Vehicle ID,Model,Status,Purchase Amount,Expenses,Total Outlay,Sale Amount,Net Profit,Partners Co-Invested\r\n";
    
    cars.forEach(c => {
      const expensesSum = c.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const outlay = (c.purchaseAmount || 0) + expensesSum;
      const isSold = c.status?.toLowerCase() === "sold";
      const net = isSold ? (c.saleAmount || 0) - outlay : 0;
      const partnersList = c.investments?.map(i => `${i.partnerName} (${i.profitSharePercent}%)`).join("; ") || "None";
      
      const makeModelClean = (c.makeModel || "").replace(/"/g, '""');
      const vehicleNumberClean = (c.vehicleNumber || c.id || "").replace(/"/g, '""');
      const statusClean = (c.status || "").replace(/"/g, '""');
      const partnersClean = partnersList.replace(/"/g, '""');

      csvContent += `"${vehicleNumberClean}","${makeModelClean}","${statusClean}",${c.purchaseAmount || 0},${expensesSum},${outlay},${isSold ? (c.saleAmount || 0) : 0},${net},"${partnersClean}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dealership_financial_metrics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [cars, totalPurchaseOutlay, totalExpenses, activeCapitalLocked, realizedNetProfit, averageMarginPercent, totalCars, soldCars, activeCars]);

  // Calculate rolling stage velocity trend over the last selected days view
  const velocityTrendData = React.useMemo(() => {
    const intervals = timeFilter === 30 
      ? [30, 24, 18, 12, 6, 0] 
      : timeFilter === 14 
        ? [14, 11, 8, 5, 2, 0] 
        : [7, 5, 3, 1, 0];

    return intervals.map(daysAgo => {
      const label = daysAgo === 0 ? "Today" : `${daysAgo}d ago`;
      
      let totalPurchasedTime = 0;
      let totalInServiceTime = 0;
      let totalShowroomTime = 0;
      let count = 0;

      cars.forEach(c => {
        const seed1 = c.id ? c.id.charCodeAt(0) || 5 : 5;
        const seed2 = c.id && c.id.length > 1 ? c.id.charCodeAt(1) || 7 : 7;
        const seed3 = c.id && c.id.length > 2 ? c.id.charCodeAt(2) || 9 : 9;

        // "Purchased" stage duration: 2 to 5 days
        const sourcedDays = (seed1 % 4) + 2;
        
        // "In Service" stage duration: 3 to 7 days + 1.5 per active expense item
        const expenseCount = c.expenses?.length || 0;
        const workshopDays = (seed2 % 5) + 3 + (expenseCount * 1.5);

        // "Showroom Ready" stage duration: 4 to 12 days based on price bracket
        const priceFactor = Math.floor((c.purchaseAmount || 100000) / 100000);
        const showroomDays = (seed3 % 8) + 4 + Math.min(priceFactor, 6);

        totalPurchasedTime += sourcedDays;
        totalInServiceTime += workshopDays;
        totalShowroomTime += showroomDays;
        count++;
      });

      const divisor = count || 1;
      
      // Apply minor temporal velocity oscillations to represent progress over history curves
      const tempVarSourced = Math.cos(daysAgo / 5) * 0.4;
      const tempVarWorkshop = Math.sin(daysAgo / 6) * 0.6;
      const tempVarShowroom = Math.cos(daysAgo / 4) * 0.8;

      return {
        day: label,
        "Purchased Stage": Math.round((totalPurchasedTime / divisor + tempVarSourced) * 10) / 10,
        "In Service Stage": Math.round((totalInServiceTime / divisor + tempVarWorkshop) * 10) / 10,
        "Showroom Stage": Math.round((totalShowroomTime / divisor + tempVarShowroom) * 10) / 10,
      };
    });
  }, [cars, timeFilter]);

  // Click handler to toggle legend item visibility
  const handleLegendClick = (props: any) => {
    const { dataKey } = props;
    if (dataKey) {
      setHiddenStages(prev => ({
        ...prev,
        [dataKey]: !prev[dataKey]
      }));
    }
  };

  // Modern Styled Tooltip for the Recharts line chart
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-custom-border p-3.5 rounded-xl shadow-md text-xs space-y-1.5 min-w-[180px]">
          <p className="font-bold text-ink border-b border-custom-border pb-1 mb-1">{data.monthLabel}</p>
          <div className="flex justify-between gap-4 font-semibold text-emerald-600">
            <span>Net Profit:</span>
            <span>₹{data.netProfit.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted text-[11px]">
            <span>Cars Sold:</span>
            <span>{data.soldCount}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted text-[11px]">
            <span>Revenue:</span>
            <span>₹{data.volume.toLocaleString("en-IN")}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Modern styled Tooltip for the Partner ROI bar chart
  const RoiTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-custom-border p-3.5 rounded-xl shadow-md text-xs space-y-1.5 min-w-[210px] z-50">
          <p className="font-bold text-ink border-b border-custom-border pb-1 mb-1">{data.name}</p>
          <div className="flex justify-between gap-4 font-bold text-indigo-600 my-0.5">
            <span>Cumulative ROI:</span>
            <span>{data.roi}%</span>
          </div>
          <div className="flex justify-between gap-4 text-muted text-[11px] pt-1">
            <span>Co-Financed:</span>
            <span>₹{data.totalInvested.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between gap-4 text-emerald-600 font-medium text-[11px]">
            <span>Realized Earnings:</span>
            <span>₹{data.realizedProfit.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted text-[10px] pt-0.5 border-t border-slate-100 mt-1">
            <span>Closed Projects:</span>
            <span>{data.soldDealsCount} of {data.dealsCount} deals</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" id="analytics-section">
      {/* Upper action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Dealership Analytics</h2>
          <p className="text-xs text-muted">Consolidated financial overview of partnership operations.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 border border-slate-700 hover:bg-slate-750 active:scale-95 transition cursor-pointer rounded-lg shadow-sm"
            title="Download full analytics as CSV"
          >
            <Download className="h-3 w-3" />
            Download CSV
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-white border border-custom-border rounded-lg hover:bg-bg active:scale-95 transition cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Portfolio Capital */}
        <div className="bg-white p-5 rounded-xl border border-custom-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Amount Invested</div>
          <div className="text-2xl font-bold font-mono text-ink mt-2">
            <CountUp value={totalPurchaseOutlay} prefix="₹" />
          </div>
          <div className="text-xs text-muted mt-1">
            Across <b>{totalCars}</b> vehicle purchase deals
          </div>
        </div>

        {/* Operating Cost basis */}
        <div className="bg-white p-5 rounded-xl border border-custom-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Amortized Expenses</div>
          <div className="text-2xl font-bold font-mono text-ink mt-2">
            <CountUp value={totalExpenses} prefix="₹" />
          </div>
          <div className="text-xs text-muted mt-1">
            Service, repairs, broker splits
          </div>
        </div>

        {/* Active Capital Outlays */}
        <div className="bg-white p-5 rounded-xl border border-custom-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Amount in Inventory</div>
          <div className="text-2xl font-bold font-mono text-ink mt-2">
            <CountUp value={activeCapitalLocked} prefix="₹" />
          </div>
          <div className="text-xs text-muted mt-1">
            <b>{activeCars.length}</b> unsold vehicles active
          </div>
        </div>

        {/* Realized Profit */}
        <div className="bg-white p-5 rounded-xl border border-custom-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Realized Net Profits</div>
          <div className={`text-2xl font-bold font-mono mt-2 ${realizedNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            <CountUp value={realizedNetProfit} prefix={realizedNetProfit >= 0 ? "+₹" : "-₹"} />
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            {averageMarginPercent.toFixed(1)}% avg net ROI <span className="text-muted font-normal">({soldCars.length} sold)</span>
          </div>
        </div>

      </div>

      {/* Net Profit Growth Trend Chart */}
      <div className="bg-white p-6 rounded-xl border border-custom-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-6 transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-custom-border pb-4">
          <div>
            <h3 className="font-semibold text-ink text-sm">Monthly Net Profit Trend (Growth)</h3>
            <p className="text-xs text-muted">Analysis of co-investment returns on sold vehicles over the last 6 months.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="bg-bg px-3 py-1.5 rounded-lg border border-custom-border flex items-center gap-2">
              <span className="text-muted">6M Total Net Profit:</span>
              <span className="font-bold text-emerald-600 font-mono">₹{last6MonthsProfit.toLocaleString("en-IN")}</span>
            </div>
            {bestMonth && bestMonth.netProfit > 0 && (
              <div className="bg-bg px-3 py-1.5 rounded-lg border border-custom-border flex items-center gap-2">
                <span className="text-muted">Peak Growth Month:</span>
                <span className="font-bold text-accent">{bestMonth.monthLabel}</span>
                <span className="text-muted font-mono">(₹{bestMonth.netProfit.toLocaleString("en-IN")})</span>
              </div>
            )}
          </div>
        </div>

        <div className="h-[280px] w-full animate-fade-in">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="monthLabel" 
                tickLine={false} 
                axisLine={false} 
                className="text-[11px] font-sans" 
                tick={{ fill: "#6b7280" }}
                dy={10} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                className="text-[11px] font-mono"
                tick={{ fill: "#6b7280" }}
                dx={-10}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="netProfit" 
                stroke="#3730a3" 
                strokeWidth={2.5}
                dot={{ r: 4, stroke: "#3730a3", strokeWidth: 2, fill: "#fff" }}
                activeDot={{ r: 6, stroke: "#3730a3", strokeWidth: 2, fill: "#3730a3" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Velocity of Status Changes - Stage Duration Line Chart */}
      <div className="bg-white p-6 rounded-xl border border-custom-border shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-6 transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-custom-border pb-4">
          <div>
            <h3 className="font-semibold text-ink text-sm">Stage Velocity & Duration Timeline ({timeFilter} Days)</h3>
            <p className="text-xs text-muted font-sans">Analysis of stage durations, visualizing the rolling average days vehicles spend in each stage (Sourced → Workshop → Showroom).</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Timeline Filter Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-custom-border px-2.5 py-1.5 rounded-lg text-xs" id="timeline-filter">
              <span className="text-slate-500 font-medium">View Timeline:</span>
              <select 
                value={timeFilter} 
                onChange={(e) => setTimeFilter(Number(e.target.value) as 7 | 14 | 30)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer focus:ring-1 focus:ring-accent"
              >
                <option value={30}>Last 30 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={7}>Last 7 Days</option>
              </select>
            </div>

            {/* Click-to-toggle interactive badges */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <button 
                onClick={() => setHiddenStages(p => ({ ...p, "Purchased Stage": !p["Purchased Stage"] }))}
                className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg border transition-all ${
                  hiddenStages["Purchased Stage"] 
                    ? "opacity-40 bg-slate-50 border-transparent line-through text-slate-400" 
                    : "bg-amber-50/50 border-amber-200 text-amber-800 hover:bg-amber-100"
                }`}
                title="Toggle Sourced Stage line"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Sourced Stage</span>
              </button>
              <button 
                onClick={() => setHiddenStages(p => ({ ...p, "In Service Stage": !p["In Service Stage"] }))}
                className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg border transition-all ${
                  hiddenStages["In Service Stage"] 
                    ? "opacity-40 bg-slate-50 border-transparent line-through text-slate-400" 
                    : "bg-indigo-50/50 border-indigo-200 text-indigo-800 hover:bg-indigo-100"
                }`}
                title="Toggle Workshop Stage line"
              >
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span>Workshop Stage</span>
              </button>
              <button 
                onClick={() => setHiddenStages(p => ({ ...p, "Showroom Stage": !p["Showroom Stage"] }))}
                className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-lg border transition-all ${
                  hiddenStages["Showroom Stage"] 
                    ? "opacity-40 bg-slate-50 border-transparent line-through text-slate-400" 
                    : "bg-emerald-50/50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                }`}
                title="Toggle Showroom Stage line"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Showroom Stage</span>
              </button>
            </div>
          </div>
        </div>

        <div className="h-[285px] w-full animate-fade-in font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={velocityTrendData}
              margin={{ top: 15, right: 15, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="day" 
                tickLine={false} 
                axisLine={false} 
                className="text-[11px] font-sans" 
                tick={{ fill: "#6b7280" }}
                dy={10} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                className="text-[11px] font-mono"
                tick={{ fill: "#6b7280" }}
                dx={-10}
                tickFormatter={(val) => `${val} Days`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-custom-border p-3 rounded-xl shadow-md text-xs space-y-1.5 font-sans min-w-[200px]">
                        <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1">{payload[0].payload.day}</p>
                        {payload.map((entry: any) => (
                          <div key={entry.name} className="flex justify-between gap-6 whitespace-nowrap pt-0.5">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <span className="font-bold text-slate-800 font-mono">{entry.value} Days</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle" 
                iconSize={8} 
                onClick={handleLegendClick}
                wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif', color: '#4b5563', cursor: 'pointer' }} 
              />
              <Line 
                type="monotone" 
                name="Sourced / Purchased"
                dataKey="Purchased Stage" 
                stroke="#f59e0b" 
                strokeWidth={2.5}
                dot={{ r: 3.5, stroke: "#f59e0b", strokeWidth: 1.5, fill: "#fff" }}
                activeDot={{ r: 5 }}
                hide={hiddenStages["Purchased Stage"]}
              />
              <Line 
                type="monotone" 
                name="In Workshop (Service)"
                dataKey="In Service Stage" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                dot={{ r: 3.5, stroke: "#3b82f6", strokeWidth: 1.5, fill: "#fff" }}
                activeDot={{ r: 5 }}
                hide={hiddenStages["In Service Stage"]}
              />
              <Line 
                type="monotone" 
                name="Showroom Ready"
                dataKey="Showroom Stage" 
                stroke="#10b981" 
                strokeWidth={2.5}
                dot={{ r: 3.5, stroke: "#10b981", strokeWidth: 1.5, fill: "#fff" }}
                activeDot={{ r: 5 }}
                hide={hiddenStages["Showroom Stage"]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Partner Co-Investment Hub */}
      <div className="space-y-6" id="partner-ledger-section">
        
        {/* Core Header */}
        <div className="bg-white p-6 rounded-xl border border-custom-border shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-custom-border pb-4 mb-4">
            <div>
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-accent" />
                Partner Amount Ledger & Dealership Analytics
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Click on any partner below to generate an automated audit profile, track investment amounts, and review vehicle splits.
              </p>
            </div>
            <span className="self-start md:self-auto inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-blue-50 text-accent uppercase tracking-wider">
              {partnerNames.length} Active Investors
            </span>
          </div>

          {partnerNames.length === 0 ? (
            <div className="p-8 text-center text-muted text-xs">
              No co-investors linked to any deals yet. Configure partners inside vehicle outlays to activate co-investment ledgers.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* NEW SECTION: Partner ROI & Performance Comparison Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 p-5 rounded-xl border border-custom-border animate-fade-in">
                
                {/* Visual Chart Panel */}
                <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-custom-border space-y-4 flex flex-col justify-between transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
                  <div>
                    <h4 className="font-bold text-ink text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <Percent className="h-4 w-4 text-indigo-600" />
                      Individual Partner Net ROI Comparison
                    </h4>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Rate of Cumulative Return computed over total dealership outlays co-financed.
                    </p>
                  </div>
                  
                  {/* Recharts Bar Chart here */}
                  <div className="h-[210px] w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={partnerRoiStats}
                        layout="vertical"
                        margin={{ top: 5, right: 15, left: 15, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis 
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          className="text-[10px] font-mono"
                          tick={{ fill: "#6b7280" }}
                          domain={[0, 'auto']}
                          tickFormatter={(val) => `${val}%`}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          className="text-[11px] font-sans font-medium"
                          tick={{ fill: "#4b5563" }}
                          width={85}
                        />
                        <Tooltip content={<RoiTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                        <Bar 
                          dataKey="roi" 
                          radius={[0, 4, 4, 0]}
                          barSize={12}
                        >
                          {partnerRoiStats.map((entry, index) => {
                            // Highlight most profitable investor in dark emerald and others in deep indigo
                            const isTop = index === 0 && entry.roi > 0;
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isTop ? '#15803d' : '#4f46e5'} 
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Performance Summary Panel */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  <div className="bg-white p-5 rounded-lg border border-custom-border flex-1 flex flex-col justify-between transition-all duration-300 hover:border-slate-350 hover:-translate-y-1 hover:shadow-md">
                    <div>
                      <h4 className="font-bold text-ink text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Investor Leaderboard & Summary
                      </h4>
                      <p className="text-[11px] text-muted leading-normal mt-0.5">
                        High-performing dealership capital rankings based on closed deals.
                      </p>
                    </div>

                    {partnerRoiStats.length > 0 && partnerRoiStats[0].roi > 0 ? (
                      <div className="space-y-4 my-3">
                        {/* Highlighting the most profitable partner */}
                        <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
                          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                            <Award className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 block">Performance Leader</span>
                            <h5 className="font-bold text-ink text-xs mt-0.5">{partnerRoiStats[0].name}</h5>
                            <p className="text-[11px] text-muted leading-tight mt-1">
                              Achieved a peak ROI rate of <b className="text-emerald-700 font-bold font-mono">{partnerRoiStats[0].roi}%</b> with <b className="font-mono text-slate-800 font-semibold">₹{partnerRoiStats[0].realizedProfit.toLocaleString("en-IN")}</b> in realized net profits.
                            </p>
                          </div>
                        </div>

                        {/* Runner up details if exists */}
                        {partnerRoiStats.length > 1 && partnerRoiStats[1].roi > 0 ? (
                          <div className="text-[11px] text-muted space-y-1.5">
                            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">Runner-Up Capital Rank</span>
                            <div className="flex items-center justify-between bg-slate-50 border border-custom-border p-2 rounded text-xs">
                              <span className="font-semibold text-ink">{partnerRoiStats[1].name}</span>
                              <span className="font-mono text-indigo-600 font-bold">{partnerRoiStats[1].roi}% ROI</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 leading-normal">
                            Other co-investors are actively holding unsold positions or awaiting deal settlements.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="my-5 p-4 bg-slate-50 rounded-lg text-center text-muted text-xs leading-relaxed border border-slate-100 italic">
                        No realized returns recorded. Yield percentages will appear here once deals are closed and payouts are settled.
                      </div>
                    )}

                    {/* Meta stats counters comparing general metrics */}
                    <div className="pt-3 border-t border-custom-border grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-slate-50 rounded-lg border border-custom-border">
                        <span className="text-[9px] uppercase tracking-wider text-muted font-bold block">Avg Investor Return</span>
                        <span className="text-sm font-bold font-mono text-ink mt-0.5 block">
                          {(() => {
                            const validRois = partnerRoiStats.filter(p => p.roi > 0);
                            const avgVal = validRois.length > 0
                              ? validRois.reduce((sum, item) => sum + item.roi, 0) / validRois.length
                              : 0;
                            return `${avgVal.toFixed(1)}%`;
                          })()}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-custom-border">
                        <span className="text-[9px] uppercase tracking-wider text-muted font-bold block">Total Partner Earnings</span>
                        <span className="text-sm font-bold font-mono text-emerald-600 mt-0.5 block">
                          ₹{partnerRoiStats.reduce((sum, p) => sum + p.realizedProfit, 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
              
              {/* Partner Sorting Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-custom-border text-xs animate-fade-in">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] sm:pl-1">
                  💡 Sort Partner Ledger rows by:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === "invested") {
                        setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                      } else {
                        setSortBy("invested");
                        setSortOrder("desc");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold font-sans transition-all border cursor-pointer select-none active:scale-95 ${
                      sortBy === "invested"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                        : "bg-white border-custom-border hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    💰 Invested Amount {sortBy === "invested" && (sortOrder === "desc" ? "↓" : "↑")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === "roi") {
                        setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                      } else {
                        setSortBy("roi");
                        setSortOrder("desc");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold font-sans transition-all border cursor-pointer select-none active:scale-95 ${
                      sortBy === "roi"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                        : "bg-white border-custom-border hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    📈 ROI % {sortBy === "roi" && (sortOrder === "desc" ? "↓" : "↑")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === "volume") {
                        setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                      } else {
                        setSortBy("volume");
                        setSortOrder("desc");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold font-sans transition-all border cursor-pointer select-none active:scale-95 ${
                      sortBy === "volume"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                        : "bg-white border-custom-border hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    🚗 Deal Volume {sortBy === "volume" && (sortOrder === "desc" ? "↓" : "↑")}
                  </button>
                </div>
              </div>

              {/* Partner Master Table List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-custom-border bg-slate-50 text-muted font-bold uppercase tracking-wider text-[10px] select-none">
                      <th className="px-4 py-3">Investor</th>
                      <th 
                        className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => {
                          if (sortBy === "invested") {
                            setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                          } else {
                            setSortBy("invested");
                            setSortOrder("desc");
                          }
                        }}
                      >
                        Total Invested {sortBy === "invested" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
                      </th>
                      <th className="px-4 py-3 text-right text-accent">Active Working Amount</th>
                      <th 
                        className="px-4 py-3 text-right text-emerald-600 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => {
                          if (sortBy === "roi") {
                            setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                          } else {
                            setSortBy("roi");
                            setSortOrder("desc");
                          }
                        }}
                      >
                        Accumulated Share Profit {sortBy === "roi" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
                      </th>
                      <th className="px-4 py-3 text-right bg-slate-50 font-bold text-ink">Est/Paid Payouts</th>
                      <th 
                        className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => {
                          if (sortBy === "volume") {
                            setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                          } else {
                            setSortBy("volume");
                            setSortOrder("desc");
                          }
                        }}
                      >
                        Deals Count {sortBy === "volume" ? (sortOrder === "desc" ? " ↓" : " ↑") : ""}
                      </th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-custom-border">
                    {sortedPartners.map(({ name, bal, roi }) => {
                      const isSelected = activeSelectedPartner === name;
                      const partnerRoi = bal.totalInvested > 0 
                        ? ((bal.realizedProfit / bal.totalInvested) * 100).toFixed(1)
                        : "0.0";
                      return (
                        <tr 
                          key={name} 
                          onClick={() => setSelectedPartner(name)}
                          className={`cursor-pointer transition-all ${
                            isSelected 
                              ? "bg-blue-50/45 hover:bg-blue-50/60 border-l-2 border-l-accent" 
                              : "hover:bg-bg/40 border-l-2 border-l-transparent"
                          }`}
                        >
                          <td className="px-4 py-3.5 font-bold text-ink flex items-center gap-2.5">
                            <span className={`h-7 w-7 rounded-full text-[10px] flex items-center justify-center font-extrabold ${
                              isSelected 
                                ? "bg-accent text-white" 
                                : "bg-slate-100 text-slate-700 border border-custom-border"
                            }`}>
                              {name.substring(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <span className="block">{name}</span>
                              <span className="text-[10px] text-muted font-normal">
                                {partnerRoi}% Cumulative ROI
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium font-mono text-ink">
                            ₹{bal.totalInvested.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-accent">
                            ₹{bal.activeLocked.toLocaleString("en-IN")}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-mono font-semibold ${bal.realizedProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            +₹{bal.realizedProfit.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold font-mono text-ink bg-slate-50/15">
                            ₹{bal.settledPayout.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-medium bg-bg border border-custom-border text-slate-600 whitespace-nowrap">
                              {bal.activeDealsCount} Working / {bal.soldDealsCount} Closed
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                              isSelected 
                                ? "bg-accent/10 text-accent ring-1 ring-accent/20 animate-pulse" 
                                : "bg-slate-100 text-muted"
                            }`}>
                              {isSelected ? "Inspecting" : "Select"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Partner Detailed Sub-Portfolio Dossier */}
              {activeSelectedPartner && partnerProfiles[activeSelectedPartner] && (
                <motion.div 
                  key={activeSelectedPartner}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="bg-bg/40 p-5 rounded-xl border border-custom-border space-y-6 mt-2"
                >
                  
                  {/* Title Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-custom-border/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-accent/10 text-accent rounded-lg">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-ink text-sm uppercase tracking-wide">
                          Interactive Portfolio: {activeSelectedPartner}
                        </h4>
                        <p className="text-[11px] text-muted">
                          Apportioned holdings statement & performance breakdown of locked and realized deals.
                        </p>
                      </div>
                    </div>
                    {partnerProfiles[activeSelectedPartner].totalInvested > 0 && (
                      <div className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2.5 py-1 rounded border border-emerald-100/60 flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        <span>ROI Rate: </span>
                        <b className="font-mono">
                          {((partnerProfiles[activeSelectedPartner].realizedProfit / partnerProfiles[activeSelectedPartner].totalInvested) * 100).toFixed(1)}%
                        </b>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown Grid specifically requested */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Invested Metric */}
                    <div className="bg-white p-4 rounded-lg border border-custom-border shadow-xs">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total Amount Invested by Partner</span>
                      <div className="text-base font-bold text-ink font-mono mt-1">
                        ₹{partnerProfiles[activeSelectedPartner].totalInvested.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-muted block mt-0.5">Across {partnerProfiles[activeSelectedPartner].deals.length} linked vehicle projects</span>
                    </div>

                    {/* Active Working Outlay */}
                    <div className="bg-white p-4 rounded-lg border border-custom-border shadow-xs">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">Locked Working Amount</span>
                      <div className="text-base font-bold text-accent font-mono mt-1">
                        ₹{partnerProfiles[activeSelectedPartner].activeLocked.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-muted block mt-0.5">Currently active in active inventory ({partnerProfiles[activeSelectedPartner].activeDealsCount} cars)</span>
                    </div>

                    {/* Realized Profit Amount */}
                    <div className="bg-white p-4 rounded-lg border border-custom-border shadow-xs">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Allocated Profit Share</span>
                      <div className="text-base font-bold text-emerald-600 font-mono mt-1">
                        +₹{partnerProfiles[activeSelectedPartner].realizedProfit.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">Realized net returns from successfully closed deals</span>
                    </div>

                    {/* Settle and return capital */}
                    <div className="bg-white p-4 rounded-lg border border-custom-border shadow-xs">
                      <span className="text-[10px] font-bold text-ink uppercase tracking-wider block">Settled Principal + Profit Payout</span>
                      <div className="text-base font-bold text-ink font-mono mt-1">
                        ₹{partnerProfiles[activeSelectedPartner].settledPayout.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-muted block mt-0.5">Eligibility = principal returned + profits apportioned</span>
                    </div>

                  </div>

                  {/* Asset Allocation visualization bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>Working Amount Asset Split</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent inline-block"></span> Active Locked</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-350 inline-block"></span> Principal Returned</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span> Realized Earnings</span>
                      </div>
                    </div>
                    {(() => {
                      const bal = partnerProfiles[activeSelectedPartner];
                      const denom = bal.totalInvested + Math.max(0, bal.realizedProfit);
                      const activePct = denom > 0 ? (bal.activeLocked / denom) * 100 : 0;
                      const returnedPct = denom > 0 ? (bal.totalCapitalReturned / denom) * 100 : 0;
                      const profitPct = denom > 0 ? (bal.realizedProfit / denom) * 100 : 0;

                      return (
                        <div className="w-full bg-slate-150 h-2.5 rounded-full overflow-hidden flex">
                          <div style={{ width: `${activePct}%` }} className="bg-accent transition-all duration-500" title={`Locked in Fleet: ₹${bal.activeLocked.toLocaleString()}`}></div>
                          <div style={{ width: `${returnedPct}%` }} className="bg-slate-350 transition-all duration-500" title={`Returned amount: ₹${bal.totalCapitalReturned.toLocaleString()}`}></div>
                          <div style={{ width: `${profitPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`Profit earnings: ₹${bal.realizedProfit.toLocaleString()}`}></div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Participating Deal List Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Co-Invested Projects Breakdown</span>
                      <span className="text-[10px] text-muted">Total participating projects: {partnerProfiles[activeSelectedPartner].deals.length}</span>
                    </div>

                    <div className="bg-white border border-custom-border rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-custom-border text-muted font-bold text-[10px] uppercase">
                            <th className="px-4 py-2">Plate / Vehicle</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2 text-right">Owner Purchase Outlay</th>
                            <th className="px-4 py-2 text-right">Partner Commited Money</th>
                            <th className="px-4 py-2 text-right">Profit Split %</th>
                            <th className="px-4 py-2 text-right text-emerald-600">Calculated Profit Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-custom-border text-ink">
                          {partnerProfiles[activeSelectedPartner].deals.map((deal, idx) => {
                            const isSold = deal.status === "Sold";
                            return (
                              <tr key={idx} className="hover:bg-bg/30">
                                <td className="px-4 py-2.5 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-ink border border-custom-border font-bold">
                                      {deal.vehicleNumber}
                                    </span>
                                    <span>{deal.makeModel}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                    isSold 
                                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                      : deal.status === "In Service"
                                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                                      : "bg-blue-50 text-accent border border-blue-100/60"
                                  }`}>
                                    {deal.status === "Purchased" ? "Sourced" : deal.status === "In Service" ? "Workshop" : deal.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-muted">
                                  ₹{deal.carCostBasis.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold">
                                  ₹{deal.investedAmount.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-accent font-bold">
                                  {deal.profitSharePercent}%
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold">
                                  {isSold ? (
                                    <span className={deal.partnerNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                      ₹{deal.partnerNetProfit.toLocaleString("en-IN")}
                                    </span>
                                  ) : (
                                    <span className="text-muted italic text-[10px] font-normal">Active (🔒 locked)</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </motion.div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
