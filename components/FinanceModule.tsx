import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabaseClient";
import {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
  FinanceBudgetItem,
  FinanceSecurity,
  FinanceRecurringTransaction,
  FinanceSavingsGoal,
  FinanceShoppingList,
  FinanceShoppingItem,
  FinanceInstallment,
} from "../types";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  XIcon,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  EyeIcon,
  EyeOffIcon,
  LayoutDashboard,
  ListOrdered,
  PieChart,
  CalendarDays,
  Settings,
  Trash2,
  Wallet,
  CreditCard,
  Landmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Banknote,
  ShoppingCart,
  BarChart3,
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Clock,
  Receipt,
  Pencil,
  HelpCircle,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  Sparkles,
  FolderPlus,
  DollarSign,
  RefreshCw,
  Copy,
  Check,
  Search,
  Target,
  SlidersHorizontal,
  Plus,
  Tag,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

interface EmojiPickerPopoverProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

const getTodayStr = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalMonthPrefix = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const cleanDate = dateStr.split("T")[0];
  const parts = cleanDate.split("-").map(Number);
  if (
    parts.length === 3 &&
    !isNaN(parts[0]) &&
    !isNaN(parts[1]) &&
    !isNaN(parts[2])
  ) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
};

const getFriendlyDateHeader = (dateStr: string): string => {
  if (!dateStr) return "";
  const txDate = parseLocalDate(dateStr);
  const now = new Date();
  const todayStr = getTodayStr(now);
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = getTodayStr(yesterday);

  const cleanDate = dateStr.split("T")[0];
  if (cleanDate === todayStr) {
    return "HOY";
  }
  if (cleanDate === yesterdayStr) {
    return "AYER";
  }

  const months = [
    "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
  ];
  const day = txDate.getDate();
  const month = months[txDate.getMonth()];
  const year = txDate.getFullYear();
  const currentYear = now.getFullYear();

  if (year === currentYear) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${year}`;
};

const formatDetailDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const txDate = parseLocalDate(dateStr);
  const days = [
    "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
  ];
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const dayName = days[txDate.getDay()];
  const day = txDate.getDate();
  const monthName = months[txDate.getMonth()];
  const year = txDate.getFullYear();
  return `${dayName}, ${day} de ${monthName} de ${year}`;
};

const formatSimpleReadableDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const cleanDate = dateStr.split("T")[0];
  const todayStr = getTodayStr();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = getTodayStr(yesterday);

  if (cleanDate === todayStr) return "Hoy";
  if (cleanDate === yesterdayStr) return "Ayer";

  const txDate = parseLocalDate(dateStr);
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
  ];
  return `${txDate.getDate()} ${months[txDate.getMonth()]} ${txDate.getFullYear()}`;
};

const EMOJI_CATEGORIES = [
  {
    name: "Populares",
    emojis: [
      "🛒",
      "🏠",
      "💡",
      "🚗",
      "⛽",
      "🍿",
      "💊",
      "🩺",
      "🎓",
      "✈️",
      "👕",
      "📱",
      "💰",
      "💼",
      "💵",
      "📈",
      "🎁",
      "☕",
      "🐾",
      "🏋️",
      "🛠️",
      "🍕",
      "🍣",
      "🌮",
      "🥗",
      "🍔",
      "🚌",
      "🔑",
      "🛋️",
      "📺",
      "🎨",
      "🔥",
      "⚡",
      "💧",
      "🔒",
      "📜",
      "💳",
      "🏦",
      "🧾",
      "🏥",
      "🏖️",
      "🎬",
      "🎮",
      "🎧",
      "📦",
    ],
  },
  {
    name: "Comida & Bebida",
    emojis: [
      "🍕",
      "🍔",
      "🍟",
      "🌭",
      "🍿",
      "🥓",
      "🍳",
      "🧇",
      "🥞",
      "🥐",
      "🍞",
      "🥖",
      "🥨",
      "🧀",
      "🥗",
      "🥪",
      "🌮",
      "🌯",
      "🥙",
      "🧆",
      "🥘",
      "🍲",
      "🥣",
      "🍣",
      "🍱",
      "🥟",
      "🍤",
      "🍙",
      "🍚",
      "🍜",
      "🍝",
      "🍦",
      "🍧",
      "🍨",
      "🍩",
      "🍪",
      "🎂",
      "🍰",
      "🧁",
      "🥧",
      "🍫",
      "🍬",
      "🍭",
      "🍮",
      "🍯",
      "☕",
      "🍵",
      "🧃",
      "🥤",
      "🍺",
      "🍷",
      "🍸",
      "🍹",
    ],
  },
  {
    name: "Hogar & Servicios",
    emojis: [
      "🏠",
      "🏡",
      "🏢",
      "🛏️",
      "🛋️",
      "🚿",
      "🛁",
      "🔑",
      "💡",
      "⚡",
      "💧",
      "🔥",
      "📶",
      "📱",
      "💻",
      "🖥️",
      "📺",
      "🛠️",
      "🔧",
      "🔨",
      "🧹",
      "🧺",
      "🧼",
      "📦",
      "🚪",
      "🪴",
      "🌱",
    ],
  },
  {
    name: "Transporte & Autos",
    emojis: [
      "🚗",
      "🚘",
      "🚙",
      "🚌",
      "🚎",
      "🏎️",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "🛻",
      "🚚",
      "🚛",
      "🚜",
      "🛵",
      "🏍️",
      "🚲",
      "🛴",
      "⛽",
      "🚨",
      "🚥",
      "✈️",
      "🛫",
      "🛬",
      "🧳",
      "🛺",
      "⚓",
      "🚢",
      "🚆",
      "🚇",
      "🎫",
      "🗺️",
      "🏖️",
      "🏨",
    ],
  },
  {
    name: "Salud & Cuidado",
    emojis: [
      "🩺",
      "💊",
      "🏥",
      "💉",
      "🩹",
      "🩸",
      "🧬",
      "🔬",
      "👓",
      "🕶️",
      "🧴",
      "🪒",
      "💇",
      "💅",
      "🧘",
      "🏋️",
      "🚴",
      "🏃",
      "👟",
      "⚽",
      "🏀",
      "🎾",
      "🥊",
      "🎯",
    ],
  },
  {
    name: "Finanzas & Trabajo",
    emojis: [
      "💰",
      "💵",
      "💸",
      "💳",
      "🪙",
      "💎",
      "📈",
      "📉",
      "📊",
      "💼",
      "📁",
      "📄",
      "📜",
      "🧾",
      "🏛️",
      "🏦",
      "🏧",
      "⚖️",
      "🏷️",
      "✉️",
      "📦",
      "🎓",
      "📚",
      "✏️",
      "💻",
    ],
  },
];

const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  value,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  const filteredEmojis = search.trim() ? Array.from(new Set(allEmojis)) : null;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 flex items-center justify-center text-xl bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all shadow-xs cursor-pointer group shrink-0"
        title="Seleccionar emoji"
      >
        <span>{value || "🏷️"}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 w-72 bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl p-3 space-y-2 max-h-72 overflow-y-auto"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar emoji..."
                className="w-full bg-transparent outline-none text-xs text-gray-900 dark:text-white"
              />
            </div>

            {filteredEmojis ? (
              <div className="grid grid-cols-7 gap-1">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onChange(emoji);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`p-1.5 text-lg hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-all ${value === emoji ? "bg-gray-100 dark:bg-zinc-800 scale-110" : ""}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">
                      {cat.name}
                    </span>
                    <div className="grid grid-cols-7 gap-1">
                      {cat.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onChange(emoji);
                            setIsOpen(false);
                          }}
                          className={`p-1.5 text-lg hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-all ${value === emoji ? "bg-gray-100 dark:bg-zinc-800 scale-110 font-bold" : ""}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FinancePortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
};

interface FinanceModuleProps {
  onClose?: () => void;
  isMobile?: boolean;
}

type TabType =
  | "overview"
  | "transactions"
  | "budgets"
  | "planning"
  | "savings"
  | "shopping"
  | "debts"
  | "stats"
  | "closing"
  | "settings";
type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER_OUT" | "TRANSFER_IN";

export const FinanceModule: React.FC<FinanceModuleProps> = ({ onClose, isMobile: propIsMobile }) => {
  // --- Responsive Mobile Detection ---
  const [screenIsMobile, setScreenIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(max-width: 767px), (orientation: landscape) and (max-height: 550px)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px), (orientation: landscape) and (max-height: 550px)");
    const listener = () => setScreenIsMobile(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const isMobile = propIsMobile ?? screenIsMobile;

  // --- Mobile Navigation State (Fase 1: Resumen | Movimientos | Planificar | Más) ---
  const [mobileMainTab, setMobileMainTab] = useState<"overview" | "transactions" | "planning" | "more">("overview");
  const [mobilePlanSubView, setMobilePlanSubView] = useState<null | "budgets" | "calendar" | "subscriptions" | "installments" | "savings" | "shopping">(null);
  const [mobileMoreSubView, setMobileMoreSubView] = useState<null | "debts" | "stats" | "closing" | "accounts" | "categories" | "security" | "settings">(null);

  const getPlanSubViewTitle = (sub: string | null) => {
    switch (sub) {
      case "budgets":
        return "Presupuestos";
      case "calendar":
        return "Calendario de Pagos";
      case "subscriptions":
        return "Suscripciones";
      case "installments":
        return "Cuotas";
      case "savings":
        return "Metas de Ahorro";
      case "shopping":
        return "Listas de Compras";
      default:
        return "";
    }
  };

  const getMoreSubViewTitle = (sub: string | null) => {
    switch (sub) {
      case "debts":
        return "Deudas y Tarjetas";
      case "stats":
        return "Análisis Financiero";
      case "closing":
        return "Cierre y Reportes";
      case "accounts":
        return "Cuentas";
      case "categories":
        return "Categorías";
      case "security":
        return "Seguridad";
      case "settings":
        return "Ajustes";
      default:
        return "";
    }
  };

  // --- Global State ---
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const effectiveTab: string = useMemo(() => {
    if (!isMobile) return activeTab;
    if (mobileMainTab === "overview") return "overview";
    if (mobileMainTab === "transactions") return "transactions";
    if (mobileMainTab === "planning") {
      if (mobilePlanSubView === null) return "planning_menu";
      if (mobilePlanSubView === "calendar" || mobilePlanSubView === "subscriptions" || mobilePlanSubView === "installments") {
        return "planning";
      }
      return mobilePlanSubView;
    }
    if (mobileMainTab === "more") {
      if (mobileMoreSubView === null) return "more_menu";
      if (["accounts", "categories", "security", "settings"].includes(mobileMoreSubView)) {
        return "settings";
      }
      return mobileMoreSubView;
    }
    return activeTab;
  }, [isMobile, activeTab, mobileMainTab, mobilePlanSubView, mobileMoreSubView]);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [showMobileTransferMenu, setShowMobileTransferMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debtSubTab, setDebtSubTab] = useState<"cards" | "loans" | "installments">("cards");
  const [showAddDebtInline, setShowAddDebtInline] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<"THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "LAST_6_MONTHS" | "THIS_YEAR">("THIS_MONTH");
  const [showAllCategoriesModal, setShowAllCategoriesModal] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [trendSeries, setTrendSeries] = useState({ ingresos: true, gastos: true, ahorro: false });

  // Mobile FASE 7 Sub-routing States
  const [mobileNavigationSource, setMobileNavigationSource] = useState<"more" | "settings">("more");
  const [selectedHistoricalMonth, setSelectedHistoricalMonth] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [showHistoricalTxList, setShowHistoricalTxList] = useState(false);
  const [showHistoricalOptionsSheet, setShowHistoricalOptionsSheet] = useState(false);
  const [selectedMobileAccount, setSelectedMobileAccount] = useState<FinanceAccount | null>(null);
  const [showAccountOptionsSheet, setShowAccountOptionsSheet] = useState(false);
  const [showAccountTxList, setShowAccountTxList] = useState(false);
  const [selectedMobileCategory, setSelectedMobileCategory] = useState<FinanceCategory | null>(null);
  const [mobileCategoryEditName, setMobileCategoryEditName] = useState("");
  const [mobileCategoryEditEmoji, setMobileCategoryEditEmoji] = useState("");
  const [mobileCategoryEditBudget, setMobileCategoryEditBudget] = useState("");
  const [showConfirmCloseMonth, setShowConfirmCloseMonth] = useState(false);
  const [monthIsClosedStatus, setMonthIsClosedStatus] = useState<Record<string, boolean>>({});

  // --- Data State ---
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [budgetItems, setBudgetItems] = useState<FinanceBudgetItem[]>([]);
  const [recurring, setRecurring] = useState<FinanceRecurringTransaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<FinanceSavingsGoal[]>(() => {
    try {
      const cached = localStorage.getItem("finance_savings_goals_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [shoppingLists, setShoppingLists] = useState<FinanceShoppingList[]>([]);
  const [shoppingItems, setShoppingItems] = useState<FinanceShoppingItem[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [installments, setInstallments] = useState<FinanceInstallment[]>([]);
  const [securityConfig, setSecurityConfig] = useState<FinanceSecurity | null>(
    () => {
      try {
        const allKeys = Object.keys(localStorage);
        const secKey = allKeys.find((k) => k.startsWith("finance_sec_"));
        if (secKey) {
          const cached = localStorage.getItem(secKey);
          if (cached) return JSON.parse(cached);
        }
      } catch {}
      return null;
    },
  );

  // --- Security & PIN States ---
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      const isAlreadyUnlocked =
        sessionStorage.getItem("finance_unlocked_session") === "true";
      if (isAlreadyUnlocked) return true;
      const allKeys = Object.keys(localStorage);
      const secKey = allKeys.find((k) => k.startsWith("finance_sec_"));
      if (secKey) {
        const cached = localStorage.getItem(secKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (
            parsed &&
            parsed.pin_hash &&
            (parsed.require_on_enter || parsed.require_pin_on_entry)
          ) {
            return false;
          }
        }
      }
    } catch {}
    return true;
  });
  const [lockPinInput, setLockPinInput] = useState("");
  const [lockPinError, setLockPinError] = useState("");
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [newPinValue, setNewPinValue] = useState("");
  const [confirmPinValue, setConfirmPinValue] = useState("");
  const [setPinError, setSetPinError] = useState("");
  const [showDeletePinModal, setShowDeletePinModal] = useState(false);
  const [deleteTargetAccountId, setDeleteTargetAccountId] = useState<
    number | null
  >(null);
  const [deletePinInput, setDeletePinInput] = useState("");
  const [deletePinError, setDeletePinError] = useState("");
  const [showDisablePinModal, setShowDisablePinModal] = useState(false);
  const [disablePinInput, setDisablePinInput] = useState("");
  const [disablePinError, setDisablePinError] = useState("");

  // --- Month Deletion in Cierre States ---
  const [deleteTargetMonth, setDeleteTargetMonth] = useState<{
    monthKey: string;
    monthName: string;
    count: number;
  } | null>(null);
  const [showDeleteMonthModal, setShowDeleteMonthModal] = useState(false);
  const [deleteMonthPinInput, setDeleteMonthPinInput] = useState("");
  const [deleteMonthPinError, setDeleteMonthPinError] = useState("");

  // --- Budget Breakdown States ---
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState<string>(
    getLocalMonthPrefix(),
  );
  const [showBudgetItemModal, setShowBudgetItemModal] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] =
    useState<FinanceBudgetItem | null>(null);
  const [budgetItemName, setBudgetItemName] = useState("");
  const [budgetItemAmount, setBudgetItemAmount] = useState("");
  const [budgetItemIcon, setBudgetItemIcon] = useState("🍔");
  const [budgetItemColor, setBudgetItemColor] = useState("#10b981");
  const [budgetItemCategoryId, setBudgetItemCategoryId] = useState<number | "">(
    "",
  );
  const [quickExpenseBudgetItem, setQuickExpenseBudgetItem] =
    useState<FinanceBudgetItem | null>(null);

  // --- Filters (Transactions) ---
  const [txFilterSearch, setTxFilterSearch] = useState("");
  const [txFilterType, setTxFilterType] = useState<TransactionType | "ALL">(
    "ALL",
  );
  const [txFilterAccount, setTxFilterAccount] = useState<number | "ALL">("ALL");
  const [txFilterCategory, setTxFilterCategory] = useState<number | "ALL">("ALL");
  const [txFilterDateRange, setTxFilterDateRange] = useState<
    "ALL" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR"
  >("THIS_MONTH");
  const [showMobileTxFilters, setShowMobileTxFilters] = useState(false);

  // --- Modal & Bottom Sheet States ---
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<TransactionType>("EXPENSE");
  const [showAdvancedTx, setShowAdvancedTx] = useState(false);
  const [showNewTxTypeSheet, setShowNewTxTypeSheet] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<FinanceTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [showCategoryPickerSheet, setShowCategoryPickerSheet] = useState(false);
  const [categoryPickerSearch, setCategoryPickerSearch] = useState("");
  const [showAccountPickerSheet, setShowAccountPickerSheet] = useState<"from" | "to" | null>(null);
  const [showDatePickerSheet, setShowDatePickerSheet] = useState(false);

  const [showContributeModal, setShowContributeModal] = useState<number | null>(
    null,
  );
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeAccountId, setContributeAccountId] = useState<number | "">(
    "",
  );

  const [showPayDebtModal, setShowPayDebtModal] = useState<any | null>(null);
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [payDebtAccountId, setPayDebtAccountId] = useState<number | "">("");

  // --- Funds & Credit Card Payment Modals ---
  const [showAddFundsModal, setShowAddFundsModal] = useState<{
    accountId: number;
    accountName: string;
    requiredCents?: number;
  } | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState("");

  const [showPayCardModal, setShowPayCardModal] =
    useState<FinanceAccount | null>(null);
  const [payCardAmount, setPayCardAmount] = useState("");
  const [payCardFromAccountId, setPayCardFromAccountId] = useState<number | "">(
    "",
  );

  // --- Installment Modal ---
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [instName, setInstName] = useState("");
  const [instTotalAmount, setInstTotalAmount] = useState("");
  const [instTotalInstallments, setInstTotalInstallments] = useState("12");
  const [instAccountId, setInstAccountId] = useState<number | "">("");
  const [instCategoryId, setInstCategoryId] = useState<number | "">("");
  const [instStartDate, setInstStartDate] = useState(getTodayStr());
  const [instPaymentDay, setInstPaymentDay] = useState(
    new Date().getDate().toString(),
  );
  const [instInterestPercent, setInstInterestPercent] = useState("");

  // --- Create Account Modal & System Alerts ---
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [financialAlerts, setFinancialAlerts] = useState<string[]>([]);
  const [showCreditInfoModal, setShowCreditInfoModal] = useState(false);

  // --- Planning Sub-tab & Calendar ---
  const [planningSubTab, setPlanningSubTab] = useState<
    "calendar" | "subscriptions" | "installments"
  >("calendar");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(
    getTodayStr(),
  );
  const [includeAvailableCredit, setIncludeAvailableCredit] = useState(false);
  const [showNewSubscriptionModal, setShowNewSubscriptionModal] = useState(false);
  const [showNewSavingsGoalModal, setShowNewSavingsGoalModal] = useState(false);
  const [showCreateShoppingListModal, setShowCreateShoppingListModal] = useState(false);
  const [showSetTotalBudgetModal, setShowSetTotalBudgetModal] = useState(false);

  // --- Form States (Transaction) ---
  const [txAmount, setTxAmount] = useState("");
  const [txCategoryId, setTxCategoryId] = useState<number | "">("");
  const [txAccountId, setTxAccountId] = useState<number | "">("");
  const [txToAccountId, setTxToAccountId] = useState<number | "">(""); // For transfers
  const [txDate, setTxDate] = useState(getTodayStr());
  const [txDescription, setTxDescription] = useState("");
  const [txTransferFeeType, setTxTransferFeeType] = useState<
    "fixed" | "percent"
  >("fixed");
  const [txTransferFeeValue, setTxTransferFeeValue] = useState("");

  // --- Form States (Settings/Accounts/Categories) ---
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("bank");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  const [newAccountCreditLimit, setNewAccountCreditLimit] = useState("");
  const [newAccountCutoffDay, setNewAccountCutoffDay] = useState<number | "">(
    15,
  );
  const [newAccountDueDay, setNewAccountDueDay] = useState<number | "">(5);
  const [newAccountCardLast4, setNewAccountCardLast4] = useState("");
  const [newAccountCardColor, setNewAccountCardColor] = useState("slate");
  const [newAccountMaintFeeType, setNewAccountMaintFeeType] = useState<
    "none" | "fixed" | "percent"
  >("none");
  const [newAccountMaintFeeValue, setNewAccountMaintFeeValue] = useState("");
  const [newAccountMaintFeeFreq, setNewAccountMaintFeeFreq] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [newAccountMaintFeeDate, setNewAccountMaintFeeDate] = useState("");
  const [newAccountTransferFeeType, setNewAccountTransferFeeType] = useState<
    "none" | "fixed" | "percent"
  >("none");
  const [newAccountTransferFeeValue, setNewAccountTransferFeeValue] =
    useState("");

  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("💰");
  const [editingCategory, setEditingCategory] =
    useState<FinanceCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("🏷️");
  const [catType, setCatType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [catBudgetAmount, setCatBudgetAmount] = useState("");
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);

  // --- Form States (Budget) ---
  const [budgetAmount, setBudgetAmount] = useState("");

  // --- Form States (Recurring) ---
  const [recAmount, setRecAmount] = useState("");
  const [recDesc, setRecDesc] = useState("");
  const [recFrequency, setRecFrequency] = useState("monthly");
  const [recNextDate, setRecNextDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [recAccountId, setRecAccountId] = useState<number | "">("");
  const [recCategoryId, setRecCategoryId] = useState<number | "">("");

  // --- Edit States ---
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(
    null,
  );
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountType, setEditAccountType] = useState("bank");
  const [editAccountBalance, setEditAccountBalance] = useState("");
  const [editAccountCardColor, setEditAccountCardColor] = useState("slate");
  const [editAccountCreditLimit, setEditAccountCreditLimit] = useState("");
  const [editAccountCutoffDay, setEditAccountCutoffDay] = useState("");
  const [editAccountDueDay, setEditAccountDueDay] = useState("");
  const [editAccountCardNumberLast4, setEditAccountCardNumberLast4] =
    useState("");
  const [editAccountMaintFeeType, setEditAccountMaintFeeType] = useState<
    "none" | "fixed" | "percent"
  >("none");
  const [editAccountMaintFeeValue, setEditAccountMaintFeeValue] = useState("");
  const [editAccountMaintFeeFreq, setEditAccountMaintFeeFreq] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [editAccountMaintFeeDate, setEditAccountMaintFeeDate] = useState("");
  const [editAccountTransferFeeType, setEditAccountTransferFeeType] = useState<
    "none" | "fixed" | "percent"
  >("none");
  const [editAccountTransferFeeValue, setEditAccountTransferFeeValue] =
    useState("");
  const [showNewAccountExtras, setShowNewAccountExtras] = useState(false);
  const [showEditAccountExtras, setShowEditAccountExtras] = useState(false);

  const [editingDebt, setEditingDebt] = useState<any | null>(null);
  const [editDebtName, setEditDebtName] = useState("");
  const [editDebtType, setEditDebtType] = useState<"OWE" | "OWED">("OWE");
  const [editDebtAmount, setEditDebtAmount] = useState("");
  const [editDebtRemaining, setEditDebtRemaining] = useState("");
  const [editDebtDueDate, setEditDebtDueDate] = useState("");

  // --- Form States (Savings Goals) ---
  const [goalName, setGoalName] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalCustomContribution, setGoalCustomContribution] = useState("");
  const [goalFrequency, setGoalFrequency] = useState<
    "WEEKLY" | "BIWEEKLY" | "MONTHLY"
  >("MONTHLY");

  // --- Form States (Debts) ---
  const [debtName, setDebtName] = useState("");
  const [debtType, setDebtType] = useState<"OWE" | "OWED">("OWE");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDueDate, setDebtDueDate] = useState("");

  // --- Form States (Shopping) ---
  const [newListName, setNewListName] = useState("");
  const [newItemNames, setNewItemNames] = useState<{
    [listId: number]: string;
  }>({});
  const [newItemQuantities, setNewItemQuantities] = useState<{
    [listId: number]: string;
  }>({});
  const [newItemPrices, setNewItemPrices] = useState<{
    [listId: number]: string;
  }>({});
  const [shoppingFilter, setShoppingFilter] = useState<"active" | "archived">(
    "active",
  );
  const [showLoadExpenseModal, setShowLoadExpenseModal] =
    useState<FinanceShoppingList | null>(null);
  const [loadExpenseAccountId, setLoadExpenseAccountId] = useState("");
  const [loadExpenseCategoryId, setLoadExpenseCategoryId] = useState("");
  const [loadExpenseDescription, setLoadExpenseDescription] = useState("");
  const [loadExpenseDate, setLoadExpenseDate] = useState("");

  useEffect(() => {
    // Immediate local cache restore for instant rendering of summary and module data
    try {
      const cachedFull = localStorage.getItem("finance_full_cache_v2");
      if (cachedFull) {
        const parsed = JSON.parse(cachedFull);
        if (parsed.accounts && Array.isArray(parsed.accounts))
          setAccounts(parsed.accounts);
        if (parsed.categories && Array.isArray(parsed.categories))
          setCategories(parsed.categories);
        if (parsed.transactions && Array.isArray(parsed.transactions))
          setTransactions(parsed.transactions);
        if (parsed.budgets && Array.isArray(parsed.budgets))
          setBudgets(parsed.budgets);
        if (parsed.budgetItems && Array.isArray(parsed.budgetItems))
          setBudgetItems(parsed.budgetItems);
        if (parsed.recurring && Array.isArray(parsed.recurring))
          setRecurring(parsed.recurring);
        if (parsed.savingsGoals && Array.isArray(parsed.savingsGoals))
          setSavingsGoals(parsed.savingsGoals);
        if (parsed.shoppingLists && Array.isArray(parsed.shoppingLists))
          setShoppingLists(parsed.shoppingLists);
        if (parsed.shoppingItems && Array.isArray(parsed.shoppingItems))
          setShoppingItems(parsed.shoppingItems);
        if (parsed.debts && Array.isArray(parsed.debts)) setDebts(parsed.debts);
        if (parsed.installments && Array.isArray(parsed.installments))
          setInstallments(parsed.installments);
      }
    } catch (e) {
      console.error("Cache load error:", e);
    }

    fetchFinanceData();
    return () => {
      sessionStorage.removeItem("finance_unlocked_session");
    };
  }, []);

  useEffect(() => {
    if (savingsGoals && savingsGoals.length > 0) {
      try {
        localStorage.setItem(
          "finance_savings_goals_cache",
          JSON.stringify(savingsGoals),
        );
      } catch {}
    }
  }, [savingsGoals]);

  const autoProcessDueSubscriptions = async (
    recList: FinanceRecurringTransaction[],
    accountsList: any[],
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const due = recList.filter((r) => r.next_date && r.next_date <= today);
    if (due.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let dataChanged = false;
    let alertsAdded: string[] = [];

    for (const rec of due) {
      const targetAccId = rec.account_id || accountsList[0]?.id;
      if (!targetAccId) continue;

      const currAcc = accountsList.find((a) => a.id === targetAccId);
      if (!currAcc) continue;

      const txAmount = rec.amount_cents;
      let hasSufficient = true;

      if (currAcc.type === "credit") {
        const limit = currAcc.credit_limit_cents || 0;
        const used = currAcc.balance_cents;
        const available = limit - used;
        if (limit > 0 && txAmount > available) {
          hasSufficient = false;
          alertsAdded.push(
            `⚠️ Pago Tardío / Cupo Insuficiente: La suscripción '${rec.description || "Suscripción"}' ($${(txAmount / 100).toFixed(2)}) no se cobró en '${currAcc.name}' por falta de cupo de crédito.`,
          );
        }
      } else {
        if (currAcc.balance_cents < txAmount) {
          hasSufficient = false;
          alertsAdded.push(
            `⚠️ Pago Tardío / Sin Fondos: La suscripción '${rec.description || "Suscripción"}' ($${(txAmount / 100).toFixed(2)}) no se cobró en '${currAcc.name}' por falta de saldo disponible.`,
          );
        }
      }

      if (!hasSufficient) {
        rec.is_past_due = true;
        continue;
      }

      // Insert transaction
      await supabase.from("finance_transactions").insert([
        {
          user_id: user.id,
          account_id: targetAccId,
          type: rec.type || "EXPENSE",
          amount_cents: txAmount,
          date: today,
          category_id: rec.category_id || null,
          description: `Cobro automático suscripción: ${rec.description || "Suscripción"}`,
        },
      ]);

      // Update Account Balance
      const newBalance =
        rec.type === "INCOME"
          ? currAcc.balance_cents + txAmount
          : currAcc.type === "credit"
            ? currAcc.balance_cents + txAmount
            : Math.max(0, currAcc.balance_cents - txAmount);
      await supabase
        .from("finance_accounts")
        .update({ balance_cents: Math.max(0, newBalance) })
        .eq("id", targetAccId);
      currAcc.balance_cents = Math.max(0, newBalance);

      // Update Next Date or delete if single payment
      if (
        (rec.frequency as string) === "once" ||
        (rec.frequency as string) === "ONCE"
      ) {
        await supabase
          .from("finance_recurring_transactions")
          .delete()
          .eq("id", rec.id);
      } else {
        const currentNext = new Date(rec.next_date || today);
        if (rec.frequency === "weekly")
          currentNext.setDate(currentNext.getDate() + 7);
        else if (rec.frequency === "yearly")
          currentNext.setFullYear(currentNext.getFullYear() + 1);
        else currentNext.setMonth(currentNext.getMonth() + 1);

        const newNextDateStr = currentNext.toISOString().split("T")[0];
        await supabase
          .from("finance_recurring_transactions")
          .update({ next_date: newNextDateStr })
          .eq("id", rec.id);
      }
      dataChanged = true;
    }

    if (alertsAdded.length > 0) {
      setFinancialAlerts((prev) =>
        Array.from(new Set([...prev, ...alertsAdded])),
      );
    }

    if (dataChanged) {
      const [accRes, txRes, recRes] = await Promise.all([
        supabase.from("finance_accounts").select("*").order("created_at"),
        supabase
          .from("finance_transactions")
          .select("*")
          .order("date", { ascending: false })
          .limit(200),
        supabase
          .from("finance_recurring_transactions")
          .select("*")
          .order("next_date"),
      ]);
      if (accRes.data) setAccounts(accRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (recRes.data) setRecurring(recRes.data);
    }
  };

  const autoProcessDueInstallments = async (
    instList: FinanceInstallment[],
    accountsList: any[],
  ) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const currentMonthKey = todayStr.substring(0, 7);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let alertsAdded: string[] = [];
    let dataChanged = false;

    for (const inst of instList) {
      if (inst.status !== "ACTIVE") continue;

      const start = new Date(inst.start_date);
      const payDay = inst.payment_day || start.getDate() || 15;

      // Calculate expected payments up to current date
      let totalMonthsElapsed =
        (currentYear - start.getFullYear()) * 12 +
        (currentMonth - start.getMonth());
      if (currentDay >= payDay) {
        totalMonthsElapsed += 1;
      }

      const expectedPaid = Math.min(
        Math.max(0, totalMonthsElapsed),
        inst.total_installments,
      );

      if (inst.paid_installments < expectedPaid) {
        const nextPaid = inst.paid_installments + 1;
        const newStatus =
          nextPaid >= inst.total_installments ? "COMPLETED" : "ACTIVE";

        const targetAccId = inst.account_id || accountsList[0]?.id;
        if (!targetAccId) continue;

        const currAcc = accountsList.find((a) => a.id === targetAccId);
        if (!currAcc) continue;

        let hasSufficient = true;
        if (currAcc.type === "credit") {
          // For credit card installment payments: total was retained at purchase creation.
          // Monthly payment releases debt back into available limit!
          // Checking available limit is not blocking release, but check if card is frozen/overdue
        } else {
          if (currAcc.balance_cents < inst.installment_amount_cents) {
            hasSufficient = false;
            alertsAdded.push(
              `⚠️ Pago Tardío / Sin Fondos: No se pudo cobrar la cuota "${inst.name}" ($${(inst.installment_amount_cents / 100).toFixed(2)}) en '${currAcc.name}' por falta de saldo disponible.`,
            );
          }
        }

        if (!hasSufficient) {
          inst.is_past_due = true;
          continue;
        }

        await supabase
          .from("finance_installments")
          .update({
            paid_installments: nextPaid,
            last_paid_month: currentMonthKey,
            status: newStatus,
          })
          .eq("id", inst.id);

        await supabase.from("finance_transactions").insert([
          {
            user_id: user.id,
            account_id: targetAccId,
            type: "EXPENSE",
            amount_cents: inst.installment_amount_cents,
            date: todayStr,
            category_id: inst.category_id || null,
            description: `Cobro automático cuota ${nextPaid}/${inst.total_installments} (Día ${payDay}): ${inst.name}`,
          },
        ]);

        // On credit cards, paying monthly installment lowers total used debt, releasing credit limit!
        const newBal =
          currAcc.type === "credit"
            ? Math.max(0, currAcc.balance_cents - inst.installment_amount_cents)
            : currAcc.balance_cents - inst.installment_amount_cents;

        await supabase
          .from("finance_accounts")
          .update({ balance_cents: newBal })
          .eq("id", targetAccId);

        currAcc.balance_cents = newBal;
        inst.paid_installments = nextPaid;
        inst.last_paid_month = currentMonthKey;
        inst.status = newStatus;
        dataChanged = true;
      }
    }

    if (alertsAdded.length > 0) {
      setFinancialAlerts((prev) =>
        Array.from(new Set([...prev, ...alertsAdded])),
      );
    }

    if (dataChanged) {
      setAccounts([...accountsList]);
      setInstallments([...instList]);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const clean = pin.trim();
    try {
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(clean + "_fin_security_salt_2026");
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch {
      // fallback
    }
    let hash = 5381;
    const str = clean + "_fin_security_salt_2026";
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  };

  // Helper to explicitly copy previous month's budget items on user demand
  const handleCopyFromPreviousMonth = async () => {
    const allMonths = Array.from(new Set(budgetItems.map((b) => b.month)))
      .sort()
      .reverse();
    const sourceMonth =
      allMonths.find((m) => m < selectedBudgetMonth) || allMonths[0];
    if (!sourceMonth || sourceMonth === selectedBudgetMonth) {
      alert("No se encontraron desgloses en otros meses para copiar.");
      return;
    }
    const sourceItems = budgetItems.filter((b) => b.month === sourceMonth);
    if (sourceItems.length === 0) {
      alert("El mes anterior no tiene desgloses.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newItems = sourceItems.map((item) => ({
      user_id: user.id,
      month: selectedBudgetMonth,
      name: item.name,
      icon: item.icon || "🏷️",
      color: item.color || "#3b82f6",
      allocated_cents: item.allocated_cents,
      category_id: item.category_id || null,
    }));

    try {
      const { data: inserted, error } = await supabase
        .from("finance_budget_items")
        .insert(newItems)
        .select();
      if (inserted && !error) {
        setBudgetItems((prev) => [...prev, ...inserted]);
      } else {
        const localItems = newItems.map(
          (item, idx) =>
            ({ ...item, id: Date.now() + idx }) as FinanceBudgetItem,
        );
        setBudgetItems((prev) => [...prev, ...localItems]);
      }
    } catch (err) {
      console.error("Error copying budget items:", err);
    }
  };

  const fetchFinanceData = async (silent: boolean = false) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Immediate local cache restore for PIN security
      const localSecKey = `finance_sec_${user.id}`;
      const cachedSec = localStorage.getItem(localSecKey);
      if (cachedSec) {
        try {
          const parsed = JSON.parse(cachedSec);
          if (parsed && parsed.pin_hash) {
            setSecurityConfig(parsed);
            if (
              (parsed.require_on_enter || parsed.require_pin_on_entry) &&
              parsed.pin_hash
            ) {
              const isAlreadyUnlocked =
                sessionStorage.getItem("finance_unlocked_session") === "true";
              if (!isAlreadyUnlocked) {
                setIsUnlocked(false);
              }
            }
          }
        } catch {
          // silent
        }
      }

      // Perform ALL 12 queries concurrently in a single Promise.all with user_id filters for maximum performance
      const [
        accRes,
        catRes,
        txRes,
        budRes,
        recRes,
        goalsRes,
        listsRes,
        itemsRes,
        debtsRes,
        instRes,
        bItemsRes,
        secRes,
      ] = await Promise.all([
        supabase
          .from("finance_accounts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase
          .from("finance_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name"),
        supabase
          .from("finance_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(250),
        supabase.from("finance_budgets").select("*").eq("user_id", user.id),
        supabase
          .from("finance_recurring_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("next_date"),
        supabase
          .from("finance_savings_goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_shopping_lists")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_shopping_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase
          .from("finance_debts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_installments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("finance_budget_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at"),
        supabase
          .from("finance_security")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const fetchedAccounts = accRes.data || [];
      const fetchedTransactions = txRes.data || [];
      const fetchedBudgets = budRes.data || [];
      const fetchedRecurring = recRes.data || [];
      const fetchedGoals = goalsRes.data || [];
      const fetchedLists = listsRes.data || [];
      const fetchedItems = itemsRes.data || [];
      const fetchedDebts = debtsRes.data || [];
      const fetchedInstallments = instRes.data || [];
      const fetchedBItems = bItemsRes.data || [];

      setAccounts(fetchedAccounts);
      setTransactions(fetchedTransactions);
      setBudgets(fetchedBudgets);
      setRecurring(fetchedRecurring);
      setSavingsGoals(fetchedGoals);
      setShoppingLists(fetchedLists);
      setShoppingItems(fetchedItems);
      setDebts(fetchedDebts);
      setInstallments(fetchedInstallments);
      setBudgetItems(fetchedBItems);

      // Handle categories & prevent ghost categories
      let currentCategories: FinanceCategory[] = [];
      if (catRes.data) {
        const rawDeletedCatIds = localStorage.getItem(
          `finance_deleted_cat_ids_${user.id}`,
        );
        const deletedCatIds: number[] = rawDeletedCatIds
          ? JSON.parse(rawDeletedCatIds)
          : [];
        const validCats = catRes.data.filter(
          (c) => !deletedCatIds.includes(c.id),
        );

        const seededKey = `finance_categories_initialized_${user.id}`;
        const hasEverBeenInitialized =
          localStorage.getItem(seededKey) === "true";

        if (
          validCats.length === 0 &&
          !hasEverBeenInitialized &&
          deletedCatIds.length === 0 &&
          fetchedAccounts.length === 0 &&
          fetchedTransactions.length === 0
        ) {
          localStorage.setItem(seededKey, "true");
          const currentUserId = user.id;
          const defaultCats = [
            {
              name: "Supermercado & Alimentación",
              emoji: "🛒",
              type: "EXPENSE",
              budget_limit_cents: 30000,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Vivienda & Alquiler",
              emoji: "🏠",
              type: "EXPENSE",
              budget_limit_cents: 50000,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Transporte & Combustible",
              emoji: "🚗",
              type: "EXPENSE",
              budget_limit_cents: 15000,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Entretenimiento & Ocio",
              emoji: "🍿",
              type: "EXPENSE",
              budget_limit_cents: 10000,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Servicios & Luz",
              emoji: "💡",
              type: "EXPENSE",
              budget_limit_cents: 12000,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Salud & Bienestar",
              emoji: "🩺",
              type: "EXPENSE",
              budget_limit_cents: 8000,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Salario & Nómina",
              emoji: "💼",
              type: "INCOME",
              budget_limit_cents: 0,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Freelance & Honorarios",
              emoji: "💵",
              type: "INCOME",
              budget_limit_cents: 0,
              user_id: currentUserId,
              is_archived: false,
            },
            {
              name: "Inversiones",
              emoji: "📈",
              type: "INCOME",
              budget_limit_cents: 0,
              user_id: currentUserId,
              is_archived: false,
            },
          ];
          const { data: seededData } = await supabase
            .from("finance_categories")
            .insert(defaultCats)
            .select("*");
          if (seededData) {
            currentCategories = seededData;
            setCategories(seededData);
          }
        } else {
          localStorage.setItem(seededKey, "true");
          currentCategories = validCats;
          setCategories(validCats);
        }
      }

      // Security configuration
      if (secRes.data) {
        const sec = secRes.data;
        setSecurityConfig(sec);
        localStorage.setItem(localSecKey, JSON.stringify(sec));
        const reqEnter =
          sec.require_on_enter ?? sec.require_pin_on_entry ?? false;
        if (reqEnter && sec.pin_hash) {
          const isAlreadyUnlocked =
            sessionStorage.getItem("finance_unlocked_session") === "true";
          if (!isAlreadyUnlocked) {
            setIsUnlocked(false);
          }
        }
      }

      // Background processors
      if (fetchedRecurring.length > 0 && fetchedAccounts.length > 0) {
        autoProcessDueSubscriptions(fetchedRecurring, fetchedAccounts);
      }
      if (fetchedInstallments.length > 0 && fetchedAccounts.length > 0) {
        autoProcessDueInstallments(fetchedInstallments, fetchedAccounts);
      }

      // Persist full snapshot to local cache for instant future loads
      try {
        localStorage.setItem(
          "finance_full_cache_v2",
          JSON.stringify({
            accounts: fetchedAccounts,
            categories: currentCategories,
            transactions: fetchedTransactions,
            budgets: fetchedBudgets,
            budgetItems: fetchedBItems,
            recurring: fetchedRecurring,
            savingsGoals: fetchedGoals,
            shoppingLists: fetchedLists,
            shoppingItems: fetchedItems,
            debts: fetchedDebts,
            installments: fetchedInstallments,
          }),
        );
      } catch (e) {
        // silent
      }
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helpers ---
  const formatCurrency = (cents: number) => {
    if (isPrivacyMode) return "••••••";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const exportToCSV = () => {
    const headers = [
      "Fecha",
      "Tipo",
      "Monto",
      "Descripción",
      "Categoría",
      "Cuenta",
    ];
    const rows = thisMonthTransactions.map((tx) => {
      const catName =
        categories.find((c) => c.id === tx.category_id)?.name || "";
      const accName = accounts.find((a) => a.id === tx.account_id)?.name || "";
      const amount = (tx.amount_cents / 100).toFixed(2);
      return [tx.date, tx.type, amount, tx.description || "", catName, accName];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `finanzas_cierre_${currentMonthPrefix}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentMonthPrefix = useMemo(
    () => new Date().toISOString().substring(0, 7),
    [],
  );
  const currentMonthName = useMemo(
    () =>
      new Date().toLocaleString("es-ES", { month: "long", year: "numeric" }),
    [],
  );

  // --- Computed Values ---
  const {
    liquidCashCents,
    totalCreditCardDebtCents,
    totalAvailableCreditCents,
    netWorthCents,
    totalBalanceCents,
  } = useMemo(() => {
    const liquid = accounts
      .filter((a) => a.type !== "credit")
      .reduce((acc, a) => acc + a.balance_cents, 0);

    const creditDebt = accounts
      .filter((a) => a.type === "credit")
      .reduce((acc, a) => acc + Math.max(0, a.balance_cents), 0);

    const availableCredit = accounts
      .filter((a) => a.type === "credit")
      .reduce((acc, a) => {
        const limit = a.credit_limit_cents || 0;
        const used = Math.max(0, a.balance_cents);
        return acc + Math.max(0, limit - used);
      }, 0);

    const net = liquid - creditDebt;
    const total = includeAvailableCredit ? net + availableCredit : net;

    return {
      liquidCashCents: liquid,
      totalCreditCardDebtCents: creditDebt,
      totalAvailableCreditCents: availableCredit,
      netWorthCents: net,
      totalBalanceCents: total,
    };
  }, [accounts, includeAvailableCredit]);

  const {
    thisMonthTransactions,
    incomeThisMonth,
    expensesThisMonth,
    currentBudget,
    budgetProgress,
  } = useMemo(() => {
    const thisMonthTx = transactions.filter((t) =>
      t.date.startsWith(currentMonthPrefix),
    );
    const income = thisMonthTx
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => acc + t.amount_cents, 0);
    const expenses = thisMonthTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => acc + t.amount_cents, 0);
    const curBudget = budgets.find((b) => b.month === currentMonthPrefix);
    const progress = curBudget
      ? Math.min(
          100,
          Math.round((expenses / curBudget.total_amount_cents) * 100),
        )
      : 0;

    return {
      thisMonthTransactions: thisMonthTx,
      incomeThisMonth: income,
      expensesThisMonth: expenses,
      currentBudget: curBudget,
      budgetProgress: progress,
    };
  }, [transactions, budgets, currentMonthPrefix]);

  // --- Handlers ---
  const resetTxForm = () => {
    setTxAmount("");
    setTxCategoryId("");
    setTxAccountId("");
    setTxToAccountId("");
    setTxDescription("");
    setTxDate(getTodayStr());
    setTxTransferFeeType("fixed");
    setTxTransferFeeValue("");
    setEditingTx(null);
    setShowAdvancedTx(false);
  };

  const openNewTransactionModal = (type: TransactionType = "EXPENSE") => {
    resetTxForm();
    setTxType(type);
    setEditingTx(null);
    setShowNewTxTypeSheet(false);
    setShowTxModal(true);
  };

  const openEditTransaction = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    const resolvedType: TransactionType =
      tx.type === "TRANSFER_IN" ? "TRANSFER_OUT" : (tx.type as TransactionType);
    setTxType(resolvedType);
    setTxAmount((tx.amount_cents / 100).toFixed(2));
    setTxAccountId(tx.account_id);
    setTxCategoryId(tx.category_id || "");
    setTxDate(tx.date ? tx.date.split("T")[0] : getTodayStr());
    setTxDescription(tx.description || "");
    setShowTxModal(true);
    setSelectedTxDetail(null);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Requirement 1: Mandatory Account Selection
    if (!txAccountId || txAccountId === "") {
      alert(
        "⚠️ Debes seleccionar obligatoriamente una cuenta para realizar la transacción.",
      );
      return;
    }

    const amountCents = Math.round(parseFloat(txAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return alert("Monto inválido.");

    const selectedAcc = accounts.find((a) => a.id === Number(txAccountId));
    if (!selectedAcc) return alert("Cuenta no encontrada.");

    // Handle Edit Mode
    if (editingTx) {
      try {
        const oldAcc = accounts.find((a) => a.id === editingTx.account_id);
        if (oldAcc) {
          // Revert old transaction balance
          let revertedBal = oldAcc.balance_cents;
          if (editingTx.type === "EXPENSE" || editingTx.type === "TRANSFER_OUT") {
            revertedBal =
              oldAcc.type === "credit"
                ? revertedBal - editingTx.amount_cents
                : revertedBal + editingTx.amount_cents;
          } else if (editingTx.type === "INCOME" || editingTx.type === "TRANSFER_IN") {
            revertedBal =
              oldAcc.type === "credit"
                ? revertedBal + editingTx.amount_cents
                : Math.max(0, revertedBal - editingTx.amount_cents);
          }

          // Apply new transaction balance
          let finalBal = revertedBal;
          if (oldAcc.id === Number(txAccountId)) {
            if (txType === "EXPENSE" || txType === "TRANSFER_OUT") {
              finalBal =
                oldAcc.type === "credit"
                  ? finalBal + amountCents
                  : Math.max(0, finalBal - amountCents);
            } else {
              finalBal =
                oldAcc.type === "credit"
                  ? Math.max(0, finalBal - amountCents)
                  : finalBal + amountCents;
            }
            await supabase
              .from("finance_accounts")
              .update({ balance_cents: Math.max(0, finalBal) })
              .eq("id", oldAcc.id);
          } else {
            // Revert old account
            await supabase
              .from("finance_accounts")
              .update({ balance_cents: Math.max(0, revertedBal) })
              .eq("id", oldAcc.id);
            // Apply new account
            let newAccBal = selectedAcc.balance_cents;
            if (txType === "EXPENSE" || txType === "TRANSFER_OUT") {
              newAccBal =
                selectedAcc.type === "credit"
                  ? newAccBal + amountCents
                  : Math.max(0, newAccBal - amountCents);
            } else {
              newAccBal =
                selectedAcc.type === "credit"
                  ? Math.max(0, newAccBal - amountCents)
                  : newAccBal + amountCents;
            }
            await supabase
              .from("finance_accounts")
              .update({ balance_cents: Math.max(0, newAccBal) })
              .eq("id", selectedAcc.id);
          }
        }

        await supabase
          .from("finance_transactions")
          .update({
            account_id: txAccountId,
            type: txType,
            amount_cents: amountCents,
            category_id: txCategoryId === "" ? null : txCategoryId,
            date: txDate,
            description: txDescription,
          })
          .eq("id", editingTx.id);

        fetchFinanceData();
        setShowTxModal(false);
        resetTxForm();
        return;
      } catch (err) {
        console.error("Error editing transaction:", err);
        return;
      }
    }

    // Requirement 1: Fund Validation for Expenses & Transfers (New Transactions)
    if (txType === "EXPENSE" || txType === "TRANSFER_OUT") {
      if (selectedAcc.type === "credit") {
        const limit = selectedAcc.credit_limit_cents || 0;
        const used = selectedAcc.balance_cents;
        if (limit > 0 && limit - used < amountCents) {
          const availableCredit = Math.max(0, limit - used);
          alert(
            `⚠️ Cupo de crédito disponible insuficiente en '${selectedAcc.name}'. Cupo disponible: $${(availableCredit / 100).toFixed(2)}, Requerido: $${(amountCents / 100).toFixed(2)}.`,
          );
          setShowPayCardModal(selectedAcc);
          return;
        }
      } else {
        if (selectedAcc.balance_cents < amountCents) {
          const needed = amountCents - selectedAcc.balance_cents;
          setShowAddFundsModal({
            accountId: selectedAcc.id,
            accountName: selectedAcc.name,
            requiredCents: needed,
          });
          setAddFundsAmount((needed / 100).toFixed(2));
          return;
        }
      }
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const isFutureDate = txDate > todayStr;

    try {
      if (isFutureDate) {
        // Future scheduled payment or income: Save to finance_recurring_transactions (Pago Único / Recurrente)
        // DO NOT deduct balance or create finished transaction immediately
        await supabase.from("finance_recurring_transactions").insert([
          {
            user_id: user.id,
            description:
              txDescription ||
              (txType === "EXPENSE"
                ? "Pago programado"
                : txType === "INCOME"
                  ? "Ingreso programado"
                  : "Transferencia programada"),
            amount_cents: amountCents,
            frequency: "once",
            start_date: todayStr,
            next_date: txDate,
            account_id: Number(txAccountId),
            category_id: txCategoryId ? Number(txCategoryId) : null,
            type: txType === "TRANSFER_OUT" ? "EXPENSE" : txType,
            auto_create: true,
            is_active: true,
          },
        ]);
      } else if (txType === "TRANSFER_OUT") {
        if (!txAccountId || !txToAccountId)
          return alert("Selecciona cuenta de origen y destino");
        if (txAccountId === txToAccountId)
          return alert(
            "La cuenta de origen y la de destino no pueden ser la misma",
          );

        const fromAcc = accounts.find((a) => a.id === Number(txAccountId))!;
        const toAcc = accounts.find((a) => a.id === Number(txToAccountId))!;

        // Calculate transfer fee from form state
        const feeVal = parseFloat(txTransferFeeValue) || 0;
        let feeCents = 0;
        if (txTransferFeeType === "fixed") {
          feeCents = Math.round(feeVal * 100);
        } else if (txTransferFeeType === "percent") {
          feeCents = Math.round(amountCents * (feeVal / 100));
        }

        const totalDebitedCents = amountCents + feeCents;

        // Validate funds
        if (fromAcc.type === "credit") {
          const limit = fromAcc.credit_limit_cents || 0;
          const available = limit - fromAcc.balance_cents;
          if (limit > 0 && available < totalDebitedCents) {
            return alert(
              `⚠️ Cupo insuficiente en '${fromAcc.name}'. Monto + Comisión ($${(feeCents / 100).toFixed(2)}): $${(totalDebitedCents / 100).toFixed(2)}, Cupo Disponible: $${(available / 100).toFixed(2)}.`,
            );
          }
        } else {
          if (fromAcc.balance_cents < totalDebitedCents) {
            return alert(
              `⚠️ Fondos insuficientes en '${fromAcc.name}'. Monto + Comisión ($${(feeCents / 100).toFixed(2)}): $${(totalDebitedCents / 100).toFixed(2)}, Disponible: $${(fromAcc.balance_cents / 100).toFixed(2)}.`,
            );
          }
        }

        const txOut = {
          user_id: user.id,
          account_id: txAccountId,
          type: "TRANSFER_OUT",
          amount_cents: amountCents,
          date: txDate,
          description: txDescription || "Transferencia enviada",
        };
        const { data: outData } = await supabase
          .from("finance_transactions")
          .insert([txOut])
          .select();

        if (outData && outData.length > 0) {
          const txIn = {
            user_id: user.id,
            account_id: txToAccountId,
            type: "TRANSFER_IN",
            amount_cents: amountCents,
            date: txDate,
            description: txDescription || "Transferencia recibida",
            related_transfer_id: outData[0].id,
          };
          await supabase.from("finance_transactions").insert([txIn]);

          if (feeCents > 0) {
            await supabase.from("finance_transactions").insert([
              {
                user_id: user.id,
                account_id: txAccountId,
                type: "EXPENSE",
                amount_cents: feeCents,
                date: txDate,
                description: `Comisión por transferencia desde ${fromAcc.name}`,
              },
            ]);
          }

          const newFromBal =
            fromAcc.type === "credit"
              ? fromAcc.balance_cents + totalDebitedCents
              : Math.max(0, fromAcc.balance_cents - totalDebitedCents);

          const newToBal =
            toAcc.type === "credit"
              ? Math.max(0, toAcc.balance_cents - amountCents)
              : toAcc.balance_cents + amountCents;

          await supabase
            .from("finance_accounts")
            .update({ balance_cents: Math.max(0, newFromBal) })
            .eq("id", txAccountId);
          await supabase
            .from("finance_accounts")
            .update({ balance_cents: Math.max(0, newToBal) })
            .eq("id", txToAccountId);
        }
      } else {
        const newTx = {
          user_id: user.id,
          account_id: txAccountId,
          type: txType,
          amount_cents: amountCents,
          category_id: txCategoryId === "" ? null : txCategoryId,
          date: txDate,
          description: txDescription,
        };

        await supabase.from("finance_transactions").insert([newTx]);

        const currentBalance = selectedAcc.balance_cents;
        const newBalance =
          txType === "EXPENSE"
            ? selectedAcc.type === "credit"
              ? currentBalance + amountCents
              : Math.max(0, currentBalance - amountCents)
            : selectedAcc.type === "credit"
              ? Math.max(0, currentBalance - amountCents)
              : currentBalance + amountCents;

        await supabase
          .from("finance_accounts")
          .update({ balance_cents: Math.max(0, newBalance) })
          .eq("id", txAccountId);
      }

      fetchFinanceData();
      setShowTxModal(false);
      resetTxForm();
    } catch (error) {
      console.error("Error saving transaction", error);
    }
  };

  const handleQuickAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddFundsModal || !addFundsAmount) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const amountCents = Math.round(parseFloat(addFundsAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return alert("Monto inválido.");

    const targetAcc = accounts.find(
      (a) => a.id === showAddFundsModal.accountId,
    );
    if (!targetAcc) return;

    await supabase.from("finance_transactions").insert([
      {
        user_id: user.id,
        account_id: targetAcc.id,
        type: "INCOME",
        amount_cents: amountCents,
        date: new Date().toISOString().split("T")[0],
        description: `Recarga de fondos en ${targetAcc.name}`,
      },
    ]);

    const newBal =
      targetAcc.type === "credit"
        ? Math.max(0, targetAcc.balance_cents - amountCents)
        : targetAcc.balance_cents + amountCents;

    await supabase
      .from("finance_accounts")
      .update({
        balance_cents: newBal,
      })
      .eq("id", targetAcc.id);

    setShowAddFundsModal(null);
    setAddFundsAmount("");
    await fetchFinanceData();
  };

  const handlePayCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayCardModal || !payCardAmount || !payCardFromAccountId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const amountCents = Math.round(parseFloat(payCardAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return alert("Monto inválido");

    const fromAcc = accounts.find((a) => a.id === Number(payCardFromAccountId));
    if (!fromAcc) return alert("Cuenta de origen no encontrada");

    // Calculate transfer fee if origin account has one
    let feeCents = 0;
    if (fromAcc.transfer_fee_type === "fixed" && fromAcc.transfer_fee_value) {
      feeCents = Math.round(fromAcc.transfer_fee_value * 100);
    } else if (
      fromAcc.transfer_fee_type === "percent" &&
      fromAcc.transfer_fee_value
    ) {
      feeCents = Math.round(amountCents * (fromAcc.transfer_fee_value / 100));
    }

    const totalDebitedCents = amountCents + feeCents;

    if (fromAcc.balance_cents < totalDebitedCents) {
      return alert(
        `Fondos insuficientes en ${fromAcc.name}. Monto + Comisión ($${(feeCents / 100).toFixed(2)}): $${(totalDebitedCents / 100).toFixed(2)}, Disponible: $${(fromAcc.balance_cents / 100).toFixed(2)}.`,
      );
    }

    const cardAcc =
      accounts.find((a) => a.id === showPayCardModal.id) || showPayCardModal;

    await supabase.from("finance_transactions").insert([
      {
        user_id: user.id,
        account_id: fromAcc.id,
        type: "EXPENSE",
        amount_cents: amountCents,
        date: new Date().toISOString().split("T")[0],
        description: `Abono a tarjeta de crédito: ${cardAcc.name}`,
      },
    ]);

    if (feeCents > 0) {
      await supabase.from("finance_transactions").insert([
        {
          user_id: user.id,
          account_id: fromAcc.id,
          type: "EXPENSE",
          amount_cents: feeCents,
          date: new Date().toISOString().split("T")[0],
          description: `Comisión por transferencia desde ${fromAcc.name}`,
        },
      ]);
    }

    await supabase
      .from("finance_accounts")
      .update({
        balance_cents: Math.max(0, fromAcc.balance_cents - totalDebitedCents),
      })
      .eq("id", fromAcc.id);

    const newCardBalance = Math.max(0, cardAcc.balance_cents - amountCents);
    await supabase
      .from("finance_accounts")
      .update({
        balance_cents: newCardBalance,
      })
      .eq("id", cardAcc.id);

    setShowPayCardModal(null);
    setPayCardAmount("");
    setPayCardFromAccountId("");
    await fetchFinanceData();
  };

  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !instName.trim() || !instTotalAmount) return;

    try {
      const baseTotalCents = Math.round(parseFloat(instTotalAmount) * 100);
      const interestPct = parseFloat(instInterestPercent) || 0;
      const totalCents = Math.round(baseTotalCents * (1 + interestPct / 100));
      const totalInst = Math.max(1, parseInt(instTotalInstallments) || 1);
      const instAmountCents = Math.round(totalCents / totalInst);
      const startDate = instStartDate || new Date().toISOString().split("T")[0];
      const startMonth = startDate.substring(0, 7);
      const pDay = Math.min(
        31,
        Math.max(
          1,
          parseInt(instPaymentDay) || parseInt(startDate.split("-")[2]) || 15,
        ),
      );
      const catIdNum = instCategoryId ? Number(instCategoryId) : null;

      // CRITICAL CREDIT CARD LIMIT RETENTION CHECK
      if (instAccountId) {
        const targetAcc = accounts.find((a) => a.id === Number(instAccountId));
        if (targetAcc) {
          if (targetAcc.type === "credit") {
            const limit = targetAcc.credit_limit_cents || 0;
            const used = targetAcc.balance_cents;
            const available = limit - used;

            // Check if total purchase price (including interest) exceeds available limit
            if (limit > 0 && totalCents > available) {
              alert(
                `❌ Cupo Insuficiente: La compra a cuotas por un total de $${(totalCents / 100).toFixed(2)}${interestPct > 0 ? ` (incluyendo ${interestPct}% de interés)` : ""} excede tu cupo disponible en la tarjeta '${targetAcc.name}' ($${(available / 100).toFixed(2)}). En tarjetas de crédito, el cupo debe cubrir el total de la compra más intereses.`,
              );
              return;
            }

            // Retain total purchase amount (with interest) in credit card debt immediately
            const newDebt = used + totalCents;
            await supabase
              .from("finance_accounts")
              .update({ balance_cents: newDebt })
              .eq("id", targetAcc.id);

            // Register expense transaction on card for total purchase with interest
            await supabase.from("finance_transactions").insert([
              {
                user_id: user.id,
                account_id: targetAcc.id,
                type: "EXPENSE",
                amount_cents: totalCents,
                date: startDate,
                category_id: catIdNum,
                description: `Compra a cuotas retenida en límite: ${instName} (${totalInst} cuotas${interestPct > 0 ? `, ${interestPct}% interés` : ""})`,
              },
            ]);
          } else {
            if (targetAcc.balance_cents < instAmountCents) {
              alert(
                `⚠️ Advertencia de Fondos: La cuenta '${targetAcc.name}' tiene $${(targetAcc.balance_cents / 100).toFixed(2)} y la cuota mensual es de $${(instAmountCents / 100).toFixed(2)}.`,
              );
            }
          }
        }
      }

      let { error } = await supabase.from("finance_installments").insert([
        {
          user_id: user.id,
          name: instName,
          total_amount_cents: totalCents,
          total_installments: totalInst,
          paid_installments: 0,
          installment_amount_cents: instAmountCents,
          account_id: instAccountId ? Number(instAccountId) : null,
          category_id: catIdNum,
          start_date: startDate,
          start_month: startMonth,
          payment_day: pDay,
          status: "ACTIVE",
        },
      ]);

      if (error) {
        console.log(
          "Retrying insertion without extra columns if schema mismatch",
        );
        const { error: retryError } = await supabase
          .from("finance_installments")
          .insert([
            {
              user_id: user.id,
              name: instName,
              total_amount_cents: totalCents,
              total_installments: totalInst,
              paid_installments: 0,
              installment_amount_cents: instAmountCents,
              account_id: instAccountId ? Number(instAccountId) : null,
              category_id: catIdNum,
              start_date: startDate,
              status: "ACTIVE",
            },
          ]);
        error = retryError;
      }

      if (error) {
        console.error("Error creating installment:", error);
        alert(`Error al guardar la compra a cuotas: ${error.message}`);
        return;
      }

      setInstName("");
      setInstTotalAmount("");
      setInstTotalInstallments("12");
      setInstAccountId("");
      setInstCategoryId("");
      setInstInterestPercent("");
      setShowInstallmentModal(false);
      fetchFinanceData();
    } catch (err: any) {
      console.error("Unexpected error in handleCreateInstallment:", err);
      alert(`Ocurrió un error inesperado: ${err.message || err}`);
    }
  };

  const handlePayInstallment = async (inst: FinanceInstallment) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const targetAccId = inst.account_id || accounts[0]?.id;
    if (!targetAccId)
      return alert(
        "Debes tener una cuenta registrada para realizar este pago.",
      );

    const targetAcc = accounts.find((a) => a.id === targetAccId);
    if (!targetAcc) return alert("Cuenta no encontrada.");

    if (
      targetAcc.type !== "credit" &&
      targetAcc.balance_cents < inst.installment_amount_cents
    ) {
      setShowAddFundsModal({
        accountId: targetAcc.id,
        accountName: targetAcc.name,
        requiredCents: inst.installment_amount_cents - targetAcc.balance_cents,
      });
      return;
    }

    const nextPaid = inst.paid_installments + 1;
    const newStatus =
      nextPaid >= inst.total_installments ? "COMPLETED" : "ACTIVE";

    await supabase
      .from("finance_installments")
      .update({
        paid_installments: nextPaid,
        status: newStatus,
      })
      .eq("id", inst.id);

    await supabase.from("finance_transactions").insert([
      {
        user_id: user.id,
        account_id: targetAcc.id,
        type: "EXPENSE",
        amount_cents: inst.installment_amount_cents,
        date: new Date().toISOString().split("T")[0],
        category_id: inst.category_id || null,
        description: `Pago cuota ${nextPaid}/${inst.total_installments}: ${inst.name}`,
      },
    ]);

    const newBal =
      targetAcc.type === "credit"
        ? targetAcc.balance_cents + inst.installment_amount_cents
        : Math.max(0, targetAcc.balance_cents - inst.installment_amount_cents);

    await supabase
      .from("finance_accounts")
      .update({ balance_cents: Math.max(0, newBal) })
      .eq("id", targetAcc.id);
    fetchFinanceData();
  };

  const handleDeleteInstallment = async (id: number) => {
    if (!confirm("¿Eliminar esta compra a cuotas?")) return;
    setInstallments((prev) => prev.filter((i) => i.id !== id));
    try {
      await supabase.from("finance_installments").delete().eq("id", id);
    } catch (err) {
      console.error("Error deleting installment:", err);
    }
  };

  const handleDeleteTransaction = async (
    target: any,
    typeParam?: string,
    amountCentsParam?: number,
    accountIdParam?: number,
  ) => {
    let id: number;
    let type: string;
    let amount_cents: number;
    let account_id: number;

    if (typeof target === "object" && target !== null) {
      id = target.id;
      type = target.type;
      amount_cents = target.amount_cents;
      account_id = target.account_id;
    } else {
      id = Number(target);
      type = typeParam || "EXPENSE";
      amount_cents = amountCentsParam || 0;
      account_id = accountIdParam || 0;
    }

    if (
      !confirm("¿Eliminar este movimiento? Se ajustará el saldo de la cuenta.")
    )
      return;

    // Optimistic UI updates
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== account_id) return a;
        let newBalance = a.balance_cents;
        if (a.type === "credit") {
          if (type === "EXPENSE") newBalance -= amount_cents;
          if (type === "INCOME") newBalance += amount_cents;
        } else {
          if (type === "EXPENSE" || type === "TRANSFER_OUT")
            newBalance += amount_cents;
          if (type === "INCOME" || type === "TRANSFER_IN")
            newBalance -= amount_cents;
        }
        return { ...a, balance_cents: Math.max(0, newBalance) };
      }),
    );

    try {
      const currentAcc = accounts.find((a) => a.id === account_id);
      if (currentAcc) {
        let newBalance = currentAcc.balance_cents;
        if (currentAcc.type === "credit") {
          if (type === "EXPENSE") newBalance -= amount_cents;
          if (type === "INCOME") newBalance += amount_cents;
        } else {
          if (type === "EXPENSE" || type === "TRANSFER_OUT")
            newBalance += amount_cents;
          if (type === "INCOME" || type === "TRANSFER_IN")
            newBalance -= amount_cents;
        }
        newBalance = Math.max(0, newBalance);

        await Promise.allSettled([
          supabase
            .from("finance_accounts")
            .update({ balance_cents: newBalance })
            .eq("id", account_id),
          supabase.from("finance_transactions").delete().eq("id", id),
        ]);
      } else {
        await supabase.from("finance_transactions").delete().eq("id", id);
      }
      setSelectedTxDetail(null);
      await fetchFinanceData();
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const isEligible = ["bank", "credit", "debit"].includes(newAccountType);
      const rawBal = Math.abs(parseFloat(newAccountBalance || "0"));
      const balanceCents = Math.round(rawBal * 100);
      const isCredit = newAccountType === "credit";
      const limitCents =
        isCredit && newAccountCreditLimit
          ? Math.round(Math.abs(parseFloat(newAccountCreditLimit)) * 100)
          : null;

      const accountPayload: any = {
        user_id: user.id,
        name: newAccountName,
        type: newAccountType,
        balance_cents: balanceCents,
        credit_limit_cents: limitCents,
        cutoff_day: isCredit ? Number(newAccountCutoffDay) || 15 : null,
        due_day: isCredit ? Number(newAccountDueDay) || 5 : null,
        card_number_last4:
          newAccountType === "credit" || newAccountType === "debit"
            ? newAccountCardLast4
            : null,
        card_color:
          newAccountType === "credit" || newAccountType === "debit"
            ? newAccountCardColor
            : "slate",
        maintenance_fee_type: isEligible ? newAccountMaintFeeType : "none",
        maintenance_fee_value:
          isEligible && newAccountMaintFeeValue
            ? Math.abs(parseFloat(newAccountMaintFeeValue))
            : 0,
        maintenance_fee_freq: isEligible ? newAccountMaintFeeFreq : "monthly",
        maintenance_fee_date: isEligible
          ? newAccountMaintFeeDate || null
          : null,
        transfer_fee_type: isEligible ? newAccountTransferFeeType : "none",
        transfer_fee_value:
          isEligible && newAccountTransferFeeValue
            ? Math.abs(parseFloat(newAccountTransferFeeValue))
            : 0,
      };

      let { error } = await supabase
        .from("finance_accounts")
        .insert([accountPayload]);

      if (
        error &&
        error.message &&
        (error.message.includes("card_number_last4") ||
          error.message.includes("card_color") ||
          error.message.includes("cutoff_day") ||
          error.message.includes("due_day") ||
          error.message.includes("credit_limit_cents") ||
          error.message.includes("maintenance_fee_date"))
      ) {
        console.log(
          "Extended columns not found in database schema, retrying with core columns only.",
        );
        const { error: retryError } = await supabase
          .from("finance_accounts")
          .insert([
            {
              user_id: user.id,
              name: newAccountName,
              type: newAccountType,
              balance_cents: balanceCents,
            },
          ]);
        error = retryError;
      }

      if (error) {
        console.error("Error creating account:", error);
        alert(`Error al crear la cuenta: ${error.message}`);
        return;
      }

      const isCard = newAccountType === "credit" || newAccountType === "debit";

      setNewAccountName("");
      setNewAccountBalance("");
      setNewAccountCreditLimit("");
      setNewAccountCardLast4("");
      setNewAccountMaintFeeType("none");
      setNewAccountMaintFeeValue("");
      setNewAccountMaintFeeFreq("monthly");
      setNewAccountMaintFeeDate("");
      setNewAccountTransferFeeType("none");
      setNewAccountTransferFeeValue("");
      setShowNewAccountExtras(false);
      setShowCreateAccountModal(false);

      fetchFinanceData();

      // Redirect dynamically so the user sees their new account/card instantly
      if (isCard) {
        setActiveTab("debts");
        if (isMobile) {
          setMobileMainTab("more");
          setMobileMoreSubView("debts");
        }
      } else {
        setActiveTab("overview");
        if (isMobile) {
          setMobileMainTab("overview");
          setMobilePlanSubView(null);
          setMobileMoreSubView(null);
        }
      }
    } catch (err: any) {
      console.error("Unexpected error in handleCreateAccount:", err);
      alert(`Ocurrió un error inesperado: ${err.message || err}`);
    }
  };

  const executeDeleteAccount = async (id: number) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setTransactions((prev) => prev.filter((t) => t.account_id !== id));
    try {
      await supabase.from("finance_transactions").delete().eq("account_id", id);
      await supabase.from("finance_accounts").delete().eq("id", id);
    } catch (err) {
      console.error("Error deleting account:", err);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (securityConfig?.require_on_delete && securityConfig?.pin_hash) {
      setDeleteTargetAccountId(id);
      setDeletePinInput("");
      setDeletePinError("");
      setShowDeletePinModal(true);
    } else {
      if (
        !confirm(
          "¿Eliminar esta cuenta? Se eliminarán también sus movimientos.",
        )
      )
        return;
      await executeDeleteAccount(id);
    }
  };

  const handleConfirmDeleteAccountWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletePinError("");
    if (!deleteTargetAccountId || !securityConfig) return;

    if (deletePinInput.length !== 4) {
      setDeletePinError("El PIN debe tener 4 dígitos.");
      return;
    }

    const enteredHash = await hashPin(deletePinInput);
    if (enteredHash !== securityConfig.pin_hash) {
      setDeletePinError("PIN de seguridad incorrecto.");
      return;
    }

    const targetId = deleteTargetAccountId;
    setShowDeletePinModal(false);
    setDeleteTargetAccountId(null);
    setDeletePinInput("");
    await executeDeleteAccount(targetId);
  };

  const openNewCategoryModal = (
    defaultType: "EXPENSE" | "INCOME" = "EXPENSE",
  ) => {
    setEditingCategory(null);
    setCatName("");
    setCatEmoji(defaultType === "INCOME" ? "💼" : "🛒");
    setCatType(defaultType);
    setCatBudgetAmount("");
    setShowCreateCategoryModal(true);
  };

  const openEditCategoryModal = (cat: FinanceCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatEmoji(cat.emoji || "🏷️");
    const isInc = cat.type && cat.type.toUpperCase() === "INCOME";
    setCatType(isInc ? "INCOME" : "EXPENSE");

    const budgetItem = budgetItems.find(
      (b) => b.category_id === cat.id && b.month === selectedBudgetMonth,
    );
    const cents = budgetItem
      ? budgetItem.allocated_cents
      : cat.budget_limit_cents || 0;
    setCatBudgetAmount(cents > 0 ? (cents / 100).toString() : "");
    setShowCreateCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !catName.trim()) return;

    const budgetCents =
      catType === "EXPENSE" && catBudgetAmount
        ? Math.round(parseFloat(catBudgetAmount) * 100)
        : 0;
    let catId = editingCategory?.id;

    if (editingCategory) {
      await supabase
        .from("finance_categories")
        .update({
          name: catName.trim(),
          emoji: catEmoji || "🏷️",
          type: catType,
          budget_limit_cents: budgetCents,
        })
        .eq("id", editingCategory.id);
    } else {
      const { data: insertedCat } = await supabase
        .from("finance_categories")
        .insert([
          {
            user_id: user.id,
            name: catName.trim(),
            emoji: catEmoji || "🏷️",
            type: catType,
            budget_limit_cents: budgetCents,
            is_archived: false,
          },
        ])
        .select()
        .maybeSingle();
      if (insertedCat) catId = insertedCat.id;
    }

    // Sync with budget_items if EXPENSE
    if (catType === "EXPENSE" && catId) {
      const existingBudgetItem = budgetItems.find(
        (b) => b.category_id === catId && b.month === selectedBudgetMonth,
      );
      if (existingBudgetItem) {
        await supabase
          .from("finance_budget_items")
          .update({
            allocated_cents: budgetCents,
            name: catName.trim(),
            icon: catEmoji,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingBudgetItem.id);
      } else if (budgetCents > 0) {
        await supabase.from("finance_budget_items").insert([
          {
            user_id: user.id,
            month: selectedBudgetMonth,
            name: catName.trim(),
            allocated_cents: budgetCents,
            icon: catEmoji,
            color: "#27272a",
            category_id: catId,
          },
        ]);
      }
    }

    setShowCreateCategoryModal(false);
    setEditingCategory(null);
    setCatName("");
    setCatEmoji("🏷️");
    setCatType("EXPENSE");
    setCatBudgetAmount("");
    fetchFinanceData(true);
  };

  const handleDeleteCategory = async (id: number) => {
    if (
      !confirm(
        "¿Eliminar esta categoría? Se desvinculará de tus movimientos y desgloses.",
      )
    )
      return;

    // Optimistic UI update
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setBudgetItems((prev) =>
      prev.map((bi) =>
        bi.category_id === id ? { ...bi, category_id: null } : bi,
      ),
    );
    setTransactions((prev) =>
      prev.map((t) => (t.category_id === id ? { ...t, category_id: null } : t)),
    );

    // Mark user categories as initialized and record deleted category ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`finance_categories_initialized_${user.id}`, "true");
      try {
        const rawDeletedCatIds = localStorage.getItem(
          `finance_deleted_cat_ids_${user.id}`,
        );
        const deletedCatIds: number[] = rawDeletedCatIds
          ? JSON.parse(rawDeletedCatIds)
          : [];
        if (!deletedCatIds.includes(id)) {
          deletedCatIds.push(id);
          localStorage.setItem(
            `finance_deleted_cat_ids_${user.id}`,
            JSON.stringify(deletedCatIds),
          );
        }
      } catch (err) {
        console.error("Error saving deleted cat id:", err);
      }
    }

    try {
      await Promise.allSettled([
        supabase
          .from("finance_budget_items")
          .update({ category_id: null })
          .eq("category_id", id),
        supabase
          .from("finance_transactions")
          .update({ category_id: null })
          .eq("category_id", id),
        supabase
          .from("finance_recurring_transactions")
          .update({ category_id: null })
          .eq("category_id", id),
        supabase
          .from("finance_shopping_items")
          .update({ category_id: null })
          .eq("category_id", id),
      ]);
      await supabase.from("finance_categories").delete().eq("id", id);
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const amountCents = Math.round(parseFloat(budgetAmount) * 100);
    const existingBudget = budgets.find((b) => b.month === selectedBudgetMonth);

    if (existingBudget) {
      await supabase
        .from("finance_budgets")
        .update({ total_amount_cents: amountCents })
        .eq("id", existingBudget.id);
    } else {
      await supabase
        .from("finance_budgets")
        .insert([
          {
            user_id: user.id,
            month: selectedBudgetMonth,
            total_amount_cents: amountCents,
          },
        ]);
    }
    setBudgetAmount("");
    setShowSetTotalBudgetModal(false);
    fetchFinanceData(true);
  };

  const handleSaveBudgetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const amountCents = Math.round(parseFloat(budgetItemAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      alert("Por favor introduce un monto válido mayor a 0.");
      return;
    }

    if (editingBudgetItem) {
      await supabase
        .from("finance_budget_items")
        .update({
          name: budgetItemName,
          allocated_cents: amountCents,
          icon: budgetItemIcon,
          color: budgetItemColor,
          category_id: budgetItemCategoryId
            ? Number(budgetItemCategoryId)
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingBudgetItem.id);
    } else {
      await supabase.from("finance_budget_items").insert([
        {
          user_id: user.id,
          month: selectedBudgetMonth,
          name: budgetItemName,
          allocated_cents: amountCents,
          icon: budgetItemIcon,
          color: budgetItemColor,
          category_id: budgetItemCategoryId
            ? Number(budgetItemCategoryId)
            : null,
        },
      ]);
    }

    setShowBudgetItemModal(false);
    setEditingBudgetItem(null);
    setBudgetItemName("");
    setBudgetItemAmount("");
    setBudgetItemIcon("🏷️");
    setBudgetItemColor("#3b82f6");
    setBudgetItemCategoryId("");
    fetchFinanceData(true);
  };

  const handleDeleteBudgetItem = async (id: number) => {
    if (!confirm("¿Eliminar este desglose del presupuesto?")) return;
    setBudgetItems((prev) => prev.filter((b) => b.id !== id));
    try {
      await supabase.from("finance_budget_items").delete().eq("id", id);
    } catch (err) {
      console.error("Error deleting budget item:", err);
    }
  };

  // --- Month Deletion in Cierre (with optional PIN protection) ---
  const executeDeleteMonth = async (monthKey: string) => {
    // Optimistic UI updates
    setTransactions((prev) => prev.filter((t) => !t.date.startsWith(monthKey)));
    setBudgetItems((prev) => prev.filter((b) => b.month !== monthKey));
    setBudgets((prev) => prev.filter((b) => b.month !== monthKey));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await Promise.allSettled([
        supabase
          .from("finance_transactions")
          .delete()
          .eq("user_id", user.id)
          .gte("date", `${monthKey}-01`)
          .lte("date", `${monthKey}-31`),
        supabase
          .from("finance_budget_items")
          .delete()
          .eq("user_id", user.id)
          .eq("month", monthKey),
        supabase
          .from("finance_budgets")
          .delete()
          .eq("user_id", user.id)
          .eq("month", monthKey),
      ]);
    } catch (err) {
      console.error("Error deleting month data from Supabase:", err);
    }
  };

  const handlePromptDeleteMonth = (
    monthKey: string,
    monthName: string,
    count: number,
  ) => {
    if (securityConfig?.pin_hash) {
      setDeleteTargetMonth({ monthKey, monthName, count });
      setDeleteMonthPinInput("");
      setDeleteMonthPinError("");
      setShowDeleteMonthModal(true);
    } else {
      if (
        confirm(
          `¿Estás seguro de que deseas eliminar permanentemente todos los movimientos y datos del mes ${monthName}? Esta acción no se puede deshacer.`,
        )
      ) {
        executeDeleteMonth(monthKey);
      }
    }
  };

  const handleConfirmDeleteMonthWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteMonthPinError("");
    if (!deleteTargetMonth) return;

    if (securityConfig?.pin_hash) {
      if (deleteMonthPinInput.length !== 4) {
        setDeleteMonthPinError("El PIN debe tener 4 dígitos.");
        return;
      }
      const enteredHash = await hashPin(deleteMonthPinInput);
      if (enteredHash !== securityConfig.pin_hash) {
        setDeleteMonthPinError("PIN de seguridad incorrecto.");
        return;
      }
    }

    const targetKey = deleteTargetMonth.monthKey;
    setShowDeleteMonthModal(false);
    setDeleteTargetMonth(null);
    setDeleteMonthPinInput("");
    await executeDeleteMonth(targetKey);
  };

  const handleQuickExpenseToBudgetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExpenseBudgetItem) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const amountCents = Math.round(parseFloat(txAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return;

    const targetAccount = accounts.find((a) => a.id === Number(txAccountId));
    if (!targetAccount) {
      alert("Por favor selecciona una cuenta válida");
      return;
    }

    const { error: txError } = await supabase
      .from("finance_transactions")
      .insert([
        {
          user_id: user.id,
          account_id: Number(txAccountId),
          category_id: quickExpenseBudgetItem.category_id || null,
          amount_cents: amountCents,
          type: "expense",
          description:
            txDescription || `Gasto en ${quickExpenseBudgetItem.name}`,
          date: new Date().toISOString(),
          status: "completed",
        },
      ]);

    if (!txError) {
      const newBal =
        targetAccount.type === "credit"
          ? targetAccount.balance_cents + amountCents
          : Math.max(0, targetAccount.balance_cents - amountCents);
      await supabase
        .from("finance_accounts")
        .update({ balance_cents: Math.max(0, newBal) })
        .eq("id", targetAccount.id);

      setQuickExpenseBudgetItem(null);
      setTxAmount("");
      setTxDescription("");
      setTxAccountId("");
      fetchFinanceData(true);
    }
  };

  // --- Security Handlers ---
  const handleSaveSecurityPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetPinError("");

    const cleanPin = newPinValue.trim();
    const cleanConfirm = confirmPinValue.trim();

    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setSetPinError("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setSetPinError("Los dos códigos PIN no coinciden.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const pinHash = await hashPin(cleanPin);
    const localKey = `finance_sec_${user.id}`;

    const newSecRecord = {
      user_id: user.id,
      pin_hash: pinHash,
      require_on_enter: securityConfig?.require_on_enter ?? false,
      require_on_delete: securityConfig?.require_on_delete ?? true,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: upserted, error: upsertErr } = await supabase
        .from("finance_security")
        .upsert(newSecRecord, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (upsertErr) {
        console.error("Supabase upsert error:", upsertErr);
        // Fallback direct update or insert
        if (securityConfig?.id) {
          await supabase
            .from("finance_security")
            .update({
              pin_hash: pinHash,
              updated_at: new Date().toISOString(),
            })
            .eq("id", securityConfig.id);
        } else {
          await supabase.from("finance_security").insert([newSecRecord]);
        }
      }

      const finalConfig = upserted || {
        ...(securityConfig || {}),
        ...newSecRecord,
      };
      setSecurityConfig(finalConfig);
      localStorage.setItem(localKey, JSON.stringify(finalConfig));
    } catch (err) {
      console.error("Error saving PIN to Supabase:", err);
      const fallbackConfig = {
        id: securityConfig?.id || 0,
        ...newSecRecord,
      };
      setSecurityConfig(fallbackConfig);
      localStorage.setItem(localKey, JSON.stringify(fallbackConfig));
    }

    setShowSetPinModal(false);
    setNewPinValue("");
    setConfirmPinValue("");
    await fetchFinanceData(true);
  };

  const handleToggleRequireOnEnter = async (val: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const updated = {
      ...(securityConfig || { pin_hash: "" }),
      user_id: user.id,
      require_on_enter: val,
      require_pin_on_entry: val,
      updated_at: new Date().toISOString(),
    };
    setSecurityConfig(updated as any);
    localStorage.setItem(`finance_sec_${user.id}`, JSON.stringify(updated));

    try {
      await supabase.from("finance_security").upsert(
        {
          user_id: user.id,
          pin_hash: updated.pin_hash,
          require_on_enter: val,
          require_on_delete: updated.require_on_delete ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch {
      // silent
    }
  };

  const handleToggleRequireOnDelete = async (val: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const updated = {
      ...(securityConfig || { pin_hash: "" }),
      user_id: user.id,
      require_on_delete: val,
      require_pin_on_delete: val,
      updated_at: new Date().toISOString(),
    };
    setSecurityConfig(updated as any);
    localStorage.setItem(`finance_sec_${user.id}`, JSON.stringify(updated));

    try {
      await supabase.from("finance_security").upsert(
        {
          user_id: user.id,
          pin_hash: updated.pin_hash,
          require_on_enter: updated.require_on_enter ?? false,
          require_on_delete: val,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch {
      // silent
    }
  };

  const handleDisablePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisablePinError("");
    if (!securityConfig) return;

    if (disablePinInput.length !== 4) {
      setDisablePinError("El PIN debe tener 4 dígitos.");
      return;
    }

    const enteredHash = await hashPin(disablePinInput);
    if (enteredHash !== securityConfig.pin_hash) {
      setDisablePinError("PIN incorrecto. No se pudo desactivar la seguridad.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      localStorage.removeItem(`finance_sec_${user.id}`);
      try {
        await supabase.from("finance_security").delete().eq("user_id", user.id);
      } catch {
        if (securityConfig.id) {
          await supabase
            .from("finance_security")
            .delete()
            .eq("id", securityConfig.id);
        }
      }
    }

    setSecurityConfig(null);
    setShowDisablePinModal(false);
    setDisablePinInput("");
    fetchFinanceData(true);
  };

  const handleUnlockModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockPinError("");
    if (!securityConfig || !securityConfig.pin_hash) {
      setIsUnlocked(true);
      return;
    }

    if (lockPinInput.length !== 4) {
      setLockPinError("Ingresa los 4 dígitos del PIN.");
      return;
    }

    const enteredHash = await hashPin(lockPinInput);
    if (enteredHash === securityConfig.pin_hash) {
      setIsUnlocked(true);
      sessionStorage.setItem("finance_unlocked_session", "true");
      setLockPinInput("");
    } else {
      setLockPinError("PIN incorrecto. Intenta de nuevo.");
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("finance_recurring_transactions").insert([
      {
        user_id: user.id,
        type: "EXPENSE",
        amount_cents: Math.round(parseFloat(recAmount) * 100),
        description: recDesc,
        frequency: recFrequency,
        start_date: new Date().toISOString().split("T")[0],
        next_date: recNextDate,
        account_id: recAccountId ? Number(recAccountId) : null,
        category_id: recCategoryId ? Number(recCategoryId) : null,
      },
    ]);
    setRecAmount("");
    setRecDesc("");
    setRecAccountId("");
    setRecCategoryId("");
    fetchFinanceData();
  };

  const handleProcessRecurring = async (rec: FinanceRecurringTransaction) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const targetAccId = rec.account_id || accounts[0]?.id;
    if (!targetAccId)
      return alert(
        "Necesitas tener al menos una cuenta para registrar el pago.",
      );

    const today = new Date().toISOString().split("T")[0];

    await supabase.from("finance_transactions").insert([
      {
        user_id: user.id,
        account_id: targetAccId,
        type: rec.type || "EXPENSE",
        amount_cents: rec.amount_cents,
        date: today,
        category_id: rec.category_id || null,
        description: `Cobro recurrente: ${rec.description || "Suscripción"}`,
      },
    ]);

    const currAcc = accounts.find((a) => a.id === targetAccId);
    if (currAcc) {
      const newBalance =
        rec.type === "INCOME"
          ? currAcc.balance_cents + rec.amount_cents
          : Math.max(0, currAcc.balance_cents - rec.amount_cents);
      await supabase
        .from("finance_accounts")
        .update({ balance_cents: Math.max(0, newBalance) })
        .eq("id", targetAccId);
    }

    if (
      (rec.frequency as string) === "once" ||
      (rec.frequency as string) === "ONCE"
    ) {
      await supabase
        .from("finance_recurring_transactions")
        .delete()
        .eq("id", rec.id);
    } else {
      const currentNext = new Date(rec.next_date || today);
      if (rec.frequency === "weekly")
        currentNext.setDate(currentNext.getDate() + 7);
      else if (rec.frequency === "yearly")
        currentNext.setFullYear(currentNext.getFullYear() + 1);
      else currentNext.setMonth(currentNext.getMonth() + 1);

      const newNextDateStr = currentNext.toISOString().split("T")[0];
      await supabase
        .from("finance_recurring_transactions")
        .update({ next_date: newNextDateStr })
        .eq("id", rec.id);
    }

    fetchFinanceData();
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!confirm("¿Eliminar esta suscripción / pago recurrente?")) return;
    setRecurring((prev) => prev.filter((r) => r.id !== id));
    try {
      await supabase
        .from("finance_recurring_transactions")
        .delete()
        .eq("id", id);
    } catch (err) {
      console.error("Error deleting recurring transaction:", err);
    }
  };

  // --- Savings Goal Calculation Helpers ---
  const roundToNearest5Cents = (amount: number): number => {
    return Math.round(amount * 20) / 20;
  };

  const calculateSavingsCuota = (
    targetCents: number,
    currentCents: number,
    targetDateStr?: string,
    frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" = "MONTHLY",
    customContribCents?: number,
  ) => {
    const remainingCents = Math.max(0, targetCents - currentCents);
    if (remainingCents <= 0) return { cuota: 0, periods: 0, daysRemaining: 0 };

    if (!targetDateStr) {
      if (customContribCents && customContribCents > 0) {
        const periods = Math.max(
          1,
          Math.ceil(remainingCents / customContribCents),
        );
        const cuota = customContribCents / 100;
        let daysPerPeriod = 30;
        if (frequency === "WEEKLY") daysPerPeriod = 7;
        else if (frequency === "BIWEEKLY") daysPerPeriod = 14;
        const daysRemaining = periods * daysPerPeriod;
        return { cuota, periods, daysRemaining, isIndefinite: true };
      }
      return {
        cuota: null,
        periods: null,
        daysRemaining: null,
        isIndefinite: true,
      };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const targetDate = new Date(targetDateStr);
    const diffTime = targetDate.getTime() - now.getTime();
    const daysRemaining = Math.max(
      1,
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
    );

    let daysPerPeriod = 30;
    if (frequency === "WEEKLY") daysPerPeriod = 7;
    else if (frequency === "BIWEEKLY") daysPerPeriod = 14;

    const periods = Math.max(1, Math.ceil(daysRemaining / daysPerPeriod));
    const rawCuota = remainingCents / 100 / periods;
    const cuota = roundToNearest5Cents(rawCuota);

    return { cuota, periods, daysRemaining, isIndefinite: false };
  };

  const calculateEstimatedCompletionDate = (goal: FinanceSavingsGoal) => {
    if (
      goal.is_completed ||
      goal.current_amount_cents >= goal.target_amount_cents
    ) {
      return { isCompleted: true, text: "¡Meta alcanzada!" };
    }

    const remainingCents = goal.target_amount_cents - goal.current_amount_cents;

    // Calculate based on contribution pace so far
    if (goal.current_amount_cents > 0) {
      const createdAt = goal.created_at
        ? new Date(goal.created_at)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysElapsed = Math.max(
        1,
        Math.ceil(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const centsPerDay = goal.current_amount_cents / daysElapsed;
      if (centsPerDay > 0) {
        const daysNeeded = Math.ceil(remainingCents / centsPerDay);
        const estimatedDate = new Date();
        estimatedDate.setDate(now.getDate() + daysNeeded);
        return {
          isCompleted: false,
          dateFormatted: estimatedDate.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          daysNeeded,
          basedOnPace: true,
        };
      }
    }

    // If custom contribution is defined for indefinite goals
    if (goal.custom_contribution_cents && goal.custom_contribution_cents > 0) {
      const daysPerPeriod =
        goal.frequency === "WEEKLY"
          ? 7
          : goal.frequency === "BIWEEKLY"
            ? 14
            : 30;
      const periodsNeeded = Math.ceil(
        remainingCents / goal.custom_contribution_cents,
      );
      const daysNeeded = periodsNeeded * daysPerPeriod;
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);
      return {
        isCompleted: false,
        dateFormatted: estimatedDate.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        daysNeeded,
        periodsNeeded,
        basedOnCustomContribution: true,
      };
    }

    // If target_date is set, show estimated completion date from schedule
    if (goal.target_date) {
      const now = new Date();
      const targetDate = new Date(goal.target_date);
      const daysNeeded = Math.max(
        0,
        Math.ceil(
          (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      return {
        isCompleted: false,
        dateFormatted: targetDate.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        daysNeeded,
        basedOnPace: false,
      };
    }

    return null;
  };

  const handleCreateSavingsGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) {
      alert("Por favor, ingresa el nombre de la meta.");
      return;
    }

    const rawAmount = parseFloat(goalTargetAmount);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      alert("Por favor, ingresa un monto objetivo válido mayor a 0.");
      return;
    }

    const amountCents = Math.round(rawAmount * 100);
    const customContribRaw = parseFloat(goalCustomContribution);
    const customContribCents =
      !isNaN(customContribRaw) && customContribRaw > 0
        ? Math.round(customContribRaw * 100)
        : undefined;
    const tempId = Date.now();

    const newGoalObj: FinanceSavingsGoal = {
      id: tempId,
      user_id: "local",
      name: goalName.trim(),
      target_amount_cents: amountCents,
      current_amount_cents: 0,
      target_date: goalTargetDate ? goalTargetDate : undefined,
      custom_contribution_cents: customContribCents,
      frequency: (goalFrequency || "MONTHLY") as any,
      is_completed: false,
      created_at: new Date().toISOString(),
    };

    // Immediate optimistic state update
    setSavingsGoals((prev) => [newGoalObj, ...prev]);

    setGoalName("");
    setGoalTargetAmount("");
    setGoalTargetDate("");
    setGoalCustomContribution("");
    setGoalFrequency("MONTHLY");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("finance_savings_goals")
          .insert([
            {
              user_id: user.id,
              name: newGoalObj.name,
              target_amount_cents: amountCents,
              current_amount_cents: 0,
              target_date: goalTargetDate ? goalTargetDate : null,
              custom_contribution_cents: customContribCents || null,
              frequency: goalFrequency || "MONTHLY",
            },
          ])
          .select();

        if (!error && data && data.length > 0) {
          setSavingsGoals((prev) =>
            prev.map((g) => (g.id === tempId ? data[0] : g)),
          );
        }
      }
    } catch (err) {
      console.error("Error inserting savings goal:", err);
    }
  };

  const handleDeleteGoal = async (id: number | string) => {
    if (!confirm("¿Eliminar esta meta de ahorro?")) return;
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await supabase.from("finance_savings_goals").delete().eq("id", id);
    } catch (err) {
      console.error("Error deleting goal:", err);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showContributeModal) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (!contributeAccountId) {
      alert("Por favor, selecciona una cuenta o tarjeta de origen.");
      return;
    }

    const amountCents = Math.round(parseFloat(contributeAmount) * 100);
    const goal = savingsGoals.find((g) => g.id === showContributeModal);
    if (!goal) return;

    const targetAcc = accounts.find(
      (a) => a.id === Number(contributeAccountId),
    );
    if (!targetAcc) {
      alert("La cuenta de origen no pudo ser encontrada.");
      return;
    }

    if (targetAcc.balance_cents < amountCents) {
      // Insufficient funds: prompt to add funds directly!
      setShowAddFundsModal({
        accountId: targetAcc.id,
        accountName: targetAcc.name,
        requiredCents: amountCents - targetAcc.balance_cents,
      });
      setShowContributeModal(null);
      return;
    }

    await supabase.from("finance_savings_contributions").insert([
      {
        user_id: user.id,
        goal_id: showContributeModal,
        amount_cents: amountCents,
        date: new Date().toISOString().split("T")[0],
      },
    ]);

    await supabase
      .from("finance_savings_goals")
      .update({
        current_amount_cents: goal.current_amount_cents + amountCents,
      })
      .eq("id", goal.id);

    await supabase.from("finance_transactions").insert([
      {
        user_id: user.id,
        account_id: targetAcc.id,
        type: "EXPENSE",
        amount_cents: amountCents,
        date: new Date().toISOString().split("T")[0],
        description: `Aporte a meta: ${goal.name}`,
      },
    ]);

    await supabase
      .from("finance_accounts")
      .update({
        balance_cents: Math.max(0, targetAcc.balance_cents - amountCents),
      })
      .eq("id", targetAcc.id);

    setContributeAmount("");
    setContributeAccountId("");
    setShowContributeModal(null);
    fetchFinanceData();
  };

  const handleCreateShoppingList = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !newListName.trim()) return;

    await supabase
      .from("finance_shopping_lists")
      .insert([{ user_id: user.id, name: newListName }]);
    setNewListName("");
    fetchFinanceData();
  };

  const handleAddShoppingItem = async (e: React.FormEvent, listId: number) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const itemName = newItemNames[listId];
    if (!user || !itemName?.trim()) return;

    const qty = Math.max(
      1,
      parseInt(newItemQuantities[listId] || "1", 10) || 1,
    );
    const rawPrice = newItemPrices[listId] || "0";
    const priceCents = Math.round(Math.max(0, parseFloat(rawPrice) || 0) * 100);

    await supabase.from("finance_shopping_items").insert([
      {
        user_id: user.id,
        list_id: listId,
        name: itemName.trim(),
        quantity: qty,
        price_cents: priceCents,
      },
    ]);

    setNewItemNames((prev) => ({ ...prev, [listId]: "" }));
    setNewItemQuantities((prev) => ({ ...prev, [listId]: "1" }));
    setNewItemPrices((prev) => ({ ...prev, [listId]: "" }));
    fetchFinanceData();
  };

  const handleDeleteShoppingItem = async (itemId: number) => {
    setShoppingItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await supabase.from("finance_shopping_items").delete().eq("id", itemId);
    } catch (err) {
      console.error("Error deleting shopping item:", err);
    }
  };

  const handleToggleShoppingItem = async (item: FinanceShoppingItem) => {
    setShoppingItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_purchased: !item.is_purchased } : i,
      ),
    );
    try {
      await supabase
        .from("finance_shopping_items")
        .update({ is_purchased: !item.is_purchased })
        .eq("id", item.id);
    } catch (err) {
      console.error("Error toggling shopping item:", err);
    }
  };

  const handleDeleteShoppingList = async (listId: number) => {
    if (!confirm("¿Eliminar esta lista?")) return;
    setShoppingLists((prev) => prev.filter((l) => l.id !== listId));
    setShoppingItems((prev) => prev.filter((i) => i.list_id !== listId));
    try {
      await supabase
        .from("finance_shopping_items")
        .delete()
        .eq("list_id", listId);
      await supabase.from("finance_shopping_lists").delete().eq("id", listId);
    } catch (err) {
      console.error("Error deleting shopping list:", err);
    }
  };

  const handleToggleArchiveShoppingList = async (list: FinanceShoppingList) => {
    setShoppingLists((prev) =>
      prev.map((l) =>
        l.id === list.id ? { ...l, is_archived: !list.is_archived } : l,
      ),
    );
    try {
      await supabase
        .from("finance_shopping_lists")
        .update({ is_archived: !list.is_archived })
        .eq("id", list.id);
    } catch (err) {
      console.error("Error toggling archive shopping list:", err);
    }
  };

  const handleResetShoppingList = async (listId: number) => {
    if (
      !confirm(
        "¿Restablecer esta lista? Se eliminarán todos los artículos actuales para comenzar limpia.",
      )
    )
      return;
    setShoppingItems((prev) => prev.filter((i) => i.list_id !== listId));
    try {
      await supabase
        .from("finance_shopping_items")
        .delete()
        .eq("list_id", listId);
    } catch (err) {
      console.error("Error resetting shopping list:", err);
    }
  };

  const handleOpenLoadExpenseModal = (list: FinanceShoppingList) => {
    const listItems = shoppingItems.filter(
      (i) => i.list_id === list.id && i.is_purchased,
    );
    if (listItems.length === 0) return;

    const defaultCategory =
      categories.find(
        (c) =>
          c.name.toLowerCase().includes("super") ||
          c.name.toLowerCase().includes("compra"),
      ) || categories[0];

    setShowLoadExpenseModal(list);
    setLoadExpenseAccountId(accounts[0]?.id ? String(accounts[0].id) : "");
    setLoadExpenseCategoryId(
      defaultCategory?.id ? String(defaultCategory.id) : "",
    );
    setLoadExpenseDescription(`Compra: ${list.name}`);
    setLoadExpenseDate(new Date().toISOString().split("T")[0]);
  };

  const handleConfirmLoadExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !showLoadExpenseModal || !loadExpenseAccountId) return;

    const list = showLoadExpenseModal;
    const purchasedItems = shoppingItems.filter(
      (i) => i.list_id === list.id && i.is_purchased,
    );
    const totalBoughtCents = purchasedItems.reduce(
      (acc, item) => acc + (item.quantity || 1) * (item.price_cents || 0),
      0,
    );

    if (totalBoughtCents <= 0) {
      alert(
        "El monto total comprado debe ser mayor a $0 para registrar el gasto.",
      );
      return;
    }

    const accId = parseInt(loadExpenseAccountId, 10);
    const targetAcc = accounts.find((a) => a.id === accId);
    if (!targetAcc) {
      alert("Por favor selecciona una cuenta válida.");
      return;
    }

    // 1. Insert transaction
    await supabase.from("finance_transactions").insert([
      {
        user_id: user.id,
        account_id: accId,
        category_id: loadExpenseCategoryId
          ? parseInt(loadExpenseCategoryId, 10)
          : null,
        type: "EXPENSE",
        amount_cents: totalBoughtCents,
        date: loadExpenseDate || new Date().toISOString().split("T")[0],
        description: loadExpenseDescription.trim() || `Compra: ${list.name}`,
      },
    ]);

    // 2. Update account balance
    await supabase
      .from("finance_accounts")
      .update({
        balance_cents: Math.max(0, targetAcc.balance_cents - totalBoughtCents),
      })
      .eq("id", accId);

    // 3. Reset checkmarks on items in this list
    const purchasedIds = purchasedItems.map((i) => i.id);
    if (purchasedIds.length > 0) {
      await supabase
        .from("finance_shopping_items")
        .update({ is_purchased: false })
        .in("id", purchasedIds);
    }

    setShowLoadExpenseModal(null);
    fetchFinanceData();
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !debtName.trim() || !debtAmount) return;

    const amountCents = Math.round(parseFloat(debtAmount) * 100);
    await supabase.from("finance_debts").insert([
      {
        user_id: user.id,
        name: debtName,
        type: debtType,
        amount_cents: amountCents,
        remaining_cents: amountCents,
        due_date: debtDueDate || null,
      },
    ]);
    setDebtName("");
    setDebtAmount("");
    setDebtDueDate("");
    fetchFinanceData();
  };

  const handlePayDebtConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayDebtModal || !payDebtAmount) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const amountCents = Math.round(parseFloat(payDebtAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return alert("Monto inválido");

    const debt = showPayDebtModal;
    const newRemaining = Math.max(0, debt.remaining_cents - amountCents);
    await supabase
      .from("finance_debts")
      .update({ remaining_cents: newRemaining })
      .eq("id", debt.id);

    if (payDebtAccountId) {
      const targetAcc = accounts.find((a) => a.id === Number(payDebtAccountId));
      if (targetAcc) {
        const isOwe = debt.type === "OWE";
        const txType = isOwe ? "EXPENSE" : "INCOME";
        const newBalance = isOwe
          ? Math.max(0, targetAcc.balance_cents - amountCents)
          : targetAcc.balance_cents + amountCents;

        await supabase.from("finance_transactions").insert([
          {
            user_id: user.id,
            account_id: targetAcc.id,
            type: txType,
            amount_cents: amountCents,
            date: new Date().toISOString().split("T")[0],
            description: `${isOwe ? "Abono a deuda" : "Cobro de préstamo"}: ${debt.name}`,
          },
        ]);

        await supabase
          .from("finance_accounts")
          .update({ balance_cents: Math.max(0, newBalance) })
          .eq("id", targetAcc.id);
      }
    }

    setShowPayDebtModal(null);
    setPayDebtAmount("");
    setPayDebtAccountId("");
    fetchFinanceData();
  };

  const handleDeleteDebt = async (debtId: number) => {
    if (!confirm("¿Eliminar este registro de deuda/préstamo?")) return;
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    try {
      await supabase.from("finance_debts").delete().eq("id", debtId);
    } catch (err) {
      console.error("Error deleting debt:", err);
    }
  };

  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;

    const amountCents = Math.round(parseFloat(editDebtAmount) * 100);
    const remainingCents = Math.round(parseFloat(editDebtRemaining) * 100);

    await supabase
      .from("finance_debts")
      .update({
        name: editDebtName,
        type: editDebtType,
        amount_cents: amountCents,
        remaining_cents: remainingCents,
        due_date: editDebtDueDate || null,
      })
      .eq("id", editingDebt.id);

    setEditingDebt(null);
    fetchFinanceData();
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const rawBal = Math.abs(parseFloat(editAccountBalance || "0"));
    const balanceCents = Math.round(rawBal * 100);
    const limitCents =
      editAccountType === "credit" && editAccountCreditLimit
        ? Math.round(Math.abs(parseFloat(editAccountCreditLimit)) * 100)
        : null;
    const isEligible = ["bank", "credit", "debit"].includes(editAccountType);

    await supabase
      .from("finance_accounts")
      .update({
        name: editAccountName,
        type: editAccountType,
        balance_cents: balanceCents,
        card_color: editAccountCardColor,
        credit_limit_cents: limitCents,
        cutoff_day:
          editAccountType === "credit" && editAccountCutoffDay
            ? Number(editAccountCutoffDay)
            : null,
        due_day:
          editAccountType === "credit" && editAccountDueDay
            ? Number(editAccountDueDay)
            : null,
        card_number_last4:
          editAccountType === "credit" || editAccountType === "debit"
            ? editAccountCardNumberLast4 || null
            : null,
        maintenance_fee_type: isEligible ? editAccountMaintFeeType : "none",
        maintenance_fee_value:
          isEligible && editAccountMaintFeeValue
            ? Math.abs(parseFloat(editAccountMaintFeeValue))
            : 0,
        maintenance_fee_freq: isEligible ? editAccountMaintFeeFreq : "monthly",
        maintenance_fee_date: isEligible
          ? editAccountMaintFeeDate || null
          : null,
        transfer_fee_type: isEligible ? editAccountTransferFeeType : "none",
        transfer_fee_value:
          isEligible && editAccountTransferFeeValue
            ? Math.abs(parseFloat(editAccountTransferFeeValue))
            : 0,
      })
      .eq("id", editingAccount.id);

    setEditingAccount(null);
    fetchFinanceData();
  };

  // Prevent negative sign and exponential notation in numeric inputs across all financial forms
  const blockNegativeKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
      e.preventDefault();
    }
  };

  // --- Render Helpers ---
  const getAccountIcon = (type: string) => {
    switch (type) {
      case "bank":
        return <Landmark className="w-5 h-5" />;
      case "wallet":
        return <Wallet className="w-5 h-5" />;
      case "cash":
        return <Banknote className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const handleMouseDownDragScroll = (e: React.MouseEvent<HTMLDivElement>) => {
    const slider = e.currentTarget;
    let startX = e.pageX - slider.offsetLeft;
    let scrollLeft = slider.scrollLeft;

    const onMouseMove = (ev: MouseEvent) => {
      const x = ev.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const renderTabs = () => (
    <div
      onMouseDown={handleMouseDownDragScroll}
      className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 mb-6 overflow-x-auto no-scrollbar pb-px select-none cursor-grab active:cursor-grabbing"
    >
      {[
        { id: "overview", icon: LayoutDashboard, label: "Resumen" },
        { id: "transactions", icon: ListOrdered, label: "Movimientos" },
        { id: "budgets", icon: PieChart, label: "Presupuestos" },
        { id: "planning", icon: CalendarDays, label: "Planificación" },
        { id: "savings", icon: CheckCircle2, label: "Metas" },
        { id: "shopping", icon: ShoppingCart, label: "Compras" },
        { id: "debts", icon: Banknote, label: "Deudas" },
        { id: "stats", icon: BarChart3, label: "Análisis" },
        { id: "closing", icon: Archive, label: "Cierre" },
        { id: "settings", icon: Settings, label: "Ajustes" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="finance-active-tab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-gray-100"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );

  const renderMobileTopNav = () => (
    <div className="w-full grid grid-cols-4 border-b border-gray-200 dark:border-zinc-800 mb-4 select-none bg-white dark:bg-[#0a0a0a]">
      {[
        { id: "overview", label: "Resumen", icon: LayoutDashboard },
        { id: "transactions", label: "Movimientos", icon: ListOrdered },
        { id: "planning", label: "Planificar", icon: CalendarDays },
        { id: "more", label: "Más", icon: Layers },
      ].map((tab) => {
        const isActive = mobileMainTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id === "overview") {
                setMobileMainTab("overview");
                setActiveTab("overview");
                setMobilePlanSubView(null);
                setMobileMoreSubView(null);
              } else if (tab.id === "transactions") {
                setMobileMainTab("transactions");
                setActiveTab("transactions");
                setMobilePlanSubView(null);
                setMobileMoreSubView(null);
              } else if (tab.id === "planning") {
                setMobileMainTab("planning");
                setMobilePlanSubView(null);
              } else if (tab.id === "more") {
                setMobileMainTab("more");
                setMobileMoreSubView(null);
              }
            }}
            className={`relative flex flex-col items-center justify-center py-2.5 px-1 text-xs font-semibold transition-colors ${
              isActive
                ? "text-gray-900 dark:text-white"
                : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
            }`}
          >
            <tab.icon className="w-4 h-4 mb-1 shrink-0" />
            <span className="text-[11px] leading-tight truncate">{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="finance-mobile-active-tab"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-gray-900 dark:bg-white rounded-full"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  // Helper to format short date for transactions (e.g., "2 sep")
  const formatTxDateShort = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthNames = [
          "ene", "feb", "mar", "abr", "may", "jun",
          "jul", "ago", "sep", "oct", "nov", "dic"
        ];
        return `${day} ${monthNames[monthIndex] || ""}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper to format payment date badge (e.g. { day: "17", month: "SEP" })
  const formatPaymentDateBadge = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthNames = [
          "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
          "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
        ];
        return {
          day: String(day),
          month: monthNames[monthIndex] || "---",
        };
      }
    } catch {
      // fallback
    }
    return { day: "--", month: "---" };
  };

  // Upcoming payments calculation for Mobile Overview (compromisos próximos sin alterar balance)
  const upcomingPayments = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      amount_cents: number;
      dateStr: string;
      source: "subscription" | "installment" | "debt";
      subLabel?: string;
    }> = [];

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();

    // 1. Recurring / Subscriptions (active and non-income)
    recurring.forEach((r) => {
      if (r.is_active === false || r.type === "INCOME") return;
      const targetDate = r.next_date || r.start_date || todayStr;
      const cat = categories.find((c) => c.id === r.category_id);
      list.push({
        id: `rec-${r.id}`,
        name: r.description || cat?.name || "Suscripción",
        amount_cents: r.amount_cents,
        dateStr: targetDate,
        source: "subscription",
        subLabel: "Suscripción",
      });
    });

    // 2. Active Installments (cuotas pendientes)
    installments.forEach((inst) => {
      if (inst.status !== "ACTIVE" || inst.paid_installments >= inst.total_installments) return;
      const pDay = inst.payment_day || parseInt(inst.start_date.substring(8, 10), 10) || 15;
      let targetDate: string;
      if (pDay >= todayDay) {
        const mm = String(todayMonth + 1).padStart(2, "0");
        const dd = String(pDay).padStart(2, "0");
        targetDate = `${todayYear}-${mm}-${dd}`;
      } else {
        const nextMonthDate = new Date(todayYear, todayMonth + 1, pDay);
        targetDate = nextMonthDate.toISOString().split("T")[0];
      }
      list.push({
        id: `inst-${inst.id}`,
        name: inst.name,
        amount_cents: inst.installment_amount_cents,
        dateStr: targetDate,
        source: "installment",
        subLabel: `Cuota ${inst.paid_installments + 1}/${inst.total_installments}`,
      });
    });

    // 3. Debts to pay (OWE)
    debts.forEach((d) => {
      if (d.type === "OWE" && !d.is_archived && d.remaining_cents > 0 && d.due_date) {
        list.push({
          id: `debt-${d.id}`,
          name: d.name,
          amount_cents: d.remaining_cents,
          dateStr: d.due_date,
          source: "debt",
          subLabel: "Compromiso de pago",
        });
      }
    });

    // Sort ascending by dateStr
    list.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    // Show upcoming (today or future), or nearest if none in the future
    const upcomingOrToday = list.filter((item) => item.dateStr >= todayStr);
    const finalItems = upcomingOrToday.length > 0 ? upcomingOrToday : list;

    return finalItems.slice(0, 3);
  }, [recurring, installments, debts, categories]);

  // REDESIGNED DEBTS MEMOS (Fase 5)
  const totalDebtsCents = useMemo(() => {
    const cardDebts = accounts
      .filter((a) => a.type === "credit")
      .reduce((acc, a) => acc + Math.max(0, a.balance_cents), 0);
    const loanDebts = debts
      .filter((d) => d.type === "OWE" && !d.is_archived)
      .reduce((acc, d) => acc + d.remaining_cents, 0);
    const instDebts = installments
      .filter((i) => i.status === "ACTIVE")
      .reduce((acc, i) => acc + Math.max(0, (i.total_installments - i.paid_installments) * i.installment_amount_cents), 0);
    return cardDebts + loanDebts + instDebts;
  }, [accounts, debts, installments]);

  const totalOwedToMeCents = useMemo(() => {
    return debts
      .filter((d) => d.type === "OWED" && !d.is_archived)
      .reduce((acc, d) => acc + d.remaining_cents, 0);
  }, [debts]);

  const totalPaidCents = useMemo(() => {
    const loanPaid = debts
      .filter((d) => d.type === "OWE" && !d.is_archived)
      .reduce((acc, d) => acc + (d.amount_cents - d.remaining_cents), 0);
    const instPaid = installments
      .reduce((acc, i) => acc + (i.paid_installments * i.installment_amount_cents), 0);
    return loanPaid + instPaid;
  }, [debts, installments]);

  const nextDebtPayment = useMemo(() => {
    const list: Array<{
      name: string;
      amount_cents: number;
      dateStr: string;
      type: "installment" | "debt" | "card_due";
    }> = [];

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDay = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();

    // Installments
    installments.forEach((inst) => {
      if (inst.status !== "ACTIVE" || inst.paid_installments >= inst.total_installments) return;
      const pDay = inst.payment_day || 15;
      let targetDate: string;
      if (pDay >= todayDay) {
        const mm = String(todayMonth + 1).padStart(2, "0");
        const dd = String(pDay).padStart(2, "0");
        targetDate = `${todayYear}-${mm}-${dd}`;
      } else {
        const nextMonthDate = new Date(todayYear, todayMonth + 1, pDay);
        targetDate = nextMonthDate.toISOString().split("T")[0];
      }
      list.push({
        name: inst.name,
        amount_cents: inst.installment_amount_cents,
        dateStr: targetDate,
        type: "installment",
      });
    });

    // Loans/Debts we owe
    debts.forEach((d) => {
      if (d.type === "OWE" && !d.is_archived && d.remaining_cents > 0 && d.due_date) {
        list.push({
          name: d.name,
          amount_cents: d.remaining_cents,
          dateStr: d.due_date,
          type: "debt",
        });
      }
    });

    // Credit cards payment dates
    accounts.forEach((a) => {
      if (a.type === "credit" && a.balance_cents > 0 && a.due_day) {
        let targetDate: string;
        if (a.due_day >= todayDay) {
          const mm = String(todayMonth + 1).padStart(2, "0");
          const dd = String(a.due_day).padStart(2, "0");
          targetDate = `${todayYear}-${mm}-${dd}`;
        } else {
          const nextMonthDate = new Date(todayYear, todayMonth + 1, a.due_day);
          targetDate = nextMonthDate.toISOString().split("T")[0];
        }
        list.push({
          name: `Pago ${a.name}`,
          amount_cents: a.balance_cents,
          dateStr: targetDate,
          type: "card_due",
        });
      }
    });

    if (list.length === 0) return null;
    list.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    return list[0];
  }, [installments, debts, accounts]);

  const renderMobileDebts = () => {
    // 1. Compile active creditors for "¿A quién debo?"
    const creditors: string[] = [];
    accounts.forEach(a => {
      if (a.type === "credit" && a.balance_cents > 0) {
        creditors.push(a.name);
      }
    });
    debts.forEach(d => {
      if (d.type === "OWE" && !d.is_archived && d.remaining_cents > 0) {
        creditors.push(d.name);
      }
    });
    installments.forEach(i => {
      if (i.status === "ACTIVE" && (i.total_installments - i.paid_installments) > 0) {
        creditors.push(i.name);
      }
    });

    const totalOriginallyOwed = totalDebtsCents + totalPaidCents;
    const paidPercentage = totalOriginallyOwed > 0 ? Math.round((totalPaidCents / totalOriginallyOwed) * 100) : 0;

    return (
      <div className="space-y-6 pb-32 animate-in fade-in duration-200">
        {/* QUESTION: ¿Cuánto debo? & ¿Cuánto he pagado? & ¿Cuánto me falta? */}
        <div className="bg-zinc-950 dark:bg-[#121212] text-white border border-transparent rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {/* Subtle background visual touch */}
          <div className="absolute right-0 top-0 -mt-4 -mr-4 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] tracking-widest font-black uppercase text-zinc-400">
              Deuda Total Pendiente
            </span>
            <button
              type="button"
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
              title={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
            >
              {isPrivacyMode ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-4xl font-black tracking-tight text-white mb-6">
            {isPrivacyMode ? "••••" : formatCurrency(totalDebtsCents)}
          </div>

          {/* PROGRESS: ¿Cuánto he pagado? & ¿Cuánto me falta? */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center text-[11px] font-bold text-zinc-300">
              <span>Progreso de Liquidación</span>
              <span>{paidPercentage}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 pt-1">
              <div>
                <span className="block text-zinc-500 uppercase font-bold text-[8px] tracking-wider">Total pagado</span>
                <span className="font-bold text-emerald-400">
                  {isPrivacyMode ? "••••" : formatCurrency(totalPaidCents)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-zinc-500 uppercase font-bold text-[8px] tracking-wider">Total restante</span>
                <span className="font-bold text-white">
                  {isPrivacyMode ? "••••" : formatCurrency(totalDebtsCents)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* METRICS ROW (Me deben & Disponible) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs">
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 block uppercase font-bold tracking-wider mb-1">
              Me deben (Préstamos)
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {isPrivacyMode ? "••••" : formatCurrency(totalOwedToMeCents)}
            </span>
          </div>
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs">
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 block uppercase font-bold tracking-wider mb-1">
              Capacidad Libre Crédito
            </span>
            <span className="text-base font-extrabold text-zinc-800 dark:text-zinc-200">
              {(() => {
                const totalCreditLimit = accounts
                  .filter((a) => a.type === "credit")
                  .reduce((acc, a) => acc + (a.credit_limit_cents || 0), 0);
                const totalCreditDebt = accounts
                  .filter((a) => a.type === "credit")
                  .reduce((acc, a) => acc + Math.max(0, a.balance_cents), 0);
                const freeCredit = totalCreditLimit - totalCreditDebt;
                return isPrivacyMode ? "••••" : formatCurrency(Math.max(0, freeCredit));
              })()}
            </span>
          </div>
        </div>

        {/* QUESTION: ¿A quién debo? */}
        <div className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-200/60 dark:border-zinc-800/50 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿A quién le debo actualmente?</span>
          </div>
          {creditors.length === 0 ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              🎉 ¡A nadie! Estás al corriente con todas tus cuentas y deudas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {Array.from(new Set(creditors)).map((c, idx) => (
                <span
                  key={idx}
                  className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-zinc-950 text-gray-800 dark:text-zinc-250 border border-gray-200/60 dark:border-zinc-800 rounded-xl shadow-3xs flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* QUESTION: ¿Cuál es mi próximo pago? */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-1 block">
            Próximo vencimiento
          </span>
          {nextDebtPayment ? (
            <div className="bg-zinc-900 dark:bg-zinc-950 text-white border border-transparent rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-white/5 pointer-events-none">
                <CalendarDays className="w-16 h-16" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-xl">
                    {nextDebtPayment.type === "card_due" ? (
                      <CreditCard className="w-4 h-4 text-white" />
                    ) : nextDebtPayment.type === "installment" ? (
                      <Layers className="w-4 h-4 text-white" />
                    ) : (
                      <Banknote className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white truncate max-w-[160px]">
                      {nextDebtPayment.name}
                    </h4>
                    <span className="text-[10px] text-zinc-400 capitalize">
                      {nextDebtPayment.type === "card_due"
                        ? "Pago Tarjeta"
                        : nextDebtPayment.type === "installment"
                        ? "Cuota Fina."
                        : "Préstamo"}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold bg-white/10 text-white px-2.5 py-1 rounded-full border border-white/5 shadow-2xs">
                  {(() => {
                    const diff = Math.ceil(
                      (new Date(nextDebtPayment.dateStr + "T12:00:00").getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    if (diff === 0) return "Hoy";
                    if (diff === 1) return "Mañana";
                    if (diff < 0) return "Vencido";
                    return `En ${diff} días`;
                  })()}
                </span>
              </div>

              <div className="flex justify-between items-end pt-2 border-t border-white/5">
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">Fecha de pago</p>
                  <p className="text-xs font-bold text-zinc-200">
                    {formatTxDateShort(nextDebtPayment.dateStr)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">Importe de cuota</p>
                  <p className="text-xl font-black text-white">
                    {isPrivacyMode ? "••••" : formatCurrency(nextDebtPayment.amount_cents)}
                  </p>
                </div>
              </div>

              {/* ACTION: Pagar directo desde próximo vencimiento card */}
              <button
                type="button"
                onClick={() => {
                  if (nextDebtPayment.type === "installment") {
                    const inst = installments.find((i) => i.name === nextDebtPayment.name);
                    if (inst) handlePayInstallment(inst);
                  } else if (nextDebtPayment.type === "debt") {
                    const d = debts.find((x) => x.name === nextDebtPayment.name);
                    if (d) {
                      setShowPayDebtModal(d);
                      setPayDebtAmount("");
                      setPayDebtAccountId("");
                    }
                  } else if (nextDebtPayment.type === "card_due") {
                    const card = accounts.find(
                      (a) => a.name === nextDebtPayment.name.replace("Pago ", ""),
                    );
                    if (card) {
                      setShowPayCardModal(card);
                    }
                  }
                }}
                className="w-full min-h-[44px] flex items-center justify-center bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-black transition-colors shadow-xs animate-in fade-in"
              >
                Registrar Pago de esta Cuota
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800/80 rounded-2xl p-5 text-center">
              <p className="text-xs text-gray-500 dark:text-zinc-505 font-medium">
                Sin compromisos de pago en agenda activa 🎉
              </p>
            </div>
          )}
        </div>

        {/* CONVENIENT INTERACTIVE ACTION BAR (iOS/Android Native Style) */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-1 block">
            Acciones rápidas
          </span>
          <div className="grid grid-cols-3 gap-2 bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800/80 p-2.5 rounded-2xl shadow-3xs">
            <button
              onClick={() => {
                setNewAccountType("credit");
                setShowCreateAccountModal(true);
              }}
              className="flex flex-col items-center justify-center py-2 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all group min-h-[44px]"
            >
              <div className="p-2 bg-zinc-100 dark:bg-zinc-850 rounded-full group-hover:scale-105 transition-transform">
                <CreditCard className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
              </div>
              <span className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300 mt-1.5 text-center">
                Nueva Tarjeta
              </span>
            </button>
            
            <button
              onClick={() => {
                setDebtType("OWE");
                setDebtName("");
                setDebtAmount("");
                setDebtDueDate("");
                setShowAddDebtInline(true);
                setDebtSubTab("loans");
              }}
              className="flex flex-col items-center justify-center py-2 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all group min-h-[44px]"
            >
              <div className="p-2 bg-zinc-100 dark:bg-zinc-850 rounded-full group-hover:scale-105 transition-transform">
                <Banknote className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
              </div>
              <span className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300 mt-1.5 text-center">
                Préstamo
              </span>
            </button>

            <button
              onClick={() => {
                setShowInstallmentModal(true);
                setDebtSubTab("installments");
              }}
              className="flex flex-col items-center justify-center py-2 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all group min-h-[44px]"
            >
              <div className="p-2 bg-zinc-100 dark:bg-zinc-850 rounded-full group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
              </div>
              <span className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300 mt-1.5 text-center">
                Compra Cuotas
              </span>
            </button>
          </div>
        </div>

        {/* SEGMENTED SUB-TABS (Pills) */}
        <div className="flex p-1 bg-gray-150/80 dark:bg-[#121212] border border-gray-200/40 dark:border-zinc-800/60 rounded-2xl">
          <button
            type="button"
            onClick={() => setDebtSubTab("cards")}
            className={`flex-1 text-xs font-black py-2.5 rounded-xl transition-all ${
              debtSubTab === "cards"
                ? "bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white"
                : "text-gray-400 dark:text-zinc-500 hover:text-gray-900"
            }`}
          >
            Tarjetas
          </button>
          <button
            type="button"
            onClick={() => setDebtSubTab("loans")}
            className={`flex-1 text-xs font-black py-2.5 rounded-xl transition-all ${
              debtSubTab === "loans"
                ? "bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white"
                : "text-gray-400 dark:text-zinc-500 hover:text-gray-900"
            }`}
          >
            Préstamos
          </button>
          <button
            type="button"
            onClick={() => setDebtSubTab("installments")}
            className={`flex-1 text-xs font-black py-2.5 rounded-xl transition-all ${
              debtSubTab === "installments"
                ? "bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white"
                : "text-gray-400 dark:text-zinc-500 hover:text-gray-900"
            }`}
          >
            Cuotas
          </button>
        </div>

        {/* 4. TAB CONTENTS */}
        {debtSubTab === "cards" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-gray-400 dark:text-zinc-500">
                Límites y plásticos
              </span>
              <button
                type="button"
                onClick={() => {
                  setNewAccountType("credit");
                  setShowCreateAccountModal(true);
                }}
                className="text-[11px] font-bold text-gray-905 dark:text-white flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>

            {accounts.filter(a => a.type === "credit" || a.type === "debit").length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl space-y-2">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-500">No tienes tarjetas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts
                  .filter(a => a.type === "credit" || a.type === "debit")
                  .map((card) => {
                    const isCredit = card.type === "credit";
                    const limit = card.credit_limit_cents || 0;
                    const debtBalance = Math.abs(card.balance_cents);
                    const availableCents = isCredit ? limit - debtBalance : card.balance_cents;
                    const usedPct = isCredit && limit > 0 ? Math.min(100, Math.round((debtBalance / limit) * 100)) : 0;
                    
                    return (
                      <div
                        key={card.id}
                        className="relative overflow-hidden bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] tracking-wider font-bold uppercase text-gray-400 dark:text-zinc-500 block">
                              {isCredit ? "Crédito" : "Débito"}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                              {card.name}
                            </h3>
                          </div>
                          <span className="font-mono text-[10px] text-gray-500 bg-gray-50 dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800/80 px-2 py-0.5 rounded-md">
                            •••• {card.card_number_last4 || "4242"}
                          </span>
                        </div>

                        {isCredit ? (
                          <div className="space-y-3 pt-2.5 border-t border-gray-100 dark:border-zinc-800/80">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-gray-50 dark:bg-zinc-900/40 p-2 rounded-xl">
                                <span className="text-[9px] text-gray-400 dark:text-zinc-500 block uppercase font-semibold">
                                  Deuda actual
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(debtBalance)}
                                </span>
                              </div>
                              <div className="bg-gray-50 dark:bg-zinc-900/40 p-2 rounded-xl">
                                <span className="text-[9px] text-gray-400 dark:text-zinc-500 block uppercase font-semibold">
                                  Cupo disponible
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(availableCents)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-gray-400 dark:text-zinc-500 font-semibold">
                                <span>Límite utilizado</span>
                                <span>{usedPct}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300"
                                  style={{ width: `${usedPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                              <span>Corte: Día {card.cutoff_day || "N/A"}</span>
                              <span>Pago: Día {card.due_day || "N/A"}</span>
                            </div>

                            {debtBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowPayCardModal(card)}
                                className="w-full flex items-center justify-center min-h-[44px] bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 rounded-xl text-xs font-bold transition-all shadow-sm mt-1"
                              >
                                Abonar a Tarjeta
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex justify-between items-center">
                            <div>
                              <span className="text-[9px] text-gray-400 dark:text-zinc-500 block uppercase font-semibold">
                                Saldo disponible
                              </span>
                              <p className="text-base font-bold text-gray-900 dark:text-white">
                                {formatCurrency(card.balance_cents)}
                              </p>
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                              Líquido
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {debtSubTab === "loans" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-gray-400 dark:text-zinc-500">
                Yo debo / Me deben
              </span>
              <button
                type="button"
                onClick={() => setShowAddDebtInline(!showAddDebtInline)}
                className="text-[11px] font-bold text-gray-905 dark:text-white flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg"
              >
                {showAddDebtInline ? "Cerrar" : "+ Registrar"}
              </button>
            </div>

            {showAddDebtInline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 p-4 rounded-2xl space-y-4 overflow-hidden"
              >
                <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-zinc-900 border border-gray-200/40 dark:border-zinc-850 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDebtType("OWE")}
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${debtType === "OWE" ? "bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white" : "text-gray-400"}`}
                  >
                    Yo debo
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtType("OWED")}
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${debtType === "OWED" ? "bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white" : "text-gray-400"}`}
                  >
                    Me deben
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Nombre / Persona
                  </label>
                  <input
                    required
                    type="text"
                    value={debtName}
                    onChange={(e) => setDebtName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Monto Total
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">$</span>
                    </div>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      onKeyDown={blockNegativeKeys}
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Fecha límite (Opcional)
                  </label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={async (e) => {
                    await handleAddDebt(e);
                    setShowAddDebtInline(false);
                  }}
                  className="w-full min-h-[44px] bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  Registrar Compromiso
                </button>
              </motion.div>
            )}

            {debts.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl space-y-2">
                <Banknote className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-500">No hay deudas personales registradas</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {debts.map((debt) => {
                  const isOwed = debt.type === "OWED";
                  const paidAmount = debt.amount_cents - debt.remaining_cents;
                  const progress = Math.min(100, Math.round((paidAmount / debt.amount_cents) * 100));

                  return (
                    <div
                      key={debt.id}
                      className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${isOwed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-gray-900 text-white dark:bg-white dark:text-gray-900"}`}>
                              {isOwed ? "Me deben" : "Debo"}
                            </span>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[140px]">
                              {debt.name}
                            </h3>
                          </div>
                          {debt.due_date && (
                            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>Límite: {formatTxDateShort(debt.due_date)}</span>
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-semibold">Restante</p>
                          <p className="font-black text-sm text-gray-900 dark:text-white">
                            {formatCurrency(debt.remaining_cents)}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="h-1 bg-gray-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 dark:text-zinc-500">
                          <span>Pagado: {formatCurrency(paidAmount)}</span>
                          <span>{progress}%</span>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100/50 dark:border-zinc-800/50">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDebt(debt);
                              setEditDebtName(debt.name);
                              setEditDebtType(debt.type);
                              setEditDebtAmount((debt.amount_cents / 100).toString());
                              setEditDebtRemaining((debt.remaining_cents / 100).toString());
                              setEditDebtDueDate(debt.due_date || "");
                            }}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-850 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-850 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {debt.remaining_cents > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPayDebtModal(debt);
                              setPayDebtAmount("");
                              setPayDebtAccountId("");
                            }}
                            className="text-xs font-bold bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Abonar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {debtSubTab === "installments" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-gray-400 dark:text-zinc-500">
                Compras Diferidas (Cuotas)
              </span>
              <button
                type="button"
                onClick={() => setShowInstallmentModal(true)}
                className="text-[11px] font-bold text-gray-905 dark:text-white flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>

            {installments.filter(i => i.status === "ACTIVE").length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl space-y-2">
                <Layers className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-500">No tienes compras diferidas activas</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {installments
                  .filter(i => i.status === "ACTIVE")
                  .map((inst) => {
                    const remainingInstallments = inst.total_installments - inst.paid_installments;
                    const remainingCents = remainingInstallments * inst.installment_amount_cents;
                    const paidCents = inst.paid_installments * inst.installment_amount_cents;
                    const progress = Math.min(100, Math.round((inst.paid_installments / inst.total_installments) * 100));
                    const backedAccount = accounts.find(a => a.id === inst.account_id);

                    return (
                      <div
                        key={inst.id}
                        className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[150px]">
                              {inst.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
                              Respaldo: {backedAccount ? backedAccount.name : "Cuenta General"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-semibold block">Próxima cuota</span>
                            <span className="font-extrabold text-sm text-gray-950 dark:text-white">
                              {formatCurrency(inst.installment_amount_cents)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-gray-50/50 dark:bg-zinc-900/30 p-2 rounded-xl">
                          <div>
                            <span className="text-gray-400 block font-medium">Pagado</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paidCents)}</span>
                          </div>
                          <div className="border-l border-gray-100 dark:border-zinc-800 pl-3">
                            <span className="text-gray-400 block font-medium">Falta</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(remainingCents)}</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="h-1 bg-gray-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-gray-400 dark:text-zinc-500">
                            <span>Cuotas pagadas: {inst.paid_installments}/{inst.total_installments}</span>
                            <span>{progress}%</span>
                          </div>
                        </div>

                        {/* Payment / Delete actions */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-gray-100/50 dark:border-zinc-800/50">
                          <button
                            type="button"
                            onClick={() => handleDeleteInstallment(inst.id)}
                            className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-850 rounded-lg transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {remainingInstallments > 0 && (
                            <button
                              type="button"
                              onClick={() => handlePayInstallment(inst)}
                              className="text-xs font-bold bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-3 py-1.5 rounded-lg transition-all"
                            >
                              Pagar Cuota
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMobileOverview = () => {
    const netMonthCents = incomeThisMonth - expensesThisMonth;

    return (
      <div className="space-y-4 pb-32 animate-in fade-in duration-200">
        {/* 1. BALANCE PRINCIPAL */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Balance total
            </span>
            <button
              type="button"
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-colors cursor-pointer"
              title={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
              aria-label={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
            >
              {isPrivacyMode ? (
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-1.5">
            {formatCurrency(totalBalanceCents)}
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Disponible entre tus cuentas
          </p>
        </div>

        {/* 2. RESUMEN DEL MES */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 px-1">
            Este mes
          </span>
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3">
            {/* Ingresos & Gastos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Ingresos</span>
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  {formatCurrency(incomeThisMonth)}
                </div>
              </div>

              <div className="space-y-1 border-l border-gray-100 dark:border-zinc-800/80 pl-4">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Gastos</span>
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  {formatCurrency(expensesThisMonth)}
                </div>
              </div>
            </div>

            {/* Disponible del período */}
            <div className="border-t border-gray-100 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                Disponible
              </span>
              <span
                className={`text-sm font-bold tracking-tight ${
                  netMonthCents >= 0
                    ? "text-gray-900 dark:text-white"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {formatCurrency(netMonthCents)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. ACCIONES RÁPIDAS */}
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => {
              setTxType("EXPENSE");
              setShowTxModal(true);
            }}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4 text-red-400 dark:text-red-500 shrink-0" />
            <span>Gasto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTxType("INCOME");
              setShowTxModal(true);
            }}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 text-gray-900 dark:text-white rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Ingreso</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMobileTransferMenu(!showMobileTransferMenu)}
              className="w-11 min-h-[44px] flex items-center justify-center bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
              title="Más acciones"
              aria-label="Más acciones rápidas"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMobileTransferMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMobileTransferMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-40 w-48 bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg p-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTransferMenu(false);
                      setTxType("TRANSFER_OUT");
                      setShowTxModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-gray-500 dark:text-zinc-400 shrink-0" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 4. PRÓXIMOS PAGOS */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Próximos pagos
            </span>
            <button
              type="button"
              onClick={() => {
                setMobileMainTab("planning");
                setMobilePlanSubView("calendar");
                setActiveTab("planning");
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Ver todos
            </button>
          </div>

          {upcomingPayments.length === 0 ? (
            <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl text-center">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                No tienes pagos próximos.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl divide-y divide-gray-100 dark:divide-zinc-800/70 shadow-sm overflow-hidden">
              {upcomingPayments.map((item) => {
                const dateInfo = formatPaymentDateBadge(item.dateStr);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.source === "subscription") {
                        setMobileMainTab("planning");
                        setMobilePlanSubView("subscriptions");
                        setActiveTab("planning");
                      } else if (item.source === "installment") {
                        setMobileMainTab("planning");
                        setMobilePlanSubView("installments");
                        setActiveTab("planning");
                      } else if (item.source === "debt") {
                        setMobileMainTab("more");
                        setMobileMoreSubView("debts");
                        setActiveTab("debts");
                      } else {
                        setMobileMainTab("planning");
                        setMobilePlanSubView("calendar");
                        setActiveTab("planning");
                      }
                    }}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors text-left cursor-pointer min-h-[48px]"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-10 text-center shrink-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                          {dateInfo.day}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase leading-tight tracking-wider">
                          {dateInfo.month}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        {item.subLabel && (
                          <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                            {item.subLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.amount_cents)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. MOVIMIENTOS RECIENTES */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Movimientos recientes
            </span>
            <button
              type="button"
              onClick={() => {
                setMobileMainTab("transactions");
                setActiveTab("transactions");
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Ver todos
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl text-center space-y-2">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Aún no tienes movimientos.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTxType("EXPENSE");
                  setShowTxModal(true);
                }}
                className="text-xs font-semibold text-gray-900 dark:text-white underline hover:opacity-80 cursor-pointer"
              >
                Registrar movimiento
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200/90 dark:border-zinc-800 rounded-2xl divide-y divide-gray-100 dark:divide-zinc-800/70 shadow-sm overflow-hidden">
              {transactions.slice(0, 4).map((tx) => {
                const isExpense = tx.type === "EXPENSE" || tx.type === "TRANSFER_OUT";
                const cat = categories.find((c) => c.id === tx.category_id);
                const acc = accounts.find((a) => a.id === tx.account_id);
                const title = tx.description || cat?.name || "Movimiento";
                const dateShort = formatTxDateShort(tx.date);
                const accName = acc?.name || "Cuenta";

                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setMobileMainTab("transactions");
                      setActiveTab("transactions");
                    }}
                    className="flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer min-h-[48px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="text-xs font-bold shrink-0">
                        {isExpense ? (
                          <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {title}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">
                          {accName} · {dateShort}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-sm font-semibold shrink-0 ${
                        isExpense
                          ? "text-gray-900 dark:text-white"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(tx.amount_cents)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {!isUnlocked ? (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-sm bg-white dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mx-auto text-gray-800 dark:text-gray-200">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                    Módulo Protegido
                  </h2>
                  <p className="text-xs text-gray-500">
                    Ingresa tu PIN de 4 dígitos para acceder a tus finanzas.
                  </p>
                </div>

                <form onSubmit={handleUnlockModule} className="space-y-4">
                  <div className="space-y-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      pattern="\d{4}"
                      autoFocus
                      required
                      value={lockPinInput}
                      onChange={(e) =>
                        setLockPinInput(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="••••"
                      className="w-full text-center text-2xl tracking-widest font-mono py-2.5 px-4 bg-gray-50 dark:bg-[#181818] border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100"
                    />
                    {lockPinError && (
                      <p className="text-xs font-semibold text-red-500 dark:text-red-400 flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {lockPinError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold text-sm rounded-xl transition-all"
                  >
                    Desbloquear Finanzas
                  </button>
                </form>
              </motion.div>
            </div>
          ) : (
            <>
              {isMobile ? renderMobileTopNav() : renderTabs()}

              {financialAlerts.length > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Avisos de Fondos y Crédito ({financialAlerts.length})
                    </div>
                    <button
                      onClick={() => setFinancialAlerts([])}
                      className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                    >
                      Entendido / Limpiar
                    </button>
                  </div>
                  <ul className="space-y-1.5 pl-1">
                    {financialAlerts.map((alert, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-amber-900 dark:text-amber-200 font-medium flex items-start gap-1.5"
                      >
                        <span className="shrink-0 text-amber-600">•</span>
                        <span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={effectiveTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {/* Mobile Hierarchical Back Header: Planificar */}
                  {isMobile && mobileMainTab === "planning" && mobilePlanSubView && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setMobilePlanSubView(null)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-1.5 py-1 px-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Planificar</span>
                      </button>
                      <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {getPlanSubViewTitle(mobilePlanSubView)}
                      </h2>
                    </div>
                  )}

                  {/* Mobile Hierarchical Back Header: Más */}
                  {isMobile && mobileMainTab === "more" && mobileMoreSubView && !["accounts", "categories", "security", "settings", "closing"].includes(mobileMoreSubView) && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setMobileMoreSubView(null)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-1.5 py-1 px-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Más</span>
                      </button>
                      <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {getMoreSubViewTitle(mobileMoreSubView)}
                      </h2>
                    </div>
                  )}

                  {/* MOBILE PLANIFICAR MENU */}
                  {effectiveTab === "planning_menu" && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                          Planificar
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Organiza tu dinero, límites mensuales y próximos compromisos.
                        </p>
                      </div>

                      {/* SECTION 1: PRESUPUESTO */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
                          Presupuesto
                        </span>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMobilePlanSubView("budgets");
                            }}
                            className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-2xl transition-all text-left shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-800 dark:text-zinc-200 shrink-0">
                                <PieChart className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                  Presupuestos
                                </div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                  Límites mensuales y categorías de gasto
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0 ml-2" />
                          </button>
                        </div>
                      </div>

                      {/* SECTION 2: PAGOS Y COMPROMISOS */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
                          Pagos y Compromisos
                        </span>
                        <div className="space-y-2">
                          {[
                            {
                              id: "calendar",
                              label: "Calendario de pagos",
                              subtitle: "Vencimientos y fechas clave del mes",
                              icon: CalendarDays,
                            },
                            {
                              id: "subscriptions",
                              label: "Suscripciones",
                              subtitle: `Servicios y cargos recurrentes (${recurring.length})`,
                              icon: Calendar,
                            },
                            {
                              id: "installments",
                              label: "Cuotas",
                              subtitle: `Compras diferidas y avance (${installments.length})`,
                              icon: Layers,
                            },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setMobilePlanSubView(item.id as any);
                                if (item.id === "calendar") setPlanningSubTab("calendar");
                                if (item.id === "subscriptions") setPlanningSubTab("subscriptions");
                                if (item.id === "installments") setPlanningSubTab("installments");
                              }}
                              className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-2xl transition-all text-left shadow-2xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-800 dark:text-zinc-200 shrink-0">
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {item.label}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                    {item.subtitle}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0 ml-2" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* SECTION 3: OBJETIVOS Y COMPRAS */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-1">
                          Objetivos y Compras
                        </span>
                        <div className="space-y-2">
                          {[
                            {
                              id: "savings",
                              label: "Metas de ahorro",
                              subtitle: `Fondos y objetivos futuros (${savingsGoals.length})`,
                              icon: CheckCircle2,
                            },
                            {
                              id: "shopping",
                              label: "Listas de compras",
                              subtitle: `Artículos y listas pendientes (${shoppingLists.filter(l => !l.is_archived).length})`,
                              icon: ShoppingCart,
                            },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setMobilePlanSubView(item.id as any);
                              }}
                              className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-2xl transition-all text-left shadow-2xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-800 dark:text-zinc-200 shrink-0">
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {item.label}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                    {item.subtitle}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0 ml-2" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MOBILE MÁS MENU */}
                  {effectiveTab === "more_menu" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                          Más
                        </h2>
                      </div>

                      {/* FINANZAS SECTION */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-gray-400 dark:text-zinc-500 px-1 block">
                          FINANZAS
                        </span>
                        <div className="space-y-2">
                          {[
                            { id: "debts", label: "Deudas y tarjetas", icon: Banknote },
                            { id: "stats", label: "Análisis financiero", icon: BarChart3 },
                            { id: "closing", label: "Cierre y reportes", icon: Archive },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setMobileNavigationSource("more");
                                setMobileMoreSubView(item.id as any);
                              }}
                              className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-2xl transition-all text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-300 shrink-0">
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.label}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* GESTIÓN SECTION */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-gray-400 dark:text-zinc-500 px-1 block">
                          GESTIÓN
                        </span>
                        <div className="space-y-2">
                          {[
                            { id: "accounts", label: "Cuentas", icon: Wallet },
                            { id: "categories", label: "Categorías", icon: ListOrdered },
                            { id: "security", label: "Seguridad", icon: ShieldCheck },
                            { id: "settings", label: "Ajustes", icon: Settings },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setMobileNavigationSource("more");
                                setMobileMoreSubView(item.id as any);
                              }}
                              className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-zinc-900/60 border border-gray-200/90 dark:border-zinc-800 rounded-2xl transition-all text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-300 shrink-0">
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.label}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OVERVIEW TAB */}
                  {effectiveTab === "overview" && (
                    isMobile ? (
                      renderMobileOverview()
                    ) : (
                      <div className="space-y-8">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Balance Total
                            </h2>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {formatCurrency(totalBalanceCents)}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setIsPrivacyMode(!isPrivacyMode)
                                  }
                                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  title={
                                    isPrivacyMode
                                      ? "Mostrar montos"
                                      : "Ocultar montos"
                                  }
                                >
                                  {isPrivacyMode ? (
                                    <EyeOffIcon className="w-5 h-5" />
                                  ) : (
                                    <EyeIcon className="w-5 h-5" />
                                  )}
                                </button>

                                <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 mx-1"></div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setIncludeAvailableCredit(
                                      !includeAvailableCredit,
                                    )
                                  }
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer shrink-0"
                                  title="Incluir crédito disponible en el balance total"
                                >
                                  <div
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                                      includeAvailableCredit
                                        ? "bg-primary"
                                        : "bg-gray-300 dark:bg-zinc-700"
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out scale-75 ${
                                        includeAvailableCredit
                                          ? "translate-x-3"
                                          : "translate-x-0"
                                      }`}
                                    />
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowCreditInfoModal(true)}
                                  className="p-1.5 text-gray-400 hover:text-primary rounded-full transition-colors"
                                  title="¿Qué hace este interruptor?"
                                >
                                  <HelpCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm">
                          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />{" "}
                            Ingresos mes
                          </h2>
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(incomeThisMonth)}
                          </div>
                        </div>
                        <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm">
                          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />{" "}
                            Gastos mes
                          </h2>
                          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(expensesThisMonth)}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-4">
                        <button
                          onClick={() => {
                            setTxType("EXPENSE");
                            setShowTxModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm"
                        >
                          <TrendingDown className="w-5 h-5" /> Gasto
                        </button>
                        <button
                          onClick={() => {
                            setTxType("INCOME");
                            setShowTxModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors shadow-sm border border-gray-200 dark:border-zinc-800"
                        >
                          <TrendingUp className="w-5 h-5" /> Ingreso
                        </button>
                        <button
                          onClick={() => {
                            setTxType("TRANSFER_OUT");
                            setShowTxModal(true);
                          }}
                          className="flex-1 hidden sm:flex items-center justify-center gap-2 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors shadow-sm border border-gray-200 dark:border-zinc-800"
                        >
                          <ArrowRightLeft className="w-5 h-5" /> Transferir
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Tx */}
                        <div className="lg:col-span-2 space-y-4">
                          <h3 className="text-lg font-semibold">
                            Gastos recientes
                          </h3>
                          {transactions.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                              No hay movimientos recientes.
                            </p>
                          ) : (
                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                              {transactions.slice(0, 5).map((tx) => (
                                <div
                                  key={tx.id}
                                  className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800/50 last:border-0"
                                >
                                  <div className="flex items-center gap-4">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "EXPENSE" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : tx.type === "INCOME" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" : "bg-blue-50 dark:bg-blue-500/10 text-blue-500"}`}
                                    >
                                      {tx.type === "EXPENSE" ? (
                                        <TrendingDown className="w-5 h-5" />
                                      ) : tx.type === "INCOME" ? (
                                        <TrendingUp className="w-5 h-5" />
                                      ) : (
                                        <ArrowRightLeft className="w-5 h-5" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {tx.description ||
                                          categories.find(
                                            (c) => c.id === tx.category_id,
                                          )?.name ||
                                          "Movimiento"}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {
                                          accounts.find(
                                            (a) => a.id === tx.account_id,
                                          )?.name
                                        }{" "}
                                        • {tx.date}
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={`font-semibold ${tx.type === "EXPENSE" || tx.type === "TRANSFER_OUT" ? "text-gray-900 dark:text-white" : "text-emerald-600 dark:text-emerald-400"}`}
                                  >
                                    {tx.type === "EXPENSE" ||
                                    tx.type === "TRANSFER_OUT"
                                      ? "-"
                                      : "+"}
                                    {formatCurrency(tx.amount_cents)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Budget Preview */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Presupuesto {currentMonthName}
                          </h3>
                          <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm">
                            {currentBudget ? (
                              <>
                                <div className="flex justify-between text-sm mb-3">
                                  <span className="text-gray-500">Gastado</span>
                                  <span className="font-medium">
                                    {formatCurrency(expensesThisMonth)}{" "}
                                    <span className="text-gray-400 font-normal">
                                      /{" "}
                                      {formatCurrency(
                                        currentBudget.total_amount_cents,
                                      )}
                                    </span>
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                                  <div
                                    className={`h-full rounded-full ${budgetProgress > 90 ? "bg-red-500" : budgetProgress > 75 ? "bg-amber-500" : "bg-gray-900 dark:bg-gray-100"}`}
                                    style={{ width: `${budgetProgress}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-right text-gray-500">
                                  {budgetProgress}% utilizado
                                </p>
                              </>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-sm text-gray-500 mb-3">
                                  No has definido un presupuesto para este mes.
                                </p>
                                <button
                                  onClick={() => {
                                    setActiveTab("budgets");
                                    if (isMobile) {
                                      setMobileMainTab("planning");
                                      setMobilePlanSubView("budgets");
                                    }
                                  }}
                                  className="text-gray-900 dark:text-white text-sm font-medium hover:underline"
                                >
                                  Crear presupuesto
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                  {/* TRANSACTIONS TAB */}
                  {effectiveTab === "transactions" && (() => {
                    const filtered = transactions.filter((tx) => {
                      if (txFilterType !== "ALL" && tx.type !== txFilterType)
                        return false;
                      if (
                        txFilterAccount !== "ALL" &&
                        tx.account_id !== txFilterAccount
                      )
                        return false;
                      if (
                        txFilterCategory !== "ALL" &&
                        tx.category_id !== txFilterCategory
                      )
                        return false;
                      if (txFilterSearch.trim() !== "") {
                        const searchLower = txFilterSearch.toLowerCase();
                        const catName =
                          categories.find((c) => c.id === tx.category_id)
                            ?.name || "";
                        const accName =
                          accounts.find((a) => a.id === tx.account_id)?.name ||
                          "";
                        const desc = tx.description || "";
                        if (
                          !desc.toLowerCase().includes(searchLower) &&
                          !catName.toLowerCase().includes(searchLower) &&
                          !accName.toLowerCase().includes(searchLower)
                        ) {
                          return false;
                        }
                      }

                      const txDateObj = parseLocalDate(tx.date);
                      const now = new Date();
                      if (txFilterDateRange === "THIS_MONTH") {
                        if (
                          txDateObj.getMonth() !== now.getMonth() ||
                          txDateObj.getFullYear() !== now.getFullYear()
                        )
                          return false;
                      } else if (txFilterDateRange === "LAST_MONTH") {
                        const lastMonth = new Date(
                          now.getFullYear(),
                          now.getMonth() - 1,
                          1,
                        );
                        if (
                          txDateObj.getMonth() !== lastMonth.getMonth() ||
                          txDateObj.getFullYear() !== lastMonth.getFullYear()
                        )
                          return false;
                      } else if (txFilterDateRange === "THIS_YEAR") {
                        if (txDateObj.getFullYear() !== now.getFullYear())
                          return false;
                      }

                      return true;
                    });

                    // Sort descending: newest date first, highest ID first
                    const sortedTxs = [...filtered].sort((a, b) => {
                      const da = new Date(a.date).getTime();
                      const db = new Date(b.date).getTime();
                      if (db !== da) return db - da;
                      return b.id - a.id;
                    });

                    // Group by clean date string (YYYY-MM-DD)
                    const groupsMap = new Map<string, FinanceTransaction[]>();
                    sortedTxs.forEach((tx) => {
                      const cleanDate = tx.date.split("T")[0];
                      if (!groupsMap.has(cleanDate)) {
                        groupsMap.set(cleanDate, []);
                      }
                      groupsMap.get(cleanDate)!.push(tx);
                    });

                    const groupsList: { dateKey: string; label: string; items: FinanceTransaction[] }[] = [];
                    groupsMap.forEach((items, dateKey) => {
                      groupsList.push({
                        dateKey,
                        label: getFriendlyDateHeader(dateKey),
                        items,
                      });
                    });

                    const activeFilterCount =
                      (txFilterType !== "ALL" ? 1 : 0) +
                      (txFilterAccount !== "ALL" ? 1 : 0) +
                      (txFilterCategory !== "ALL" ? 1 : 0) +
                      (txFilterDateRange !== "THIS_MONTH" ? 1 : 0) +
                      (txFilterSearch.trim() !== "" ? 1 : 0);

                    return (
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                              Movimientos
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:block">
                              Historial de ingresos, gastos y transferencias
                            </p>
                          </div>
                          <button
                            onClick={() => setShowNewTxTypeSheet(true)}
                            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Nuevo</span>
                          </button>
                        </div>

                        {/* Search & Filter Trigger Bar */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Buscar movimientos..."
                              value={txFilterSearch}
                              onChange={(e) => setTxFilterSearch(e.target.value)}
                              className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-all"
                            />
                            {txFilterSearch && (
                              <button
                                onClick={() => setTxFilterSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-1"
                              >
                                <XIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => setShowMobileTxFilters(true)}
                            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors shrink-0 ${
                              activeFilterCount > 0
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-sm"
                                : "bg-gray-50 dark:bg-[#121212] text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Filtros</span>
                            {activeFilterCount > 0 && (
                              <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                activeFilterCount > 0
                                  ? "bg-emerald-500 text-white"
                                  : "bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200"
                              }`}>
                                {activeFilterCount}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Active Filter Chips (visible only when filters are active) */}
                        {activeFilterCount > 0 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                            {txFilterType !== "ALL" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                                <span>Tipo:</span>
                                <b>
                                  {txFilterType === "EXPENSE"
                                    ? "Gastos"
                                    : txFilterType === "INCOME"
                                      ? "Ingresos"
                                      : "Transferencias"}
                                </b>
                                <button
                                  onClick={() => setTxFilterType("ALL")}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 ml-0.5"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              </span>
                            )}

                            {txFilterAccount !== "ALL" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                                <span>Cuenta:</span>
                                <b>
                                  {accounts.find((a) => a.id === txFilterAccount)?.name ||
                                    "Cuenta"}
                                </b>
                                <button
                                  onClick={() => setTxFilterAccount("ALL")}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 ml-0.5"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              </span>
                            )}

                            {txFilterCategory !== "ALL" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                                <span>Cat:</span>
                                <b>
                                  {categories.find((c) => c.id === txFilterCategory)?.name ||
                                    "Categoría"}
                                </b>
                                <button
                                  onClick={() => setTxFilterCategory("ALL")}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 ml-0.5"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              </span>
                            )}

                            {txFilterDateRange !== "THIS_MONTH" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                                <span>Periodo:</span>
                                <b>
                                  {txFilterDateRange === "LAST_MONTH"
                                    ? "Mes anterior"
                                    : txFilterDateRange === "THIS_YEAR"
                                      ? "Este año"
                                      : "Todo"}
                                </b>
                                <button
                                  onClick={() => setTxFilterDateRange("THIS_MONTH")}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 ml-0.5"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              </span>
                            )}

                            {txFilterSearch && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                                <span>Buscar:</span>
                                <b>"{txFilterSearch}"</b>
                                <button
                                  onClick={() => setTxFilterSearch("")}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 ml-0.5"
                                >
                                  <XIcon className="w-3 h-3" />
                                </button>
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setTxFilterType("ALL");
                                setTxFilterAccount("ALL");
                                setTxFilterCategory("ALL");
                                setTxFilterDateRange("THIS_MONTH");
                                setTxFilterSearch("");
                              }}
                              className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white px-2 py-1 underline"
                            >
                              Limpiar
                            </button>
                          </div>
                        )}

                        {/* Transactions List Grouped by Date */}
                        {groupsList.length === 0 ? (
                          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400">
                              <Receipt className="w-6 h-6" />
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {transactions.length === 0
                                ? "No tienes movimientos registrados"
                                : "No se encontraron movimientos"}
                            </div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-xs mx-auto">
                              {transactions.length === 0
                                ? "Comienza registrando tus gastos cotidianos o ingresos para llevar el control."
                                : "Intenta ajustando los filtros o el término de búsqueda."}
                            </p>
                            {transactions.length === 0 ? (
                              <button
                                onClick={() => setShowNewTxTypeSheet(true)}
                                className="inline-flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-xs font-semibold mt-2"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Registrar movimiento</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTxFilterType("ALL");
                                  setTxFilterAccount("ALL");
                                  setTxFilterCategory("ALL");
                                  setTxFilterDateRange("THIS_MONTH");
                                  setTxFilterSearch("");
                                }}
                                className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold mt-2"
                              >
                                <span>Limpiar filtros</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {groupsList.map((group) => (
                              <div key={group.dateKey} className="space-y-1.5">
                                <div className="text-[11px] font-bold tracking-wider text-gray-400 dark:text-zinc-500 px-1 uppercase">
                                  {group.label}
                                </div>
                                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800/60 shadow-sm">
                                  {group.items.map((tx) => {
                                    const isExpense =
                                      tx.type === "EXPENSE" ||
                                      tx.type === "TRANSFER_OUT";
                                    const isTransfer =
                                      tx.type === "TRANSFER_OUT" ||
                                      tx.type === "TRANSFER_IN";
                                    const cat = categories.find(
                                      (c) => c.id === tx.category_id,
                                    );
                                    const acc = accounts.find(
                                      (a) => a.id === tx.account_id,
                                    );
                                    const title =
                                      tx.description ||
                                      cat?.name ||
                                      (isTransfer ? "Transferencia" : "Movimiento");
                                    const accName = acc?.name || "Cuenta";
                                    const catName = isTransfer
                                      ? "Transferencia"
                                      : cat?.name || "Sin categoría";

                                    return (
                                      <div
                                        key={tx.id}
                                        onClick={() => setSelectedTxDetail(tx)}
                                        className="flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group active:bg-gray-100 dark:active:bg-zinc-800"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                          <div
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                                              isTransfer
                                                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-500"
                                                : isExpense
                                                  ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                                                  : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                                            }`}
                                          >
                                            {isTransfer ? (
                                              <ArrowRightLeft className="w-4 h-4" />
                                            ) : isExpense ? (
                                              <ArrowDownRight className="w-4 h-4" />
                                            ) : (
                                              <ArrowUpRight className="w-4 h-4" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                              {title}
                                            </div>
                                            <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate flex items-center gap-1.5">
                                              <span>{catName}</span>
                                              <span>•</span>
                                              <span>{accName}</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span
                                            className={`text-sm font-semibold ${
                                              isExpense
                                                ? "text-gray-900 dark:text-white"
                                                : "text-emerald-600 dark:text-emerald-400"
                                            }`}
                                          >
                                            {isExpense ? "-" : "+"}
                                            {formatCurrency(tx.amount_cents)}
                                          </span>
                                          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 transition-colors" />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* BUDGETS TAB - Clean & Elegant Breakdown System */}
                  {effectiveTab === "budgets" &&
                    (() => {
                      const currentSelectedMonthBudget = budgets.find(
                        (b) => b.month === selectedBudgetMonth,
                      );
                      const monthBudgetItems = budgetItems.filter(
                        (b) => b.month === selectedBudgetMonth,
                      );
                      const totalAllocatedInItems = monthBudgetItems.reduce(
                        (acc, item) => acc + item.allocated_cents,
                        0,
                      );
                      const totalEffectiveBudget = currentSelectedMonthBudget
                        ? currentSelectedMonthBudget.total_amount_cents
                        : totalAllocatedInItems;
                      const monthTxs = transactions.filter((t) =>
                        t.date.startsWith(selectedBudgetMonth),
                      );
                      const monthExpenses = monthTxs
                        .filter((t) => t.type === "EXPENSE")
                        .reduce((acc, t) => acc + t.amount_cents, 0);
                      const unallocatedBudget = currentSelectedMonthBudget
                        ? Math.max(
                            0,
                            currentSelectedMonthBudget.total_amount_cents -
                              totalAllocatedInItems,
                          )
                        : 0;
                      const isOverAllocated =
                        currentSelectedMonthBudget &&
                        totalAllocatedInItems >
                          currentSelectedMonthBudget.total_amount_cents;
                      const overAllocatedAmount = isOverAllocated
                        ? totalAllocatedInItems -
                          currentSelectedMonthBudget.total_amount_cents
                        : 0;
                      const overallPct =
                        totalEffectiveBudget > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (monthExpenses / totalEffectiveBudget) * 100,
                              ),
                            )
                          : 0;
                      const isExceededGlobal =
                        monthExpenses > totalEffectiveBudget &&
                        totalEffectiveBudget > 0;
                      const remainingGlobal = Math.max(
                        0,
                        totalEffectiveBudget - monthExpenses,
                      );

                      // Format selected month display
                      const [selYear, selMonth] =
                        selectedBudgetMonth.split("-");
                      const monthDate = new Date(
                        parseInt(selYear),
                        parseInt(selMonth) - 1,
                        1,
                      );
                      const monthDisplayTitle = monthDate.toLocaleDateString(
                        "es-ES",
                        { month: "long", year: "numeric" },
                      );

                      const handlePrevMonth = () => {
                        const prev = new Date(
                          parseInt(selYear),
                          parseInt(selMonth) - 2,
                          1,
                        );
                        setSelectedBudgetMonth(
                          prev.toISOString().substring(0, 7),
                        );
                      };

                      const handleNextMonth = () => {
                        const next = new Date(
                          parseInt(selYear),
                          parseInt(selMonth),
                          1,
                        );
                        setSelectedBudgetMonth(
                          next.toISOString().substring(0, 7),
                        );
                      };

                      return (
                        <div className="space-y-6 max-w-5xl mx-auto">
                          {/* Header & Controls in one sleek bar */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-150 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h2 className="text-xl font-bold capitalize text-gray-900 dark:text-white">
                                    {monthDisplayTitle}
                                  </h2>
                                  {selectedBudgetMonth ===
                                    currentMonthPrefix && (
                                    <span className="text-[10px] uppercase tracking-wider font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">
                                      Actual
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  Planificación y desglose de gastos
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              {/* Month Navigation */}
                              <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#121212] p-1 rounded-xl border border-gray-200 dark:border-zinc-800">
                                <button
                                  onClick={handlePrevMonth}
                                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-gray-400"
                                  title="Mes anterior"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <input
                                  type="month"
                                  value={selectedBudgetMonth}
                                  onChange={(e) =>
                                    e.target.value &&
                                    setSelectedBudgetMonth(e.target.value)
                                  }
                                  className="px-2 py-0.5 text-xs font-medium bg-transparent text-gray-900 dark:text-white outline-none cursor-pointer"
                                />
                                <button
                                  onClick={handleNextMonth}
                                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-gray-400"
                                  title="Mes siguiente"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedBudgetMonth(currentMonthPrefix)
                                  }
                                  className="px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                                >
                                  Hoy
                                </button>
                              </div>

                              {/* Add Breakdown Action */}
                              <button
                                onClick={() => {
                                  setEditingBudgetItem(null);
                                  setBudgetItemName("");
                                  setBudgetItemAmount("");
                                  setBudgetItemIcon("🏷️");
                                  setBudgetItemColor("#27272a");
                                  setBudgetItemCategoryId("");
                                  setShowBudgetItemModal(true);
                                }}
                                className="flex items-center gap-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-3.5 py-2 rounded-xl font-medium text-xs shadow-sm transition-all"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Añadir Desglose
                              </button>
                            </div>
                          </div>

                          {/* Compact Summary Strip */}
                          <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                              <div>
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                  Presupuesto
                                </span>
                                <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(totalEffectiveBudget)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                  Gastado ({overallPct}%)
                                </span>
                                <span
                                  className={`text-base sm:text-lg font-bold ${isExceededGlobal ? "text-red-500" : "text-gray-900 dark:text-white"}`}
                                >
                                  {formatCurrency(monthExpenses)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                  Disponible
                                </span>
                                <span
                                  className={`text-base sm:text-lg font-bold ${isExceededGlobal ? "text-red-500" : "text-gray-900 dark:text-white"}`}
                                >
                                  {isExceededGlobal
                                    ? `-${formatCurrency(monthExpenses - totalEffectiveBudget)}`
                                    : formatCurrency(remainingGlobal)}
                                </span>
                              </div>
                              <div className="flex items-center sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBudgetAmount(
                                      currentSelectedMonthBudget && currentSelectedMonthBudget.total_amount_cents > 0
                                        ? (currentSelectedMonthBudget.total_amount_cents / 100).toString()
                                        : ""
                                    );
                                    setShowSetTotalBudgetModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-zinc-700 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
                                >
                                  {currentSelectedMonthBudget && currentSelectedMonthBudget.total_amount_cents > 0
                                    ? "Editar Meta Global"
                                    : "Fijar Meta Global"}
                                </button>
                              </div>
                            </div>

                            {/* Slim Progress Bar */}
                            <div className="h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  overallPct > 100
                                    ? "bg-red-500"
                                    : "bg-gray-900 dark:bg-white"
                                }`}
                                style={{
                                  width: `${Math.min(100, overallPct)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Presupuestos y Desgloses - FRONT AND CENTER */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Desglose de Presupuestos
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {monthBudgetItems.length}{" "}
                                  {monthBudgetItems.length === 1
                                    ? "categoría asignada"
                                    : "categorías asignadas"}{" "}
                                  · {formatCurrency(totalAllocatedInItems)}{" "}
                                  total
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBudgetItem(null);
                                  setBudgetItemName("");
                                  setBudgetItemAmount("");
                                  setBudgetItemIcon("🏷️");
                                  setBudgetItemColor("#27272a");
                                  setBudgetItemCategoryId("");
                                  setShowBudgetItemModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-2xs"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                <span>Nuevo Desglose</span>
                              </button>
                            </div>

                            {monthBudgetItems.length === 0 ? (
                              <div className="bg-white dark:bg-[#0a0a0a] border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                                <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto text-gray-400">
                                  <PieChart className="w-5 h-5" />
                                </div>
                                <div className="space-y-1 max-w-sm mx-auto">
                                  <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                    Sin desgloses para este mes
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Crea desgloses específicos para organizar
                                    tus límites de gasto en Comida, Transporte,
                                    Vivienda, etc.
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingBudgetItem(null);
                                    setBudgetItemName("");
                                    setBudgetItemAmount("");
                                    setBudgetItemIcon("🏷️");
                                    setBudgetItemColor("#27272a");
                                    setBudgetItemCategoryId("");
                                    setShowBudgetItemModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-medium transition-all"
                                >
                                  <PlusIcon className="w-3.5 h-3.5" />
                                  Añadir Desglose
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {monthBudgetItems.map((item) => {
                                  let spentCents = 0;
                                  if (item.category_id) {
                                    spentCents = monthTxs
                                      .filter(
                                        (t) =>
                                          t.type === "EXPENSE" &&
                                          t.category_id === item.category_id,
                                      )
                                      .reduce(
                                        (acc, t) => acc + t.amount_cents,
                                        0,
                                      );
                                  } else {
                                    const itemLower = item.name.toLowerCase();
                                    spentCents = monthTxs
                                      .filter((t) => {
                                        if (t.type !== "EXPENSE") return false;
                                        const desc = (
                                          t.description || ""
                                        ).toLowerCase();
                                        const catName = (
                                          categories.find(
                                            (c) => c.id === t.category_id,
                                          )?.name || ""
                                        ).toLowerCase();
                                        return (
                                          desc.includes(itemLower) ||
                                          catName.includes(itemLower) ||
                                          itemLower.includes(catName)
                                        );
                                      })
                                      .reduce(
                                        (acc, t) => acc + t.amount_cents,
                                        0,
                                      );
                                  }

                                  const remainingCents =
                                    item.allocated_cents - spentCents;
                                  const isExceeded = remainingCents < 0;
                                  const itemPct =
                                    item.allocated_cents > 0
                                      ? Math.round(
                                          (spentCents / item.allocated_cents) *
                                            100,
                                        )
                                      : 0;
                                  const linkedCat = categories.find(
                                    (c) => c.id === item.category_id,
                                  );

                                  return (
                                    <div
                                      key={item.id}
                                      className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3 hover:border-gray-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                                    >
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                                              {item.icon || "🏷️"}
                                            </div>
                                            <div className="min-w-0">
                                              <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                                                {item.name}
                                              </h4>
                                              {linkedCat && (
                                                <span className="text-[10px] text-gray-400 truncate block">
                                                  {linkedCat.emoji}{" "}
                                                  {linkedCat.name}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              onClick={() => {
                                                setQuickExpenseBudgetItem(item);
                                                setTxAmount("");
                                                setTxAccountId(
                                                  accounts.length > 0
                                                    ? accounts[0].id
                                                    : "",
                                                );
                                                setTxDescription("");
                                              }}
                                              className="px-2 py-1 text-[10px] font-medium bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-gray-200 dark:border-zinc-700"
                                              title="Registrar gasto rápido"
                                            >
                                              + Gasto
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingBudgetItem(item);
                                                setBudgetItemName(item.name);
                                                setBudgetItemAmount(
                                                  (
                                                    item.allocated_cents / 100
                                                  ).toString(),
                                                );
                                                setBudgetItemIcon(
                                                  item.icon || "🏷️",
                                                );
                                                setBudgetItemColor(
                                                  item.color || "#27272a",
                                                );
                                                setBudgetItemCategoryId(
                                                  item.category_id || "",
                                                );
                                                setShowBudgetItemModal(true);
                                              }}
                                              className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                                              title="Editar desglose"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteBudgetItem(item.id)
                                              }
                                              className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                              title="Eliminar desglose"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="space-y-1.5 pt-1">
                                          <div className="flex justify-between text-xs">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                              {formatCurrency(spentCents)}
                                              <span className="text-[11px] font-normal text-gray-400">
                                                {" "}
                                                /{" "}
                                                {formatCurrency(
                                                  item.allocated_cents,
                                                )}
                                              </span>
                                            </span>
                                            <span
                                              className={`text-[11px] font-medium ${isExceeded ? "text-red-500" : "text-gray-500"}`}
                                            >
                                              {isExceeded
                                                ? `-${formatCurrency(Math.abs(remainingCents))}`
                                                : `${formatCurrency(remainingCents)}`}
                                            </span>
                                          </div>
                                          <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-300 ${
                                                isExceeded
                                                  ? "bg-red-500"
                                                  : "bg-gray-900 dark:bg-white"
                                              }`}
                                              style={{
                                                width: `${Math.min(100, itemPct)}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  {/* PLANNING TAB */}
                  {effectiveTab === "planning" && (
                    <div className="space-y-6">
                      {/* Planning Sub-nav */}
                      {!isMobile && (
                        <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl overflow-x-auto scrollbar-none">
                          <button
                            onClick={() => setPlanningSubTab("calendar")}
                            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${planningSubTab === "calendar" ? "bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Calendario de Pagos
                          </button>
                          <button
                            onClick={() => setPlanningSubTab("subscriptions")}
                            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${planningSubTab === "subscriptions" ? "bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Suscripciones ({recurring.length})
                          </button>
                          <button
                            onClick={() => setPlanningSubTab("installments")}
                            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${planningSubTab === "installments" ? "bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Cuotas ({installments.length})
                          </button>
                        </div>
                      )}

                      {/* Sub-tab 1: Payment Calendar */}
                      {planningSubTab === "calendar" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="font-bold text-lg flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-indigo-500" />
                                {calendarMonth
                                  .toLocaleString("es-ES", {
                                    month: "long",
                                    year: "numeric",
                                  })
                                  .replace(/^\w/, (c) => c.toUpperCase())}
                              </h3>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    setCalendarMonth(
                                      new Date(
                                        calendarMonth.getFullYear(),
                                        calendarMonth.getMonth() - 1,
                                        1,
                                      ),
                                    )
                                  }
                                  className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setCalendarMonth(new Date())}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                  Hoy
                                </button>
                                <button
                                  onClick={() =>
                                    setCalendarMonth(
                                      new Date(
                                        calendarMonth.getFullYear(),
                                        calendarMonth.getMonth() + 1,
                                        1,
                                      ),
                                    )
                                  }
                                  className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Calendar Grid Header */}
                            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
                              <div>Lun</div>
                              <div>Mar</div>
                              <div>Mié</div>
                              <div>Jue</div>
                              <div>Vie</div>
                              <div>Sáb</div>
                              <div>Dom</div>
                            </div>

                            {/* Calendar Grid Body */}
                            <div className="grid grid-cols-7 gap-1.5">
                              {(() => {
                                const year = calendarMonth.getFullYear();
                                const month = calendarMonth.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const lastDay = new Date(year, month + 1, 0);
                                const startOffset = (firstDay.getDay() + 6) % 7;
                                const totalDays = lastDay.getDate();

                                const cells = [];
                                for (let i = 0; i < startOffset; i++) {
                                  cells.push(
                                    <div
                                      key={`pad-${i}`}
                                      className="h-20 bg-gray-50/50 dark:bg-zinc-900/20 rounded-xl"
                                    />,
                                  );
                                }

                                for (let day = 1; day <= totalDays; day++) {
                                  const mm = String(month + 1).padStart(2, "0");
                                  const dd = String(day).padStart(2, "0");
                                  const dateStr = `${year}-${mm}-${dd}`;
                                  const isToday =
                                    new Date().toISOString().split("T")[0] ===
                                    dateStr;

                                  // Subscriptions on this day
                                  const dayRecs = recurring.filter(
                                    (r) => r.next_date === dateStr,
                                  );
                                  // Installments on this day
                                  const dayInsts = installments.filter(
                                    (inst) =>
                                      inst.status === "ACTIVE" &&
                                      inst.start_date.substring(8, 10) === dd,
                                  );
                                  const isSelected =
                                    selectedCalendarDay === dateStr;

                                  cells.push(
                                    <button
                                      key={dateStr}
                                      onClick={() =>
                                        setSelectedCalendarDay(dateStr)
                                      }
                                      className={`h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                        isSelected
                                          ? "ring-2 ring-gray-900 dark:ring-white border-transparent bg-gray-50 dark:bg-zinc-900/50"
                                          : isToday
                                            ? "border-gray-900 dark:border-white bg-gray-50/50 dark:bg-zinc-900/20"
                                            : "border-gray-100 dark:border-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                                      }`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <span
                                          className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${isToday ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-700 dark:text-gray-300"}`}
                                        >
                                          {day}
                                        </span>
                                        {(dayRecs.length > 0 ||
                                          dayInsts.length > 0) && (
                                          <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white animate-pulse" />
                                        )}
                                      </div>
                                      <div className="space-y-0.5 overflow-hidden">
                                        {dayRecs.map((r) => (
                                          <div
                                            key={r.id}
                                            className="text-[10px] truncate bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded font-medium"
                                          >
                                            {r.description}
                                          </div>
                                        ))}
                                        {dayInsts.map((inst) => (
                                          <div
                                            key={inst.id}
                                            className="text-[10px] truncate bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white px-1 py-0.5 rounded font-medium"
                                          >
                                            Cuota: {inst.name}
                                          </div>
                                        ))}
                                      </div>
                                    </button>,
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          </div>

                          {/* Selected Day Details */}
                          <div className="bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
                            <h4 className="font-bold text-md border-b border-gray-200 dark:border-zinc-800 pb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              Detalles del día{" "}
                              {selectedCalendarDay || "Selecciona un día"}
                            </h4>

                            {selectedCalendarDay ? (
                              <div className="space-y-3">
                                {recurring
                                  .filter(
                                    (r) => r.next_date === selectedCalendarDay,
                                  )
                                  .map((r) => (
                                    <div
                                      key={r.id}
                                      className="p-3 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-semibold text-sm">
                                            {r.description}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Suscripción recurrente{" "}
                                            {(() => {
                                              const c = categories.find(
                                                (cat) =>
                                                  cat.id === r.category_id,
                                              );
                                              return c
                                                ? `• ${c.emoji || "🏷️"} ${c.name}`
                                                : "";
                                            })()}
                                          </p>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                          -{formatCurrency(r.amount_cents)}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 bg-gray-50 dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                                        <span>Estado de cobro:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                                          Cobro Automático
                                        </span>
                                      </div>
                                    </div>
                                  ))}

                                {installments
                                  .filter(
                                    (inst) =>
                                      inst.status === "ACTIVE" &&
                                      inst.start_date.substring(8, 10) ===
                                        selectedCalendarDay.substring(8, 10),
                                  )
                                  .map((inst) => (
                                    <div
                                      key={inst.id}
                                      className="p-3 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-semibold text-sm">
                                            {inst.name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            Cuota mensual (
                                            {inst.paid_installments + 1}/
                                            {inst.total_installments}){" "}
                                            {(() => {
                                              const c = categories.find(
                                                (cat) =>
                                                  cat.id === inst.category_id,
                                              );
                                              return c
                                                ? `• ${c.emoji || "🏷️"} ${c.name}`
                                                : "";
                                            })()}
                                          </p>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                          {formatCurrency(
                                            inst.installment_amount_cents,
                                          )}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 flex items-center justify-between">
                                        <span>Cobro automático:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                                          Día{" "}
                                          {inst.payment_day ||
                                            inst.start_date.substring(
                                              8,
                                              10,
                                            )}{" "}
                                          de cada mes
                                        </span>
                                      </div>
                                    </div>
                                  ))}

                                {recurring.filter(
                                  (r) => r.next_date === selectedCalendarDay,
                                ).length === 0 &&
                                  installments.filter(
                                    (inst) =>
                                      inst.status === "ACTIVE" &&
                                      inst.start_date.substring(8, 10) ===
                                        selectedCalendarDay.substring(8, 10),
                                  ).length === 0 && (
                                    <p className="text-xs text-gray-500 text-center py-8">
                                      No hay cobros ni cuotas programados para
                                      esta fecha.
                                    </p>
                                  )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 text-center py-12">
                                Haz clic en cualquier día del calendario para
                                revisar o procesar pagos.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sub-tab 2: Subscriptions */}
                      {planningSubTab === "subscriptions" && (() => {
                        const totalMonthlyRecurring = recurring.reduce((acc, r) => {
                          if (r.frequency === "yearly") return acc + Math.round(r.amount_cents / 12);
                          if (r.frequency === "weekly") return acc + Math.round(r.amount_cents * 4.33);
                          return acc + r.amount_cents;
                        }, 0);

                        return (
                          <div className="space-y-5 max-w-5xl mx-auto">
                            {/* Header & Action */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-150 dark:border-zinc-800">
                              <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                  <Calendar className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                  Suscripciones
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Servicios periódicos y pagos recurrentes programados
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setRecDesc("");
                                  setRecAmount("");
                                  setRecFrequency("monthly");
                                  setRecNextDate(getTodayStr());
                                  setRecAccountId(accounts.length > 0 ? accounts[0].id : "");
                                  setRecCategoryId("");
                                  setShowNewSubscriptionModal(true);
                                }}
                                className="flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-3.5 py-2.5 rounded-xl font-semibold text-xs shadow-2xs transition-all active:scale-95"
                              >
                                <PlusIcon className="w-4 h-4" />
                                Nueva Suscripción
                              </button>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-zinc-800">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                    Costo Mensual Estimado
                                  </span>
                                  <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(totalMonthlyRecurring)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                    Suscripciones Activas
                                  </span>
                                  <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                    {recurring.length}
                                  </span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                    Próximo Vencimiento
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {recurring.length > 0
                                      ? [...recurring].sort((a, b) => a.next_date.localeCompare(b.next_date))[0]?.next_date
                                      : "Ninguno"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Subscriptions List */}
                            <div className="space-y-3">
                              {recurring.length === 0 ? (
                                <div className="bg-white dark:bg-[#0a0a0a] border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                                  <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto text-gray-400">
                                    <Calendar className="w-5 h-5" />
                                  </div>
                                  <div className="space-y-1 max-w-sm mx-auto">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                      No hay suscripciones registradas
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Agrega streaming, gimnasio, servicios o cualquier pago recurrente para proyectar tus finanzas.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecDesc("");
                                      setRecAmount("");
                                      setRecFrequency("monthly");
                                      setRecNextDate(getTodayStr());
                                      setRecAccountId(accounts.length > 0 ? accounts[0].id : "");
                                      setRecCategoryId("");
                                      setShowNewSubscriptionModal(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                                  >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    Añadir Suscripción
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {recurring.map((r) => {
                                    const targetAcc = accounts.find((a) => a.id === r.account_id);
                                    const targetCat = categories.find((c) => c.id === r.category_id);
                                    const freqLabel =
                                      r.frequency === "monthly"
                                        ? "Mensual"
                                        : r.frequency === "yearly"
                                          ? "Anual"
                                          : r.frequency === "weekly"
                                            ? "Semanal"
                                            : "Único";

                                    return (
                                      <div
                                        key={r.id}
                                        className="flex items-center justify-between p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200/80 dark:border-zinc-800 rounded-2xl shadow-2xs hover:border-gray-300 dark:hover:border-zinc-700 transition-all"
                                      >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
                                            <Receipt className="w-4 h-4" />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                {r.description}
                                              </p>
                                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 uppercase tracking-wider shrink-0">
                                                {freqLabel}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate mt-0.5">
                                              Próximo: {r.next_date}
                                              {targetAcc ? ` • ${targetAcc.name}` : ""}
                                              {targetCat ? ` • ${targetCat.name}` : ""}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                                            {formatCurrency(r.amount_cents)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteRecurring(r.id)}
                                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                            title="Eliminar suscripción"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Sub-tab 3: Installments (Cuotas Financiadas) */}
                      {planningSubTab === "installments" && (() => {
                        const activeInsts = installments.filter((i) => i.status === "ACTIVE");
                        const totalFinanced = activeInsts.reduce((sum, i) => sum + (i.total_amount_cents || 0), 0);
                        const monthlyCommitment = activeInsts.reduce((sum, i) => sum + (i.installment_amount_cents || 0), 0);
                        const totalRemainingDebt = activeInsts.reduce(
                          (sum, i) => sum + Math.max(0, (i.total_installments - i.paid_installments) * (i.installment_amount_cents || 0)),
                          0
                        );

                        return (
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                  Cuotas Financiadas
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Compras diferidas en cuotas mensuales y su progreso de amortización
                                </p>
                              </div>
                              <button
                                onClick={() => setShowInstallmentModal(true)}
                                className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-2xs hover:opacity-90 transition-all self-start sm:self-auto"
                              >
                                <PlusIcon className="w-4 h-4" />
                                <span>Nueva Compra a Cuotas</span>
                              </button>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl">
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                                  Compromiso Mensual
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 block">
                                  {formatCurrency(monthlyCommitment)}
                                </span>
                                <span className="text-[11px] text-gray-400 block mt-0.5">
                                  {activeInsts.length} {activeInsts.length === 1 ? "cuota activa" : "cuotas activas"}
                                </span>
                              </div>
                              <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl">
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                                  Deuda Restante
                                </span>
                                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                                  {formatCurrency(totalRemainingDebt)}
                                </span>
                                <span className="text-[11px] text-gray-400 block mt-0.5">
                                  por amortizar
                                </span>
                              </div>
                              <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl col-span-2 sm:col-span-1">
                                <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block">
                                  Total Financiado Original
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 block">
                                  {formatCurrency(totalFinanced)}
                                </span>
                                <span className="text-[11px] text-gray-400 block mt-0.5">
                                  {installments.length} {installments.length === 1 ? "plan total" : "planes totales"}
                                </span>
                              </div>
                            </div>

                            {installments.length === 0 ? (
                              <div className="bg-white dark:bg-[#0a0a0a] border border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-gray-400">
                                  <Layers className="w-6 h-6" />
                                </div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                  No tienes compras a cuotas registradas
                                </p>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                  Registra tus compras diferidas (ej. electrodomésticos, tecnología, viajes) para controlar tus pagos mensuales.
                                </p>
                                <button
                                  onClick={() => setShowInstallmentModal(true)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-2xs"
                                >
                                  <PlusIcon className="w-3.5 h-3.5" />
                                  <span>Crear Primera Cuota</span>
                                </button>
                              </div>
                            ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                              {installments.map((inst) => {
                                const pct = Math.min(
                                  100,
                                  Math.round(
                                    (inst.paid_installments /
                                      inst.total_installments) *
                                      100,
                                  ),
                                );
                                const targetAcc = accounts.find(
                                  (a) => a.id === inst.account_id,
                                );
                                const targetCat = categories.find(
                                  (c) => c.id === inst.category_id,
                                );

                                return (
                                  <div
                                    key={inst.id}
                                    className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-bold text-base">
                                            {inst.name}
                                          </h4>
                                          <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inst.status === "COMPLETED" ? "bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:text-gray-200" : "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white"}`}
                                          >
                                            {inst.status === "COMPLETED"
                                              ? "Completado"
                                              : "Activo"}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {targetAcc
                                            ? `Tarjeta/Cuenta: ${targetAcc.name}`
                                            : "Sin cuenta asignada"}
                                          {targetCat
                                            ? ` • ${targetCat.emoji || "🏷️"} ${targetCat.name}`
                                            : ""}{" "}
                                          • Día de cobro:{" "}
                                          {inst.payment_day || 15} • Inicio:{" "}
                                          {inst.start_date}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleDeleteInstallment(inst.id)
                                        }
                                        className="text-gray-400 hover:text-red-500 p-1"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1 p-2.5 bg-gray-50/70 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/50 rounded-xl text-center">
                                      <div className="min-w-0">
                                        <p className="text-[10px] text-gray-400 font-medium truncate">
                                          Monto Total
                                        </p>
                                        <p className="font-bold text-xs text-gray-950 dark:text-white truncate">
                                          {formatCurrency(
                                            inst.total_amount_cents,
                                          )}
                                        </p>
                                      </div>
                                      <div className="min-w-0 border-x border-gray-100 dark:border-zinc-800">
                                        <p className="text-[10px] text-gray-400 font-medium truncate">
                                          Valor Cuota
                                        </p>
                                        <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                          {formatCurrency(
                                            inst.installment_amount_cents,
                                          )}
                                        </p>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[10px] text-gray-400 font-medium truncate">
                                          Cuotas
                                        </p>
                                        <p className="font-bold text-xs text-gray-950 dark:text-white truncate">
                                          {inst.paid_installments}/
                                          {inst.total_installments}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between text-[11px] font-semibold mb-1 text-gray-400">
                                        <span>Progreso ({pct}%)</span>
                                        <span>
                                          Restan{" "}
                                          {inst.total_installments -
                                            inst.paid_installments}{" "}
                                          meses
                                        </span>
                                      </div>
                                      <div className="h-1 bg-gray-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-zinc-800 dark:bg-white rounded-full transition-all duration-500"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>

                                    {inst.status === "ACTIVE" ? (
                                      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-500 text-[11px] p-2 rounded-xl text-center flex items-center justify-center gap-1.5 font-medium">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        <span>
                                          Descuento automático el día{" "}
                                          {inst.payment_day || 15} de cada mes
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 text-[11px] p-2 rounded-xl text-center font-medium">
                                        ✅ Todas las cuotas han sido pagadas
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* SAVINGS TAB */}
                  {effectiveTab === "savings" && (() => {
                    const totalCurrentSaved = savingsGoals.reduce((sum, g) => sum + g.current_amount_cents, 0);
                    const totalTargetGoals = savingsGoals.reduce((sum, g) => sum + g.target_amount_cents, 0);
                    const overallProgress = totalTargetGoals > 0 ? Math.min(100, Math.round((totalCurrentSaved / totalTargetGoals) * 100)) : 0;

                    return (
                      <div className="space-y-5 max-w-5xl mx-auto">
                        {/* Header & Action */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-150 dark:border-zinc-800">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <Target className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                              Metas de Ahorro
                            </h2>
                            <p className="text-xs text-gray-500">
                              Planifica, realiza aportes y monitorea tus objetivos financieros
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setGoalName("");
                              setGoalTargetAmount("");
                              setGoalTargetDate("");
                              setGoalFrequency("MONTHLY");
                              setGoalCustomContribution("");
                              setShowNewSavingsGoalModal(true);
                            }}
                            className="flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-3.5 py-2.5 rounded-xl font-semibold text-xs shadow-2xs transition-all active:scale-95"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Nueva Meta
                          </button>
                        </div>

                        {/* Summary Metrics */}
                        <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                Total Ahorrado
                              </span>
                              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalCurrentSaved)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                Meta Total
                              </span>
                              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalTargetGoals)}
                              </span>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                                Metas Activas
                              </span>
                              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                {savingsGoals.length} {savingsGoals.length === 1 ? "meta" : "metas"}
                              </span>
                            </div>
                          </div>

                          {totalTargetGoals > 0 && (
                            <div className="pt-2 border-t border-gray-200 dark:border-zinc-800/80">
                              <div className="flex justify-between text-[11px] text-gray-500 font-medium mb-1">
                                <span>Progreso global</span>
                                <span>{overallProgress}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-500"
                                  style={{ width: `${overallProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Goals List */}
                        <div className="space-y-3">
                          {savingsGoals.length === 0 ? (
                            <div className="bg-white dark:bg-[#0a0a0a] border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                              <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto text-gray-400">
                                <Target className="w-5 h-5" />
                              </div>
                              <div className="space-y-1 max-w-sm mx-auto">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                  No hay metas de ahorro activas
                                </p>
                                <p className="text-xs text-gray-500">
                                  Crea tu primera meta de ahorro (fondo de emergencia, viaje, compra) para monitorear tu progreso.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGoalName("");
                                  setGoalTargetAmount("");
                                  setGoalTargetDate("");
                                  setGoalFrequency("MONTHLY");
                                  setGoalCustomContribution("");
                                  setShowNewSavingsGoalModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Añadir Primera Meta
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {savingsGoals.map((goal) => {
                                const progress = Math.min(
                                  100,
                                  Math.round(
                                    (goal.current_amount_cents / goal.target_amount_cents) * 100,
                                  ),
                                );
                                const freqLabel =
                                  goal.frequency === "WEEKLY"
                                    ? "semanal"
                                    : goal.frequency === "BIWEEKLY"
                                      ? "quincenal"
                                      : "mensual";
                                const cuotaInfo = calculateSavingsCuota(
                                  goal.target_amount_cents,
                                  goal.current_amount_cents,
                                  goal.target_date,
                                  goal.frequency || "MONTHLY",
                                  goal.custom_contribution_cents,
                                );
                                const projection = calculateEstimatedCompletionDate(goal);

                                return (
                                  <div
                                    key={goal.id}
                                    className="bg-white dark:bg-[#0a0a0a] border border-gray-200/80 dark:border-zinc-800 p-4 rounded-2xl space-y-3 shadow-2xs hover:border-gray-300 dark:hover:border-zinc-700 transition-all"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                            {goal.name}
                                          </h3>
                                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            {freqLabel}
                                          </span>
                                        </div>
                                        {goal.target_date ? (
                                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3 text-gray-400" />
                                            Meta para: {goal.target_date}
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3 text-gray-400" />
                                            Sin fecha límite (Indefinida)
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                          <p className="font-bold text-sm text-gray-900 dark:text-white">
                                            {formatCurrency(goal.current_amount_cents)}
                                          </p>
                                          <p className="text-[10px] text-gray-400">
                                            de {formatCurrency(goal.target_amount_cents)}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteGoal(goal.id)}
                                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                          title="Eliminar meta"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      {cuotaInfo.cuota !== null && cuotaInfo.cuota > 0 && (
                                        <div className="p-2 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                                          <div>
                                            <span className="text-[10px] font-semibold text-gray-400 block uppercase tracking-wider">
                                              Abono sugerido
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white text-xs">
                                              ${cuotaInfo.cuota.toFixed(2)}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-gray-500 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">
                                            ~{cuotaInfo.periods} abonos
                                          </span>
                                        </div>
                                      )}
                                      {projection && (
                                        <div className="p-2 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-zinc-800">
                                          <span className="text-[10px] font-semibold text-gray-400 block uppercase tracking-wider flex items-center gap-1">
                                            <Target className="w-3 h-3 text-gray-500" /> Proyección
                                          </span>
                                          <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                                            {projection.isCompleted
                                              ? projection.text
                                              : `Estimado: ${projection.dateFormatted}`}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Progress Bar & Actions */}
                                    <div className="space-y-1.5 pt-1">
                                      <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300"
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                      <div className="flex justify-between items-center pt-0.5">
                                        <span className="text-[11px] text-gray-400 font-medium">
                                          {progress}% completado
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setShowContributeModal(goal.id);
                                            if (
                                              goal.custom_contribution_cents &&
                                              goal.custom_contribution_cents > 0
                                            ) {
                                              setContributeAmount(
                                                (goal.custom_contribution_cents / 100).toFixed(2),
                                              );
                                            } else if (cuotaInfo.cuota && cuotaInfo.cuota > 0) {
                                              setContributeAmount(cuotaInfo.cuota.toFixed(2));
                                            }
                                          }}
                                          className="text-xs font-semibold bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95"
                                        >
                                          Aportar
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* SHOPPING TAB */}
                  {effectiveTab === "shopping" && (() => {
                    const activeLists = shoppingLists.filter((l) => !l.is_archived);
                    const archivedLists = shoppingLists.filter((l) => l.is_archived);
                    const displayedLists = shoppingFilter === "archived" ? archivedLists : activeLists;

                    const totalActiveItems = shoppingItems.filter((i) => {
                      const parentList = shoppingLists.find((l) => l.id === i.list_id);
                      return parentList && !parentList.is_archived;
                    });
                    const totalActiveEstCents = totalActiveItems.reduce(
                      (acc, item) => acc + (item.quantity || 1) * (item.price_cents || 0),
                      0,
                    );
                    const totalActiveBoughtCents = totalActiveItems
                      .filter((i) => i.is_purchased)
                      .reduce(
                        (acc, item) => acc + (item.quantity || 1) * (item.price_cents || 0),
                        0,
                      );

                    return (
                      <div className="space-y-5 max-w-4xl mx-auto">
                        {/* Header & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-150 dark:border-zinc-800">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                              Listas de Compras
                            </h2>
                            <p className="text-xs text-gray-500">
                              Organiza artículos, precios, cantidades y carga a gastos
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex bg-gray-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-gray-200 dark:border-zinc-700/60 text-xs font-medium">
                              <button
                                type="button"
                                onClick={() => setShoppingFilter("active")}
                                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                                  shoppingFilter === "active"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-2xs font-semibold"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                Activas ({activeLists.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setShoppingFilter("archived")}
                                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                                  shoppingFilter === "archived"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-2xs font-semibold"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                <Archive className="w-3 h-3" /> Archivadas ({archivedLists.length})
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setNewListName("");
                                setShowCreateShoppingListModal(true);
                              }}
                              className="flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-3.5 py-2.5 rounded-xl font-semibold text-xs shadow-2xs transition-all active:scale-95"
                            >
                              <PlusIcon className="w-4 h-4" />
                              Nueva Lista
                            </button>
                          </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-zinc-800">
                          <div>
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                              Total Estimado
                            </span>
                            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(totalActiveEstCents)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                              Total Comprado
                            </span>
                            <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(totalActiveBoughtCents)}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                              Listas Activas
                            </span>
                            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                              {activeLists.length} {activeLists.length === 1 ? "lista" : "listas"}
                            </span>
                          </div>
                        </div>

                        {/* Lists Content */}
                        <div className="space-y-4">
                          {displayedLists.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-[#0a0a0a] rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 space-y-3">
                              <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto text-gray-400">
                                <ShoppingCart className="w-5 h-5" />
                              </div>
                              <div className="space-y-1 max-w-sm mx-auto">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                  {shoppingFilter === "archived"
                                    ? "No hay listas archivadas"
                                    : "No hay listas de compras activas"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {shoppingFilter === "archived"
                                    ? "Puedes archivar listas completadas o guardadas para tenerlas como referencia."
                                    : "Crea tu primera lista para organizar artículos, precios y compras de supermercado o pendientes."}
                                </p>
                              </div>
                              {shoppingFilter !== "archived" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewListName("");
                                    setShowCreateShoppingListModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                                >
                                  <PlusIcon className="w-3.5 h-3.5" />
                                  Crear Primera Lista
                                </button>
                              )}
                            </div>
                          ) : (
                            displayedLists.map((list) => {
                              const listItems = shoppingItems.filter((i) => i.list_id === list.id);
                              const completed = listItems.filter((i) => i.is_purchased).length;
                              const totalItems = listItems.length;
                              const progress =
                                totalItems === 0 ? 0 : Math.round((completed / totalItems) * 100);

                              const totalEstCents = listItems.reduce(
                                (acc, item) =>
                                  acc + (item.quantity || 1) * (item.price_cents || 0),
                                0,
                              );
                              const totalBoughtCents = listItems
                                .filter((i) => i.is_purchased)
                                .reduce(
                                  (acc, item) =>
                                    acc + (item.quantity || 1) * (item.price_cents || 0),
                                  0,
                                );
                              const totalPendingCents = Math.max(0, totalEstCents - totalBoughtCents);

                              return (
                                <div
                                  key={list.id}
                                  className="bg-white dark:bg-[#0a0a0a] border border-gray-200/80 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl shadow-2xs space-y-3.5"
                                >
                                  {/* List Header */}
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2.5 border-b border-gray-100 dark:border-zinc-800/80 gap-2">
                                    <div>
                                      <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
                                        <span>{list.name}</span>
                                        {list.is_archived && (
                                          <span className="text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-500 px-2 py-0.5 rounded-md">
                                            Archivada
                                          </span>
                                        )}
                                      </h3>
                                      <p className="text-[11px] text-gray-400 mt-0.5">
                                        {completed} de {totalItems} artículos marcados ({progress}%)
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                      <button
                                        type="button"
                                        onClick={() => handleResetShoppingList(list.id)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1 text-xs font-medium"
                                        title="Restablecer lista"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Restablecer</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleToggleArchiveShoppingList(list)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1 text-xs font-medium"
                                        title={list.is_archived ? "Desarchivar lista" : "Archivar lista"}
                                      >
                                        <Archive className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">
                                          {list.is_archived ? "Desarchivar" : "Archivar"}
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteShoppingList(list.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                        title="Eliminar lista"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>

                                  {/* Financial summary banner */}
                                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-100 dark:border-zinc-800 text-center">
                                    <div>
                                      <span className="text-[10px] uppercase font-semibold text-gray-400 block">
                                        Estimado
                                      </span>
                                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(totalEstCents)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-semibold text-gray-400 block">
                                        Comprado
                                      </span>
                                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(totalBoughtCents)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-semibold text-gray-400 block">
                                        Pendiente
                                      </span>
                                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {formatCurrency(totalPendingCents)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Load to expense trigger */}
                                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl">
                                    <div className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                      <Banknote className="w-4 h-4 text-gray-500 shrink-0" />
                                      <span>
                                        Listo para cargar:{" "}
                                        <strong className="text-gray-900 dark:text-white font-semibold">
                                          {formatCurrency(totalBoughtCents)}
                                        </strong>
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={completed === 0 || totalBoughtCents <= 0}
                                      onClick={() => handleOpenLoadExpenseModal(list)}
                                      className={`w-full sm:w-auto px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                        completed === 0 || totalBoughtCents <= 0
                                          ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 border border-gray-200 dark:border-zinc-700 cursor-not-allowed"
                                          : "bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white cursor-pointer shadow-2xs active:scale-95"
                                      }`}
                                      title={
                                        completed === 0
                                          ? "Marca artículos con el check para habilitar"
                                          : "Cargar costo a tu cuenta"
                                      }
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      Cargar a Gasto
                                    </button>
                                  </div>

                                  {/* Items list */}
                                  <div className="space-y-1.5 max-h-[170px] overflow-y-auto no-scrollbar pr-0.5">
                                    {listItems.length === 0 ? (
                                      <p className="text-xs text-gray-400 italic py-2 text-center">
                                        No hay artículos en esta lista aún.
                                      </p>
                                    ) : (
                                      listItems.map((item) => {
                                        const itemTotalCents =
                                          (item.quantity || 1) * (item.price_cents || 0);
                                        return (
                                          <div
                                            key={item.id}
                                            className="flex items-center justify-between p-2.5 bg-gray-50/70 dark:bg-[#121212] rounded-xl border border-gray-100 dark:border-zinc-800/80 group hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleShoppingItem(item)}
                                                className={`w-4 h-4 rounded border ${
                                                  item.is_purchased
                                                    ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
                                                    : "border-gray-300 dark:border-zinc-700 hover:border-gray-400"
                                                } flex items-center justify-center transition-all shrink-0`}
                                              >
                                                {item.is_purchased && (
                                                  <CheckCircle2 className="w-3 h-3" />
                                                )}
                                              </button>
                                              <div className="truncate">
                                                <span
                                                  className={`text-xs font-medium ${
                                                    item.is_purchased
                                                      ? "line-through text-gray-400"
                                                      : "text-gray-900 dark:text-white"
                                                  }`}
                                                >
                                                  {item.name}
                                                </span>
                                                {((item.quantity && item.quantity > 1) ||
                                                  (item.price_cents && item.price_cents > 0)) && (
                                                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                    {item.quantity && item.quantity > 1 && (
                                                      <span className="font-medium text-gray-500 dark:text-gray-400">
                                                        {item.quantity} ud.
                                                      </span>
                                                    )}
                                                    {item.price_cents && item.price_cents > 0 && (
                                                      <span>
                                                        c/u: {formatCurrency(item.price_cents)}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {itemTotalCents > 0 && (
                                                <span
                                                  className={`text-xs font-semibold ${
                                                    item.is_purchased
                                                      ? "text-gray-400 line-through"
                                                      : "text-gray-900 dark:text-white"
                                                  }`}
                                                >
                                                  {formatCurrency(itemTotalCents)}
                                                </span>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteShoppingItem(item.id)}
                                                className="text-gray-400 hover:text-red-500 p-1 opacity-60 group-hover:opacity-100 transition-opacity"
                                                title="Eliminar artículo"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Formulario para añadir artículo inline a esta lista específica */}
                                  <form
                                    onSubmit={(e) => handleAddShoppingItem(e, list.id)}
                                    className="pt-2.5 border-t border-gray-100 dark:border-zinc-800 space-y-2"
                                  >
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <input
                                        type="text"
                                        required
                                        value={newItemNames[list.id] || ""}
                                        onChange={(e) =>
                                          setNewItemNames((prev) => ({
                                            ...prev,
                                            [list.id]: e.target.value,
                                          }))
                                        }
                                        placeholder="Nombre del artículo"
                                        className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl outline-none text-gray-900 dark:text-white focus:border-gray-400"
                                      />
                                      <div className="flex gap-2">
                                        <input
                                          type="number"
                                          min="1"
                                          step="1"
                                          value={newItemQuantities[list.id] || "1"}
                                          onChange={(e) =>
                                            setNewItemQuantities((prev) => ({
                                              ...prev,
                                              [list.id]: e.target.value,
                                            }))
                                          }
                                          placeholder="Cant."
                                          title="Cantidad"
                                          className="w-16 px-2 py-2 text-xs bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl outline-none text-center font-medium text-gray-900 dark:text-white"
                                        />
                                        <div className="relative w-24">
                                          <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-bold">
                                            $
                                          </span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            onKeyDown={blockNegativeKeys}
                                            value={newItemPrices[list.id] || ""}
                                            onChange={(e) =>
                                              setNewItemPrices((prev) => ({
                                                ...prev,
                                                [list.id]: e.target.value.replace(/-/g, ""),
                                              }))
                                            }
                                            placeholder="Precio"
                                            title="Precio unitario"
                                            className="w-full pl-6 pr-2 py-2 text-xs bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl outline-none font-medium text-gray-900 dark:text-white"
                                          />
                                        </div>
                                        <button
                                          type="submit"
                                          className="px-3.5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                                        >
                                          <PlusIcon className="w-3.5 h-3.5" />
                                          Añadir
                                        </button>
                                      </div>
                                    </div>
                                  </form>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* DEBTS & CARDS TAB */}
                  {effectiveTab === "debts" && (
                    <div className="space-y-10">
                      {isMobile ? renderMobileDebts() : (
                        <>
                          {/* Credit & Debit Cards Visual Section */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                              <CreditCard className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                              Mis Tarjetas (Crédito y Débito)
                            </h2>
                            <p className="text-xs text-gray-500">
                              Gestión visual de plásticos, límites, fechas de
                              corte y vencimientos
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setNewAccountType("credit");
                              setShowCreateAccountModal(true);
                            }}
                            className="text-xs font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-xl text-gray-900 dark:text-white transition-colors flex items-center gap-1.5"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Nueva Tarjeta
                          </button>
                        </div>

                        {accounts.filter(
                          (a) => a.type === "credit" || a.type === "debit",
                        ).length === 0 ? (
                          <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-2">
                            <CreditCard className="w-10 h-10 text-gray-400 mx-auto" />
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                              No tienes tarjetas registradas
                            </p>
                            <p className="text-xs text-gray-500">
                              Agrega tus tarjetas de crédito o débito desde
                              Ajustes para llevar control de deudas y fechas de
                              pago.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {accounts
                              .filter(
                                (a) =>
                                  a.type === "credit" || a.type === "debit",
                              )
                              .map((card) => {
                                const isCredit = card.type === "credit";
                                const limit = card.credit_limit_cents || 0;
                                const debtBalance = Math.abs(
                                  card.balance_cents,
                                );
                                const availableCents = isCredit
                                  ? limit - debtBalance
                                  : card.balance_cents;
                                const usedPct =
                                  isCredit && limit > 0
                                    ? Math.min(
                                        100,
                                        Math.round((debtBalance / limit) * 100),
                                      )
                                    : 0;

                                return (
                                  <div
                                    key={card.id}
                                    className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-4 text-gray-900 dark:text-white"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="text-[10px] tracking-wider font-semibold uppercase text-gray-400 block">
                                          {isCredit
                                            ? "Tarjeta de Crédito"
                                            : "Tarjeta de Débito"}
                                        </span>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                                          {card.name}
                                        </h3>
                                      </div>
                                      <span className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700">
                                        •••• {card.card_number_last4 || "4242"}
                                      </span>
                                    </div>

                                    {isCredit ? (
                                      <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div className="bg-gray-50 dark:bg-[#121212] p-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-800/80">
                                            <span className="text-[10px] text-gray-400 block uppercase font-medium">
                                              Deuda Actual
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                              {formatCurrency(debtBalance)}
                                            </span>
                                          </div>
                                          <div className="bg-gray-50 dark:bg-[#121212] p-2.5 rounded-xl border border-gray-200/60 dark:border-zinc-800/80">
                                            <span className="text-[10px] text-gray-400 block uppercase font-medium">
                                              Disponible
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                              {formatCurrency(availableCents)}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                                            <span>Uso de límite</span>
                                            <span>{usedPct}%</span>
                                          </div>
                                          <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300"
                                              style={{ width: `${usedPct}%` }}
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                                          <span>
                                            Corte: Día{" "}
                                            {card.cutoff_day || "N/A"}
                                          </span>
                                          <span>
                                            Pago: Día {card.due_day || "N/A"}
                                          </span>
                                        </div>

                                        {debtBalance > 0 && (
                                          <button
                                            onClick={() =>
                                              setShowPayCardModal(card)
                                            }
                                            className="w-full bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 py-2 rounded-xl text-xs font-semibold transition-colors shadow-2xs mt-1"
                                          >
                                            Abonar a Tarjeta
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                        <span className="text-[11px] text-gray-400 block uppercase font-medium">
                                          Saldo Disponible
                                        </span>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                          {formatCurrency(card.balance_cents)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Loans & Personal Debts Section */}
                      <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-zinc-850">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Préstamos Personales
                          </h2>
                          <p className="text-xs text-gray-400">
                            Control de dinero prestado y deudas con terceros
                          </p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          <div className="lg:col-span-8 space-y-3.5">
                            {debts.length === 0 ? (
                              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl p-10 text-center text-gray-400 text-xs">
                                No hay registro de préstamos ni deudas
                                personales. Crea uno a la derecha.
                              </div>
                            ) : (
                              debts.map((debt) => {
                                const isOwed = debt.type === "OWED";
                                const progress = Math.min(
                                  100,
                                  Math.round(
                                    ((debt.amount_cents -
                                      debt.remaining_cents) /
                                      debt.amount_cents) *
                                      100,
                                  ),
                                );

                                return (
                                  <div
                                    key={debt.id}
                                    className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm hover:border-gray-200 dark:hover:border-zinc-700 transition-all space-y-4"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOwed ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" : "bg-gray-950 text-white dark:bg-white dark:text-gray-950"}`}
                                          >
                                            {isOwed ? "Me deben" : "Debo"}
                                          </span>
                                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                            {debt.name}
                                          </h3>
                                        </div>
                                        {debt.due_date && (
                                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3 text-gray-400" />{" "}
                                            Vence: {debt.due_date}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <div className="text-right mr-1.5">
                                          <p className="text-[10px] text-gray-400 font-medium">
                                            Restante
                                          </p>
                                          <p className="font-bold text-sm text-gray-950 dark:text-white">
                                            {formatCurrency(
                                              debt.remaining_cents,
                                            )}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingDebt(debt);
                                            setEditDebtName(debt.name);
                                            setEditDebtType(debt.type);
                                            setEditDebtAmount(
                                              (
                                                debt.amount_cents / 100
                                              ).toString(),
                                            );
                                            setEditDebtRemaining(
                                              (
                                                debt.remaining_cents / 100
                                              ).toString(),
                                            );
                                            setEditDebtDueDate(
                                              debt.due_date || "",
                                            );
                                          }}
                                          className="text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-xl transition-colors shrink-0"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteDebt(debt.id)
                                          }
                                          className="text-gray-400 hover:text-red-500 p-1 rounded-xl transition-colors shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="h-1 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-zinc-800 dark:bg-white rounded-full transition-all duration-500"
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                      <div className="flex justify-between items-center pt-1">
                                        <span className="text-[11px] text-gray-400 font-medium">
                                          {formatCurrency(
                                            debt.amount_cents -
                                              debt.remaining_cents,
                                          )}{" "}
                                          de {formatCurrency(debt.amount_cents)}{" "}
                                          pagado ({progress}%)
                                        </span>
                                        {debt.remaining_cents > 0 && (
                                          <button
                                            onClick={() => {
                                              setShowPayDebtModal(debt);
                                              setPayDebtAmount("");
                                              setPayDebtAccountId("");
                                            }}
                                            className="text-[11px] font-semibold bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white px-3 py-1.5 rounded-lg transition-colors"
                                          >
                                            Abonar {isOwed ? "Cobro" : "Pago"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <div className="lg:col-span-4">
                            <form
                              onSubmit={handleAddDebt}
                              className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4 shadow-sm sticky top-6"
                            >
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Nuevo Préstamo
                              </h3>

                              <div className="flex gap-1.5 p-1 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => setDebtType("OWE")}
                                  className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${debtType === "OWE" ? "bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white" : "text-gray-400 hover:text-gray-900"}`}
                                >
                                  Yo debo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDebtType("OWED")}
                                  className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${debtType === "OWED" ? "bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white" : "text-gray-400 hover:text-gray-900"}`}
                                >
                                  Me deben
                                </button>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                  Nombre/Persona
                                </label>
                                <input
                                  required
                                  type="text"
                                  value={debtName}
                                  onChange={(e) => setDebtName(e.target.value)}
                                  placeholder="Ej. Juan Pérez"
                                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                  Monto Total
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-sm">
                                      $
                                    </span>
                                  </div>
                                  <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    onKeyDown={blockNegativeKeys}
                                    value={debtAmount}
                                    onChange={(e) =>
                                      setDebtAmount(
                                        e.target.value.replace(/-/g, ""),
                                      )
                                    }
                                    placeholder="0.00"
                                    className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                  Fecha límite (Opcional)
                                </label>
                                <input
                                  type="date"
                                  value={debtDueDate}
                                  onChange={(e) =>
                                    setDebtDueDate(e.target.value)
                                  }
                                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
                                />
                              </div>
                              <button
                                type="submit"
                                className="w-full bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                              >
                                Guardar
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* MOBILE STATS RENDERER */}
                  {(() => {
                    (window as any).renderMobileStats = () => {
                      // 1. Filtered Transactions
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth();

                      const filteredTx = transactions.filter(t => {
                        const tDate = new Date(t.date + "T12:00:00");
                        if (isNaN(tDate.getTime())) return false;

                        if (statsPeriod === "THIS_MONTH") {
                          return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
                        }
                        if (statsPeriod === "LAST_MONTH") {
                          let targetYear = currentYear;
                          let targetMonth = currentMonth - 1;
                          if (targetMonth < 0) {
                            targetMonth = 11;
                            targetYear -= 1;
                          }
                          return tDate.getFullYear() === targetYear && tDate.getMonth() === targetMonth;
                        }
                        if (statsPeriod === "LAST_3_MONTHS") {
                          const boundary = new Date(currentYear, currentMonth - 3, 1);
                          return tDate >= boundary && tDate <= now;
                        }
                        if (statsPeriod === "LAST_6_MONTHS") {
                          const boundary = new Date(currentYear, currentMonth - 6, 1);
                          return tDate >= boundary && tDate <= now;
                        }
                        if (statsPeriod === "THIS_YEAR") {
                          return tDate.getFullYear() === currentYear;
                        }
                        return true;
                      });

                      // 2. Days Elapsed
                      const periodDays = (() => {
                        if (statsPeriod === "THIS_MONTH") {
                          return Math.max(1, now.getDate());
                        }
                        if (statsPeriod === "LAST_MONTH") {
                          return new Date(now.getFullYear(), now.getMonth(), 0).getDate();
                        }
                        if (statsPeriod === "LAST_3_MONTHS") {
                          return 90;
                        }
                        if (statsPeriod === "LAST_6_MONTHS") {
                          return 180;
                        }
                        if (statsPeriod === "THIS_YEAR") {
                          const startOfYear = new Date(now.getFullYear(), 0, 1);
                          const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return Math.max(1, diffDays);
                        }
                        return 30;
                      })();

                      // 3. Metrics Calculations
                      const periodIncome = filteredTx.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount_cents, 0) / 100;
                      const periodExpenses = filteredTx.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount_cents, 0) / 100;
                      const periodNet = periodIncome - periodExpenses;
                      const periodSavingsRate = periodIncome > 0 ? Math.round((periodNet / periodIncome) * 100) : (periodExpenses > 0 ? -100 : 0);
                      const periodDailyAvg = periodDays > 0 ? Math.round(periodExpenses / periodDays) : 0;

                      // Monthly projection based on current month
                      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                      const currentDay = Math.max(1, now.getDate());
                      const dailyAverageExpense = Math.round((expensesThisMonth / 100) / currentDay);
                      const projectedMonthlyExpense = dailyAverageExpense * daysInMonth;

                      // Credit limits & usage
                      const creditAccounts = accounts.filter((a) => a.type === "credit");
                      const totalCreditLimit = creditAccounts.reduce((sum, a) => sum + (a.credit_limit_cents || 0), 0);
                      const totalCreditUsed = creditAccounts.reduce((sum, a) => sum + a.balance_cents, 0);
                      const creditUtilization = totalCreditLimit > 0 ? Math.min(100, Math.round((totalCreditUsed / totalCreditLimit) * 100)) : 0;

                      // 4. Flow Data for selected period
                      const flowData = (() => {
                        if (statsPeriod === "THIS_MONTH" || statsPeriod === "LAST_MONTH") {
                          const targetYear = statsPeriod === "THIS_MONTH" ? currentYear : (currentMonth === 0 ? currentYear - 1 : currentYear);
                          const targetMonth = statsPeriod === "THIS_MONTH" ? currentMonth : (currentMonth === 0 ? 11 : currentMonth - 1);
                          const days = new Date(targetYear, targetMonth + 1, 0).getDate();
                          const prefix = `${targetYear}-${(targetMonth + 1).toString().padStart(2, "0")}`;

                          return Array.from({ length: days }).map((_, i) => {
                            const dayNum = i + 1;
                            const dayStr = `${prefix}-${dayNum.toString().padStart(2, "0")}`;
                            const dayTx = transactions.filter((t) => t.date === dayStr);
                            const exp = dayTx.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                            const inc = dayTx.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                            return {
                              label: `${dayNum}`,
                              Gastos: exp,
                              Ingresos: inc,
                            };
                          });
                        } else if (statsPeriod === "LAST_3_MONTHS" || statsPeriod === "LAST_6_MONTHS") {
                          const count = statsPeriod === "LAST_3_MONTHS" ? 3 : 6;
                          return Array.from({ length: count }).map((_, i) => {
                            const d = new Date();
                            d.setMonth(d.getMonth() - ((count - 1) - i));
                            const prefix = d.toISOString().substring(0, 7);
                            const mTx = transactions.filter((t) => t.date.startsWith(prefix));
                            const inc = mTx.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                            const exp = mTx.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                            return {
                              label: d.toLocaleString("es-ES", { month: "short" }),
                              Gastos: exp,
                              Ingresos: inc,
                            };
                          });
                        } else {
                          // THIS_YEAR
                          return Array.from({ length: 12 }).map((_, i) => {
                            const prefix = `${currentYear}-${(i + 1).toString().padStart(2, "0")}`;
                            const mTx = transactions.filter((t) => t.date.startsWith(prefix));
                            const inc = mTx.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                            const exp = mTx.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                            return {
                              label: new Date(currentYear, i, 1).toLocaleString("es-ES", { month: "narrow" }),
                              Gastos: exp,
                              Ingresos: inc,
                            };
                          });
                        }
                      })();

                      // 5. Historical trend (6 months)
                      const sixMonthsData = Array.from({ length: 6 }).map((_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - (5 - i));
                        const prefix = d.toISOString().substring(0, 7);
                        const mTx = transactions.filter((t) => t.date.startsWith(prefix));
                        const inc = mTx.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                        const exp = mTx.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount_cents / 100, 0);
                        return {
                          month: d.toLocaleString("es-ES", { month: "short" }),
                          Ingresos: inc,
                          Gastos: exp,
                          Ahorro: inc - exp,
                        };
                      });

                      // 6. Category Breakdown
                      const catExpenseMap: Record<string, { amount: number; emoji: string; id: number }> = {};
                      filteredTx
                        .filter((t) => t.type === "EXPENSE")
                        .forEach((t) => {
                          const cat = categories.find((c) => c.id === t.category_id);
                          const catName = cat?.name || "Sin Categoría";
                          const catEmoji = cat?.emoji || "📦";
                          const catId = cat?.id || -1;
                          if (!catExpenseMap[catName]) {
                            catExpenseMap[catName] = {
                              amount: 0,
                              emoji: catEmoji,
                              id: catId,
                            };
                          }
                          catExpenseMap[catName].amount += t.amount_cents / 100;
                        });

                      const sortedCategoryBreakdown = Object.entries(catExpenseMap)
                        .map(([name, data]) => ({ name, ...data }))
                        .sort((a, b) => b.amount - a.amount);

                      const totalCatExpense = sortedCategoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

                      // 7. Previous month comparison metrics
                      let prevMonth = currentMonth - 1;
                      let prevYear = currentYear;
                      if (prevMonth < 0) {
                        prevMonth = 11;
                        prevYear -= 1;
                      }
                      const prevMonthName = new Date(prevYear, prevMonth, 1).toLocaleString("es-ES", { month: "long" });

                      const prevMonthTx = transactions.filter(t => {
                        const tDate = new Date(t.date + "T12:00:00");
                        if (isNaN(tDate.getTime())) return false;
                        return tDate.getFullYear() === prevYear && tDate.getMonth() === prevMonth;
                      });

                      const prevMonthIncome = prevMonthTx.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount_cents, 0) / 100;
                      const prevMonthExpenses = prevMonthTx.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount_cents, 0) / 100;
                      const prevMonthSavings = prevMonthIncome - prevMonthExpenses;
                      const prevSavingsRate = prevMonthIncome > 0 ? Math.round((prevMonthSavings / prevMonthIncome) * 100) : 0;

                      const savingsRateDiff = periodSavingsRate - prevSavingsRate;
                      const gastosDiff = prevMonthExpenses > 0 ? Math.round(((periodExpenses - prevMonthExpenses) / prevMonthExpenses) * 100) : 0;
                      const ingresosDiff = prevMonthIncome > 0 ? Math.round(((periodIncome - prevMonthIncome) / prevMonthIncome) * 100) : 0;
                      const ahorroDiff = periodNet - prevMonthSavings;

                      const hasSuffData = flowData.some(d => d.Gastos > 0 || d.Ingresos > 0);

                      // Category transactions inside modal
                      const categoryTxs = (() => {
                        if (!selectedCategoryName) return [];
                        return filteredTx.filter((t) => {
                          const cat = categories.find((c) => c.id === t.category_id);
                          return (cat?.name || "Sin Categoría") === selectedCategoryName;
                        });
                      })();

                      return (
                        <div className="space-y-5 pb-10">
                          {/* Period Selector Box */}
                          <div className="flex items-center justify-between border-b border-gray-150 dark:border-zinc-800 pb-2.5">
                            <span className="text-xs text-gray-500 font-medium">Filtro de período:</span>
                            <div className="relative">
                              <select
                                value={statsPeriod}
                                onChange={(e) => setStatsPeriod(e.target.value as any)}
                                className="appearance-none bg-gray-100 dark:bg-zinc-850 hover:bg-gray-200/80 dark:hover:bg-zinc-800 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg border-none cursor-pointer focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
                              >
                                <option value="THIS_MONTH">Este mes</option>
                                <option value="LAST_MONTH">Mes anterior</option>
                                <option value="LAST_3_MONTHS">Últimos 3 meses</option>
                                <option value="LAST_6_MONTHS">Últimos 6 meses</option>
                                <option value="THIS_YEAR">Este año</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                          </div>

                          {/* 2x2 Grid of Key Metrics */}
                          <div className="grid grid-cols-2 gap-3.5">
                            {/* Tasa de Ahorro */}
                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                                Tasa de ahorro
                              </span>
                              <span className={`text-lg font-black block ${periodSavingsRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {periodSavingsRate}%
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-semibold leading-tight">
                                {periodSavingsRate >= 0 ? "Ahorro de " : "Déficit de "}{formatCurrency(Math.abs(periodNet * 100))}
                              </span>
                            </div>

                            {/* Promedio Diario */}
                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                                Promedio diario
                              </span>
                              <span className="text-lg font-black text-gray-900 dark:text-white block">
                                {formatCurrency(periodDailyAvg * 100)}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 block leading-tight">
                                Gasto por día
                              </span>
                            </div>

                            {/* Proyección Fin de Mes */}
                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                                Proyección mes
                              </span>
                              <span className="text-lg font-black text-gray-900 dark:text-white block">
                                {formatCurrency(projectedMonthlyExpense)}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 block leading-tight">
                                Estimación mensual
                              </span>
                            </div>

                            {/* Uso de Crédito */}
                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                                Uso de crédito
                              </span>
                              <span className={`text-lg font-black block ${creditUtilization > 70 ? "text-rose-500" : "text-gray-900 dark:text-white"}`}>
                                {creditUtilization}%
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 block leading-tight">
                                Límite {formatCurrency(totalCreditLimit)}
                              </span>
                            </div>
                          </div>

                          {/* Dynamic Charts or Empty State */}
                          {!hasSuffData ? (
                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-6 rounded-2xl text-center space-y-3">
                              <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                  Todavía no hay suficientes movimientos para analizar
                                </h4>
                                <p className="text-[10px] text-gray-400 max-w-[240px] mx-auto">
                                  No existen registros de ingresos o gastos para el período seleccionado.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMobileMainTab("transactions")}
                                className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] font-bold py-1.5 px-3.5 rounded-lg transition-all"
                              >
                                Ver movimientos
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-5">
                              {/* Flujo de dinero Evolution Chart */}
                              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-3">
                                <div>
                                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                                    Flujo de Dinero
                                  </h3>
                                  <p className="text-[10px] text-gray-400">
                                    Evolución temporal de ingresos y gastos
                                  </p>
                                </div>
                                <div className="h-[210px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <XAxis dataKey="label" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                                      <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                      <Tooltip 
                                        formatter={(value: any) => [`$${Math.round(value)}`, undefined]}
                                        contentStyle={{ background: '#000', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                                      />
                                      <Area type="monotone" dataKey="Ingresos" stroke="#10b981" fillOpacity={1} fill="url(#incomeColor)" strokeWidth={2} />
                                      <Area type="monotone" dataKey="Gastos" stroke="#f43f5e" fillOpacity={1} fill="url(#expenseColor)" strokeWidth={2} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* Gastos por categoría Horizontal Progress Bars */}
                              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                                      Distribución por Categorías
                                    </h3>
                                    <p className="text-[10px] text-gray-400">
                                      Principales focos de consumo
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowAllCategoriesModal(true)}
                                    className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                  >
                                    Ver todas
                                  </button>
                                </div>

                                {sortedCategoryBreakdown.length === 0 ? (
                                  <p className="text-[11px] text-gray-400 text-center py-4">
                                    No hay gastos registrados en este período.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {sortedCategoryBreakdown.slice(0, 3).map((cat, idx) => {
                                      const pct = totalCatExpense > 0 ? Math.round((cat.amount / totalCatExpense) * 100) : 0;
                                      return (
                                        <div key={idx} className="space-y-1">
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span className="font-semibold flex items-center gap-1.5 text-gray-900 dark:text-white">
                                              <span>{cat.emoji}</span>
                                              <span>{cat.name}</span>
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                              {formatCurrency(Math.round(cat.amount * 100))}
                                              <span className="text-gray-400 font-normal ml-1">
                                                ({pct}%)
                                              </span>
                                            </span>
                                          </div>
                                          <div className="h-2 bg-gray-150 dark:bg-zinc-900 rounded-full overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200 transition-all duration-500"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Tendencia Histórica 6 Meses with interactive Legend toggles */}
                              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-3">
                                <div>
                                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                                    Tendencia Histórica (6 Meses)
                                  </h3>
                                  <p className="text-[10px] text-gray-400">
                                    Haz clic para activar/desactivar series
                                  </p>
                                </div>

                                <div className="h-[210px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sixMonthsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                                      <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                      <Tooltip 
                                        formatter={(value: any) => [`$${Math.round(value)}`, undefined]}
                                        contentStyle={{ background: '#000', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                                      />
                                      {trendSeries.ingresos && (
                                        <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                      )}
                                      {trendSeries.gastos && (
                                        <Line type="monotone" dataKey="Gastos" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                      )}
                                      {trendSeries.ahorro && (
                                        <Line type="monotone" dataKey="Ahorro" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 1.5 }} />
                                      )}
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>

                                {/* Multi-series interactive Legend */}
                                <div className="flex gap-2.5 justify-center text-[10px] font-bold pt-1 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setTrendSeries(prev => ({ ...prev, ingresos: !prev.ingresos }))}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                                      trendSeries.ingresos
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40"
                                        : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-zinc-900/40 dark:border-zinc-800"
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Ingresos
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTrendSeries(prev => ({ ...prev, gastos: !prev.gastos }))}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                                      trendSeries.gastos
                                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40"
                                        : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-zinc-900/40 dark:border-zinc-800"
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Gastos
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTrendSeries(prev => ({ ...prev, ahorro: !prev.ahorro }))}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                                      trendSeries.ahorro
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/40"
                                        : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-zinc-900/40 dark:border-zinc-800"
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Ahorro
                                  </button>
                                </div>
                              </div>

                              {/* Previous Period Comparison Summary */}
                              <div className="bg-white dark:bg-[#0a0a0a] border border-gray-250/85 dark:border-zinc-850 p-4 rounded-2xl space-y-3">
                                <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                                  Comparado con {prevMonthName}
                                </span>
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Gastos</span>
                                    <span className={`text-xs font-black flex items-center justify-center gap-0.5 ${gastosDiff > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                      {gastosDiff > 0 ? "↑" : "↓"} {Math.abs(gastosDiff)}%
                                    </span>
                                  </div>
                                  <div className="space-y-1 border-l border-gray-100 dark:border-zinc-850/80">
                                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Ingresos</span>
                                    <span className={`text-xs font-black flex items-center justify-center gap-0.5 ${ingresosDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                      {ingresosDiff >= 0 ? "↑" : "↓"} {Math.abs(ingresosDiff)}%
                                    </span>
                                  </div>
                                  <div className="space-y-1 border-l border-gray-100 dark:border-zinc-850/80">
                                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Ahorro</span>
                                    <span className={`text-xs font-black flex items-center justify-center gap-0.5 ${ahorroDiff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                      {ahorroDiff >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(ahorroDiff * 100))}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Modal Category Detail */}
                          {showAllCategoriesModal && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center z-50">
                              <div className="bg-white dark:bg-[#09090b] w-full max-w-md rounded-t-3xl p-5 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto">
                                {/* Modal Header */}
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-2.5">
                                  <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                      Gastos por Categoría
                                    </h3>
                                    <p className="text-[10px] text-gray-500">
                                      Desglose detallado del período seleccionado
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setShowAllCategoriesModal(false);
                                      setSelectedCategoryName(null);
                                    }}
                                    className="p-1.5 rounded-full bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                  >
                                    <XIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Categories list in modal */}
                                <div className="space-y-3">
                                  {sortedCategoryBreakdown.map((cat, idx) => {
                                    const pct = totalCatExpense > 0 ? Math.round((cat.amount / totalCatExpense) * 100) : 0;
                                    const isSelected = selectedCategoryName === cat.name;

                                    return (
                                      <div key={cat.name} className="space-y-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedCategoryName(isSelected ? null : cat.name)}
                                          className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                                            isSelected
                                              ? "bg-zinc-50 border-zinc-900 dark:bg-zinc-900 dark:border-white"
                                              : "bg-white border-gray-100 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-850"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-base">{cat.emoji}</span>
                                            <div>
                                              <span className="text-xs font-bold text-gray-900 dark:text-white block">
                                                {idx + 1}. {cat.name}
                                              </span>
                                              <span className="text-[9px] text-gray-400">
                                                {pct}% del total
                                              </span>
                                            </div>
                                          </div>
                                          <div className="text-right flex items-center gap-1">
                                            <span className="text-xs font-black text-gray-900 dark:text-white">
                                              {formatCurrency(Math.round(cat.amount * 100))}
                                            </span>
                                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`} />
                                          </div>
                                        </button>

                                        {/* Expanded transaction logs */}
                                        {isSelected && (
                                          <div className="bg-gray-50/50 dark:bg-zinc-900/30 rounded-xl p-3 border border-dashed border-gray-200 dark:border-zinc-800 space-y-2.5 mx-0.5 animate-fade-in">
                                            <div className="text-[9px] uppercase tracking-wider font-bold text-gray-400">
                                              Movimientos asociados
                                            </div>
                                            {categoryTxs.length > 0 ? (
                                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {categoryTxs.map((t) => (
                                                  <div key={t.id} className="flex justify-between items-center text-[11px]">
                                                    <div>
                                                      <span className="font-semibold text-gray-800 dark:text-zinc-200 block truncate max-w-[180px]">
                                                        {t.concept || "Sin concepto"}
                                                      </span>
                                                      <span className="text-[9px] text-gray-400">
                                                        {t.date} · {accounts.find(a => a.id === t.account_id)?.name || "Cuenta"}
                                                      </span>
                                                    </div>
                                                    <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                                      -{formatCurrency(t.amount_cents)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-[10px] text-gray-400 text-center py-1">
                                                No hay transacciones registradas.
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    return null;
                  })()}

                  {/* STATS TAB */}
                  {effectiveTab === "stats" &&
                    (() => {
                      if (isMobile && (window as any).renderMobileStats) {
                        return (window as any).renderMobileStats();
                      }

                      // Calculate analytics metrics
                      const totalIncome = transactions
                        .filter((t) => t.type === "INCOME")
                        .reduce((a, b) => a + b.amount_cents, 0);
                      const totalExpenses = transactions
                        .filter((t) => t.type === "EXPENSE")
                        .reduce((a, b) => a + b.amount_cents, 0);
                      const netSavings = totalIncome - totalExpenses;
                      const savingsRate =
                        totalIncome > 0
                          ? Math.max(
                              0,
                              Math.round((netSavings / totalIncome) * 100),
                            )
                          : 0;

                      const today = new Date();
                      const daysInMonth = new Date(
                        today.getFullYear(),
                        today.getMonth() + 1,
                        0,
                      ).getDate();
                      const currentDay = Math.max(1, today.getDate());
                      const dailyAverageExpense = Math.round(
                        expensesThisMonth / currentDay,
                      );
                      const projectedMonthlyExpense =
                        dailyAverageExpense * daysInMonth;

                      const creditAccounts = accounts.filter(
                        (a) => a.type === "credit",
                      );
                      const totalCreditLimit = creditAccounts.reduce(
                        (a, b) => a + (b.credit_limit_cents || 0),
                        0,
                      );
                      const totalCreditUsed = creditAccounts.reduce(
                        (a, b) => a + b.balance_cents,
                        0,
                      );
                      const creditUtilization =
                        totalCreditLimit > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (totalCreditUsed / totalCreditLimit) * 100,
                              ),
                            )
                          : 0;

                      // Daily expenses for line chart
                      const currentMonthPrefix = today
                        .toISOString()
                        .substring(0, 7);
                      const dailyData = Array.from({ length: currentDay }).map(
                        (_, i) => {
                          const dayNum = i + 1;
                          const dayStr = `${currentMonthPrefix}-${dayNum.toString().padStart(2, "0")}`;
                          const dayTx = transactions.filter(
                            (t) => t.date === dayStr,
                          );
                          const exp = dayTx
                            .filter((t) => t.type === "EXPENSE")
                            .reduce((a, b) => a + b.amount_cents / 100, 0);
                          const inc = dayTx
                            .filter((t) => t.type === "INCOME")
                            .reduce((a, b) => a + b.amount_cents / 100, 0);
                          return {
                            day: `${dayNum}`,
                            Gasto: exp,
                            Ingreso: inc,
                          };
                        },
                      );

                      // 6 Months historical line chart data
                      const sixMonthsData = Array.from({ length: 6 }).map(
                        (_, i) => {
                          const d = new Date();
                          d.setMonth(d.getMonth() - (5 - i));
                          const prefix = d.toISOString().substring(0, 7);
                          const mTx = transactions.filter((t) =>
                            t.date.startsWith(prefix),
                          );
                          const inc = mTx
                            .filter((t) => t.type === "INCOME")
                            .reduce((a, b) => a + b.amount_cents / 100, 0);
                          const exp = mTx
                            .filter((t) => t.type === "EXPENSE")
                            .reduce((a, b) => a + b.amount_cents / 100, 0);
                          return {
                            month: d.toLocaleString("es-ES", {
                              month: "short",
                            }),
                            Ingresos: inc,
                            Gastos: exp,
                            Ahorro: inc - exp,
                          };
                        },
                      );

                      // Category breakdown with percentages
                      const catExpenseMap: Record<
                        string,
                        { amount: number; emoji: string }
                      > = {};
                      transactions
                        .filter((t) => t.type === "EXPENSE")
                        .forEach((t) => {
                          const cat = categories.find(
                            (c) => c.id === t.category_id,
                          );
                          const catName = cat?.name || "Sin Categoría";
                          const catEmoji = cat?.emoji || "📦";
                          if (!catExpenseMap[catName]) {
                            catExpenseMap[catName] = {
                              amount: 0,
                              emoji: catEmoji,
                            };
                          }
                          catExpenseMap[catName].amount += t.amount_cents / 100;
                        });
                      const sortedCategoryBreakdown = Object.entries(
                        catExpenseMap,
                      )
                        .map(([name, data]) => ({ name, ...data }))
                        .sort((a, b) => b.amount - a.amount);
                      const totalCatExpense = sortedCategoryBreakdown.reduce(
                        (a, b) => a + b.amount,
                        0,
                      );

                      const categoryPalette = [
                        "#10b981",
                        "#f43f5e",
                        "#6366f1",
                        "#f59e0b",
                        "#06b6d4",
                        "#8b5cf6",
                        "#ec4899",
                        "#3b82f6",
                      ];

                      return (
                        <div className="space-y-8 max-w-5xl mx-auto">
                          <div className="border-b border-gray-200 dark:border-zinc-800 pb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                              Análisis Financiero
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                              Métricas clave, proyecciones y patrones de gasto
                              consolidados
                            </p>
                          </div>

                          {/* KPI Metrics Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Savings Rate Card */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500">
                                  Tasa de Ahorro
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    savingsRate >= 20
                                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                                      : savingsRate > 0
                                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50"
                                        : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50"
                                  }`}
                                >
                                  {savingsRate >= 20
                                    ? "Saludable"
                                    : savingsRate > 0
                                      ? "Estable"
                                      : "Deficitario"}
                                </span>
                              </div>
                              <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {savingsRate}%
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${netSavings >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, savingsRate))}%`,
                                    }}
                                  />
                                </div>
                                <p className="text-[10px] text-gray-400 flex items-center justify-between">
                                  <span>Superávit:</span>
                                  <strong
                                    className={`font-semibold ${netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                                  >
                                    {formatCurrency(netSavings)}
                                  </strong>
                                </p>
                              </div>
                            </div>

                            {/* Daily Average Expense Card */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500">
                                  Promedio Diario
                                </span>
                                <TrendingDown className="w-4 h-4 text-rose-500" />
                              </div>
                              <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {formatCurrency(dailyAverageExpense)}
                              </div>
                              <p className="text-[10px] text-gray-400">
                                Basado en {currentDay} días transcurridos
                              </p>
                            </div>

                            {/* Projected Monthly Expense Card */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500">
                                  Proyección Fin de Mes
                                </span>
                                <BarChart3 className="w-4 h-4 text-amber-500" />
                              </div>
                              <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {formatCurrency(projectedMonthlyExpense)}
                              </div>
                              <p className="text-[10px] text-gray-400">
                                Estimación para {daysInMonth} días del mes
                              </p>
                            </div>

                            {/* Credit Utilization Card */}
                            <div className="p-5 rounded-2xl bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500">
                                  Uso de Crédito
                                </span>
                                <CreditCard className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div
                                className={`text-2xl font-bold tracking-tight ${creditUtilization > 70 ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white"}`}
                              >
                                {creditUtilization}%
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${creditUtilization > 70 ? "bg-rose-500" : creditUtilization > 40 ? "bg-amber-500" : "bg-indigo-500"}`}
                                    style={{ width: `${creditUtilization}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-gray-400 flex justify-between">
                                  <span>{formatCurrency(totalCreditUsed)}</span>
                                  <span>
                                    de {formatCurrency(totalCreditLimit)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Line Charts Grid */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Real Daily Expense Line/Area Chart */}
                            <div className="bg-white dark:bg-[#09090b] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Gasto Diario vs Ingresos (Mes Actual)
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    Comportamiento día por día
                                  </p>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-700 dark:text-gray-300">
                                  Mensual
                                </span>
                              </div>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={dailyData}>
                                    <defs>
                                      <linearGradient
                                        id="expenseGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                      >
                                        <stop
                                          offset="5%"
                                          stopColor="#f43f5e"
                                          stopOpacity={0.25}
                                        />
                                        <stop
                                          offset="95%"
                                          stopColor="#f43f5e"
                                          stopOpacity={0}
                                        />
                                      </linearGradient>
                                      <linearGradient
                                        id="incomeGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                      >
                                        <stop
                                          offset="5%"
                                          stopColor="#10b981"
                                          stopOpacity={0.25}
                                        />
                                        <stop
                                          offset="95%"
                                          stopColor="#10b981"
                                          stopOpacity={0}
                                        />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      vertical={false}
                                      stroke="#e5e7eb"
                                    />
                                    <XAxis
                                      dataKey="day"
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fontSize: 11, fill: "#71717a" }}
                                    />
                                    <YAxis
                                      axisLine={false}
                                      tickLine={false}
                                      tickFormatter={(val) => `$${val}`}
                                      tick={{ fontSize: 11, fill: "#71717a" }}
                                    />
                                    <Tooltip
                                      formatter={(value: number) =>
                                        new Intl.NumberFormat("en-US", {
                                          style: "currency",
                                          currency: "USD",
                                        }).format(value)
                                      }
                                    />
                                    <Legend />
                                    <Area
                                      type="monotone"
                                      dataKey="Gasto"
                                      stroke="#f43f5e"
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill="url(#expenseGradient)"
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="Ingreso"
                                      stroke="#10b981"
                                      strokeWidth={2}
                                      strokeDasharray="3 3"
                                      fillOpacity={1}
                                      fill="url(#incomeGradient)"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* 6 Months Trend Line Chart */}
                            <div className="bg-white dark:bg-[#09090b] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Tendencia Histórica (6 Meses)
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    Comparación de flujos mensual
                                  </p>
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-gray-700 dark:text-gray-300">
                                  Histórico
                                </span>
                              </div>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={sixMonthsData}>
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      vertical={false}
                                      stroke="#e5e7eb"
                                    />
                                    <XAxis
                                      dataKey="month"
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fontSize: 11, fill: "#71717a" }}
                                    />
                                    <YAxis
                                      axisLine={false}
                                      tickLine={false}
                                      tickFormatter={(val) => `$${val}`}
                                      tick={{ fontSize: 11, fill: "#71717a" }}
                                    />
                                    <Tooltip
                                      formatter={(value: number) =>
                                        new Intl.NumberFormat("en-US", {
                                          style: "currency",
                                          currency: "USD",
                                        }).format(value)
                                      }
                                    />
                                    <Legend />
                                    <Line
                                      type="monotone"
                                      dataKey="Ingresos"
                                      stroke="#10b981"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 5 }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="Gastos"
                                      stroke="#f43f5e"
                                      strokeWidth={2.5}
                                      dot={{ r: 3 }}
                                      activeDot={{ r: 5 }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="Ahorro"
                                      stroke="#6366f1"
                                      strokeWidth={1.5}
                                      strokeDasharray="3 3"
                                      dot={{ r: 2 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>

                          {/* Category Breakdown & Progress Gauges */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Category Progress Bars */}
                            <div className="bg-white dark:bg-[#09090b] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                Gastos por Categoría
                              </h3>
                              {sortedCategoryBreakdown.length === 0 ? (
                                <p className="text-xs text-gray-500 text-center py-8">
                                  No hay gastos registrados para analizar.
                                </p>
                              ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                  {sortedCategoryBreakdown.map((cat, idx) => {
                                    const pct =
                                      totalCatExpense > 0
                                        ? Math.round(
                                            (cat.amount / totalCatExpense) *
                                              100,
                                          )
                                        : 0;
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="font-semibold flex items-center gap-1.5 text-gray-900 dark:text-white">
                                            <span>{cat.emoji}</span>
                                            <span>{cat.name}</span>
                                          </span>
                                          <span className="font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(
                                              Math.round(cat.amount * 100),
                                            )}{" "}
                                            <span className="text-gray-400 font-normal">
                                              ({pct}%)
                                            </span>
                                          </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                              width: `${pct}%`,
                                              backgroundColor:
                                                categoryPalette[
                                                  idx % categoryPalette.length
                                                ],
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Category Pie Chart */}
                            <div className="bg-white dark:bg-[#09090b] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
                              <h3 className="text-sm font-bold text-center text-gray-900 dark:text-white">
                                Distribución de Gastos
                              </h3>
                              <div className="h-64">
                                {sortedCategoryBreakdown.length > 0 ? (
                                  <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                  >
                                    <RechartsPieChart>
                                      <Pie
                                        data={sortedCategoryBreakdown.map(
                                          (c) => ({
                                            name: `${c.emoji} ${c.name}`,
                                            value: c.amount,
                                          }),
                                        )}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                      >
                                        {sortedCategoryBreakdown.map(
                                          (_, index) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                categoryPalette[
                                                  index % categoryPalette.length
                                                ]
                                              }
                                            />
                                          ),
                                        )}
                                      </Pie>
                                      <Tooltip
                                        formatter={(value: number) =>
                                          new Intl.NumberFormat("en-US", {
                                            style: "currency",
                                            currency: "USD",
                                          }).format(value)
                                        }
                                      />
                                      <Legend />
                                    </RechartsPieChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <p className="text-center text-xs text-gray-500 mt-20">
                                    No hay suficientes datos
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  {/* CLOSING TAB */}
                  {effectiveTab === "closing" && (
                    isMobile ? (
                      <div className="space-y-6">
                        {selectedHistoricalMonth ? (
                          // 7.1 DETALLE DE MES
                          (() => {
                            const monthKey = selectedHistoricalMonth;
                            const [yr, mn] = monthKey.split("-");
                            const monthsList = [
                              "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                              "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                            ];
                            const monthName = `${monthsList[parseInt(mn) - 1]} ${yr}`;
                            
                            const monthTx = transactions.filter(t => t.date.startsWith(monthKey));
                            const inc = monthTx.filter(t => t.type === "INCOME").reduce((acc, t) => acc + t.amount_cents, 0);
                            const exp = monthTx.filter(t => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount_cents, 0);
                            const net = inc - exp;
                            
                            const expTx = monthTx.filter(t => t.type === "EXPENSE");
                            const totalExp = expTx.reduce((acc, t) => acc + t.amount_cents, 0);
                            const catMap = new Map<string, number>();
                            expTx.forEach(t => {
                              catMap.set(t.category_id, (catMap.get(t.category_id) || 0) + t.amount_cents);
                            });
                            const catList = Array.from(catMap.entries()).map(([catId, amount]) => {
                              const cat = categories.find(c => c.id === catId);
                              return {
                                id: catId,
                                name: cat?.name || "Otros",
                                emoji: cat?.emoji || "🛒",
                                amount,
                                percent: totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0,
                              };
                            }).sort((a, b) => b.amount - a.amount);

                            return (
                              <div className="space-y-6 animate-fade-in">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHistoricalMonth(null)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Cierre y reportes</span>
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => setShowHistoricalOptionsSheet(true)}
                                    className="p-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors"
                                  >
                                    <MoreHorizontal className="w-5 h-5" />
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {monthName}
                                  </h2>
                                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                                    Reporte detallado del mes
                                  </p>
                                </div>

                                {/* Metrics Summary */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">
                                      Ingresos
                                    </span>
                                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-500 mt-0.5">
                                      {formatCurrency(inc)}
                                    </div>
                                  </div>

                                  <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">
                                      Gastos
                                    </span>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                                      {formatCurrency(exp)}
                                    </div>
                                  </div>

                                  <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">
                                      Flujo Neto
                                    </span>
                                    <div className={`text-lg font-bold mt-0.5 ${net >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                                      {net >= 0 ? "+" : ""}
                                      {formatCurrency(net)}
                                    </div>
                                  </div>

                                  <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold">
                                      Movimientos
                                    </span>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                                      {monthTx.length}
                                    </div>
                                  </div>
                                </div>

                                {/* Gastos por categoría */}
                                <div className="space-y-3">
                                  <h3 className="text-xs font-bold tracking-wider text-gray-400 dark:text-zinc-500 uppercase px-1">
                                    Gastos por categoría
                                  </h3>
                                  
                                  {catList.length === 0 ? (
                                    <div className="p-6 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl text-center text-xs text-gray-400">
                                      Sin gastos registrados en este período.
                                    </div>
                                  ) : (
                                    <div className="p-4 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl space-y-4">
                                      {catList.map(item => (
                                        <div key={item.id} className="space-y-1.5">
                                          <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                                              <span>{item.emoji}</span>
                                              <span>{item.name}</span>
                                            </span>
                                            <div className="text-right">
                                              <span className="font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(item.amount)}
                                              </span>
                                              <span className="text-gray-400 dark:text-zinc-500 ml-1.5 text-[10px]">
                                                {item.percent}%
                                              </span>
                                            </div>
                                          </div>
                                          <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gray-800 dark:bg-zinc-200 rounded-full transition-all duration-500"
                                              style={{ width: `${item.percent}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Ver movimientos button */}
                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowHistoricalTxList(true)}
                                    className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 border border-gray-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white transition-all flex items-center justify-center gap-2"
                                  >
                                    <ListOrdered className="w-4 h-4" />
                                    <span>Ver movimientos del mes</span>
                                  </button>
                                </div>

                                {/* Historical Drawer/Sheet for Transactions */}
                                <AnimatePresence>
                                  {showHistoricalTxList && (
                                    <>
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowHistoricalTxList(false)}
                                        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                                      />
                                      <motion.div
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}
                                        exit={{ y: "100%" }}
                                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                                        className="fixed bottom-0 inset-x-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-zinc-800 rounded-t-[28px] max-h-[80vh] z-50 flex flex-col overflow-hidden pb-safe animate-fade-in"
                                      >
                                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto my-3 shrink-0" />
                                        
                                        <div className="px-5 pb-3 border-b border-gray-100 dark:border-zinc-900 flex justify-between items-center shrink-0">
                                          <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                            Movimientos: {monthName}
                                          </h3>
                                          <button
                                            type="button"
                                            onClick={() => setShowHistoricalTxList(false)}
                                            className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                                          >
                                            Cerrar
                                          </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                          {monthTx.length === 0 ? (
                                            <p className="text-center text-xs text-gray-400 my-8">
                                              No hay movimientos en este mes.
                                            </p>
                                          ) : (
                                            monthTx.map(tx => {
                                              const cat = categories.find(c => c.id === tx.category_id);
                                              return (
                                                <div key={tx.id} className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-zinc-900/40 rounded-xl border border-gray-100/60 dark:border-zinc-800/40">
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-lg">{cat?.emoji || "🏷️"}</span>
                                                    <div>
                                                      <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                                                        {tx.description || cat?.name || "Sin descripción"}
                                                      </span>
                                                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                                                        {tx.date}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <span className={`text-xs font-bold ${tx.type === "INCOME" ? "text-emerald-600 dark:text-emerald-500" : "text-gray-900 dark:text-white"}`}>
                                                    {tx.type === "INCOME" ? "+" : "-"}
                                                    {formatCurrency(tx.amount_cents)}
                                                  </span>
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>

                                {/* Historical Options Drawer/Sheet (•••) */}
                                <AnimatePresence>
                                  {showHistoricalOptionsSheet && (
                                    <>
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowHistoricalOptionsSheet(false)}
                                        className="fixed inset-0 bg-black/45 z-50 transition-opacity"
                                      />
                                      <motion.div
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}
                                        exit={{ y: "100%" }}
                                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                                        className="fixed bottom-0 inset-x-0 bg-white dark:bg-[#0d0d0d] border-t border-gray-200 dark:border-zinc-800 rounded-t-[28px] z-50 overflow-hidden pb-6"
                                      >
                                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto my-3 shrink-0" />
                                        
                                        <div className="p-4 border-b border-gray-100 dark:border-zinc-900 text-center">
                                          <h4 className="text-xs font-bold tracking-wider text-gray-400 dark:text-zinc-500 uppercase">
                                            Opciones de reporte
                                          </h4>
                                        </div>

                                        <div className="p-4 space-y-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setShowHistoricalOptionsSheet(false);
                                              const rows = monthTx.map((tx) => {
                                                const catName = categories.find((c) => c.id === tx.category_id)?.name || "";
                                                const accName = accounts.find((a) => a.id === tx.account_id)?.name || "";
                                                const amount = (tx.amount_cents / 100).toFixed(2);
                                                return [tx.date, tx.type, amount, tx.description || "", catName, accName];
                                              });
                                              const csvContent = [
                                                ["Fecha", "Tipo", "Monto", "Descripción", "Categoría", "Cuenta"].join(","),
                                                ...rows.map((e) => e.map((field) => `"${field}"`).join(",")),
                                              ].join("\n");
                                              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                                              const link = document.createElement("a");
                                              link.setAttribute("href", URL.createObjectURL(blob));
                                              link.setAttribute("download", `finanzas_cierre_${monthKey}.csv`);
                                              link.style.visibility = "hidden";
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                            }}
                                            className="w-full py-4 px-5 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 text-left rounded-xl transition-colors flex items-center gap-3"
                                          >
                                            <Download className="w-4 h-4 text-gray-500" />
                                            <span>Exportar CSV</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setShowHistoricalOptionsSheet(false);
                                              handlePromptDeleteMonth(monthKey, monthName, monthTx.length);
                                            }}
                                            className="w-full py-4 px-5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left rounded-xl transition-colors flex items-center gap-3"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            <span>Eliminar cierre</span>
                                          </button>
                                          
                                          <button
                                            type="button"
                                            onClick={() => setShowHistoricalOptionsSheet(false)}
                                            className="w-full py-3.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors shrink-0"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })()
                        ) : (
                          // 7.1 MAIN SCREEN OF CLOSING (Mes actual + Historial)
                          <div className="space-y-6">
                            <div className="space-y-1">
                              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Cierre y Reportes
                              </h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                Gestiona tu cierre mensual y consulta historiales de flujo.
                              </p>
                            </div>

                            {/* MES ACTUAL */}
                            <div className="space-y-3">
                              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold px-1">
                                MES ACTUAL
                              </span>
                              
                              <div className="p-5 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                      {(() => {
                                        const monthsList = [
                                          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                                        ];
                                        const [yr, mn] = currentMonthPrefix.split("-");
                                        return `${monthsList[parseInt(mn) - 1]} ${yr}`;
                                      })()}
                                    </h3>
                                    <span className="text-[10px] font-semibold py-0.5 px-2 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full mt-1 inline-block">
                                      {monthIsClosedStatus[currentMonthPrefix] ? "Mes cerrado" : "En curso"}
                                    </span>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={exportToCSV}
                                    className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-gray-200/60 dark:border-zinc-800 rounded-xl text-gray-700 dark:text-zinc-300 transition-colors"
                                    title="Exportar CSV"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-zinc-900 pt-4">
                                  <div>
                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase block font-bold">
                                      Ingresos
                                    </span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500">
                                      {formatCurrency(incomeThisMonth)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase block font-bold">
                                      Gastos
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                      {formatCurrency(expensesThisMonth)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase block font-bold">
                                      Flujo Neto
                                    </span>
                                    <span className={`text-sm font-bold ${(incomeThisMonth - expensesThisMonth) >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                                      {(incomeThisMonth - expensesThisMonth) >= 0 ? "+" : ""}
                                      {formatCurrency(incomeThisMonth - expensesThisMonth)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase block font-bold">
                                      Movimientos
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                      {thisMonthTransactions.length}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100 dark:border-zinc-900">
                                  {monthIsClosedStatus[currentMonthPrefix] ? (
                                    <button
                                      type="button"
                                      onClick={() => setMonthIsClosedStatus(prev => ({ ...prev, [currentMonthPrefix]: false }))}
                                      className="w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                    >
                                      Reabrir mes para movimientos
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setShowConfirmCloseMonth(true)}
                                      className="w-full py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 rounded-xl text-xs font-bold transition-all text-center"
                                    >
                                      Cerrar {(() => {
                                        const monthsList = [
                                          "enero", "febrero", "marzo", "abril", "mayo", "junio",
                                          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
                                        ];
                                        const [, mn] = currentMonthPrefix.split("-");
                                        return monthsList[parseInt(mn) - 1];
                                      })()}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* HISTORIAL */}
                            <div className="space-y-3">
                              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-bold px-1">
                                HISTORIAL DE MESES
                              </span>

                              {(() => {
                                const monthlyGroups: { [key: string]: FinanceTransaction[] } = {};
                                transactions.forEach((tx) => {
                                  const prefix = tx.date.substring(0, 7);
                                  if (prefix !== currentMonthPrefix) {
                                    if (!monthlyGroups[prefix]) monthlyGroups[prefix] = [];
                                    monthlyGroups[prefix].push(tx);
                                  }
                                });

                                const historicalList = Object.keys(monthlyGroups)
                                  .sort()
                                  .reverse()
                                  .map((prefix) => {
                                    const txs = monthlyGroups[prefix];
                                    const inc = txs.filter((t) => t.type === "INCOME").reduce((acc, t) => acc + t.amount_cents, 0);
                                    const exp = txs.filter((t) => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount_cents, 0);
                                    
                                    const [yr, mn] = prefix.split("-");
                                    const monthsList = [
                                      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                                    ];
                                    const monthName = `${monthsList[parseInt(mn) - 1]} ${yr}`;

                                    return {
                                      monthKey: prefix,
                                      monthName,
                                      txs,
                                      income: inc,
                                      expenses: exp,
                                    };
                                  });

                                if (historicalList.length === 0) {
                                  return (
                                    <div className="p-8 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl text-center text-xs text-gray-400 dark:text-zinc-500">
                                      No hay meses cerrados ni datos históricos anteriores.
                                    </div>
                                  );
                                }

                                return (
                                  <div className="divide-y divide-gray-100 dark:divide-zinc-900 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                                    {historicalList.map((item) => {
                                      const net = item.income - item.expenses;
                                      return (
                                        <button
                                          key={item.monthKey}
                                          type="button"
                                          onClick={() => setSelectedHistoricalMonth(item.monthKey)}
                                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 text-left transition-all"
                                        >
                                          <div>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                                              {item.monthName}
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                                              Ingresos {formatCurrency(item.income)} · Gastos {formatCurrency(item.expenses)}
                                            </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-semibold ${net >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                                              {net >= 0 ? "+" : ""}
                                              {formatCurrency(net)}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Cerrar Mes Confirmation Dialog */}
                            <AnimatePresence>
                              {showConfirmCloseMonth && (
                                <>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowConfirmCloseMonth(false)}
                                    className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl z-50 text-center space-y-4"
                                  >
                                    <div className="space-y-1">
                                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        Cerrar {(() => {
                                          const monthsList = [
                                            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                                          ];
                                          const [, mn] = currentMonthPrefix.split("-");
                                          return monthsList[parseInt(mn) - 1];
                                        })()} {currentMonthPrefix.split("-")[0]}
                                      </h3>
                                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                                        Se guardará un resumen del mes para consultas y reportes. Los movimientos originales no se eliminarán.
                                      </p>
                                    </div>

                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setShowConfirmCloseMonth(false)}
                                        className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                      >
                                        Cancelar
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMonthIsClosedStatus(prev => ({ ...prev, [currentMonthPrefix]: true }));
                                          setShowConfirmCloseMonth(false);
                                        }}
                                        className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 rounded-xl text-xs font-bold transition-all"
                                      >
                                        Cerrar mes
                                      </button>
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Original Desktop View of CLOSING tab (perfectly kept for desktop as requested!)
                      <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-zinc-800 pb-3">
                          <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                              Cierre de Mes y Reportes
                            </h2>
                            <p className="text-xs text-gray-500">
                              Resumen mensual de flujos y exportación de datos
                            </p>
                          </div>
                        </div>

                        {/* Current Month Box */}
                        <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 p-5 rounded-xl space-y-4 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-zinc-800/80 pb-3">
                            <div>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                Mes Actual en Curso
                              </span>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                                {new Date()
                                  .toLocaleString("es-ES", {
                                    month: "long",
                                    year: "numeric",
                                  })
                                  .replace(/^\w/, (c) => c.toUpperCase())}
                              </h3>
                            </div>
                            <button
                              onClick={exportToCSV}
                              className="bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Exportar CSV
                            </button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-lg border border-gray-200/70 dark:border-zinc-800/80">
                              <p className="text-[11px] text-gray-400 font-medium mb-0.5">
                                Ingresos
                              </p>
                              <p className="text-base font-bold text-gray-900 dark:text-white">
                                {formatCurrency(incomeThisMonth)}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-lg border border-gray-200/70 dark:border-zinc-800/80">
                              <p className="text-[11px] text-gray-400 font-medium mb-0.5">
                                Gastos
                              </p>
                              <p className="text-base font-bold text-gray-900 dark:text-white">
                                {formatCurrency(expensesThisMonth)}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-lg border border-gray-200/70 dark:border-zinc-800/80">
                              <p className="text-[11px] text-gray-400 font-medium mb-0.5">
                                Flujo Neto
                              </p>
                              <p className="text-base font-bold text-gray-900 dark:text-white">
                                {incomeThisMonth - expensesThisMonth >= 0
                                  ? "+"
                                  : ""}
                                {formatCurrency(
                                  incomeThisMonth - expensesThisMonth,
                                )}
                              </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-lg border border-gray-200/70 dark:border-zinc-800/80">
                              <p className="text-[11px] text-gray-400 font-medium mb-0.5">
                                Movimientos
                              </p>
                              <p className="text-base font-bold text-gray-900 dark:text-white">
                                {
                                  transactions.filter((t) =>
                                    t.date.startsWith(
                                      new Date().toISOString().substring(0, 7),
                                    ),
                                  ).length
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* HISTORIAL */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                            Historial de Meses Cerrados
                          </h3>

                          {(() => {
                            const monthsMap = new Map<
                              string,
                              {
                                monthKey: string;
                                monthName: string;
                                income: number;
                                expenses: number;
                                txs: FinanceTransaction[];
                              }
                            >();

                            transactions.forEach((tx) => {
                              const prefix = tx.date.substring(0, 7);
                              if (!monthsMap.has(prefix)) {
                                const [y, m] = prefix.split("-");
                                const dateObj = new Date(
                                  parseInt(y),
                                  parseInt(m) - 1,
                                  1,
                                );
                                const mName = dateObj.toLocaleString("es-ES", {
                                  month: "long",
                                  year: "numeric",
                                });
                                monthsMap.set(prefix, {
                                  monthKey: prefix,
                                  monthName: mName.replace(/^\w/, (c) =>
                                    c.toUpperCase(),
                                  ),
                                  income: 0,
                                  expenses: 0,
                                  txs: [],
                                });
                              }
                              const data = monthsMap.get(prefix)!;
                              data.txs.push(tx);
                              if (tx.type === "INCOME")
                                data.income += tx.amount_cents;
                              if (tx.type === "EXPENSE")
                                data.expenses += tx.amount_cents;
                            });

                            const historical = Array.from(
                              monthsMap.values(),
                            ).sort((a, b) =>
                              b.monthKey.localeCompare(a.monthKey),
                            );

                            if (historical.length === 0) {
                              return (
                                <p className="text-xs text-gray-500 py-4 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg">
                                  No hay meses anteriores guardados en el historial
                                </p>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {historical.map((item) => {
                                  const net = item.income - item.expenses;

                                  const exportMonthCSV = () => {
                                    const headers = [
                                      "ID",
                                      "Fecha",
                                      "Tipo",
                                      "Monto ($)",
                                      "Categoría",
                                      "Cuenta",
                                      "Descripción",
                                    ];
                                    const rows = item.txs.map((t) => [
                                      t.id,
                                      t.date,
                                      t.type,
                                      (t.amount_cents / 100).toFixed(2),
                                      categories.find(
                                        (c) => c.id === t.category_id,
                                      )?.name || "Sin categoría",
                                      accounts.find((a) => a.id === t.account_id)
                                        ?.name || "Sin cuenta",
                                      `"${t.description || ""}"`,
                                    ]);
                                    const csvContent =
                                      "data:text/csv;charset=utf-8," +
                                      [
                                        headers.join(","),
                                        ...rows.map((e) => e.join(",")),
                                      ].join("\n");
                                    const encodedUri = encodeURI(csvContent);
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodedUri);
                                    link.setAttribute(
                                      "download",
                                      `cierre_finanzas_${item.monthKey}.csv`,
                                    );
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  };

                                  return (
                                    <div
                                      key={item.monthKey}
                                      className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                                    >
                                      <div>
                                        <h4 className="font-semibold text-xs text-gray-900 dark:text-white">
                                          {item.monthName}
                                        </h4>
                                        <p className="text-[11px] text-gray-400">
                                          {item.txs.length} movimientos
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-4 text-right">
                                        <div>
                                          <span className="text-[10px] text-gray-400 block uppercase">
                                            Ingresos
                                          </span>
                                          <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(item.income)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-gray-400 block uppercase">
                                            Gastos
                                          </span>
                                          <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(item.expenses)}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] text-gray-400 block uppercase">
                                            Neto
                                          </span>
                                          <span className={`font-semibold ${net >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"}`}>
                                            {net >= 0 ? "+" : ""}
                                            {formatCurrency(net)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 ml-1">
                                          <button
                                            onClick={exportMonthCSV}
                                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-gray-200 dark:border-zinc-800"
                                            title="Exportar CSV"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handlePromptDeleteMonth(
                                                item.monthKey,
                                                item.monthName,
                                                item.txs.length,
                                              )
                                            }
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors border border-gray-200 dark:border-zinc-800"
                                            title="Eliminar datos de este mes"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )
                  )}

                  {/* SETTINGS TAB */}
                  {effectiveTab === "settings" && (
                    isMobile ? (
                      <div className="space-y-6">
                        {/* 1. MAIN SETTINGS LIST */}
                        {mobileMoreSubView === "settings" && (
                          <div className="space-y-6 animate-fade-in">
                            <div className="space-y-1">
                              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Configuración
                              </h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                Personaliza tus preferencias y gestiona tus recursos financieros.
                              </p>
                            </div>

                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl divide-y divide-gray-100 dark:divide-zinc-900 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMoreSubView("accounts");
                                  setMobileNavigationSource("settings");
                                }}
                                className="w-full flex items-center justify-between p-4.5 hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 text-left transition-all active:bg-gray-50 dark:active:bg-zinc-900"
                              >
                                <div className="flex items-center gap-3.5">
                                  <div className="p-2.5 bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 rounded-xl border border-gray-100 dark:border-zinc-800">
                                    <Wallet className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                                      Cuentas y Tarjetas
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                      {accounts.length} {accounts.length === 1 ? "cuenta registrada" : "cuentas registradas"}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMoreSubView("categories");
                                  setMobileNavigationSource("settings");
                                }}
                                className="w-full flex items-center justify-between p-4.5 hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 text-left transition-all active:bg-gray-50 dark:active:bg-zinc-900"
                              >
                                <div className="flex items-center gap-3.5">
                                  <div className="p-2.5 bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 rounded-xl border border-gray-100 dark:border-zinc-800">
                                    <Tag className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                                      Categorías y Presupuestos
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                      {categories.length} categorías de flujo
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMoreSubView("security");
                                  setMobileNavigationSource("settings");
                                }}
                                className="w-full flex items-center justify-between p-4.5 hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 text-left transition-all active:bg-gray-50 dark:active:bg-zinc-900"
                              >
                                <div className="flex items-center gap-3.5">
                                  <div className="p-2.5 bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 rounded-xl border border-gray-100 dark:border-zinc-800">
                                    <Lock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                                      Seguridad y Código PIN
                                    </span>
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                      {securityConfig?.pin_hash ? "Protección Activa" : "PIN no configurado"}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 2. DEDICATED ACCOUNTS VIEW */}
                        {mobileMoreSubView === "accounts" && (
                          <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMoreSubView(mobileNavigationSource === "settings" ? "settings" : null);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{mobileNavigationSource === "settings" ? "Configuración" : "Más"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setShowCreateAccountModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all shrink-0"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                <span>Nueva Cuenta</span>
                              </button>
                            </div>

                            <div className="space-y-1">
                              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Cuentas Financieras
                              </h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                Cuentas de banco, efectivo o tarjetas de crédito registradas.
                              </p>
                            </div>

                            <div className="divide-y divide-gray-100 dark:divide-zinc-900 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                              {accounts.map((acc) => (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMobileAccount(acc);
                                    setShowAccountOptionsSheet(true);
                                  }}
                                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 text-left transition-all active:bg-gray-50 dark:active:bg-zinc-900"
                                >
                                  <div className="flex items-center gap-3.5">
                                    <div className="p-2 bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 rounded-xl border border-gray-100 dark:border-zinc-800">
                                      {getAccountIcon(acc.type)}
                                    </div>
                                    <div>
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                                        {acc.name}
                                      </span>
                                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mt-0.5">
                                        {acc.type === "credit"
                                          ? `Tarjeta •••• ${acc.card_number_last4 || ""}`
                                          : acc.type === "wallet"
                                            ? "Efectivo"
                                            : "Banco"}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                      {formatCurrency(acc.balance_cents)}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  </div>
                                </button>
                              ))}
                            </div>

                            {/* Account Bottom Options Sheet */}
                            <AnimatePresence>
                              {showAccountOptionsSheet && selectedMobileAccount && (
                                <>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => {
                                      setShowAccountOptionsSheet(false);
                                      setSelectedMobileAccount(null);
                                    }}
                                    className="fixed inset-0 bg-black/45 z-50 transition-opacity"
                                  />
                                  <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                                    className="fixed bottom-0 inset-x-0 bg-white dark:bg-[#0d0d0d] border-t border-gray-200 dark:border-zinc-800 rounded-t-[28px] z-50 overflow-hidden pb-6"
                                  >
                                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto my-3 shrink-0" />
                                    
                                    <div className="p-4 border-b border-gray-100 dark:border-zinc-900 text-center">
                                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        {selectedMobileAccount.name}
                                      </h3>
                                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 block mt-0.5">
                                        Balance actual: {formatCurrency(selectedMobileAccount.balance_cents)}
                                      </span>
                                    </div>

                                    <div className="p-4 space-y-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAccountOptionsSheet(false);
                                          setShowAccountTxList(true);
                                        }}
                                        className="w-full py-4 px-5 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 text-left rounded-xl transition-colors flex items-center gap-3"
                                      >
                                        <ListOrdered className="w-4 h-4 text-gray-500" />
                                        <span>Ver movimientos de esta cuenta</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const acc = selectedMobileAccount;
                                          setShowAccountOptionsSheet(false);
                                          setSelectedMobileAccount(null);
                                          
                                          // Set all account edit states as in original
                                          setEditingAccount(acc);
                                          setEditAccountName(acc.name);
                                          setEditAccountType(acc.type);
                                          setEditAccountBalance((acc.balance_cents / 100).toString());
                                          setEditAccountCardColor(acc.card_color || "slate");
                                          setEditAccountCreditLimit(((acc.credit_limit_cents || 0) / 100).toString());
                                          setEditAccountCutoffDay((acc.cutoff_day || "").toString());
                                          setEditAccountDueDay((acc.due_day || "").toString());
                                          setEditAccountCardNumberLast4(acc.card_number_last4 || "");
                                          setEditAccountMaintFeeType(acc.maintenance_fee_type || "none");
                                          setEditAccountMaintFeeValue((acc.maintenance_fee_value || 0).toString());
                                          setEditAccountMaintFeeFreq(acc.maintenance_fee_freq || "monthly");
                                          setEditAccountTransferFeeType(acc.transfer_fee_type || "none");
                                          setEditAccountTransferFeeValue((acc.transfer_fee_value || 0).toString());
                                          setShowEditAccountExtras(
                                            (acc.maintenance_fee_type && acc.maintenance_fee_type !== "none") ||
                                            (acc.transfer_fee_type && acc.transfer_fee_type !== "none")
                                          );
                                        }}
                                        className="w-full py-4 px-5 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 text-left rounded-xl transition-colors flex items-center gap-3"
                                      >
                                        <Pencil className="w-4 h-4 text-gray-500" />
                                        <span>Editar cuenta</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const accId = selectedMobileAccount.id;
                                          setShowAccountOptionsSheet(false);
                                          setSelectedMobileAccount(null);
                                          handleDeleteAccount(accId);
                                        }}
                                        className="w-full py-4 px-5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left rounded-xl transition-colors flex items-center gap-3"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Eliminar cuenta</span>
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAccountOptionsSheet(false);
                                          setSelectedMobileAccount(null);
                                        }}
                                        className="w-full py-3.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors shrink-0"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>

                            {/* Account Transactions Bottom Sheet */}
                            <AnimatePresence>
                              {showAccountTxList && selectedMobileAccount && (
                                <>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => {
                                      setShowAccountTxList(false);
                                      setSelectedMobileAccount(null);
                                    }}
                                    className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                                  />
                                  <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                                    className="fixed bottom-0 inset-x-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-zinc-800 rounded-t-[28px] max-h-[80vh] z-50 flex flex-col overflow-hidden pb-safe animate-fade-in"
                                  >
                                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto my-3 shrink-0" />
                                    
                                    <div className="px-5 pb-3 border-b border-gray-100 dark:border-zinc-900 flex justify-between items-center shrink-0">
                                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        Movimientos: {selectedMobileAccount.name}
                                      </h3>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAccountTxList(false);
                                          setSelectedMobileAccount(null);
                                        }}
                                        className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400"
                                      >
                                        Cerrar
                                      </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                      {(() => {
                                        const accTx = transactions.filter(t => t.account_id === selectedMobileAccount.id);
                                        if (accTx.length === 0) {
                                          return (
                                            <p className="text-center text-xs text-gray-400 my-8">
                                              No hay movimientos registrados en esta cuenta.
                                            </p>
                                          );
                                        }
                                        return accTx.map(tx => {
                                          const cat = categories.find(c => c.id === tx.category_id);
                                          return (
                                            <div key={tx.id} className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-zinc-900/40 rounded-xl border border-gray-100/60 dark:border-zinc-800/40">
                                              <div className="flex items-center gap-3">
                                                <span className="text-lg">{cat?.emoji || "🏷️"}</span>
                                                <div>
                                                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                                                    {tx.description || cat?.name || "Sin descripción"}
                                                  </span>
                                                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 block">
                                                    {tx.date}
                                                  </span>
                                                </div>
                                              </div>
                                              <span className={`text-xs font-bold ${tx.type === "INCOME" ? "text-emerald-600 dark:text-emerald-500" : "text-gray-900 dark:text-white"}`}>
                                                {tx.type === "INCOME" ? "+" : "-"}
                                                {formatCurrency(tx.amount_cents)}
                                              </span>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* 3. DEDICATED CATEGORIES VIEW */}
                        {mobileMoreSubView === "categories" && (
                          <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMoreSubView(mobileNavigationSource === "settings" ? "settings" : null);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{mobileNavigationSource === "settings" ? "Configuración" : "Más"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openNewCategoryModal(activeCategoryTab)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all shrink-0"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                <span>Nueva Categoría</span>
                              </button>
                            </div>

                            <div className="space-y-1">
                              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Categorías de Flujo
                              </h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                Clasificación de movimientos y topes presupuestarios mensuales.
                              </p>
                            </div>

                            {/* Custom Category Segment Tab */}
                            <div className="bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl flex gap-1">
                              <button
                                type="button"
                                onClick={() => setActiveCategoryTab("EXPENSE")}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all ${activeCategoryTab === "EXPENSE" ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-xs" : "text-gray-500"}`}
                              >
                                Gastos / Presupuestos
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveCategoryTab("INCOME")}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all ${activeCategoryTab === "INCOME" ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-xs" : "text-gray-500"}`}
                              >
                                Ingresos
                              </button>
                            </div>

                            {/* Category items list */}
                            {(() => {
                              const filteredCats = categories.filter(c => {
                                if (activeCategoryTab === "EXPENSE") {
                                  return !c.type || c.type.toUpperCase() === "EXPENSE" || c.type.toUpperCase() === "GASTO";
                                } else {
                                  return c.type && (c.type.toUpperCase() === "INCOME" || c.type.toUpperCase() === "INGRESO");
                                }
                              });

                              if (filteredCats.length === 0) {
                                return (
                                  <div className="p-8 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl text-center text-xs text-gray-400">
                                    No hay categorías en esta sección.
                                  </div>
                                );
                              }

                              return (
                                <div className="divide-y divide-gray-100 dark:divide-zinc-900 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                                  {filteredCats.map((cat) => (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedMobileCategory(cat);
                                      }}
                                      className="w-full flex items-center justify-between p-4.5 hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 text-left transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl w-8 h-8 rounded-lg bg-gray-50 dark:bg-zinc-900 flex items-center justify-center border border-gray-100 dark:border-zinc-800 shrink-0">
                                          {cat.emoji || "🏷️"}
                                        </span>
                                        <div>
                                          <span className="text-xs font-bold text-gray-900 dark:text-white block">
                                            {cat.name}
                                          </span>
                                          {cat.budget_limit_cents && cat.budget_limit_cents > 0 ? (
                                            <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 block mt-0.5">
                                              Presupuesto: {formatCurrency(cat.budget_limit_cents)}/mes
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5">
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Category Bottom Sheet (•••) */}
                            <AnimatePresence>
                              {selectedMobileCategory && (
                                <>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedMobileCategory(null)}
                                    className="fixed inset-0 bg-black/45 z-50 transition-opacity"
                                  />
                                  <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                                    className="fixed bottom-0 inset-x-0 bg-white dark:bg-[#0d0d0d] border-t border-gray-200 dark:border-zinc-800 rounded-t-[28px] z-50 overflow-hidden pb-6"
                                  >
                                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto my-3 shrink-0" />
                                    
                                    <div className="p-4 border-b border-gray-100 dark:border-zinc-900 text-center">
                                      <span className="text-lg block mb-1">{selectedMobileCategory.emoji}</span>
                                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        {selectedMobileCategory.name}
                                      </h3>
                                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase block tracking-wider mt-0.5">
                                        Categoría de {activeCategoryTab === "EXPENSE" ? "Gasto" : "Ingreso"}
                                      </span>
                                    </div>

                                    <div className="p-4 space-y-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cat = selectedMobileCategory;
                                          setSelectedMobileCategory(null);
                                          openEditCategoryModal(cat);
                                        }}
                                        className="w-full py-4 px-5 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 text-left rounded-xl transition-colors flex items-center gap-3"
                                      >
                                        <Pencil className="w-4 h-4 text-gray-500" />
                                        <span>Editar categoría</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const catId = selectedMobileCategory.id;
                                          setSelectedMobileCategory(null);
                                          handleDeleteCategory(catId);
                                        }}
                                        className="w-full py-4 px-5 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left rounded-xl transition-colors flex items-center gap-3"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Eliminar categoría</span>
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMobileCategory(null)}
                                        className="w-full py-3.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl transition-colors shrink-0"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* 4. DEDICATED SECURITY VIEW */}
                        {mobileMoreSubView === "security" && (
                          <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileMoreSubView(mobileNavigationSource === "settings" ? "settings" : null);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850"
                              >
                                <ChevronLeft className="w-4 h-4" />
                                <span>{mobileNavigationSource === "settings" ? "Configuración" : "Más"}</span>
                              </button>
                            </div>

                            <div className="space-y-1">
                              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Seguridad y PIN
                              </h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                Asegura el acceso a tus datos financieros con un código de seguridad.
                              </p>
                            </div>

                            {/* Protection Status Block */}
                            <div className="p-5 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl space-y-4">
                              <div className="flex justify-between items-center">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider block font-bold">
                                    ESTADO DE PROTECCIÓN
                                  </span>
                                  <span className="text-sm font-bold text-gray-900 dark:text-white block mt-0.5">
                                    {securityConfig?.pin_hash ? "Bloqueo por PIN Activo" : "Bloqueo por PIN Inactivo"}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${securityConfig?.pin_hash ? "bg-gray-950 text-white dark:bg-white dark:text-gray-900" : "bg-gray-100 text-gray-500 dark:bg-zinc-850 dark:text-zinc-400"}`}>
                                  {securityConfig?.pin_hash ? "Protegido" : "Inactivo"}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewPinValue("");
                                    setConfirmPinValue("");
                                    setSetPinError("");
                                    setShowSetPinModal(true);
                                  }}
                                  className="flex-1 py-3 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>{securityConfig?.pin_hash ? "Cambiar PIN" : "Crear PIN"}</span>
                                </button>
                                
                                {securityConfig?.pin_hash && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDisablePinInput("");
                                      setDisablePinError("");
                                      setShowDisablePinModal(true);
                                    }}
                                    className="flex-1 py-3 bg-white dark:bg-transparent border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl text-xs font-semibold transition-all"
                                  >
                                    Eliminar PIN
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Security Requirements Switches */}
                            {securityConfig?.pin_hash && (
                              <div className="space-y-3">
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider block font-bold px-1">
                                  REGLAS DE REQUERIMIENTO
                                </span>
                                
                                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800/80 rounded-2xl divide-y divide-gray-100 dark:divide-zinc-900 overflow-hidden">
                                  <div className="flex items-center justify-between p-4.5 text-xs">
                                    <div className="space-y-0.5 pr-4 flex-1">
                                      <label
                                        htmlFor="toggle-lock-on-enter-mob"
                                        className="font-bold text-gray-900 dark:text-white cursor-pointer"
                                      >
                                        Solicitar PIN al ingresar
                                      </label>
                                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                        Exige introducir el PIN al iniciar o reanudar el panel financiero.
                                      </p>
                                    </div>
                                    <button
                                      id="toggle-lock-on-enter-mob"
                                      type="button"
                                      role="switch"
                                      aria-checked={securityConfig.require_on_enter}
                                      onClick={() => handleToggleRequireOnEnter(!securityConfig.require_on_enter)}
                                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors ${securityConfig.require_on_enter ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-zinc-800"}`}
                                    >
                                      <div className={`w-4.5 h-4.5 rounded-full transition-transform ${securityConfig.require_on_enter ? "translate-x-4.5 bg-white dark:bg-gray-900" : "translate-x-0 bg-white dark:bg-zinc-300"}`} />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between p-4.5 text-xs">
                                    <div className="space-y-0.5 pr-4 flex-1">
                                      <label
                                        htmlFor="toggle-lock-on-delete-mob"
                                        className="font-bold text-gray-900 dark:text-white cursor-pointer"
                                      >
                                        Proteger eliminación de cuentas
                                      </label>
                                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                        Exige validar tu PIN para confirmar el borrado de cualquier cuenta o tarjeta.
                                      </p>
                                    </div>
                                    <button
                                      id="toggle-lock-on-delete-mob"
                                      type="button"
                                      role="switch"
                                      aria-checked={securityConfig.require_on_delete}
                                      onClick={() => handleToggleRequireOnDelete(!securityConfig.require_on_delete)}
                                      className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors ${securityConfig.require_on_delete ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-zinc-800"}`}
                                    >
                                      <div className={`w-4.5 h-4.5 rounded-full transition-transform ${securityConfig.require_on_delete ? "translate-x-4.5 bg-white dark:bg-gray-900" : "translate-x-0 bg-white dark:bg-zinc-300"}`} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Original Desktop View of SETTINGS tab (perfectly kept for desktop as requested!)
                      <div className="space-y-8 max-w-4xl mx-auto">
                        {(!isMobile || mobileMoreSubView === "settings") && (
                          <div className="border-b border-gray-200 dark:border-zinc-800 pb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                              Configuración del Sistema
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                              Gestiona tus cuentas financieras, categorías de
                              presupuesto y opciones de seguridad
                            </p>
                          </div>
                        )}

                        <div className="space-y-8">
                          {/* SECTION 1: ACCOUNTS */}
                          {(!isMobile || mobileMoreSubView === "accounts" || mobileMoreSubView === "settings") && (
                          <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                              <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Cuentas y Tarjetas de Crédito
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Cuentas registradas para tus movimientos y
                                  saldos
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowCreateAccountModal(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all shrink-0 self-start sm:self-auto"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Nueva Cuenta
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                              {accounts.map((acc) => (
                                <div
                                  key={acc.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200/80 dark:border-zinc-800/80 gap-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300">
                                      {getAccountIcon(acc.type)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-xs text-gray-900 dark:text-white">
                                        {acc.name}
                                      </p>
                                      <p className="text-[10px] text-gray-400 uppercase font-semibold">
                                        {acc.type === "credit"
                                          ? `Tarjeta de Crédito ${acc.card_number_last4 ? `•••• ${acc.card_number_last4}` : ""}`
                                          : acc.type === "wallet"
                                            ? "Wallet digital"
                                            : acc.type}
                                      </p>
                                      {["bank", "credit", "debit"].includes(
                                        acc.type,
                                      ) &&
                                        (acc.maintenance_fee_type !== "none" ||
                                          acc.transfer_fee_type !== "none") && (
                                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {acc.maintenance_fee_type !==
                                              "none" && (
                                              <span className="text-[9px] font-medium px-2 py-0.5 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-md">
                                                Mantenimiento:{" "}
                                                {acc.maintenance_fee_type ===
                                                "fixed"
                                                  ? `$${acc.maintenance_fee_value}`
                                                  : `${acc.maintenance_fee_value}%`}{" "}
                                                (
                                                {acc.maintenance_fee_freq ===
                                                "yearly"
                                                  ? "Anual"
                                                  : "Mensual"}
                                                )
                                              </span>
                                            )}
                                            {acc.transfer_fee_type !== "none" && (
                                              <span className="text-[9px] font-medium px-2 py-0.5 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-md">
                                                Comisión:{" "}
                                                {acc.transfer_fee_type === "fixed"
                                                  ? `$${acc.transfer_fee_value}`
                                                  : `${acc.transfer_fee_value}%`}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200 dark:border-zinc-800">
                                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                                      {formatCurrency(acc.balance_cents)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingAccount(acc);
                                          setEditAccountName(acc.name);
                                          setEditAccountType(acc.type);
                                          setEditAccountBalance(
                                            (acc.balance_cents / 100).toString(),
                                          );
                                          setEditAccountCardColor(
                                            acc.card_color || "slate",
                                          );
                                          setEditAccountCreditLimit(
                                            (
                                              (acc.credit_limit_cents || 0) / 100
                                            ).toString(),
                                          );
                                          setEditAccountCutoffDay(
                                            (acc.cutoff_day || "").toString(),
                                          );
                                          setEditAccountDueDay(
                                            (acc.due_day || "").toString(),
                                          );
                                          setEditAccountCardNumberLast4(
                                            acc.card_number_last4 || "",
                                          );
                                          setEditAccountMaintFeeType(
                                            acc.maintenance_fee_type || "none",
                                          );
                                          setEditAccountMaintFeeValue(
                                            (
                                              acc.maintenance_fee_value || 0
                                            ).toString(),
                                          );
                                          setEditAccountMaintFeeFreq(
                                            acc.maintenance_fee_freq || "monthly",
                                          );
                                          setEditAccountTransferFeeType(
                                            acc.transfer_fee_type || "none",
                                          );
                                          setEditAccountTransferFeeValue(
                                            (
                                              acc.transfer_fee_value || 0
                                            ).toString(),
                                          );
                                          setShowEditAccountExtras(
                                            (acc.maintenance_fee_type &&
                                              acc.maintenance_fee_type !==
                                                "none") ||
                                              (acc.transfer_fee_type &&
                                                acc.transfer_fee_type !== "none"),
                                          );
                                        }}
                                        className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                                        title="Editar cuenta"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteAccount(acc.id)
                                        }
                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                                        title="Eliminar cuenta"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          )}

                          {/* SECTION 2: CATEGORIES & BUDGETS */}
                          {(!isMobile || mobileMoreSubView === "categories" || mobileMoreSubView === "settings") && (
                          <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
                              <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Categorías y Presupuestos
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Clasificación de movimientos y topes mensuales
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openNewCategoryModal("EXPENSE")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all"
                              >
                                <PlusIcon className="w-3.5 h-3.5" />
                                Nueva Categoría
                              </button>
                            </div>

                            {/* Expenses Section */}
                            <div className="space-y-2.5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Categorías de Gasto / Presupuesto
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {categories
                                  .filter(
                                    (c) =>
                                      !c.type ||
                                      c.type.toUpperCase() === "EXPENSE" ||
                                      c.type.toUpperCase() === "GASTO",
                                  )
                                  .map((cat) => (
                                    <div
                                      key={cat.id}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-900 dark:text-gray-100"
                                    >
                                      <span>{cat.emoji || "🛒"}</span>
                                      <span className="font-medium">
                                        {cat.name}
                                      </span>
                                      {cat.budget_limit_cents &&
                                      cat.budget_limit_cents > 0 ? (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-md">
                                          $
                                          {(cat.budget_limit_cents / 100).toFixed(
                                            2,
                                          )}
                                          /mes
                                        </span>
                                      ) : null}
                                      <div className="flex items-center gap-1 ml-1 pl-1 border-l border-gray-200 dark:border-zinc-700">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openEditCategoryModal(cat)
                                          }
                                          className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-0.5 rounded transition-colors"
                                          title="Editar"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteCategory(cat.id)
                                          }
                                          className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Income Section */}
                            <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Categorías de Ingreso
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {categories
                                  .filter(
                                    (c) =>
                                      c.type &&
                                      (c.type.toUpperCase() === "INCOME" ||
                                        c.type.toUpperCase() === "INGRESO"),
                                  )
                                  .map((cat) => (
                                    <div
                                      key={cat.id}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100/70 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80 rounded-xl text-xs text-gray-900 dark:text-gray-100"
                                    >
                                      <span>{cat.emoji || "💼"}</span>
                                      <span className="font-medium">
                                        {cat.name}
                                      </span>
                                      <div className="flex items-center gap-1 ml-1 pl-1 border-l border-gray-200 dark:border-zinc-700">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openEditCategoryModal(cat)
                                          }
                                          className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-0.5 rounded transition-colors"
                                          title="Editar"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteCategory(cat.id)
                                          }
                                          className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                          )}

                          {/* SECTION 3: SECURITY & PIN */}
                          {(!isMobile || mobileMoreSubView === "security" || mobileMoreSubView === "settings") && (
                          <div className="bg-white dark:bg-[#09090b] border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
                              <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                  Seguridad y Código PIN
                                </h3>
                                <p className="text-xs text-gray-500">
                                  Protección del módulo financiero y
                                  confirmaciones requeridas
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-md ${
                                  securityConfig?.pin_hash
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400"
                                }`}
                              >
                                {securityConfig?.pin_hash
                                  ? "Protección Activa"
                                  : "Sin PIN"}
                              </span>
                            </div>

                            <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                    {securityConfig?.pin_hash
                                      ? "PIN de 4 dígitos configurado"
                                      : "Sin PIN de seguridad activo"}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    {securityConfig?.pin_hash
                                      ? "Puedes actualizar tu código actual o modificar las reglas de bloqueo."
                                      : "Configura un PIN numérico de 4 dígitos para proteger tu información."}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewPinValue("");
                                      setConfirmPinValue("");
                                      setSetPinError("");
                                      setShowSetPinModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    {securityConfig?.pin_hash
                                      ? "Cambiar PIN"
                                      : "Crear PIN"}
                                  </button>
                                  {securityConfig?.pin_hash && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDisablePinInput("");
                                        setDisablePinError("");
                                        setShowDisablePinModal(true);
                                      }}
                                      className="px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl border border-gray-300 dark:border-zinc-700 transition-all"
                                    >
                                      Eliminar PIN
                                    </button>
                                  )}
                                </div>
                              </div>

                              {securityConfig?.pin_hash && (
                                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
                                  <div className="flex items-center justify-between py-1">
                                    <div className="space-y-0.5 pr-4">
                                      <label
                                        htmlFor="toggle-lock-on-enter"
                                        className="text-xs font-semibold text-gray-900 dark:text-white cursor-pointer"
                                      >
                                        Solicitar PIN al ingresar
                                      </label>
                                      <p className="text-[11px] text-gray-500">
                                        Bloquea las vistas financieras hasta
                                        introducir el PIN de 4 dígitos.
                                      </p>
                                    </div>
                                    <button
                                      id="toggle-lock-on-enter"
                                      type="button"
                                      role="switch"
                                      aria-checked={
                                        securityConfig.require_on_enter
                                      }
                                      onClick={() =>
                                        handleToggleRequireOnEnter(
                                          !securityConfig.require_on_enter,
                                        )
                                      }
                                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                                        securityConfig.require_on_enter
                                          ? "bg-gray-900 dark:bg-white"
                                          : "bg-gray-300 dark:bg-zinc-700"
                                      }`}
                                    >
                                      <div
                                        className={`w-4 h-4 rounded-full transition-transform ${
                                          securityConfig.require_on_enter
                                            ? "translate-x-5 bg-white dark:bg-gray-900"
                                            : "translate-x-0 bg-white dark:bg-zinc-300"
                                        }`}
                                      />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between py-1">
                                    <div className="space-y-0.5 pr-4">
                                      <label
                                        htmlFor="toggle-lock-on-delete"
                                        className="text-xs font-semibold text-gray-900 dark:text-white cursor-pointer"
                                      >
                                        Proteger eliminación de cuentas
                                      </label>
                                      <p className="text-[11px] text-gray-500">
                                        Exige la validación del PIN antes de
                                        borrar cuentas o tarjetas.
                                      </p>
                                    </div>
                                    <button
                                      id="toggle-lock-on-delete"
                                      type="button"
                                      role="switch"
                                      aria-checked={
                                        securityConfig.require_on_delete
                                      }
                                      onClick={() =>
                                        handleToggleRequireOnDelete(
                                          !securityConfig.require_on_delete,
                                        )
                                      }
                                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                                        securityConfig.require_on_delete
                                          ? "bg-gray-900 dark:bg-white"
                                          : "bg-gray-300 dark:bg-zinc-700"
                                      }`}
                                    >
                                      <div
                                        className={`w-4 h-4 rounded-full transition-transform ${
                                          securityConfig.require_on_delete
                                            ? "translate-x-5 bg-white dark:bg-gray-900"
                                            : "translate-x-0 bg-white dark:bg-zinc-300"
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* Portaled Modals (renders to document.body, outside window boundaries) */}
      <FinancePortal>
        {/* New Transaction Type Picker Sheet */}
        <AnimatePresence>
          {showNewTxTypeSheet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100010] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowNewTxTypeSheet(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#121214] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4"
              >
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Nuevo movimiento
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ¿Qué tipo de transacción deseas registrar?
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewTxTypeSheet(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => openNewTransactionModal("EXPENSE")}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-rose-50/60 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-left transition-all active:scale-[0.99]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/20">
                      <ArrowDownRight className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-rose-950 dark:text-rose-200">
                        Registrar Gasto
                      </div>
                      <div className="text-xs text-rose-800/70 dark:text-rose-300/70 truncate">
                        Compras, pagos de servicios, consumos
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openNewTransactionModal("INCOME")}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-left transition-all active:scale-[0.99]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                        Registrar Ingreso
                      </div>
                      <div className="text-xs text-emerald-800/70 dark:text-emerald-300/70 truncate">
                        Salarios, cobros, transferencias recibidas
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openNewTransactionModal("TRANSFER_OUT")}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 text-left transition-all active:scale-[0.99]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-blue-950 dark:text-blue-200">
                        Transferencia entre cuentas
                      </div>
                      <div className="text-xs text-blue-800/70 dark:text-blue-300/70 truncate">
                        Mover saldo propio de una cuenta a otra
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Filters Bottom Sheet */}
        <AnimatePresence>
          {showMobileTxFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100010] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowMobileTxFilters(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#121214] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto space-y-5"
              >
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Filtros de Movimientos
                    </h3>
                    <p className="text-xs text-gray-500">
                      Personaliza los resultados de tu historial
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMobileTxFilters(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Filter 1: Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Tipo de movimiento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "ALL", label: "Todos" },
                      { id: "EXPENSE", label: "Gastos" },
                      { id: "INCOME", label: "Ingresos" },
                      { id: "TRANSFER_OUT", label: "Transferencias" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTxFilterType(t.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                          txFilterType === t.id
                            ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white shadow-sm"
                            : "bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 2: Date Range */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Período
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "THIS_MONTH", label: "Este mes" },
                      { id: "LAST_MONTH", label: "Mes anterior" },
                      { id: "THIS_YEAR", label: "Este año" },
                      { id: "ALL", label: "Todo el tiempo" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setTxFilterDateRange(d.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                          txFilterDateRange === d.id
                            ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white shadow-sm"
                            : "bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 3: Account */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Cuenta
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setTxFilterAccount("ALL")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        txFilterAccount === "ALL"
                          ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                          : "bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                      }`}
                    >
                      Todas las cuentas
                    </button>
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setTxFilterAccount(acc.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          txFilterAccount === acc.id
                            ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                            : "bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                        }`}
                      >
                        {acc.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 4: Category */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Categoría
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setTxFilterCategory("ALL")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        txFilterCategory === "ALL"
                          ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                          : "bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                      }`}
                    >
                      Todas las categorías
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setTxFilterCategory(cat.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          txFilterCategory === cat.id
                            ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                            : "bg-gray-50 dark:bg-zinc-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                        }`}
                      >
                        <span>{cat.emoji || "🏷️"}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setTxFilterType("ALL");
                      setTxFilterAccount("ALL");
                      setTxFilterCategory("ALL");
                      setTxFilterDateRange("THIS_MONTH");
                      setTxFilterSearch("");
                    }}
                    className="flex-1 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-center"
                  >
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMobileTxFilters(false)}
                    className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity text-center"
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction Detail Bottom Sheet */}
        <AnimatePresence>
          {selectedTxDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100010] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setSelectedTxDetail(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#121214] rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-5"
              >
                {(() => {
                  const tx = selectedTxDetail;
                  const isExpense =
                    tx.type === "EXPENSE" ||
                    tx.type?.toLowerCase() === "expense" ||
                    tx.type?.toLowerCase() === "gasto";
                  const isIncome =
                    tx.type === "INCOME" ||
                    tx.type?.toLowerCase() === "income" ||
                    tx.type?.toLowerCase() === "ingreso";
                  const isTransfer = !isExpense && !isIncome;
                  const cat = categories.find((c) => c.id === tx.category_id);
                  const acc = accounts.find((a) => a.id === tx.account_id);

                  return (
                    <>
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                              isExpense
                                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                                : isIncome
                                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                            }`}
                          >
                            {cat?.emoji || (isExpense ? "💸" : isIncome ? "💰" : "↔️")}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {isExpense
                                ? "Gasto"
                                : isIncome
                                  ? "Ingreso"
                                  : "Transferencia"}
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">
                              {cat?.name || tx.description || "Movimiento"}
                            </h3>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTxDetail(null)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <XIcon className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Hero Amount */}
                      <div className="bg-gray-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-gray-150 dark:border-zinc-800 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Monto total
                        </div>
                        <div
                          className={`text-3xl font-black tracking-tight ${
                            isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {isExpense ? "-" : isIncome ? "+" : ""}
                          {formatCurrency(tx.amount_cents)}
                        </div>
                      </div>

                      {/* Details List */}
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800/80">
                          <span className="text-gray-500 dark:text-gray-400">Fecha</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatDetailDate(tx.date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800/80">
                          <span className="text-gray-500 dark:text-gray-400">Cuenta</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {acc?.name || "Cuenta no especificada"}
                          </span>
                        </div>

                        {cat && (
                          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800/80">
                            <span className="text-gray-500 dark:text-gray-400">Categoría</span>
                            <span className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-1">
                              <span>{cat.emoji}</span>
                              <span>{cat.name}</span>
                            </span>
                          </div>
                        )}

                        {tx.description && (
                          <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-zinc-800/80 gap-3">
                            <span className="text-gray-500 dark:text-gray-400 shrink-0">
                              Descripción / Nota
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white text-right">
                              {tx.description}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => openEditTransaction(tx)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/50 transition-colors"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Add / Edit Modal (Mobile Bottom Sheet & Desktop Modal) */}
        <AnimatePresence>
          {showTxModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
              onClick={() => {
                setShowTxModal(false);
                resetTxForm();
              }}
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#0e0e11] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-zinc-800 max-h-[92vh] overflow-y-auto custom-scrollbar my-0 sm:my-auto space-y-4"
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      {editingTx
                        ? "Editar Movimiento"
                        : txType === "EXPENSE"
                          ? "Nuevo Gasto"
                          : txType === "INCOME"
                            ? "Nuevo Ingreso"
                            : "Nueva Transferencia"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {editingTx
                        ? "Modifica los detalles del movimiento"
                        : "Ingresa el monto y confirma para registrarlo"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTxModal(false);
                      resetTxForm();
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Type Switcher (only for new transactions or if changing type) */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-zinc-900 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTxType("EXPENSE")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      txType === "EXPENSE"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType("INCOME")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      txType === "INCOME"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType("TRANSFER_OUT")}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      txType === "TRANSFER_OUT"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Transferencia
                  </button>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-4">
                  {/* Hero Amount Input */}
                  <div className="bg-gray-50 dark:bg-zinc-900/70 p-4 rounded-2xl border border-gray-200/80 dark:border-zinc-800 text-center">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Monto a {txType === "EXPENSE" ? "gastar" : txType === "INCOME" ? "ingresar" : "transferir"}
                    </label>
                    <div className="relative flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-400 mr-1.5">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        onKeyDown={blockNegativeKeys}
                        required
                        autoFocus
                        value={txAmount}
                        onChange={(e) =>
                          setTxAmount(e.target.value.replace(/-/g, ""))
                        }
                        className="w-48 sm:w-64 py-1 bg-transparent text-3xl sm:text-4xl font-black text-center text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-700 focus:outline-none tracking-tight"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {txType !== "TRANSFER_OUT" ? (
                    <>
                      {/* Account Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                          Cuenta {txType === "EXPENSE" ? "de pago" : "destino"}
                        </label>
                        <select
                          required
                          value={txAccountId}
                          onChange={(e) => setTxAccountId(Number(e.target.value))}
                          className="w-full px-3.5 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        >
                          <option value="" disabled>
                            Selecciona una cuenta
                          </option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} (
                              {acc.type === "credit"
                                ? `Cupo disp: ${formatCurrency((acc.credit_limit_cents || 0) - Math.abs(acc.balance_cents))}`
                                : `Saldo: ${formatCurrency(acc.balance_cents)}`}
                              )
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Category Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                          Categoría
                        </label>
                        <select
                          required
                          value={txCategoryId}
                          onChange={(e) =>
                            setTxCategoryId(Number(e.target.value))
                          }
                          className="w-full px-3.5 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        >
                          <option value="" disabled>
                            Selecciona una categoría
                          </option>
                          {categories
                            .filter(
                              (cat) =>
                                !cat.type ||
                                (txType === "EXPENSE"
                                  ? cat.type.toUpperCase() === "EXPENSE" ||
                                    cat.type.toUpperCase() === "GASTO"
                                  : cat.type.toUpperCase() === "INCOME" ||
                                    cat.type.toUpperCase() === "INGRESO"),
                            )
                            .map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.emoji} {cat.name}{" "}
                                {cat.budget_limit_cents &&
                                cat.budget_limit_cents > 0
                                  ? `(Presupuesto: $${(cat.budget_limit_cents / 100).toFixed(2)})`
                                  : ""}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                          Descripción o nota <span className="font-normal text-gray-400">(opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={txDescription}
                          onChange={(e) => setTxDescription(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                          placeholder="Ej. Almuerzo, Uber, Supermercado..."
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Cuenta de Origen
                          </label>
                          <select
                            required
                            value={txAccountId}
                            onChange={(e) =>
                              setTxAccountId(Number(e.target.value))
                            }
                            className="w-full px-3.5 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white"
                          >
                            <option value="" disabled>
                              Origen
                            </option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({formatCurrency(acc.balance_cents)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Cuenta de Destino
                          </label>
                          <select
                            required
                            value={txToAccountId}
                            onChange={(e) =>
                              setTxToAccountId(Number(e.target.value))
                            }
                            className="w-full px-3.5 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white"
                          >
                            <option value="" disabled>
                              Destino
                            </option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Transfer Fee option */}
                      <div className="bg-gray-50 dark:bg-zinc-900 p-3.5 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Comisión por transferencia (Opcional)
                          </label>
                          <div className="flex items-center bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setTxTransferFeeType("fixed")}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${
                                txTransferFeeType === "fixed"
                                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                              }`}
                            >
                              $ Fijo
                            </button>
                            <button
                              type="button"
                              onClick={() => setTxTransferFeeType("percent")}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${
                                txTransferFeeType === "percent"
                                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                              }`}
                            >
                              % Porc.
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                            {txTransferFeeType === "fixed" ? "$" : "%"}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={
                              txTransferFeeType === "fixed"
                                ? "0.00 (sin comisión)"
                                : "0.00 %"
                            }
                            value={txTransferFeeValue}
                            onChange={(e) =>
                              setTxTransferFeeValue(e.target.value)
                            }
                            className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm"
                          />
                        </div>

                        {/* Live transfer preview */}
                        {txAmount && parseFloat(txAmount) > 0 && (
                          <div className="text-[11px] bg-white dark:bg-[#0a0a0a] p-2.5 rounded-xl border border-gray-150 dark:border-zinc-800 space-y-1">
                            {(() => {
                              const amount = parseFloat(txAmount) || 0;
                              const feeVal = parseFloat(txTransferFeeValue) || 0;
                              const feeAmount =
                                txTransferFeeType === "fixed"
                                  ? feeVal
                                  : (amount * feeVal) / 100;
                              const totalDebited = amount + feeAmount;
                              return (
                                <>
                                  <div className="flex justify-between text-gray-500">
                                    <span>Monto transferido:</span>
                                    <span>${amount.toFixed(2)}</span>
                                  </div>
                                  {feeAmount > 0 && (
                                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                                      <span>
                                        Comisión (
                                        {txTransferFeeType === "fixed"
                                          ? `$${feeVal.toFixed(2)}`
                                          : `${feeVal}%`}
                                        ):
                                      </span>
                                      <span>+${feeAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200 border-t border-gray-100 dark:border-zinc-800 pt-1">
                                    <span>Total a salir del origen:</span>
                                    <span className="text-red-500">
                                      ${totalDebited.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span>Total a llegar al destino:</span>
                                    <span>${amount.toFixed(2)}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Collapsible */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedTx(!showAdvancedTx)}
                      className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {showAdvancedTx ? "Ocultar fecha / opciones" : "Modificar fecha u otras opciones"}
                      {showAdvancedTx ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showAdvancedTx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 overflow-hidden pt-1"
                      >
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Fecha de movimiento
                          </label>
                          <input
                            type="date"
                            value={txDate}
                            onChange={(e) => setTxDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit CTA */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition-opacity active:scale-[0.99]"
                    >
                      {editingTx
                        ? "Guardar Cambios"
                        : txType === "EXPENSE"
                          ? "Guardar Gasto"
                          : txType === "INCOME"
                            ? "Guardar Ingreso"
                            : "Transferir Fondos"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Quick Add Funds Modal (Insufficient funds flow) */}
      <AnimatePresence>
        {showAddFundsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowAddFundsModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  Recargar / Recibir Fondos
                </h3>
                <button
                  onClick={() => setShowAddFundsModal(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Añade fondos directamente a{" "}
                <strong className="text-gray-900 dark:text-white">
                  {showAddFundsModal.accountName}
                </strong>{" "}
                para poder realizar la operación.
              </p>

              <form onSubmit={handleQuickAddFunds} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Monto a depositar ($)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    onKeyDown={blockNegativeKeys}
                    autoFocus
                    value={addFundsAmount}
                    onChange={(e) =>
                      setAddFundsAmount(e.target.value.replace(/-/g, ""))
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-bold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Añadir Fondos a la Cuenta
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pay Credit Card Modal */}
      <AnimatePresence>
        {showPayCardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowPayCardModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                <h3 className="text-lg font-bold">
                  Abonar a Tarjeta de Crédito
                </h3>
                <button
                  onClick={() => setShowPayCardModal(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-[#121212] rounded-2xl space-y-1 text-xs">
                <p>
                  <span className="text-gray-500">Tarjeta:</span>{" "}
                  <strong>{showPayCardModal.name}</strong>
                </p>
                <p>
                  <span className="text-gray-500">Deuda actual:</span>{" "}
                  <strong className="text-red-500">
                    {formatCurrency(Math.abs(showPayCardModal.balance_cents))}
                  </strong>
                </p>
              </div>

              <form onSubmit={handlePayCreditCard} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Monto a abonar ($)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    onKeyDown={blockNegativeKeys}
                    autoFocus
                    value={payCardAmount}
                    onChange={(e) =>
                      setPayCardAmount(e.target.value.replace(/-/g, ""))
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Pagar desde cuenta (Débito/Efectivo)
                  </label>
                  <select
                    required
                    value={payCardFromAccountId}
                    onChange={(e) =>
                      setPayCardFromAccountId(Number(e.target.value))
                    }
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  >
                    <option value="" disabled>
                      Selecciona cuenta de origen
                    </option>
                    {accounts
                      .filter((a) => a.type !== "credit")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatCurrency(a.balance_cents)})
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Confirmar Pago de Tarjeta
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Financed Installment Purchase Modal */}
      <AnimatePresence>
        {showInstallmentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowInstallmentModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                <h3 className="text-lg font-bold">Registrar Compra a Cuotas</h3>
                <button
                  onClick={() => setShowInstallmentModal(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateInstallment} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nombre / Producto
                  </label>
                  <input
                    required
                    type="text"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    placeholder="Ej. Smart TV, Laptop, Sofá..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">
                      Monto Total ($)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      onKeyDown={blockNegativeKeys}
                      value={instTotalAmount}
                      onChange={(e) =>
                        setInstTotalAmount(e.target.value.replace(/-/g, ""))
                      }
                      placeholder="1200.00"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">
                      Cant. Cuotas
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="72"
                      onKeyDown={blockNegativeKeys}
                      value={instTotalInstallments}
                      onChange={(e) =>
                        setInstTotalInstallments(
                          e.target.value.replace(/-/g, ""),
                        )
                      }
                      placeholder="12"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Asociar Tarjeta / Cuenta
                  </label>
                  <select
                    value={instAccountId}
                    onChange={(e) =>
                      setInstAccountId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium"
                  >
                    <option value="">Ninguna</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (
                        {a.type === "credit"
                          ? `Crédito - Cupo Disp: ${formatCurrency((a.credit_limit_cents || 0) - Math.abs(a.balance_cents))}`
                          : `Saldo: ${formatCurrency(a.balance_cents)}`}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Categoría de Gasto / Presupuesto
                  </label>
                  <select
                    value={instCategoryId}
                    onChange={(e) =>
                      setInstCategoryId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium"
                  >
                    <option value="">Sin categoría asignada</option>
                    {categories
                      .filter(
                        (cat) =>
                          !cat.type ||
                          cat.type.toUpperCase() === "EXPENSE" ||
                          cat.type.toUpperCase() === "GASTO",
                      )
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji || "🏷️"} {cat.name}{" "}
                          {cat.budget_limit_cents && cat.budget_limit_cents > 0
                            ? `(Presupuesto: $${(cat.budget_limit_cents / 100).toFixed(2)})`
                            : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {instAccountId &&
                  accounts.find((a) => a.id === Number(instAccountId))?.type ===
                    "credit" && (
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Interés (%){" "}
                        <span className="text-gray-400 font-normal">
                          (Opcional, dejar vacío si no tiene interés)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          onKeyDown={blockNegativeKeys}
                          placeholder="0.00 %"
                          value={instInterestPercent}
                          onChange={(e) =>
                            setInstInterestPercent(
                              e.target.value.replace(/-/g, ""),
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                          %
                        </div>
                      </div>
                    </div>
                  )}

                {instTotalAmount && parseFloat(instTotalAmount) > 0 && (
                  <div className="text-[11px] bg-gray-50 dark:bg-[#121212] p-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-1">
                    {(() => {
                      const base = parseFloat(instTotalAmount) || 0;
                      const interestRate = parseFloat(instInterestPercent) || 0;
                      const interestAmount = (base * interestRate) / 100;
                      const finalTotal = base + interestAmount;
                      const count = parseInt(instTotalInstallments) || 1;
                      const monthly = finalTotal / count;
                      return (
                        <>
                          <div className="flex justify-between text-gray-500">
                            <span>Monto base compra:</span>
                            <span>${base.toFixed(2)}</span>
                          </div>
                          {interestAmount > 0 && (
                            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                              <span>Interés ({interestRate}%):</span>
                              <span>+${interestAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200 border-t border-gray-200 dark:border-zinc-800 pt-1">
                            <span>Total a pagar/descontar del crédito:</span>
                            <span>${finalTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                            <span>{count} cuotas mensuales de:</span>
                            <span>${monthly.toFixed(2)} / mes</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">
                      Fecha de Inicio
                    </label>
                    <input
                      required
                      type="date"
                      value={instStartDate}
                      onChange={(e) => {
                        setInstStartDate(e.target.value);
                        if (e.target.value) {
                          const d = e.target.value.split("-")[2];
                          if (d) setInstPaymentDay(parseInt(d).toString());
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1">
                      Día de Cobro (1-31)
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="31"
                      onKeyDown={blockNegativeKeys}
                      value={instPaymentDay}
                      onChange={(e) =>
                        setInstPaymentDay(e.target.value.replace(/-/g, ""))
                      }
                      placeholder="Ej. 15"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Crear Plan de Cuotas
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contribute Modal */}
      <AnimatePresence>
        {showContributeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowContributeModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Aportar a Meta</h3>
                <button
                  onClick={() => setShowContributeModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleContribute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Monto a aportar
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-lg">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      onKeyDown={blockNegativeKeys}
                      required
                      autoFocus
                      value={contributeAmount}
                      onChange={(e) =>
                        setContributeAmount(e.target.value.replace(/-/g, ""))
                      }
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary text-lg"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descontar de la Cuenta
                  </label>
                  <select
                    required
                    value={contributeAccountId}
                    onChange={(e) =>
                      setContributeAccountId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium"
                  >
                    <option value="">Selecciona cuenta de origen</option>
                    {accounts
                      .filter((a) => a.type !== "credit")
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Saldo: {formatCurrency(acc.balance_cents)}
                          )
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Confirmar Aporte
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pay/Abonar Debt Modal */}
      <AnimatePresence>
        {showPayDebtModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowPayDebtModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Abonar Préstamo / Deuda
                </h3>
                <button
                  onClick={() => setShowPayDebtModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handlePayDebtConfirm} className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 space-y-1 bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div>
                      Préstamo:{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {showPayDebtModal.name}
                      </strong>
                    </div>
                    <div>
                      Monto total:{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {formatCurrency(showPayDebtModal.amount_cents)}
                      </strong>
                    </div>
                    <div>
                      Monto restante:{" "}
                      <strong className="text-red-500">
                        {formatCurrency(showPayDebtModal.remaining_cents)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">
                    Monto del abono
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">$</span>
                    </div>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      onKeyDown={blockNegativeKeys}
                      value={payDebtAmount}
                      onChange={(e) =>
                        setPayDebtAmount(e.target.value.replace(/-/g, ""))
                      }
                      className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">
                    {showPayDebtModal.type === "OWED"
                      ? "Cuenta donde se deposita el cobro"
                      : "Cuenta de donde se descuenta el pago"}
                  </label>
                  <select
                    required
                    value={payDebtAccountId}
                    onChange={(e) =>
                      setPayDebtAccountId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  >
                    <option value="">Selecciona cuenta...</option>
                    {accounts
                      .filter((a) => a.type !== "credit")
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance_cents)})
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Confirmar Abono
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Debt Modal */}
      <AnimatePresence>
        {editingDebt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setEditingDebt(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Editar Préstamo / Deuda
                </h3>
                <button
                  onClick={() => setEditingDebt(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateDebt} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">
                    Nombre del Préstamo / Deudor
                  </label>
                  <input
                    required
                    type="text"
                    value={editDebtName}
                    onChange={(e) => setEditDebtName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">
                    Tipo
                  </label>
                  <select
                    value={editDebtType}
                    onChange={(e) =>
                      setEditDebtType(e.target.value as "OWE" | "OWED")
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  >
                    <option value="OWE">Yo debo (Deuda)</option>
                    <option value="OWED">Me deben (Préstamo)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-500">
                      Monto Inicial
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      onKeyDown={blockNegativeKeys}
                      value={editDebtAmount}
                      onChange={(e) =>
                        setEditDebtAmount(e.target.value.replace(/-/g, ""))
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-500">
                      Monto Restante
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      onKeyDown={blockNegativeKeys}
                      value={editDebtRemaining}
                      onChange={(e) =>
                        setEditDebtRemaining(e.target.value.replace(/-/g, ""))
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={editDebtDueDate}
                    onChange={(e) => setEditDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Guardar Cambios
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Account Modal */}
      <AnimatePresence>
        {editingAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setEditingAccount(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-t-[2rem] sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-zinc-800 max-h-[88vh] overflow-y-auto space-y-4"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-3 cursor-grab" />
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Editar Cuenta / Tarjeta
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Nombre de la cuenta / tarjeta
                  </label>
                  <input
                    required
                    type="text"
                    value={editAccountName}
                    onChange={(e) => setEditAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Tipo de Cuenta
                  </label>
                  <select
                    value={editAccountType}
                    onChange={(e) => setEditAccountType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  >
                    <option value="bank">Cuenta Bancaria</option>
                    <option value="cash">Efectivo</option>
                    <option value="credit">Tarjeta de Crédito</option>
                    <option value="debit">Tarjeta de Débito</option>
                    <option value="wallet">Wallet Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    {editAccountType === "credit"
                      ? "Deuda Actual Cargada en Tarjeta ($)"
                      : "Saldo Disponible en la Cuenta ($)"}
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    onKeyDown={blockNegativeKeys}
                    placeholder={
                      editAccountType === "credit" ? "0.00 (sin deuda)" : "0.00"
                    }
                    value={editAccountBalance}
                    onChange={(e) =>
                      setEditAccountBalance(e.target.value.replace(/-/g, ""))
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {editAccountType === "credit"
                      ? "Monto que debes actualmente en la tarjeta (ingresa en positivo). 0.00 si no tienes deuda."
                      : "Dinero real disponible actualmente en esta cuenta."}
                  </p>
                </div>

                {editAccountType === "credit" && (
                  <div className="space-y-3.5 border-t border-gray-100 dark:border-zinc-800 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          Límite Crédito ($)
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          onKeyDown={blockNegativeKeys}
                          placeholder="Ej. 25000.00"
                          value={editAccountCreditLimit}
                          onChange={(e) =>
                            setEditAccountCreditLimit(
                              e.target.value.replace(/-/g, ""),
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          Últimos 4 dígitos
                        </label>
                        <input
                          maxLength={4}
                          type="text"
                          placeholder="1234"
                          value={editAccountCardNumberLast4}
                          onChange={(e) =>
                            setEditAccountCardNumberLast4(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          Día de Corte (1-31)
                        </label>
                        <input
                          required
                          type="number"
                          min={1}
                          max={31}
                          onKeyDown={blockNegativeKeys}
                          value={editAccountCutoffDay}
                          onChange={(e) =>
                            setEditAccountCutoffDay(
                              e.target.value.replace(/-/g, ""),
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          Día de Pago (1-31)
                        </label>
                        <input
                          required
                          type="number"
                          min={1}
                          max={31}
                          onKeyDown={blockNegativeKeys}
                          value={editAccountDueDay}
                          onChange={(e) =>
                            setEditAccountDueDay(
                              e.target.value.replace(/-/g, ""),
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Color Tarjeta
                      </label>
                      <select
                        value={editAccountCardColor}
                        onChange={(e) =>
                          setEditAccountCardColor(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                      >
                        <option value="slate">Carbono (Gris Oscuro)</option>
                        <option value="indigo">Índigo Royale</option>
                        <option value="blue">Azul Océano</option>
                        <option value="emerald">Verde Esmeralda</option>
                        <option value="rose">Rosa Cuarzo</option>
                        <option value="amber">Oro Ámbar</option>
                        <option value="violet">Amatista Violácea</option>
                      </select>
                    </div>
                  </div>
                )}

                {editAccountType === "debit" && (
                  <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          Últimos 4 dígitos
                        </label>
                        <input
                          maxLength={4}
                          type="text"
                          placeholder="1234"
                          value={editAccountCardNumberLast4}
                          onChange={(e) =>
                            setEditAccountCardNumberLast4(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          Color Tarjeta
                        </label>
                        <select
                          value={editAccountCardColor}
                          onChange={(e) =>
                            setEditAccountCardColor(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        >
                          <option value="slate">Carbono (Gris Oscuro)</option>
                          <option value="indigo">Índigo Royale</option>
                          <option value="blue">Azul Océano</option>
                          <option value="emerald">Verde Esmeralda</option>
                          <option value="rose">Rosa Cuarzo</option>
                          <option value="amber">Oro Ámbar</option>
                          <option value="violet">Amatista Violácea</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fees Section (Opciones Extras - Only for bank, credit, debit) */}
                {["bank", "credit", "debit"].includes(editAccountType) && (
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        setShowEditAccountExtras(!showEditAccountExtras)
                      }
                      className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 dark:bg-[#121212] rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        ⚙️ Opciones avanzadas (Mantenimiento / Anualidad)
                      </span>
                      {showEditAccountExtras ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {showEditAccountExtras && (
                      <div className="space-y-3 pl-1 pt-1">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-gray-500">
                              Mantenimiento / Anualidad
                            </label>
                            <div className="flex items-center bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditAccountMaintFeeType("fixed")
                                }
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                  editAccountMaintFeeType === "fixed"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                $ Fijo
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditAccountMaintFeeType("percent")
                                }
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                  editAccountMaintFeeType === "percent"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                % Porc.
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditAccountMaintFeeType("none");
                                  setEditAccountMaintFeeValue("");
                                }}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                  editAccountMaintFeeType === "none"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                No
                              </button>
                            </div>
                          </div>

                          {editAccountMaintFeeType !== "none" ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                                    {editAccountMaintFeeType === "fixed"
                                      ? "$"
                                      : "%"}
                                  </div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    onKeyDown={blockNegativeKeys}
                                    placeholder={
                                      editAccountMaintFeeType === "fixed"
                                        ? "0.00"
                                        : "0.00 %"
                                    }
                                    value={editAccountMaintFeeValue}
                                    onChange={(e) =>
                                      setEditAccountMaintFeeValue(
                                        e.target.value.replace(/-/g, ""),
                                      )
                                    }
                                    className="w-full pl-6 pr-2 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                  />
                                </div>
                                <select
                                  value={editAccountMaintFeeFreq}
                                  onChange={(e) =>
                                    setEditAccountMaintFeeFreq(
                                      e.target.value as any,
                                    )
                                  }
                                  className="px-2.5 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                >
                                  <option value="monthly">Mensual</option>
                                  <option value="yearly">Anual</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                  Fecha / Día de Cobro de Mantenimiento
                                </label>
                                <input
                                  type="date"
                                  value={editAccountMaintFeeDate}
                                  onChange={(e) =>
                                    setEditAccountMaintFeeDate(e.target.value)
                                  }
                                  className="w-full px-2.5 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 pl-1">
                              Sin cuota de mantenimiento
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Guardar Cambios
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Account Modal */}
      <AnimatePresence>
        {showCreateAccountModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowCreateAccountModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-t-[2rem] sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[88vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-3 cursor-grab" />
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold">
                  Añadir Nueva Cuenta / Tarjeta
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nombre de la Cuenta / Tarjeta
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Visa BBVA, Nomina Banamex, Efectivo..."
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Tipo
                    </label>
                    <select
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    >
                      <option value="bank">Cuenta Bancaria</option>
                      <option value="cash">Efectivo</option>
                      <option value="wallet">Wallet Digital</option>
                      <option value="credit">Tarjeta de Crédito</option>
                      <option value="debit">Tarjeta de Débito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {newAccountType === "credit"
                        ? "Deuda Actual ($)"
                        : "Saldo Disponible ($)"}
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      onKeyDown={blockNegativeKeys}
                      placeholder={
                        newAccountType === "credit"
                          ? "0.00 (sin deuda)"
                          : "0.00"
                      }
                      value={newAccountBalance}
                      onChange={(e) =>
                        setNewAccountBalance(e.target.value.replace(/-/g, ""))
                      }
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  {newAccountType === "credit"
                    ? "Deuda actual cargada en la tarjeta (ingresa en positivo). Si la tarjeta está sin uso ingresa 0."
                    : "Dinero total disponible en esta cuenta."}
                </p>

                {(newAccountType === "credit" ||
                  newAccountType === "debit") && (
                  <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                    {newAccountType === "credit" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Límite de Crédito Total ($)
                          </label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            onKeyDown={blockNegativeKeys}
                            placeholder="Ej. 25000.00"
                            value={newAccountCreditLimit}
                            onChange={(e) =>
                              setNewAccountCreditLimit(
                                e.target.value.replace(/-/g, ""),
                              )
                            }
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              Día de Corte (1-31)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              onKeyDown={blockNegativeKeys}
                              placeholder="Ej. 15"
                              value={newAccountCutoffDay}
                              onChange={(e) =>
                                setNewAccountCutoffDay(
                                  e.target.value
                                    ? Number(e.target.value.replace(/-/g, ""))
                                    : "",
                                )
                              }
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              Día Límite de Pago (1-31)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              onKeyDown={blockNegativeKeys}
                              placeholder="Ej. 5"
                              value={newAccountDueDay}
                              onChange={(e) =>
                                setNewAccountDueDay(
                                  e.target.value
                                    ? Number(e.target.value.replace(/-/g, ""))
                                    : "",
                                )
                              }
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Últimos 4 Dígitos
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="4242"
                          value={newAccountCardLast4}
                          onChange={(e) =>
                            setNewAccountCardLast4(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Color de Tarjeta
                        </label>
                        <select
                          value={newAccountCardColor}
                          onChange={(e) =>
                            setNewAccountCardColor(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                        >
                          <option value="slate">Carbono (Gris Oscuro)</option>
                          <option value="indigo">Índigo Royale</option>
                          <option value="blue">Azul Océano</option>
                          <option value="emerald">Verde Esmeralda</option>
                          <option value="rose">Rosa Cuarzo</option>
                          <option value="amber">Oro Ámbar</option>
                          <option value="violet">Amatista Violácea</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fees Section (Opciones Extras - Only for bank, credit, debit) */}
                {["bank", "credit", "debit"].includes(newAccountType) && (
                  <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        setShowNewAccountExtras(!showNewAccountExtras)
                      }
                      className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 dark:bg-[#121212] rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        ⚙️ Opciones avanzadas (Mantenimiento / Anualidad)
                      </span>
                      {showNewAccountExtras ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {showNewAccountExtras && (
                      <div className="space-y-3 pl-1 pt-1">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-gray-500">
                              Mantenimiento / Anualidad
                            </label>
                            <div className="flex items-center bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setNewAccountMaintFeeType("fixed")
                                }
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                  newAccountMaintFeeType === "fixed"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                $ Fijo
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setNewAccountMaintFeeType("percent")
                                }
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                  newAccountMaintFeeType === "percent"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                % Porc.
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewAccountMaintFeeType("none");
                                  setNewAccountMaintFeeValue("");
                                }}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                  newAccountMaintFeeType === "none"
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                No
                              </button>
                            </div>
                          </div>

                          {newAccountMaintFeeType !== "none" ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                                    {newAccountMaintFeeType === "fixed"
                                      ? "$"
                                      : "%"}
                                  </div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    onKeyDown={blockNegativeKeys}
                                    placeholder={
                                      newAccountMaintFeeType === "fixed"
                                        ? "0.00"
                                        : "0.00 %"
                                    }
                                    value={newAccountMaintFeeValue}
                                    onChange={(e) =>
                                      setNewAccountMaintFeeValue(
                                        e.target.value.replace(/-/g, ""),
                                      )
                                    }
                                    className="w-full pl-6 pr-2 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                  />
                                </div>
                                <select
                                  value={newAccountMaintFeeFreq}
                                  onChange={(e) =>
                                    setNewAccountMaintFeeFreq(
                                      e.target.value as any,
                                    )
                                  }
                                  className="px-2.5 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                >
                                  <option value="monthly">Mensual</option>
                                  <option value="yearly">Anual</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                  Fecha / Día de Cobro de Mantenimiento
                                </label>
                                <input
                                  type="date"
                                  value={newAccountMaintFeeDate}
                                  onChange={(e) =>
                                    setNewAccountMaintFeeDate(e.target.value)
                                  }
                                  className="w-full px-2.5 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 pl-1">
                              Sin cuota de mantenimiento
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Crear Cuenta / Tarjeta
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit Balance Info Modal */}
      <AnimatePresence>
        {showCreditInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowCreditInfoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-500" />
                  ¿Cómo se calcula el Balance Total?
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreditInfoModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
                <p>
                  <strong>1. Cuentas de Débito, Efectivo y Bancarias:</strong>{" "}
                  Suman directamente tu dinero real disponible en positivo.
                </p>
                <p>
                  <strong>2. Tarjetas de Crédito:</strong> Representan una deuda
                  cuando registras consumos. Por defecto, su deuda se resta de
                  tu patrimonio neto.
                </p>
                <p>
                  <strong>3. Opción "Incluir crédito disponible":</strong> Al
                  activar este interruptor, el cálculo sumará la línea de
                  crédito que tienes libre para gastar (Límite de crédito menos
                  tu deuda actual).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreditInfoModal(false)}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Creation & Editing Modal */}
      <AnimatePresence>
        {showCreateCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowCreateCategoryModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[88vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {editingCategory
                      ? "Editar Categoría / Presupuesto"
                      : "Nueva Categoría / Presupuesto"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configura el tipo, icono y límite mensual
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateCategoryModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                {/* Type Selector */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tipo de Categoría
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-[#121212] p-1 rounded-2xl border border-gray-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCatType("EXPENSE")}
                      className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        catType === "EXPENSE"
                          ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      Gasto / Presupuesto
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatType("INCOME")}
                      className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        catType === "INCOME"
                          ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      Ingreso
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Nombre de la Categoría
                  </label>
                  <div className="flex gap-2.5 items-center">
                    <EmojiPickerPopover
                      value={catEmoji}
                      onChange={setCatEmoji}
                    />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Ej. Supermercado, Transporte, Salario..."
                      className="flex-1 px-3.5 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Budget Limit (for Expense Categories) */}
                {catType === "EXPENSE" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Presupuesto Límite Mensual ($)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                        $
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        onKeyDown={blockNegativeKeys}
                        value={catBudgetAmount}
                        onChange={(e) =>
                          setCatBudgetAmount(e.target.value.replace(/-/g, ""))
                        }
                        placeholder="Ej. 300.00 (Opcional)"
                        className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold outline-none text-gray-900 dark:text-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Asigna un monto límite mensual para monitorear tu avance
                      en el módulo de Presupuestos.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCategoryModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all"
                  >
                    {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Set / Change Security PIN Modal */}
      <AnimatePresence>
        {showSetPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowSetPinModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {securityConfig?.pin_hash
                      ? "Cambiar PIN"
                      : "Crear PIN de Seguridad"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Introduce 4 dígitos numéricos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetPinModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSecurityPin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Nuevo PIN (4 dígitos)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                    autoFocus
                    value={newPinValue}
                    onChange={(e) =>
                      setNewPinValue(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••"
                    className="w-full text-center text-2xl tracking-widest font-mono py-2.5 px-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Confirmar PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                    value={confirmPinValue}
                    onChange={(e) =>
                      setConfirmPinValue(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••"
                    className="w-full text-center text-2xl tracking-widest font-mono py-2.5 px-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl"
                  />
                </div>

                {setPinError && (
                  <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {setPinError}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSetPinModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Guardar PIN
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Account Delete with PIN Modal */}
      <AnimatePresence>
        {showDeletePinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => {
              setShowDeletePinModal(false);
              setDeleteTargetAccountId(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 text-center"
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Confirmación de Seguridad
                </h3>
                <p className="text-xs text-gray-500">
                  Ingresa tu PIN de 4 dígitos para autorizar la eliminación de
                  esta cuenta o tarjeta.
                </p>
              </div>

              <form
                onSubmit={handleConfirmDeleteAccountWithPin}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    autoFocus
                    required
                    value={deletePinInput}
                    onChange={(e) =>
                      setDeletePinInput(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••"
                    className="w-full text-center text-2xl tracking-widest font-mono py-2.5 px-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl"
                  />
                  {deletePinError && (
                    <p className="text-xs font-semibold text-red-500 pt-1">
                      {deletePinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeletePinModal(false);
                      setDeleteTargetAccountId(null);
                    }}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disable PIN Modal */}
      <AnimatePresence>
        {showDisablePinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowDisablePinModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 text-center"
            >
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Desactivar PIN
                </h3>
                <p className="text-xs text-gray-500">
                  Ingresa tu PIN actual para desactivar la protección.
                </p>
              </div>

              <form onSubmit={handleDisablePin} className="space-y-4">
                <div className="space-y-1">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    autoFocus
                    required
                    value={disablePinInput}
                    onChange={(e) =>
                      setDisablePinInput(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••"
                    className="w-full text-center text-2xl tracking-widest font-mono py-2.5 px-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl"
                  />
                  {disablePinError && (
                    <p className="text-xs font-semibold text-red-500 pt-1">
                      {disablePinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDisablePinModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Desactivar PIN
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Set Global Total Budget Modal */}
      <AnimatePresence>
        {showSetTotalBudgetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowSetTotalBudgetModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0c0c] rounded-2xl p-5 w-full max-w-sm border border-gray-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Meta Global del Mes
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Establece el tope máximo de gastos para el mes seleccionado
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetTotalBudgetModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSetBudget} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Monto Total Presupuestado ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    onKeyDown={blockNegativeKeys}
                    value={budgetAmount}
                    onChange={(e) =>
                      setBudgetAmount(e.target.value.replace(/-/g, ""))
                    }
                    placeholder="Ej. 1500.00"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-base font-bold outline-none text-gray-900 dark:text-white"
                  />
                  <p className="text-[11px] text-gray-400">
                    Este monto actúa como el techo general para comparar contra tus gastos totales del mes.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSetTotalBudgetModal(false)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                  >
                    Guardar Meta
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Budget Breakdown Item Modal */}
      <AnimatePresence>
        {showBudgetItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowBudgetItemModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0c0c] rounded-2xl p-5 w-full max-w-sm border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    {editingBudgetItem ? "Editar Desglose" : "Añadir Desglose"}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Asigna un límite a una categoría de gasto
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBudgetItemModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBudgetItem} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Nombre del Desglose
                  </label>
                  <div className="flex gap-2 items-center">
                    <EmojiPickerPopover
                      value={budgetItemIcon}
                      onChange={setBudgetItemIcon}
                    />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={budgetItemName}
                      onChange={(e) => setBudgetItemName(e.target.value)}
                      placeholder="Ej. Supermercado, Alquiler, Salidas..."
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Presupuesto Asignado ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    onKeyDown={blockNegativeKeys}
                    value={budgetItemAmount}
                    onChange={(e) =>
                      setBudgetItemAmount(e.target.value.replace(/-/g, ""))
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Vincular con Categoría (Opcional)
                  </label>
                  <select
                    value={budgetItemCategoryId}
                    onChange={(e) =>
                      setBudgetItemCategoryId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">
                      Sin vincular (por nombre o etiqueta)
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBudgetItemModal(false)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-colors"
                  >
                    {editingBudgetItem ? "Guardar Cambios" : "Crear Desglose"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Expense to Budget Breakdown Modal */}
      <AnimatePresence>
        {quickExpenseBudgetItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setQuickExpenseBudgetItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0c0c] rounded-2xl p-5 w-full max-w-sm border border-gray-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {quickExpenseBudgetItem.icon || "🏷️"}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Registrar Gasto
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {quickExpenseBudgetItem.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickExpenseBudgetItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleQuickExpenseToBudgetItem}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Monto del Gasto ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    onKeyDown={blockNegativeKeys}
                    value={txAmount}
                    onChange={(e) =>
                      setTxAmount(e.target.value.replace(/-/g, ""))
                    }
                    placeholder="0.00"
                    className="w-full text-center text-xl font-bold py-2 px-3 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Cuenta de Pago
                  </label>
                  <select
                    required
                    value={txAccountId}
                    onChange={(e) =>
                      setTxAccountId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (
                        {acc.type === "credit"
                          ? `Deuda: ${formatCurrency(acc.balance_cents)}`
                          : `Disponible: ${formatCurrency(acc.balance_cents)}`}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                    Descripción (Opcional)
                  </label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder={`Gasto en ${quickExpenseBudgetItem.name}`}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickExpenseBudgetItem(null)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Registrar Gasto
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Cargar Lista de Compras a Gasto */}
      <AnimatePresence>
        {showLoadExpenseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowLoadExpenseModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0c0c] rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    Cargar Gasto de Compras
                  </h3>
                  <p className="text-xs text-gray-500">
                    Registra los artículos marcados como un gasto real
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoadExpenseModal(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">
                    Lista: {showLoadExpenseModal.name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {
                      shoppingItems.filter(
                        (i) =>
                          i.list_id === showLoadExpenseModal.id &&
                          i.is_purchased,
                      ).length
                    }{" "}
                    artículos marcados
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-medium block">
                    Monto a descontar
                  </span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      shoppingItems
                        .filter(
                          (i) =>
                            i.list_id === showLoadExpenseModal.id &&
                            i.is_purchased,
                        )
                        .reduce(
                          (acc, item) =>
                            acc +
                            (item.quantity || 1) * (item.price_cents || 0),
                          0,
                        ),
                    )}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmLoadExpense} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Cuenta para aplicar el gasto *
                  </label>
                  <select
                    required
                    value={loadExpenseAccountId}
                    onChange={(e) => setLoadExpenseAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-gray-400 transition-colors"
                  >
                    <option value="">-- Seleccionar Cuenta --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance_cents)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Categoría del Gasto
                  </label>
                  <select
                    value={loadExpenseCategoryId}
                    onChange={(e) => setLoadExpenseCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-gray-400 transition-colors"
                  >
                    <option value="">Sin Categoría</option>
                    {categories
                      .filter((c) => c.type === "EXPENSE" || !c.type)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon || "🏷️"} {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Descripción de la transacción
                  </label>
                  <input
                    type="text"
                    required
                    value={loadExpenseDescription}
                    onChange={(e) => setLoadExpenseDescription(e.target.value)}
                    placeholder="Ej. Compra de supermercado semanal"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-gray-400 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={loadExpenseDate}
                    onChange={(e) => setLoadExpenseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-gray-400 transition-colors"
                  />
                </div>

                <p className="text-[11px] text-gray-500 bg-gray-50 dark:bg-[#141414] p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                  Al confirmar, se registrará el gasto en la cuenta seleccionada
                  y los artículos comprados se restablecerán para su
                  reutilización.
                </p>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoadExpenseModal(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Registrar Gasto
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminación de Mes en Cierre con PIN */}
      <AnimatePresence>
        {showDeleteMonthModal && deleteTargetMonth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100010] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowDeleteMonthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0c0c0c] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Eliminar Mes
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {deleteTargetMonth.monthName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteMonthModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-red-50/80 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                  ¿Eliminar todos los registros de este mes?
                </p>
                <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                  Se borrarán permanentemente los {deleteTargetMonth.count}{" "}
                  movimientos y datos de presupuesto asociados a{" "}
                  {deleteTargetMonth.monthName}.
                </p>
              </div>

              <form
                onSubmit={handleConfirmDeleteMonthWithPin}
                className="space-y-4"
              >
                {securityConfig?.pin_hash && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>Ingresa tu PIN de seguridad (4 dígitos)</span>
                      <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      required
                      autoFocus
                      value={deleteMonthPinInput}
                      onChange={(e) => {
                        setDeleteMonthPinError("");
                        setDeleteMonthPinInput(
                          e.target.value.replace(/\D/g, ""),
                        );
                      }}
                      placeholder="••••"
                      className="w-full text-center text-2xl tracking-[0.5em] py-2 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white outline-none focus:border-red-500 font-mono"
                    />
                    {deleteMonthPinError && (
                      <p className="text-[11px] text-red-500 font-medium text-center">
                        {deleteMonthPinError}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeleteMonthModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                  >
                    Eliminar Mes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </FinancePortal>
    </div>
  );
};
