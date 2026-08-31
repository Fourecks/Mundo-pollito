import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FinanceAccount, FinanceTransaction, FinanceCategory, FinanceBudget, FinanceBudgetItem, FinanceSecurity, FinanceRecurringTransaction, FinanceSavingsGoal, FinanceShoppingList, FinanceShoppingItem, FinanceInstallment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    PlusIcon, XIcon, ArrowRightLeft, TrendingUp, TrendingDown, EyeIcon, EyeOffIcon, 
    LayoutDashboard, ListOrdered, PieChart, CalendarDays, Settings, Trash2, Wallet, 
    CreditCard, Landmark, CheckCircle2, ChevronDown, ChevronUp, Calendar, Banknote, ShoppingCart, BarChart3, Archive,
    ChevronLeft, ChevronRight, Download, AlertTriangle, Layers, ShieldCheck, Clock, Receipt, Pencil, HelpCircle,
    Lock, Unlock, KeyRound, ShieldAlert, Sparkles, FolderPlus, DollarSign, RefreshCw, Copy, Check
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface FinanceModuleProps {
    onClose?: () => void;
}

type TabType = 'overview' | 'transactions' | 'budgets' | 'planning' | 'savings' | 'shopping' | 'debts' | 'stats' | 'closing' | 'settings';
type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER_OUT' | 'TRANSFER_IN';

export const FinanceModule: React.FC<FinanceModuleProps> = ({ onClose }) => {
    // --- Global State ---
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // --- Data State ---
    const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
    const [budgetItems, setBudgetItems] = useState<FinanceBudgetItem[]>([]);
    const [recurring, setRecurring] = useState<FinanceRecurringTransaction[]>([]);
    const [savingsGoals, setSavingsGoals] = useState<FinanceSavingsGoal[]>([]);
    const [shoppingLists, setShoppingLists] = useState<FinanceShoppingList[]>([]);
    const [shoppingItems, setShoppingItems] = useState<FinanceShoppingItem[]>([]);
    const [debts, setDebts] = useState<any[]>([]);
    const [installments, setInstallments] = useState<FinanceInstallment[]>([]);
    const [securityConfig, setSecurityConfig] = useState<FinanceSecurity | null>(() => {
        try {
            const allKeys = Object.keys(localStorage);
            const secKey = allKeys.find(k => k.startsWith('finance_sec_'));
            if (secKey) {
                const cached = localStorage.getItem(secKey);
                if (cached) return JSON.parse(cached);
            }
        } catch {}
        return null;
    });

    // --- Security & PIN States ---
    const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
        try {
            const isAlreadyUnlocked = sessionStorage.getItem('finance_unlocked_session') === 'true';
            if (isAlreadyUnlocked) return true;
            const allKeys = Object.keys(localStorage);
            const secKey = allKeys.find(k => k.startsWith('finance_sec_'));
            if (secKey) {
                const cached = localStorage.getItem(secKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.pin_hash && (parsed.require_on_enter || parsed.require_pin_on_entry)) {
                        return false;
                    }
                }
            }
        } catch {}
        return true;
    });
    const [lockPinInput, setLockPinInput] = useState('');
    const [lockPinError, setLockPinError] = useState('');
    const [showSetPinModal, setShowSetPinModal] = useState(false);
    const [newPinValue, setNewPinValue] = useState('');
    const [confirmPinValue, setConfirmPinValue] = useState('');
    const [setPinError, setSetPinError] = useState('');
    const [showDeletePinModal, setShowDeletePinModal] = useState(false);
    const [deleteTargetAccountId, setDeleteTargetAccountId] = useState<number | null>(null);
    const [deletePinInput, setDeletePinInput] = useState('');
    const [deletePinError, setDeletePinError] = useState('');
    const [showDisablePinModal, setShowDisablePinModal] = useState(false);
    const [disablePinInput, setDisablePinInput] = useState('');
    const [disablePinError, setDisablePinError] = useState('');

    // --- Budget Breakdown States ---
    const [selectedBudgetMonth, setSelectedBudgetMonth] = useState<string>(new Date().toISOString().substring(0, 7));
    const [showBudgetItemModal, setShowBudgetItemModal] = useState(false);
    const [editingBudgetItem, setEditingBudgetItem] = useState<FinanceBudgetItem | null>(null);
    const [budgetItemName, setBudgetItemName] = useState('');
    const [budgetItemAmount, setBudgetItemAmount] = useState('');
    const [budgetItemIcon, setBudgetItemIcon] = useState('🍔');
    const [budgetItemColor, setBudgetItemColor] = useState('#10b981');
    const [budgetItemCategoryId, setBudgetItemCategoryId] = useState<number | ''>('');
    const [quickExpenseBudgetItem, setQuickExpenseBudgetItem] = useState<FinanceBudgetItem | null>(null);

    // --- Filters (Transactions) ---
    const [txFilterSearch, setTxFilterSearch] = useState('');
    const [txFilterType, setTxFilterType] = useState<TransactionType | 'ALL'>('ALL');
    const [txFilterAccount, setTxFilterAccount] = useState<number | 'ALL'>('ALL');
    const [txFilterDateRange, setTxFilterDateRange] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR'>('THIS_MONTH');

    // --- Modal States ---
    const [showTxModal, setShowTxModal] = useState(false);
    const [txType, setTxType] = useState<TransactionType>('EXPENSE');
    const [showAdvancedTx, setShowAdvancedTx] = useState(false);
    
    const [showContributeModal, setShowContributeModal] = useState<number | null>(null);
    const [contributeAmount, setContributeAmount] = useState('');
    const [contributeAccountId, setContributeAccountId] = useState<number | ''>('');

    const [showPayDebtModal, setShowPayDebtModal] = useState<any | null>(null);
    const [payDebtAmount, setPayDebtAmount] = useState('');
    const [payDebtAccountId, setPayDebtAccountId] = useState<number | ''>('');

    // --- Funds & Credit Card Payment Modals ---
    const [showAddFundsModal, setShowAddFundsModal] = useState<{ accountId: number; accountName: string; requiredCents?: number } | null>(null);
    const [addFundsAmount, setAddFundsAmount] = useState('');

    const [showPayCardModal, setShowPayCardModal] = useState<FinanceAccount | null>(null);
    const [payCardAmount, setPayCardAmount] = useState('');
    const [payCardFromAccountId, setPayCardFromAccountId] = useState<number | ''>('');

    // --- Installment Modal ---
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [instName, setInstName] = useState('');
    const [instTotalAmount, setInstTotalAmount] = useState('');
    const [instTotalInstallments, setInstTotalInstallments] = useState('12');
    const [instAccountId, setInstAccountId] = useState<number | ''>('');
    const [instStartDate, setInstStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [instPaymentDay, setInstPaymentDay] = useState(new Date().getDate().toString());
    const [instInterestPercent, setInstInterestPercent] = useState('');

    // --- Create Account Modal & System Alerts ---
    const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
    const [financialAlerts, setFinancialAlerts] = useState<string[]>([]);
    const [showCreditInfoModal, setShowCreditInfoModal] = useState(false);

    // --- Planning Sub-tab & Calendar ---
    const [planningSubTab, setPlanningSubTab] = useState<'calendar' | 'subscriptions' | 'installments'>('calendar');
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
    const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(new Date().toISOString().split('T')[0]);
    const [includeAvailableCredit, setIncludeAvailableCredit] = useState(false);

    // --- Form States (Transaction) ---
    const [txAmount, setTxAmount] = useState('');
    const [txCategoryId, setTxCategoryId] = useState<number | ''>('');
    const [txAccountId, setTxAccountId] = useState<number | ''>('');
    const [txToAccountId, setTxToAccountId] = useState<number | ''>(''); // For transfers
    const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
    const [txDescription, setTxDescription] = useState('');
    const [txTransferFeeType, setTxTransferFeeType] = useState<'fixed' | 'percent'>('fixed');
    const [txTransferFeeValue, setTxTransferFeeValue] = useState('');

    // --- Form States (Settings/Accounts/Categories) ---
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState('bank');
    const [newAccountBalance, setNewAccountBalance] = useState('');
    const [newAccountCreditLimit, setNewAccountCreditLimit] = useState('');
    const [newAccountCutoffDay, setNewAccountCutoffDay] = useState<number | ''>(15);
    const [newAccountDueDay, setNewAccountDueDay] = useState<number | ''>(5);
    const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
    const [newAccountCardColor, setNewAccountCardColor] = useState('slate');
    const [newAccountMaintFeeType, setNewAccountMaintFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
    const [newAccountMaintFeeValue, setNewAccountMaintFeeValue] = useState('');
    const [newAccountMaintFeeFreq, setNewAccountMaintFeeFreq] = useState<'monthly' | 'yearly'>('monthly');
    const [newAccountMaintFeeDate, setNewAccountMaintFeeDate] = useState('');
    const [newAccountTransferFeeType, setNewAccountTransferFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
    const [newAccountTransferFeeValue, setNewAccountTransferFeeValue] = useState('');
    
    const [newCatName, setNewCatName] = useState('');
    const [newCatEmoji, setNewCatEmoji] = useState('💰');
    const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
    const [catName, setCatName] = useState('');
    const [catEmoji, setCatEmoji] = useState('🏷️');
    const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
    const [catBudgetAmount, setCatBudgetAmount] = useState('');
    const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);

    // --- Form States (Budget) ---
    const [budgetAmount, setBudgetAmount] = useState('');

    // --- Form States (Recurring) ---
    const [recAmount, setRecAmount] = useState('');
    const [recDesc, setRecDesc] = useState('');
    const [recFrequency, setRecFrequency] = useState('monthly');
    const [recNextDate, setRecNextDate] = useState(new Date().toISOString().split('T')[0]);
    const [recAccountId, setRecAccountId] = useState<number | ''>('');

    // --- Edit States ---
    const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
    const [editAccountName, setEditAccountName] = useState('');
    const [editAccountType, setEditAccountType] = useState('bank');
    const [editAccountBalance, setEditAccountBalance] = useState('');
    const [editAccountCardColor, setEditAccountCardColor] = useState('slate');
    const [editAccountCreditLimit, setEditAccountCreditLimit] = useState('');
    const [editAccountCutoffDay, setEditAccountCutoffDay] = useState('');
    const [editAccountDueDay, setEditAccountDueDay] = useState('');
    const [editAccountCardNumberLast4, setEditAccountCardNumberLast4] = useState('');
    const [editAccountMaintFeeType, setEditAccountMaintFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
    const [editAccountMaintFeeValue, setEditAccountMaintFeeValue] = useState('');
    const [editAccountMaintFeeFreq, setEditAccountMaintFeeFreq] = useState<'monthly' | 'yearly'>('monthly');
    const [editAccountMaintFeeDate, setEditAccountMaintFeeDate] = useState('');
    const [editAccountTransferFeeType, setEditAccountTransferFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
    const [editAccountTransferFeeValue, setEditAccountTransferFeeValue] = useState('');
    const [showNewAccountExtras, setShowNewAccountExtras] = useState(false);
    const [showEditAccountExtras, setShowEditAccountExtras] = useState(false);

    const [editingDebt, setEditingDebt] = useState<any | null>(null);
    const [editDebtName, setEditDebtName] = useState('');
    const [editDebtType, setEditDebtType] = useState<'OWE' | 'OWED'>('OWE');
    const [editDebtAmount, setEditDebtAmount] = useState('');
    const [editDebtRemaining, setEditDebtRemaining] = useState('');
    const [editDebtDueDate, setEditDebtDueDate] = useState('');

    // --- Form States (Savings Goals) ---
    const [goalName, setGoalName] = useState('');
    const [goalTargetAmount, setGoalTargetAmount] = useState('');
    const [goalTargetDate, setGoalTargetDate] = useState('');

    // --- Form States (Debts) ---
    const [debtName, setDebtName] = useState('');
    const [debtType, setDebtType] = useState<'OWE' | 'OWED'>('OWE');
    const [debtAmount, setDebtAmount] = useState('');
    const [debtDueDate, setDebtDueDate] = useState('');
    
    // --- Form States (Shopping) ---
    const [newListName, setNewListName] = useState('');
    const [newItemNames, setNewItemNames] = useState<{ [listId: number]: string }>({});

    useEffect(() => {
        fetchFinanceData();
    }, []);

    const autoProcessDueSubscriptions = async (recList: FinanceRecurringTransaction[], accountsList: any[]) => {
        const today = new Date().toISOString().split('T')[0];
        const due = recList.filter(r => r.next_date && r.next_date <= today);
        if (due.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let dataChanged = false;
        let alertsAdded: string[] = [];

        for (const rec of due) {
            const targetAccId = rec.account_id || accountsList[0]?.id;
            if (!targetAccId) continue;

            const currAcc = accountsList.find(a => a.id === targetAccId);
            if (!currAcc) continue;

            const txAmount = rec.amount_cents;
            let hasSufficient = true;

            if (currAcc.type === 'credit') {
                const limit = currAcc.credit_limit_cents || 0;
                const used = currAcc.balance_cents;
                const available = limit - used;
                if (limit > 0 && txAmount > available) {
                    hasSufficient = false;
                    alertsAdded.push(`⚠️ Pago Tardío / Cupo Insuficiente: La suscripción '${rec.description || 'Suscripción'}' ($${(txAmount/100).toFixed(2)}) no se cobró en '${currAcc.name}' por falta de cupo de crédito.`);
                }
            } else {
                if (currAcc.balance_cents < txAmount) {
                    hasSufficient = false;
                    alertsAdded.push(`⚠️ Pago Tardío / Sin Fondos: La suscripción '${rec.description || 'Suscripción'}' ($${(txAmount/100).toFixed(2)}) no se cobró en '${currAcc.name}' por falta de saldo disponible.`);
                }
            }

            if (!hasSufficient) {
                rec.is_past_due = true;
                continue;
            }

            // Insert transaction
            await supabase.from('finance_transactions').insert([{
                user_id: user.id,
                account_id: targetAccId,
                type: rec.type || 'EXPENSE',
                amount_cents: txAmount,
                date: today,
                description: `Cobro automático suscripción: ${rec.description || 'Suscripción'}`
            }]);

            // Update Account Balance
            const newBalance = (rec.type === 'INCOME') 
                ? currAcc.balance_cents + txAmount 
                : (currAcc.type === 'credit' ? currAcc.balance_cents + txAmount : Math.max(0, currAcc.balance_cents - txAmount));
            await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newBalance) }).eq('id', targetAccId);
            currAcc.balance_cents = Math.max(0, newBalance);

            // Update Next Date
            const currentNext = new Date(rec.next_date || today);
            if (rec.frequency === 'weekly') currentNext.setDate(currentNext.getDate() + 7);
            else if (rec.frequency === 'yearly') currentNext.setFullYear(currentNext.getFullYear() + 1);
            else currentNext.setMonth(currentNext.getMonth() + 1);

            const newNextDateStr = currentNext.toISOString().split('T')[0];
            await supabase.from('finance_recurring_transactions').update({ next_date: newNextDateStr }).eq('id', rec.id);
            dataChanged = true;
        }

        if (alertsAdded.length > 0) {
            setFinancialAlerts(prev => Array.from(new Set([...prev, ...alertsAdded])));
        }

        if (dataChanged) {
            const [accRes, txRes, recRes] = await Promise.all([
                supabase.from('finance_accounts').select('*').order('created_at'),
                supabase.from('finance_transactions').select('*').order('date', { ascending: false }).limit(200),
                supabase.from('finance_recurring_transactions').select('*').order('next_date')
            ]);
            if (accRes.data) setAccounts(accRes.data);
            if (txRes.data) setTransactions(txRes.data);
            if (recRes.data) setRecurring(recRes.data);
        }
    };

    const autoProcessDueInstallments = async (instList: FinanceInstallment[], accountsList: any[]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();
        const currentMonthKey = todayStr.substring(0, 7);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let alertsAdded: string[] = [];
        let dataChanged = false;

        for (const inst of instList) {
            if (inst.status !== 'ACTIVE') continue;

            const start = new Date(inst.start_date);
            const payDay = inst.payment_day || start.getDate() || 15;

            // Calculate expected payments up to current date
            let totalMonthsElapsed = (currentYear - start.getFullYear()) * 12 + (currentMonth - start.getMonth());
            if (currentDay >= payDay) {
                totalMonthsElapsed += 1;
            }

            const expectedPaid = Math.min(Math.max(0, totalMonthsElapsed), inst.total_installments);

            if (inst.paid_installments < expectedPaid) {
                const nextPaid = inst.paid_installments + 1;
                const newStatus = nextPaid >= inst.total_installments ? 'COMPLETED' : 'ACTIVE';

                const targetAccId = inst.account_id || accountsList[0]?.id;
                if (!targetAccId) continue;

                const currAcc = accountsList.find(a => a.id === targetAccId);
                if (!currAcc) continue;

                let hasSufficient = true;
                if (currAcc.type === 'credit') {
                    // For credit card installment payments: total was retained at purchase creation.
                    // Monthly payment releases debt back into available limit!
                    // Checking available limit is not blocking release, but check if card is frozen/overdue
                } else {
                    if (currAcc.balance_cents < inst.installment_amount_cents) {
                        hasSufficient = false;
                        alertsAdded.push(`⚠️ Pago Tardío / Sin Fondos: No se pudo cobrar la cuota "${inst.name}" ($${(inst.installment_amount_cents/100).toFixed(2)}) en '${currAcc.name}' por falta de saldo disponible.`);
                    }
                }

                if (!hasSufficient) {
                    inst.is_past_due = true;
                    continue;
                }

                await supabase.from('finance_installments').update({
                    paid_installments: nextPaid,
                    last_paid_month: currentMonthKey,
                    status: newStatus
                }).eq('id', inst.id);

                await supabase.from('finance_transactions').insert([{
                    user_id: user.id,
                    account_id: targetAccId,
                    type: 'EXPENSE',
                    amount_cents: inst.installment_amount_cents,
                    date: todayStr,
                    description: `Cobro automático cuota ${nextPaid}/${inst.total_installments} (Día ${payDay}): ${inst.name}`
                }]);

                // On credit cards, paying monthly installment lowers total used debt, releasing credit limit!
                const newBal = currAcc.type === 'credit'
                    ? Math.max(0, currAcc.balance_cents - inst.installment_amount_cents)
                    : currAcc.balance_cents - inst.installment_amount_cents;

                await supabase.from('finance_accounts').update({ balance_cents: newBal }).eq('id', targetAccId);

                currAcc.balance_cents = newBal;
                inst.paid_installments = nextPaid;
                inst.last_paid_month = currentMonthKey;
                inst.status = newStatus;
                dataChanged = true;
            }
        }

        if (alertsAdded.length > 0) {
            setFinancialAlerts(prev => Array.from(new Set([...prev, ...alertsAdded])));
        }

        if (dataChanged) {
            fetchFinanceData();
        }
    };

    const hashPin = async (pin: string): Promise<string> => {
        const clean = pin.trim();
        try {
            if (window.crypto && window.crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(clean + '_fin_security_salt_2026');
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch {
            // fallback
        }
        let hash = 5381;
        const str = clean + '_fin_security_salt_2026';
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    };

    // Auto-carryover of budget items to future / new months
    useEffect(() => {
        if (!selectedBudgetMonth || budgetItems.length === 0) return;

        const currentMonthItems = budgetItems.filter(b => b.month === selectedBudgetMonth);
        if (currentMonthItems.length === 0) {
            // Find most recent month with configured items
            const allMonths = Array.from(new Set(budgetItems.map(b => b.month))).sort().reverse();
            const sourceMonth = allMonths.find(m => m < selectedBudgetMonth) || allMonths[0];
            
            if (sourceMonth && sourceMonth !== selectedBudgetMonth) {
                const sourceItems = budgetItems.filter(b => b.month === sourceMonth);
                if (sourceItems.length > 0) {
                    const doAutoCarryover = async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;

                        const newItems = sourceItems.map(item => ({
                            user_id: user.id,
                            month: selectedBudgetMonth,
                            name: item.name,
                            icon: item.icon || '🏷️',
                            color: item.color || '#3b82f6',
                            allocated_cents: item.allocated_cents,
                            category_id: item.category_id || null
                        }));

                        try {
                            const { data: inserted, error } = await supabase.from('finance_budget_items').insert(newItems).select();
                            if (inserted && !error) {
                                setBudgetItems(prev => [...prev, ...inserted]);
                            } else {
                                const localItems = newItems.map((item, idx) => ({ ...item, id: Date.now() + idx } as FinanceBudgetItem));
                                setBudgetItems(prev => [...prev, ...localItems]);
                            }
                        } catch {
                            const localItems = newItems.map((item, idx) => ({ ...item, id: Date.now() + idx } as FinanceBudgetItem));
                            setBudgetItems(prev => [...prev, ...localItems]);
                        }

                        // Also carry over overall monthly budget target if exists
                        const sourceBudget = budgets.find(b => b.month === sourceMonth);
                        const curBudget = budgets.find(b => b.month === selectedBudgetMonth);
                        if (sourceBudget && !curBudget) {
                            try {
                                await supabase.from('finance_budgets').insert([{
                                    user_id: user.id,
                                    month: selectedBudgetMonth,
                                    total_amount_cents: sourceBudget.total_amount_cents
                                }]);
                                setBudgets(prev => [...prev, {
                                    id: Date.now(),
                                    user_id: user.id,
                                    month: selectedBudgetMonth,
                                    total_amount_cents: sourceBudget.total_amount_cents
                                }]);
                            } catch {
                                // silent
                            }
                        }
                    };
                    doAutoCarryover();
                }
            }
        }
    }, [selectedBudgetMonth, budgetItems.length]);

    const fetchFinanceData = async (silent: boolean = false) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Immediate local cache restore for PIN security
            const localSecKey = `finance_sec_${user.id}`;
            const cachedSec = localStorage.getItem(localSecKey);
            if (cachedSec) {
                try {
                    const parsed = JSON.parse(cachedSec);
                    if (parsed && parsed.pin_hash) {
                        setSecurityConfig(parsed);
                        if ((parsed.require_on_enter || parsed.require_pin_on_entry) && parsed.pin_hash) {
                            const isAlreadyUnlocked = sessionStorage.getItem('finance_unlocked_session') === 'true';
                            if (!isAlreadyUnlocked) {
                                setIsUnlocked(false);
                            }
                        }
                    }
                } catch {
                    // silent
                }
            }

            const [accRes, catRes, txRes, budRes, recRes, goalsRes] = await Promise.all([
                supabase.from('finance_accounts').select('*').order('created_at'),
                supabase.from('finance_categories').select('*').order('name'),
                supabase.from('finance_transactions').select('*').order('date', { ascending: false }).limit(200),
                supabase.from('finance_budgets').select('*'),
                supabase.from('finance_recurring_transactions').select('*').order('next_date'),
                supabase.from('finance_savings_goals').select('*').order('created_at', { ascending: false })
            ]);

            if (accRes.data) setAccounts(accRes.data);
            if (catRes.data && catRes.data.length > 0) {
                setCategories(catRes.data);
            } else if (user) {
                const defaultCats = [
                    { name: 'Supermercado & Alimentación', emoji: '🛒', type: 'EXPENSE', budget_limit_cents: 30000, user_id: user.id, is_archived: false },
                    { name: 'Vivienda & Alquiler', emoji: '🏠', type: 'EXPENSE', budget_limit_cents: 50000, user_id: user.id, is_archived: false },
                    { name: 'Transporte & Combustible', emoji: '🚗', type: 'EXPENSE', budget_limit_cents: 15000, user_id: user.id, is_archived: false },
                    { name: 'Entretenimiento & Ocio', emoji: '🍿', type: 'EXPENSE', budget_limit_cents: 10000, user_id: user.id, is_archived: false },
                    { name: 'Servicios & Luz', emoji: '💡', type: 'EXPENSE', budget_limit_cents: 12000, user_id: user.id, is_archived: false },
                    { name: 'Salud & Bienestar', emoji: '🩺', type: 'EXPENSE', budget_limit_cents: 8000, user_id: user.id, is_archived: false },
                    { name: 'Salario & Nómina', emoji: '💼', type: 'INCOME', budget_limit_cents: 0, user_id: user.id, is_archived: false },
                    { name: 'Freelance & Honorarios', emoji: '💵', type: 'INCOME', budget_limit_cents: 0, user_id: user.id, is_archived: false },
                    { name: 'Inversiones', emoji: '📈', type: 'INCOME', budget_limit_cents: 0, user_id: user.id, is_archived: false }
                ];
                supabase.from('finance_categories').insert(defaultCats).select('*').then(({ data }) => {
                    if (data) setCategories(data);
                });
            }
            if (txRes.data) setTransactions(txRes.data);
            if (budRes.data) setBudgets(budRes.data);
            if (recRes.data) setRecurring(recRes.data);
            if (goalsRes.data) setSavingsGoals(goalsRes.data);

            if (recRes.data && accRes.data) {
                autoProcessDueSubscriptions(recRes.data, accRes.data);
            }

            try {
                const [listsRes, itemsRes, debtsRes, instRes, bItemsRes, secRes] = await Promise.all([
                    supabase.from('finance_shopping_lists').select('*').order('created_at', { ascending: false }),
                    supabase.from('finance_shopping_items').select('*').order('created_at'),
                    supabase.from('finance_debts').select('*').order('created_at', { ascending: false }),
                    supabase.from('finance_installments').select('*').order('created_at', { ascending: false }),
                    supabase.from('finance_budget_items').select('*').order('created_at'),
                    supabase.from('finance_security').select('*').eq('user_id', user.id).maybeSingle()
                ]);
                if (listsRes.data) setShoppingLists(listsRes.data);
                if (itemsRes.data) setShoppingItems(itemsRes.data);
                if (debtsRes.data) setDebts(debtsRes.data);
                if (bItemsRes.data) setBudgetItems(bItemsRes.data);
                if (secRes.data) {
                    const sec = secRes.data;
                    setSecurityConfig(sec);
                    localStorage.setItem(localSecKey, JSON.stringify(sec));
                    const reqEnter = sec.require_on_enter ?? sec.require_pin_on_entry ?? false;
                    if (reqEnter && sec.pin_hash) {
                        const isAlreadyUnlocked = sessionStorage.getItem('finance_unlocked_session') === 'true';
                        if (!isAlreadyUnlocked) {
                            setIsUnlocked(false);
                        }
                    }
                } else if (cachedSec) {
                    try {
                        const parsed = JSON.parse(cachedSec);
                        if (parsed && parsed.pin_hash) {
                            setSecurityConfig(parsed);
                            const { data: insertedSec } = await supabase.from('finance_security').upsert({
                                user_id: user.id,
                                pin_hash: parsed.pin_hash,
                                require_on_enter: parsed.require_on_enter ?? false,
                                require_on_delete: parsed.require_on_delete ?? true
                            }, { onConflict: 'user_id' }).select().maybeSingle();
                            if (insertedSec) {
                                setSecurityConfig(insertedSec);
                                localStorage.setItem(localSecKey, JSON.stringify(insertedSec));
                            }
                        }
                    } catch {
                        // silent
                    }
                }
                if (instRes.data) {
                    setInstallments(instRes.data);
                    if (accRes.data) {
                        autoProcessDueInstallments(instRes.data, accRes.data);
                    }
                }
            } catch (err) {
                console.log('Extra tables not ready yet', err);
            }
        } catch (error) {
            console.error("Error fetching finance data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helpers ---
    const formatCurrency = (cents: number) => {
        if (isPrivacyMode) return '••••••';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
    };

    const exportToCSV = () => {
        const headers = ['Fecha', 'Tipo', 'Monto', 'Descripción', 'Categoría', 'Cuenta'];
        const rows = thisMonthTransactions.map(tx => {
            const catName = categories.find(c => c.id === tx.category_id)?.name || '';
            const accName = accounts.find(a => a.id === tx.account_id)?.name || '';
            const amount = (tx.amount_cents / 100).toFixed(2);
            return [tx.date, tx.type, amount, tx.description || '', catName, accName];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `finanzas_cierre_${currentMonthPrefix}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const currentMonthName = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    
    // --- Computed Values ---
    const liquidCashCents = accounts
        .filter(a => a.type !== 'credit')
        .reduce((acc, a) => acc + a.balance_cents, 0);

    const totalCreditCardDebtCents = accounts
        .filter(a => a.type === 'credit')
        .reduce((acc, a) => acc + Math.max(0, a.balance_cents), 0);

    const totalAvailableCreditCents = accounts
        .filter(a => a.type === 'credit')
        .reduce((acc, a) => {
            const limit = a.credit_limit_cents || 0;
            const used = Math.max(0, a.balance_cents);
            return acc + Math.max(0, limit - used);
        }, 0);

    const netWorthCents = liquidCashCents - totalCreditCardDebtCents;

    const totalBalanceCents = includeAvailableCredit 
        ? netWorthCents + totalAvailableCreditCents 
        : netWorthCents;
    
    const thisMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonthPrefix));
    const incomeThisMonth = thisMonthTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount_cents, 0);
    const expensesThisMonth = thisMonthTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount_cents, 0);
    
    const currentBudget = budgets.find(b => b.month === currentMonthPrefix);
    const budgetProgress = currentBudget ? Math.min(100, Math.round((expensesThisMonth / currentBudget.total_amount_cents) * 100)) : 0;

    // --- Handlers ---
    const resetTxForm = () => {
        setTxAmount('');
        setTxCategoryId('');
        setTxAccountId('');
        setTxToAccountId('');
        setTxDescription('');
        setTxTransferFeeType('fixed');
        setTxTransferFeeValue('');
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Requirement 1: Mandatory Account Selection
        if (!txAccountId || txAccountId === '') {
            alert('⚠️ Debes seleccionar obligatoriamente una cuenta de origen para realizar la transacción.');
            return;
        }

        const amountCents = Math.round(parseFloat(txAmount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) return alert('Monto inválido.');

        const selectedAcc = accounts.find(a => a.id === Number(txAccountId));
        if (!selectedAcc) return alert('Cuenta no encontrada.');

        // Requirement 1: Fund Validation for Expenses & Transfers
        if (txType === 'EXPENSE' || txType === 'TRANSFER_OUT') {
            if (selectedAcc.type === 'credit') {
                const limit = selectedAcc.credit_limit_cents || 0;
                const used = selectedAcc.balance_cents;
                if (limit > 0 && (limit - used) < amountCents) {
                    const availableCredit = Math.max(0, limit - used);
                    alert(`⚠️ Cupo de crédito disponible insuficiente en '${selectedAcc.name}'. Cupo disponible: $${(availableCredit/100).toFixed(2)}, Requerido: $${(amountCents/100).toFixed(2)}.`);
                    setShowPayCardModal(selectedAcc);
                    return;
                }
            } else {
                if (selectedAcc.balance_cents < amountCents) {
                    const needed = amountCents - selectedAcc.balance_cents;
                    setShowAddFundsModal({
                        accountId: selectedAcc.id,
                        accountName: selectedAcc.name,
                        requiredCents: needed
                    });
                    setAddFundsAmount((needed / 100).toFixed(2));
                    return;
                }
            }
        }

        try {
            if (txType === 'TRANSFER_OUT') {
                if (!txAccountId || !txToAccountId) return alert("Selecciona cuenta de origen y destino");
                if (txAccountId === txToAccountId) return alert("La cuenta de origen y la de destino no pueden ser la misma");
                
                const fromAcc = accounts.find(a => a.id === Number(txAccountId))!;
                const toAcc = accounts.find(a => a.id === Number(txToAccountId))!;

                // Calculate transfer fee from form state
                const feeVal = parseFloat(txTransferFeeValue) || 0;
                let feeCents = 0;
                if (txTransferFeeType === 'fixed') {
                    feeCents = Math.round(feeVal * 100);
                } else if (txTransferFeeType === 'percent') {
                    feeCents = Math.round(amountCents * (feeVal / 100));
                }

                const totalDebitedCents = amountCents + feeCents;

                // Validate funds
                if (fromAcc.type === 'credit') {
                    const limit = fromAcc.credit_limit_cents || 0;
                    const available = limit - fromAcc.balance_cents;
                    if (limit > 0 && available < totalDebitedCents) {
                        return alert(`⚠️ Cupo insuficiente en '${fromAcc.name}'. Monto + Comisión ($${(feeCents/100).toFixed(2)}): $${(totalDebitedCents/100).toFixed(2)}, Cupo Disponible: $${(available/100).toFixed(2)}.`);
                    }
                } else {
                    if (fromAcc.balance_cents < totalDebitedCents) {
                        return alert(`⚠️ Fondos insuficientes en '${fromAcc.name}'. Monto + Comisión ($${(feeCents/100).toFixed(2)}): $${(totalDebitedCents/100).toFixed(2)}, Disponible: $${(fromAcc.balance_cents/100).toFixed(2)}.`);
                    }
                }

                const txOut = { user_id: user.id, account_id: txAccountId, type: 'TRANSFER_OUT', amount_cents: amountCents, date: txDate, description: txDescription || 'Transferencia enviada' };
                const { data: outData } = await supabase.from('finance_transactions').insert([txOut]).select();
                
                if (outData && outData.length > 0) {
                    const txIn = { user_id: user.id, account_id: txToAccountId, type: 'TRANSFER_IN', amount_cents: amountCents, date: txDate, description: txDescription || 'Transferencia recibida', related_transfer_id: outData[0].id };
                    await supabase.from('finance_transactions').insert([txIn]);
                    
                    if (feeCents > 0) {
                        await supabase.from('finance_transactions').insert([{
                            user_id: user.id,
                            account_id: txAccountId,
                            type: 'EXPENSE',
                            amount_cents: feeCents,
                            date: txDate,
                            description: `Comisión por transferencia desde ${fromAcc.name}`
                        }]);
                    }

                    const newFromBal = fromAcc.type === 'credit'
                        ? fromAcc.balance_cents + totalDebitedCents
                        : Math.max(0, fromAcc.balance_cents - totalDebitedCents);

                    const newToBal = toAcc.type === 'credit'
                        ? Math.max(0, toAcc.balance_cents - amountCents)
                        : toAcc.balance_cents + amountCents;

                    await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newFromBal) }).eq('id', txAccountId);
                    await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newToBal) }).eq('id', txToAccountId);
                }
            } else {
                const newTx = {
                    user_id: user.id,
                    account_id: txAccountId,
                    type: txType,
                    amount_cents: amountCents,
                    category_id: txCategoryId === '' ? null : txCategoryId,
                    date: txDate,
                    description: txDescription
                };

                await supabase.from('finance_transactions').insert([newTx]);
                
                const currentBalance = selectedAcc.balance_cents;
                const newBalance = (txType === 'EXPENSE') 
                    ? (selectedAcc.type === 'credit' ? currentBalance + amountCents : Math.max(0, currentBalance - amountCents))
                    : (selectedAcc.type === 'credit' ? Math.max(0, currentBalance - amountCents) : currentBalance + amountCents);

                await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newBalance) }).eq('id', txAccountId);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(addFundsAmount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) return alert('Monto inválido.');

        const targetAcc = accounts.find(a => a.id === showAddFundsModal.accountId);
        if (!targetAcc) return;

        await supabase.from('finance_transactions').insert([{
            user_id: user.id,
            account_id: targetAcc.id,
            type: 'INCOME',
            amount_cents: amountCents,
            date: new Date().toISOString().split('T')[0],
            description: `Recarga de fondos en ${targetAcc.name}`
        }]);

        const newBal = targetAcc.type === 'credit' 
            ? Math.max(0, targetAcc.balance_cents - amountCents)
            : targetAcc.balance_cents + amountCents;

        await supabase.from('finance_accounts').update({
            balance_cents: newBal
        }).eq('id', targetAcc.id);

        setShowAddFundsModal(null);
        setAddFundsAmount('');
        await fetchFinanceData();
    };

    const handlePayCreditCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPayCardModal || !payCardAmount || !payCardFromAccountId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(payCardAmount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) return alert('Monto inválido');

        const fromAcc = accounts.find(a => a.id === Number(payCardFromAccountId));
        if (!fromAcc) return alert('Cuenta de origen no encontrada');

        // Calculate transfer fee if origin account has one
        let feeCents = 0;
        if (fromAcc.transfer_fee_type === 'fixed' && fromAcc.transfer_fee_value) {
            feeCents = Math.round(fromAcc.transfer_fee_value * 100);
        } else if (fromAcc.transfer_fee_type === 'percent' && fromAcc.transfer_fee_value) {
            feeCents = Math.round(amountCents * (fromAcc.transfer_fee_value / 100));
        }

        const totalDebitedCents = amountCents + feeCents;

        if (fromAcc.balance_cents < totalDebitedCents) {
            return alert(`Fondos insuficientes en ${fromAcc.name}. Monto + Comisión ($${(feeCents/100).toFixed(2)}): $${(totalDebitedCents/100).toFixed(2)}, Disponible: $${(fromAcc.balance_cents/100).toFixed(2)}.`);
        }

        const cardAcc = accounts.find(a => a.id === showPayCardModal.id) || showPayCardModal;

        await supabase.from('finance_transactions').insert([{
            user_id: user.id,
            account_id: fromAcc.id,
            type: 'EXPENSE',
            amount_cents: amountCents,
            date: new Date().toISOString().split('T')[0],
            description: `Abono a tarjeta de crédito: ${cardAcc.name}`
        }]);

        if (feeCents > 0) {
            await supabase.from('finance_transactions').insert([{
                user_id: user.id,
                account_id: fromAcc.id,
                type: 'EXPENSE',
                amount_cents: feeCents,
                date: new Date().toISOString().split('T')[0],
                description: `Comisión por transferencia desde ${fromAcc.name}`
            }]);
        }

        await supabase.from('finance_accounts').update({
            balance_cents: Math.max(0, fromAcc.balance_cents - totalDebitedCents)
        }).eq('id', fromAcc.id);

        const newCardBalance = Math.max(0, cardAcc.balance_cents - amountCents);
        await supabase.from('finance_accounts').update({
            balance_cents: newCardBalance
        }).eq('id', cardAcc.id);

        setShowPayCardModal(null);
        setPayCardAmount('');
        setPayCardFromAccountId('');
        await fetchFinanceData();
    };

    const handleCreateInstallment = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !instName.trim() || !instTotalAmount) return;

        try {
            const baseTotalCents = Math.round(parseFloat(instTotalAmount) * 100);
            const interestPct = parseFloat(instInterestPercent) || 0;
            const totalCents = Math.round(baseTotalCents * (1 + interestPct / 100));
            const totalInst = Math.max(1, parseInt(instTotalInstallments) || 1);
            const instAmountCents = Math.round(totalCents / totalInst);
            const startDate = instStartDate || new Date().toISOString().split('T')[0];
            const startMonth = startDate.substring(0, 7);
            const pDay = Math.min(31, Math.max(1, parseInt(instPaymentDay) || parseInt(startDate.split('-')[2]) || 15));

            // CRITICAL CREDIT CARD LIMIT RETENTION CHECK
            if (instAccountId) {
                const targetAcc = accounts.find(a => a.id === Number(instAccountId));
                if (targetAcc) {
                    if (targetAcc.type === 'credit') {
                        const limit = targetAcc.credit_limit_cents || 0;
                        const used = targetAcc.balance_cents;
                        const available = limit - used;
                        
                        // Check if total purchase price (including interest) exceeds available limit
                        if (limit > 0 && totalCents > available) {
                            alert(`❌ Cupo Insuficiente: La compra a cuotas por un total de $${(totalCents/100).toFixed(2)}${interestPct > 0 ? ` (incluyendo ${interestPct}% de interés)` : ''} excede tu cupo disponible en la tarjeta '${targetAcc.name}' ($${(available/100).toFixed(2)}). En tarjetas de crédito, el cupo debe cubrir el total de la compra más intereses.`);
                            return;
                        }

                        // Retain total purchase amount (with interest) in credit card debt immediately
                        const newDebt = used + totalCents;
                        await supabase.from('finance_accounts').update({ balance_cents: newDebt }).eq('id', targetAcc.id);
                        
                        // Register expense transaction on card for total purchase with interest
                        await supabase.from('finance_transactions').insert([{
                            user_id: user.id,
                            account_id: targetAcc.id,
                            type: 'EXPENSE',
                            amount_cents: totalCents,
                            date: startDate,
                            description: `Compra a cuotas retenida en límite: ${instName} (${totalInst} cuotas${interestPct > 0 ? `, ${interestPct}% interés` : ''})`
                        }]);
                    } else {
                        if (targetAcc.balance_cents < instAmountCents) {
                            alert(`⚠️ Advertencia de Fondos: La cuenta '${targetAcc.name}' tiene $${(targetAcc.balance_cents/100).toFixed(2)} y la cuota mensual es de $${(instAmountCents/100).toFixed(2)}.`);
                        }
                    }
                }
            }

            let { error } = await supabase.from('finance_installments').insert([{
                user_id: user.id,
                name: instName,
                total_amount_cents: totalCents,
                total_installments: totalInst,
                paid_installments: 0,
                installment_amount_cents: instAmountCents,
                account_id: instAccountId ? Number(instAccountId) : null,
                start_date: startDate,
                start_month: startMonth,
                payment_day: pDay,
                status: 'ACTIVE'
            }]);

            if (error) {
                console.log("Retrying insertion without extra columns if schema mismatch");
                const { error: retryError } = await supabase.from('finance_installments').insert([{
                    user_id: user.id,
                    name: instName,
                    total_amount_cents: totalCents,
                    total_installments: totalInst,
                    paid_installments: 0,
                    installment_amount_cents: instAmountCents,
                    account_id: instAccountId ? Number(instAccountId) : null,
                    start_date: startDate,
                    status: 'ACTIVE'
                }]);
                error = retryError;
            }

            if (error) {
                console.error("Error creating installment:", error);
                alert(`Error al guardar la compra a cuotas: ${error.message}`);
                return;
            }

            setInstName('');
            setInstTotalAmount('');
            setInstTotalInstallments('12');
            setInstAccountId('');
            setInstInterestPercent('');
            setShowInstallmentModal(false);
            fetchFinanceData();
        } catch (err: any) {
            console.error("Unexpected error in handleCreateInstallment:", err);
            alert(`Ocurrió un error inesperado: ${err.message || err}`);
        }
    };

    const handlePayInstallment = async (inst: FinanceInstallment) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const targetAccId = inst.account_id || accounts[0]?.id;
        if (!targetAccId) return alert('Debes tener una cuenta registrada para realizar este pago.');

        const targetAcc = accounts.find(a => a.id === targetAccId);
        if (!targetAcc) return alert('Cuenta no encontrada.');

        if (targetAcc.type !== 'credit' && targetAcc.balance_cents < inst.installment_amount_cents) {
            setShowAddFundsModal({
                accountId: targetAcc.id,
                accountName: targetAcc.name,
                requiredCents: inst.installment_amount_cents - targetAcc.balance_cents
            });
            return;
        }

        const nextPaid = inst.paid_installments + 1;
        const newStatus = nextPaid >= inst.total_installments ? 'COMPLETED' : 'ACTIVE';

        await supabase.from('finance_installments').update({
            paid_installments: nextPaid,
            status: newStatus
        }).eq('id', inst.id);

        await supabase.from('finance_transactions').insert([{
            user_id: user.id,
            account_id: targetAcc.id,
            type: 'EXPENSE',
            amount_cents: inst.installment_amount_cents,
            date: new Date().toISOString().split('T')[0],
            description: `Pago cuota ${nextPaid}/${inst.total_installments}: ${inst.name}`
        }]);

        const newBal = targetAcc.type === 'credit'
            ? targetAcc.balance_cents + inst.installment_amount_cents
            : Math.max(0, targetAcc.balance_cents - inst.installment_amount_cents);

        await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newBal) }).eq('id', targetAcc.id);
        fetchFinanceData();
    };

    const handleDeleteInstallment = async (id: number) => {
        if (!confirm('¿Eliminar esta compra a cuotas?')) return;
        await supabase.from('finance_installments').delete().eq('id', id);
        fetchFinanceData();
    };

    const handleDeleteTransaction = async (id: number, type: string, amount_cents: number, account_id: number) => {
        if (!confirm('¿Eliminar este movimiento? Se ajustará el saldo de la cuenta.')) return;
        
        const currentBalance = accounts.find(a => a.id === account_id)?.balance_cents || 0;
        let newBalance = currentBalance;
        if (type === 'EXPENSE' || type === 'TRANSFER_OUT') newBalance += amount_cents;
        if (type === 'INCOME' || type === 'TRANSFER_IN') newBalance -= amount_cents;
        newBalance = Math.max(0, newBalance);

        await supabase.from('finance_accounts').update({ balance_cents: newBalance }).eq('id', account_id);
        await supabase.from('finance_transactions').delete().eq('id', id);
        fetchFinanceData();
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
            const isEligible = ['bank', 'credit', 'debit'].includes(newAccountType);
            const rawBal = Math.abs(parseFloat(newAccountBalance || '0'));
            const balanceCents = Math.round(rawBal * 100);
            const isCredit = newAccountType === 'credit';
            const limitCents = isCredit && newAccountCreditLimit ? Math.round(Math.abs(parseFloat(newAccountCreditLimit)) * 100) : null;

            const accountPayload: any = {
                user_id: user.id,
                name: newAccountName,
                type: newAccountType,
                balance_cents: balanceCents,
                credit_limit_cents: limitCents,
                cutoff_day: isCredit ? (Number(newAccountCutoffDay) || 15) : null,
                due_day: isCredit ? (Number(newAccountDueDay) || 5) : null,
                card_number_last4: (newAccountType === 'credit' || newAccountType === 'debit') ? newAccountCardLast4 : null,
                card_color: (newAccountType === 'credit' || newAccountType === 'debit') ? newAccountCardColor : 'slate',
                maintenance_fee_type: isEligible ? newAccountMaintFeeType : 'none',
                maintenance_fee_value: isEligible && newAccountMaintFeeValue ? Math.abs(parseFloat(newAccountMaintFeeValue)) : 0,
                maintenance_fee_freq: isEligible ? newAccountMaintFeeFreq : 'monthly',
                maintenance_fee_date: isEligible ? newAccountMaintFeeDate || null : null,
                transfer_fee_type: isEligible ? newAccountTransferFeeType : 'none',
                transfer_fee_value: isEligible && newAccountTransferFeeValue ? Math.abs(parseFloat(newAccountTransferFeeValue)) : 0
            };

            let { error } = await supabase.from('finance_accounts').insert([accountPayload]);

            if (error && error.message && (
                error.message.includes('card_number_last4') ||
                error.message.includes('card_color') ||
                error.message.includes('cutoff_day') ||
                error.message.includes('due_day') ||
                error.message.includes('credit_limit_cents') ||
                error.message.includes('maintenance_fee_date')
            )) {
                console.log("Extended columns not found in database schema, retrying with core columns only.");
                const { error: retryError } = await supabase.from('finance_accounts').insert([{
                    user_id: user.id,
                    name: newAccountName,
                    type: newAccountType,
                    balance_cents: balanceCents
                }]);
                error = retryError;
            }

            if (error) {
                console.error("Error creating account:", error);
                alert(`Error al crear la cuenta: ${error.message}`);
                return;
            }

            const isCard = newAccountType === 'credit' || newAccountType === 'debit';
            
            setNewAccountName(''); 
            setNewAccountBalance('');
            setNewAccountCreditLimit('');
            setNewAccountCardLast4('');
            setNewAccountMaintFeeType('none');
            setNewAccountMaintFeeValue('');
            setNewAccountMaintFeeFreq('monthly');
            setNewAccountMaintFeeDate('');
            setNewAccountTransferFeeType('none');
            setNewAccountTransferFeeValue('');
            setShowNewAccountExtras(false);
            setShowCreateAccountModal(false);
            
            fetchFinanceData();

            // Redirect dynamically so the user sees their new account/card instantly
            if (isCard) {
                setActiveTab('debts');
            } else {
                setActiveTab('overview');
            }
        } catch (err: any) {
            console.error("Unexpected error in handleCreateAccount:", err);
            alert(`Ocurrió un error inesperado: ${err.message || err}`);
        }
    };

    const handleDeleteAccount = async (id: number) => {
        if (securityConfig?.require_on_delete && securityConfig?.pin_hash) {
            setDeleteTargetAccountId(id);
            setDeletePinInput('');
            setDeletePinError('');
            setShowDeletePinModal(true);
        } else {
            if (!confirm('¿Eliminar esta cuenta? Se eliminarán también sus movimientos.')) return;
            await supabase.from('finance_accounts').delete().eq('id', id);
            fetchFinanceData(true);
        }
    };

    const handleConfirmDeleteAccountWithPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeletePinError('');
        if (!deleteTargetAccountId || !securityConfig) return;

        if (deletePinInput.length !== 4) {
            setDeletePinError('El PIN debe tener 4 dígitos.');
            return;
        }

        const enteredHash = await hashPin(deletePinInput);
        if (enteredHash !== securityConfig.pin_hash) {
            setDeletePinError('PIN de seguridad incorrecto.');
            return;
        }

        await supabase.from('finance_accounts').delete().eq('id', deleteTargetAccountId);
        setShowDeletePinModal(false);
        setDeleteTargetAccountId(null);
        setDeletePinInput('');
        fetchFinanceData(true);
    };

    const openNewCategoryModal = (defaultType: 'EXPENSE' | 'INCOME' = 'EXPENSE') => {
        setEditingCategory(null);
        setCatName('');
        setCatEmoji(defaultType === 'INCOME' ? '💼' : '🛒');
        setCatType(defaultType);
        setCatBudgetAmount('');
        setShowCreateCategoryModal(true);
    };

    const openEditCategoryModal = (cat: FinanceCategory) => {
        setEditingCategory(cat);
        setCatName(cat.name);
        setCatEmoji(cat.emoji || '🏷️');
        const isInc = cat.type && cat.type.toUpperCase() === 'INCOME';
        setCatType(isInc ? 'INCOME' : 'EXPENSE');

        const budgetItem = budgetItems.find(b => b.category_id === cat.id && b.month === selectedBudgetMonth);
        const cents = budgetItem ? budgetItem.allocated_cents : (cat.budget_limit_cents || 0);
        setCatBudgetAmount(cents > 0 ? (cents / 100).toString() : '');
        setShowCreateCategoryModal(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !catName.trim()) return;

        const budgetCents = catType === 'EXPENSE' && catBudgetAmount ? Math.round(parseFloat(catBudgetAmount) * 100) : 0;
        let catId = editingCategory?.id;

        if (editingCategory) {
            await supabase.from('finance_categories').update({
                name: catName.trim(),
                emoji: catEmoji || '🏷️',
                type: catType,
                budget_limit_cents: budgetCents
            }).eq('id', editingCategory.id);
        } else {
            const { data: insertedCat } = await supabase.from('finance_categories').insert([{
                user_id: user.id,
                name: catName.trim(),
                emoji: catEmoji || '🏷️',
                type: catType,
                budget_limit_cents: budgetCents,
                is_archived: false
            }]).select().maybeSingle();
            if (insertedCat) catId = insertedCat.id;
        }

        // Sync with budget_items if EXPENSE
        if (catType === 'EXPENSE' && catId) {
            const existingBudgetItem = budgetItems.find(b => b.category_id === catId && b.month === selectedBudgetMonth);
            if (existingBudgetItem) {
                await supabase.from('finance_budget_items').update({
                    allocated_cents: budgetCents,
                    name: catName.trim(),
                    icon: catEmoji,
                    updated_at: new Date().toISOString()
                }).eq('id', existingBudgetItem.id);
            } else if (budgetCents > 0) {
                await supabase.from('finance_budget_items').insert([{
                    user_id: user.id,
                    month: selectedBudgetMonth,
                    name: catName.trim(),
                    allocated_cents: budgetCents,
                    icon: catEmoji,
                    color: '#27272a',
                    category_id: catId
                }]);
            }
        }

        setShowCreateCategoryModal(false);
        setEditingCategory(null);
        setCatName('');
        setCatEmoji('🏷️');
        setCatType('EXPENSE');
        setCatBudgetAmount('');
        fetchFinanceData(true);
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('¿Eliminar esta categoría? Se eliminará también de tu presupuesto.')) return;
        await supabase.from('finance_categories').delete().eq('id', id);
        fetchFinanceData(true);
    };

    const handleSetBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(budgetAmount) * 100);
        const existingBudget = budgets.find(b => b.month === selectedBudgetMonth);
        
        if (existingBudget) {
            await supabase.from('finance_budgets').update({ total_amount_cents: amountCents }).eq('id', existingBudget.id);
        } else {
            await supabase.from('finance_budgets').insert([{ user_id: user.id, month: selectedBudgetMonth, total_amount_cents: amountCents }]);
        }
        setBudgetAmount('');
        fetchFinanceData(true);
    };

    const handleSaveBudgetItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(budgetItemAmount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) {
            alert('Por favor introduce un monto válido mayor a 0.');
            return;
        }

        if (editingBudgetItem) {
            await supabase.from('finance_budget_items').update({
                name: budgetItemName,
                allocated_cents: amountCents,
                icon: budgetItemIcon,
                color: budgetItemColor,
                category_id: budgetItemCategoryId ? Number(budgetItemCategoryId) : null,
                updated_at: new Date().toISOString()
            }).eq('id', editingBudgetItem.id);
        } else {
            await supabase.from('finance_budget_items').insert([{
                user_id: user.id,
                month: selectedBudgetMonth,
                name: budgetItemName,
                allocated_cents: amountCents,
                icon: budgetItemIcon,
                color: budgetItemColor,
                category_id: budgetItemCategoryId ? Number(budgetItemCategoryId) : null
            }]);
        }

        setShowBudgetItemModal(false);
        setEditingBudgetItem(null);
        setBudgetItemName('');
        setBudgetItemAmount('');
        setBudgetItemIcon('🏷️');
        setBudgetItemColor('#3b82f6');
        setBudgetItemCategoryId('');
        fetchFinanceData(true);
    };

    const handleDeleteBudgetItem = async (id: number) => {
        if (!confirm('¿Eliminar este desglose del presupuesto?')) return;
        await supabase.from('finance_budget_items').delete().eq('id', id);
        fetchFinanceData(true);
    };

    const handleQuickExpenseToBudgetItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickExpenseBudgetItem) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(txAmount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) return;

        const targetAccount = accounts.find(a => a.id === Number(txAccountId));
        if (!targetAccount) {
            alert('Por favor selecciona una cuenta válida');
            return;
        }

        const { error: txError } = await supabase.from('finance_transactions').insert([{
            user_id: user.id,
            account_id: Number(txAccountId),
            category_id: quickExpenseBudgetItem.category_id || null,
            amount_cents: amountCents,
            type: 'expense',
            description: txDescription || `Gasto en ${quickExpenseBudgetItem.name}`,
            date: new Date().toISOString(),
            status: 'completed'
        }]);

        if (!txError) {
            const newBal = targetAccount.type === 'credit'
                ? targetAccount.balance_cents + amountCents
                : Math.max(0, targetAccount.balance_cents - amountCents);
            await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newBal) }).eq('id', targetAccount.id);

            setQuickExpenseBudgetItem(null);
            setTxAmount('');
            setTxDescription('');
            setTxAccountId('');
            fetchFinanceData(true);
        }
    };

    // --- Security Handlers ---
    const handleSaveSecurityPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSetPinError('');
        
        const cleanPin = newPinValue.trim();
        const cleanConfirm = confirmPinValue.trim();

        if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
            setSetPinError('El PIN debe tener exactamente 4 dígitos numéricos.');
            return;
        }
        if (cleanPin !== cleanConfirm) {
            setSetPinError('Los dos códigos PIN no coinciden.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const pinHash = await hashPin(cleanPin);
        const localKey = `finance_sec_${user.id}`;
        
        const newSecRecord = {
            user_id: user.id,
            pin_hash: pinHash,
            require_on_enter: securityConfig?.require_on_enter ?? false,
            require_on_delete: securityConfig?.require_on_delete ?? true,
            updated_at: new Date().toISOString()
        };

        try {
            const { data: upserted, error: upsertErr } = await supabase
                .from('finance_security')
                .upsert(newSecRecord, { onConflict: 'user_id' })
                .select()
                .maybeSingle();

            if (upsertErr) {
                console.error('Supabase upsert error:', upsertErr);
                // Fallback direct update or insert
                if (securityConfig?.id) {
                    await supabase.from('finance_security').update({
                        pin_hash: pinHash,
                        updated_at: new Date().toISOString()
                    }).eq('id', securityConfig.id);
                } else {
                    await supabase.from('finance_security').insert([newSecRecord]);
                }
            }

            const finalConfig = upserted || { ...(securityConfig || {}), ...newSecRecord };
            setSecurityConfig(finalConfig);
            localStorage.setItem(localKey, JSON.stringify(finalConfig));
        } catch (err) {
            console.error('Error saving PIN to Supabase:', err);
            const fallbackConfig = {
                id: securityConfig?.id || 0,
                ...newSecRecord
            };
            setSecurityConfig(fallbackConfig);
            localStorage.setItem(localKey, JSON.stringify(fallbackConfig));
        }

        setShowSetPinModal(false);
        setNewPinValue('');
        setConfirmPinValue('');
        await fetchFinanceData(true);
    };

    const handleToggleRequireOnEnter = async (val: boolean) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const updated = { ...(securityConfig || { pin_hash: '' }), user_id: user.id, require_on_enter: val, require_pin_on_entry: val, updated_at: new Date().toISOString() };
        setSecurityConfig(updated as any);
        localStorage.setItem(`finance_sec_${user.id}`, JSON.stringify(updated));
        
        try {
            await supabase.from('finance_security').upsert({
                user_id: user.id,
                pin_hash: updated.pin_hash,
                require_on_enter: val,
                require_on_delete: updated.require_on_delete ?? true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch {
            // silent
        }
    };

    const handleToggleRequireOnDelete = async (val: boolean) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const updated = { ...(securityConfig || { pin_hash: '' }), user_id: user.id, require_on_delete: val, require_pin_on_delete: val, updated_at: new Date().toISOString() };
        setSecurityConfig(updated as any);
        localStorage.setItem(`finance_sec_${user.id}`, JSON.stringify(updated));

        try {
            await supabase.from('finance_security').upsert({
                user_id: user.id,
                pin_hash: updated.pin_hash,
                require_on_enter: updated.require_on_enter ?? false,
                require_on_delete: val,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch {
            // silent
        }
    };

    const handleDisablePin = async (e: React.FormEvent) => {
        e.preventDefault();
        setDisablePinError('');
        if (!securityConfig) return;

        if (disablePinInput.length !== 4) {
            setDisablePinError('El PIN debe tener 4 dígitos.');
            return;
        }

        const enteredHash = await hashPin(disablePinInput);
        if (enteredHash !== securityConfig.pin_hash) {
            setDisablePinError('PIN incorrecto. No se pudo desactivar la seguridad.');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            localStorage.removeItem(`finance_sec_${user.id}`);
            try {
                await supabase.from('finance_security').delete().eq('user_id', user.id);
            } catch {
                if (securityConfig.id) {
                    await supabase.from('finance_security').delete().eq('id', securityConfig.id);
                }
            }
        }

        setSecurityConfig(null);
        setShowDisablePinModal(false);
        setDisablePinInput('');
        fetchFinanceData(true);
    };

    const handleUnlockModule = async (e: React.FormEvent) => {
        e.preventDefault();
        setLockPinError('');
        if (!securityConfig || !securityConfig.pin_hash) {
            setIsUnlocked(true);
            return;
        }

        if (lockPinInput.length !== 4) {
            setLockPinError('Ingresa los 4 dígitos del PIN.');
            return;
        }

        const enteredHash = await hashPin(lockPinInput);
        if (enteredHash === securityConfig.pin_hash) {
            setIsUnlocked(true);
            sessionStorage.setItem('finance_unlocked_session', 'true');
            setLockPinInput('');
        } else {
            setLockPinError('PIN incorrecto. Intenta de nuevo.');
        }
    };

    const handleCreateRecurring = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('finance_recurring_transactions').insert([{
            user_id: user.id,
            type: 'EXPENSE',
            amount_cents: Math.round(parseFloat(recAmount) * 100),
            description: recDesc,
            frequency: recFrequency,
            start_date: new Date().toISOString().split('T')[0],
            next_date: recNextDate,
            account_id: recAccountId ? Number(recAccountId) : null
        }]);
        setRecAmount(''); setRecDesc(''); setRecAccountId('');
        fetchFinanceData();
    };

    const handleProcessRecurring = async (rec: FinanceRecurringTransaction) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const targetAccId = rec.account_id || accounts[0]?.id;
        if (!targetAccId) return alert('Necesitas tener al menos una cuenta para registrar el pago.');

        const today = new Date().toISOString().split('T')[0];
        
        await supabase.from('finance_transactions').insert([{
            user_id: user.id,
            account_id: targetAccId,
            type: rec.type || 'EXPENSE',
            amount_cents: rec.amount_cents,
            date: today,
            description: `Cobro recurrente: ${rec.description || 'Suscripción'}`
        }]);

        const currAcc = accounts.find(a => a.id === targetAccId);
        if (currAcc) {
            const newBalance = (rec.type === 'INCOME') 
                ? currAcc.balance_cents + rec.amount_cents 
                : Math.max(0, currAcc.balance_cents - rec.amount_cents);
            await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newBalance) }).eq('id', targetAccId);
        }

        const currentNext = new Date(rec.next_date || today);
        if (rec.frequency === 'weekly') currentNext.setDate(currentNext.getDate() + 7);
        else if (rec.frequency === 'yearly') currentNext.setFullYear(currentNext.getFullYear() + 1);
        else currentNext.setMonth(currentNext.getMonth() + 1);

        const newNextDateStr = currentNext.toISOString().split('T')[0];
        await supabase.from('finance_recurring_transactions').update({ next_date: newNextDateStr }).eq('id', rec.id);

        fetchFinanceData();
    };

    const handleDeleteRecurring = async (id: number) => {
        if (!confirm('¿Eliminar esta suscripción / pago recurrente?')) return;
        await supabase.from('finance_recurring_transactions').delete().eq('id', id);
        fetchFinanceData();
    };

    const handleCreateSavingsGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(goalTargetAmount) * 100);
        await supabase.from('finance_savings_goals').insert([{
            user_id: user.id,
            name: goalName,
            target_amount_cents: amountCents,
            target_date: goalTargetDate || null
        }]);

        setGoalName('');
        setGoalTargetAmount('');
        setGoalTargetDate('');
        fetchFinanceData();
    };

    const handleDeleteGoal = async (id: number) => {
        if (!confirm('¿Eliminar esta meta de ahorro?')) return;
        await supabase.from('finance_savings_goals').delete().eq('id', id);
        fetchFinanceData();
    };

    const handleContribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showContributeModal) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!contributeAccountId) {
            alert('Por favor, selecciona una cuenta o tarjeta de origen.');
            return;
        }

        const amountCents = Math.round(parseFloat(contributeAmount) * 100);
        const goal = savingsGoals.find(g => g.id === showContributeModal);
        if (!goal) return;

        const targetAcc = accounts.find(a => a.id === Number(contributeAccountId));
        if (!targetAcc) {
            alert('La cuenta de origen no pudo ser encontrada.');
            return;
        }

        if (targetAcc.balance_cents < amountCents) {
            // Insufficient funds: prompt to add funds directly!
            setShowAddFundsModal({
                accountId: targetAcc.id,
                accountName: targetAcc.name,
                requiredCents: amountCents - targetAcc.balance_cents
            });
            setShowContributeModal(null);
            return;
        }
        
        await supabase.from('finance_savings_contributions').insert([{
            user_id: user.id,
            goal_id: showContributeModal,
            amount_cents: amountCents,
            date: new Date().toISOString().split('T')[0]
        }]);

        await supabase.from('finance_savings_goals').update({
            current_amount_cents: goal.current_amount_cents + amountCents
        }).eq('id', goal.id);

        await supabase.from('finance_transactions').insert([{
            user_id: user.id,
            account_id: targetAcc.id,
            type: 'EXPENSE',
            amount_cents: amountCents,
            date: new Date().toISOString().split('T')[0],
            description: `Aporte a meta: ${goal.name}`
        }]);

        await supabase.from('finance_accounts').update({
            balance_cents: Math.max(0, targetAcc.balance_cents - amountCents)
        }).eq('id', targetAcc.id);

        setContributeAmount('');
        setContributeAccountId('');
        setShowContributeModal(null);
        fetchFinanceData();
    };

    const handleCreateShoppingList = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !newListName.trim()) return;

        await supabase.from('finance_shopping_lists').insert([{ user_id: user.id, name: newListName }]);
        setNewListName('');
        fetchFinanceData();
    };

    const handleAddShoppingItem = async (e: React.FormEvent, listId: number) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        const itemName = newItemNames[listId];
        if (!user || !itemName?.trim()) return;

        await supabase.from('finance_shopping_items').insert([{ user_id: user.id, list_id: listId, name: itemName }]);
        setNewItemNames(prev => ({ ...prev, [listId]: '' }));
        fetchFinanceData();
    };

    const handleToggleShoppingItem = async (item: FinanceShoppingItem) => {
        await supabase.from('finance_shopping_items').update({ is_purchased: !item.is_purchased }).eq('id', item.id);
        fetchFinanceData();
    };

    const handleDeleteShoppingList = async (listId: number) => {
        if (!confirm('¿Eliminar esta lista?')) return;
        await supabase.from('finance_shopping_lists').delete().eq('id', listId);
        fetchFinanceData();
    };

    const handleAddDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !debtName.trim() || !debtAmount) return;

        const amountCents = Math.round(parseFloat(debtAmount) * 100);
        await supabase.from('finance_debts').insert([{ 
            user_id: user.id, 
            name: debtName,
            type: debtType,
            amount_cents: amountCents,
            remaining_cents: amountCents,
            due_date: debtDueDate || null
        }]);
        setDebtName(''); setDebtAmount(''); setDebtDueDate('');
        fetchFinanceData();
    };

    const handlePayDebtConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPayDebtModal || !payDebtAmount) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(payDebtAmount) * 100);
        if (isNaN(amountCents) || amountCents <= 0) return alert('Monto inválido');

        const debt = showPayDebtModal;
        const newRemaining = Math.max(0, debt.remaining_cents - amountCents);
        await supabase.from('finance_debts').update({ remaining_cents: newRemaining }).eq('id', debt.id);

        if (payDebtAccountId) {
            const targetAcc = accounts.find(a => a.id === Number(payDebtAccountId));
            if (targetAcc) {
                const isOwe = debt.type === 'OWE';
                const txType = isOwe ? 'EXPENSE' : 'INCOME';
                const newBalance = isOwe 
                    ? Math.max(0, targetAcc.balance_cents - amountCents)
                    : targetAcc.balance_cents + amountCents;

                await supabase.from('finance_transactions').insert([{
                    user_id: user.id,
                    account_id: targetAcc.id,
                    type: txType,
                    amount_cents: amountCents,
                    date: new Date().toISOString().split('T')[0],
                    description: `${isOwe ? 'Abono a deuda' : 'Cobro de préstamo'}: ${debt.name}`
                }]);

                await supabase.from('finance_accounts').update({ balance_cents: Math.max(0, newBalance) }).eq('id', targetAcc.id);
            }
        }

        setShowPayDebtModal(null);
        setPayDebtAmount('');
        setPayDebtAccountId('');
        fetchFinanceData();
    };

    const handleDeleteDebt = async (debtId: number) => {
        if (!confirm('¿Eliminar este registro de deuda/préstamo?')) return;
        await supabase.from('finance_debts').delete().eq('id', debtId);
        fetchFinanceData();
    };

    const handleUpdateDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDebt) return;

        const amountCents = Math.round(parseFloat(editDebtAmount) * 100);
        const remainingCents = Math.round(parseFloat(editDebtRemaining) * 100);

        await supabase.from('finance_debts').update({
            name: editDebtName,
            type: editDebtType,
            amount_cents: amountCents,
            remaining_cents: remainingCents,
            due_date: editDebtDueDate || null
        }).eq('id', editingDebt.id);

        setEditingDebt(null);
        fetchFinanceData();
    };

    const handleUpdateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAccount) return;

        const rawBal = Math.abs(parseFloat(editAccountBalance || '0'));
        const balanceCents = Math.round(rawBal * 100);
        const limitCents = editAccountType === 'credit' && editAccountCreditLimit ? Math.round(Math.abs(parseFloat(editAccountCreditLimit)) * 100) : null;
        const isEligible = ['bank', 'credit', 'debit'].includes(editAccountType);

        await supabase.from('finance_accounts').update({
            name: editAccountName,
            type: editAccountType,
            balance_cents: balanceCents,
            card_color: editAccountCardColor,
            credit_limit_cents: limitCents,
            cutoff_day: editAccountType === 'credit' && editAccountCutoffDay ? Number(editAccountCutoffDay) : null,
            due_day: editAccountType === 'credit' && editAccountDueDay ? Number(editAccountDueDay) : null,
            card_number_last4: (editAccountType === 'credit' || editAccountType === 'debit') ? editAccountCardNumberLast4 || null : null,
            maintenance_fee_type: isEligible ? editAccountMaintFeeType : 'none',
            maintenance_fee_value: isEligible && editAccountMaintFeeValue ? Math.abs(parseFloat(editAccountMaintFeeValue)) : 0,
            maintenance_fee_freq: isEligible ? editAccountMaintFeeFreq : 'monthly',
            maintenance_fee_date: isEligible ? editAccountMaintFeeDate || null : null,
            transfer_fee_type: isEligible ? editAccountTransferFeeType : 'none',
            transfer_fee_value: isEligible && editAccountTransferFeeValue ? Math.abs(parseFloat(editAccountTransferFeeValue)) : 0,
        }).eq('id', editingAccount.id);

        setEditingAccount(null);
        fetchFinanceData();
    };

    // Prevent negative sign and exponential notation in numeric inputs across all financial forms
    const blockNegativeKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
            e.preventDefault();
        }
    };

    // --- Render Helpers ---
    const getAccountIcon = (type: string) => {
        switch(type) {
            case 'bank': return <Landmark className="w-5 h-5" />;
            case 'wallet': return <Wallet className="w-5 h-5" />;
            case 'cash': return <Banknote className="w-5 h-5" />;
            default: return <CreditCard className="w-5 h-5" />;
        }
    };

    const renderTabs = () => (
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 mb-6 overflow-x-auto hide-scrollbar pb-px">
            {[
                { id: 'overview', icon: LayoutDashboard, label: 'Resumen' },
                { id: 'transactions', icon: ListOrdered, label: 'Movimientos' },
                { id: 'budgets', icon: PieChart, label: 'Presupuestos' },
                { id: 'planning', icon: CalendarDays, label: 'Planificación' },
                { id: 'savings', icon: CheckCircle2, label: 'Metas' },
                { id: 'shopping', icon: ShoppingCart, label: 'Compras' },
                { id: 'debts', icon: Banknote, label: 'Deudas' },
                { id: 'stats', icon: BarChart3, label: 'Análisis' },
                { id: 'closing', icon: Archive, label: 'Cierre' },
                { id: 'settings', icon: Settings, label: 'Ajustes' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'text-gray-900 dark:text-gray-100' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
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

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 overflow-hidden">
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
                                    <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Módulo Protegido</h2>
                                    <p className="text-xs text-gray-500">Ingresa tu PIN de 4 dígitos para acceder a tus finanzas.</p>
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
                                            onChange={e => setLockPinInput(e.target.value.replace(/\D/g, ''))}
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
                            {renderTabs()}

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
                                            <li key={idx} className="text-xs text-amber-900 dark:text-amber-200 font-medium flex items-start gap-1.5">
                                                <span className="shrink-0 text-amber-600">•</span>
                                                <span>{alert}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                                {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Total</h2>
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                        {formatCurrency(totalBalanceCents)}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                            title={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
                                                        >
                                                            {isPrivacyMode ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                        </button>
                                                        
                                                        <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 mx-1"></div>

                                                        <button
                                                            type="button"
                                                            onClick={() => setIncludeAvailableCredit(!includeAvailableCredit)}
                                                            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer shrink-0"
                                                            title="Incluir crédito disponible en el balance total"
                                                        >
                                                            <div
                                                                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                                                                    includeAvailableCredit ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-700'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out scale-75 ${
                                                                        includeAvailableCredit ? 'translate-x-3' : 'translate-x-0'
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
                                                <TrendingUp className="w-4 h-4 text-emerald-500" /> Ingresos mes
                                            </h2>
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(incomeThisMonth)}
                                            </div>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm">
                                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4 text-red-500" /> Gastos mes
                                            </h2>
                                            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(expensesThisMonth)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-4">
                                        <button onClick={() => { setTxType('EXPENSE'); setShowTxModal(true); }} className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm">
                                            <TrendingDown className="w-5 h-5" /> Gasto
                                        </button>
                                        <button onClick={() => { setTxType('INCOME'); setShowTxModal(true); }} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors shadow-sm border border-gray-200 dark:border-zinc-800">
                                            <TrendingUp className="w-5 h-5" /> Ingreso
                                        </button>
                                        <button onClick={() => { setTxType('TRANSFER_OUT'); setShowTxModal(true); }} className="flex-1 hidden sm:flex items-center justify-center gap-2 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors shadow-sm border border-gray-200 dark:border-zinc-800">
                                            <ArrowRightLeft className="w-5 h-5" /> Transferir
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Recent Tx */}
                                        <div className="lg:col-span-2 space-y-4">
                                            <h3 className="text-lg font-semibold">Gastos recientes</h3>
                                            {transactions.length === 0 ? (
                                                <p className="text-gray-500 text-sm">No hay movimientos recientes.</p>
                                            ) : (
                                                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                                                    {transactions.slice(0, 5).map(tx => (
                                                        <div key={tx.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800/50 last:border-0">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'EXPENSE' ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : tx.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'}`}>
                                                                    {tx.type === 'EXPENSE' ? <TrendingDown className="w-5 h-5" /> : tx.type === 'INCOME' ? <TrendingUp className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5"/>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{tx.description || categories.find(c => c.id === tx.category_id)?.name || 'Movimiento'}</div>
                                                                    <div className="text-xs text-gray-500 mt-0.5">{accounts.find(a => a.id === tx.account_id)?.name} • {tx.date}</div>
                                                                </div>
                                                            </div>
                                                            <div className={`font-semibold ${tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT' ? 'text-gray-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT' ? '-' : '+'}{formatCurrency(tx.amount_cents)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Budget Preview */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Presupuesto {currentMonthName}</h3>
                                            <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm">
                                                {currentBudget ? (
                                                    <>
                                                        <div className="flex justify-between text-sm mb-3">
                                                            <span className="text-gray-500">Gastado</span>
                                                            <span className="font-medium">{formatCurrency(expensesThisMonth)} <span className="text-gray-400 font-normal">/ {formatCurrency(currentBudget.total_amount_cents)}</span></span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                                                            <div className={`h-full rounded-full ${budgetProgress > 90 ? 'bg-red-500' : budgetProgress > 75 ? 'bg-amber-500' : 'bg-gray-900 dark:bg-gray-100'}`} style={{ width: `${budgetProgress}%` }}></div>
                                                        </div>
                                                        <p className="text-xs text-right text-gray-500">{budgetProgress}% utilizado</p>
                                                    </>
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-gray-500 mb-3">No has definido un presupuesto para este mes.</p>
                                                        <button onClick={() => setActiveTab('budgets')} className="text-gray-900 dark:text-white text-sm font-medium hover:underline">Crear presupuesto</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TRANSACTIONS TAB */}
                            {activeTab === 'transactions' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold">Historial de Movimientos</h2>
                                    </div>

                                    {/* Filters */}
                                    <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar descripción..." 
                                            value={txFilterSearch}
                                            onChange={(e) => setTxFilterSearch(e.target.value)}
                                            className="flex-1 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                                        />
                                        <select 
                                            value={txFilterType} 
                                            onChange={(e) => setTxFilterType(e.target.value as any)}
                                            className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="ALL">Todos los tipos</option>
                                            <option value="EXPENSE">Gastos</option>
                                            <option value="INCOME">Ingresos</option>
                                            <option value="TRANSFER_OUT">Transferencias</option>
                                        </select>
                                        <select 
                                            value={txFilterAccount} 
                                            onChange={(e) => setTxFilterAccount(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                            className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="ALL">Todas las cuentas</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </select>
                                        <select 
                                            value={txFilterDateRange} 
                                            onChange={(e) => setTxFilterDateRange(e.target.value as any)}
                                            className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm font-medium"
                                        >
                                            <option value="THIS_MONTH">Este mes</option>
                                            <option value="LAST_MONTH">Mes anterior</option>
                                            <option value="THIS_YEAR">Este año</option>
                                            <option value="ALL">Todo el historial</option>
                                        </select>
                                    </div>

                                    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                                        {transactions
                                            .filter(tx => {
                                                if (txFilterType !== 'ALL' && tx.type !== txFilterType) return false;
                                                if (txFilterAccount !== 'ALL' && tx.account_id !== txFilterAccount) return false;
                                                if (txFilterSearch && !tx.description?.toLowerCase().includes(txFilterSearch.toLowerCase())) return false;
                                                
                                                const txDateObj = new Date(tx.date);
                                                const now = new Date();
                                                if (txFilterDateRange === 'THIS_MONTH') {
                                                    if (txDateObj.getMonth() !== now.getMonth() || txDateObj.getFullYear() !== now.getFullYear()) return false;
                                                } else if (txFilterDateRange === 'LAST_MONTH') {
                                                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                                    if (txDateObj.getMonth() !== lastMonth.getMonth() || txDateObj.getFullYear() !== lastMonth.getFullYear()) return false;
                                                } else if (txFilterDateRange === 'THIS_YEAR') {
                                                    if (txDateObj.getFullYear() !== now.getFullYear()) return false;
                                                }

                                                return true;
                                            })
                                            .map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                                            tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT'
                                                                ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                                                                : tx.type === 'INCOME'
                                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
                                                                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'
                                                        }`}>
                                                            {tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT' ? (
                                                                <TrendingDown className="w-4 h-4" />
                                                            ) : tx.type === 'INCOME' ? (
                                                                <TrendingUp className="w-4 h-4" />
                                                            ) : (
                                                                <ArrowRightLeft className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{tx.description || categories.find(c => c.id === tx.category_id)?.name || 'Sin descripción'}</div>
                                                        <div className="text-xs text-gray-500 flex gap-2">
                                                            <span>{tx.date}</span>
                                                            <span>•</span>
                                                            <span>{accounts.find(a => a.id === tx.account_id)?.name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`font-semibold ${tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT' ? 'text-gray-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT' ? '-' : '+'}{formatCurrency(tx.amount_cents)}
                                                    </span>
                                                    <button onClick={() => handleDeleteTransaction(tx.id, tx.type, tx.amount_cents, tx.account_id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* BUDGETS TAB - Clean & Elegant Breakdown System */}
                            {activeTab === 'budgets' && (() => {
                                const currentSelectedMonthBudget = budgets.find(b => b.month === selectedBudgetMonth);
                                const monthBudgetItems = budgetItems.filter(b => b.month === selectedBudgetMonth);
                                const totalAllocatedInItems = monthBudgetItems.reduce((acc, item) => acc + item.allocated_cents, 0);
                                const totalEffectiveBudget = currentSelectedMonthBudget ? currentSelectedMonthBudget.total_amount_cents : totalAllocatedInItems;
                                const monthTxs = transactions.filter(t => t.date.startsWith(selectedBudgetMonth));
                                const monthExpenses = monthTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount_cents, 0);
                                const unallocatedBudget = currentSelectedMonthBudget ? Math.max(0, currentSelectedMonthBudget.total_amount_cents - totalAllocatedInItems) : 0;
                                const isOverAllocated = currentSelectedMonthBudget && totalAllocatedInItems > currentSelectedMonthBudget.total_amount_cents;
                                const overAllocatedAmount = isOverAllocated ? totalAllocatedInItems - currentSelectedMonthBudget.total_amount_cents : 0;
                                const overallPct = totalEffectiveBudget > 0 ? Math.min(100, Math.round((monthExpenses / totalEffectiveBudget) * 100)) : 0;
                                const isExceededGlobal = monthExpenses > totalEffectiveBudget && totalEffectiveBudget > 0;
                                const remainingGlobal = Math.max(0, totalEffectiveBudget - monthExpenses);

                                // Format selected month display
                                const [selYear, selMonth] = selectedBudgetMonth.split('-');
                                const monthDate = new Date(parseInt(selYear), parseInt(selMonth) - 1, 1);
                                const monthDisplayTitle = monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

                                const handlePrevMonth = () => {
                                    const prev = new Date(parseInt(selYear), parseInt(selMonth) - 2, 1);
                                    setSelectedBudgetMonth(prev.toISOString().substring(0, 7));
                                };

                                const handleNextMonth = () => {
                                    const next = new Date(parseInt(selYear), parseInt(selMonth), 1);
                                    setSelectedBudgetMonth(next.toISOString().substring(0, 7));
                                };

                                return (
                                    <div className="space-y-6 max-w-5xl mx-auto">
                                        {/* Header & Controls in one sleek bar */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-150 dark:border-zinc-800">
                                            <div className="flex items-center gap-3">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-xl font-bold capitalize text-gray-900 dark:text-white">{monthDisplayTitle}</h2>
                                                        {selectedBudgetMonth === currentMonthPrefix && (
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md">
                                                                Actual
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">Planificación y desglose de gastos</p>
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
                                                        onChange={e => e.target.value && setSelectedBudgetMonth(e.target.value)}
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
                                                        onClick={() => setSelectedBudgetMonth(currentMonthPrefix)}
                                                        className="px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                                                    >
                                                        Hoy
                                                    </button>
                                                </div>

                                                {/* Add Breakdown Action */}
                                                <button
                                                    onClick={() => {
                                                        setEditingBudgetItem(null);
                                                        setBudgetItemName('');
                                                        setBudgetItemAmount('');
                                                        setBudgetItemIcon('🏷️');
                                                        setBudgetItemColor('#27272a');
                                                        setBudgetItemCategoryId('');
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
                                                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">Presupuesto</span>
                                                    <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                                        {formatCurrency(totalEffectiveBudget)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">Gastado ({overallPct}%)</span>
                                                    <span className={`text-base sm:text-lg font-bold ${isExceededGlobal ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                                        {formatCurrency(monthExpenses)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">Disponible</span>
                                                    <span className={`text-base sm:text-lg font-bold ${isExceededGlobal ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                                        {isExceededGlobal ? `-${formatCurrency(monthExpenses - totalEffectiveBudget)}` : formatCurrency(remainingGlobal)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center sm:justify-end">
                                                    <form onSubmit={handleSetBudget} className="flex items-center gap-1.5 w-full sm:w-auto">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            onKeyDown={blockNegativeKeys}
                                                            value={budgetAmount}
                                                            onChange={e => setBudgetAmount(e.target.value.replace(/-/g, ''))}
                                                            placeholder={currentSelectedMonthBudget ? (currentSelectedMonthBudget.total_amount_cents / 100).toFixed(2) : "Meta global"}
                                                            className="w-24 px-2.5 py-1 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap"
                                                        >
                                                            Fijar
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>

                                            {/* Slim Progress Bar */}
                                            <div className="h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        overallPct > 100 ? 'bg-red-500' : 'bg-gray-900 dark:bg-white'
                                                    }`}
                                                    style={{ width: `${Math.min(100, overallPct)}%` }}
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
                                                        {monthBudgetItems.length} {monthBudgetItems.length === 1 ? 'categoría asignada' : 'categorías asignadas'} · {formatCurrency(totalAllocatedInItems)} total
                                                    </p>
                                                </div>
                                            </div>

                                            {monthBudgetItems.length === 0 ? (
                                                <div className="bg-white dark:bg-[#0a0a0a] border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                                                    <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto text-gray-400">
                                                        <PieChart className="w-5 h-5" />
                                                    </div>
                                                    <div className="space-y-1 max-w-sm mx-auto">
                                                        <p className="font-semibold text-sm text-gray-900 dark:text-white">Sin desgloses para este mes</p>
                                                        <p className="text-xs text-gray-500">
                                                            Crea desgloses específicos para organizar tus límites de gasto en Comida, Transporte, Vivienda, etc.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setEditingBudgetItem(null);
                                                            setBudgetItemName('');
                                                            setBudgetItemAmount('');
                                                            setBudgetItemIcon('🏷️');
                                                            setBudgetItemColor('#27272a');
                                                            setBudgetItemCategoryId('');
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
                                                    {monthBudgetItems.map(item => {
                                                        let spentCents = 0;
                                                        if (item.category_id) {
                                                            spentCents = monthTxs
                                                                .filter(t => t.type === 'EXPENSE' && t.category_id === item.category_id)
                                                                .reduce((acc, t) => acc + t.amount_cents, 0);
                                                        } else {
                                                            const itemLower = item.name.toLowerCase();
                                                            spentCents = monthTxs
                                                                .filter(t => {
                                                                    if (t.type !== 'EXPENSE') return false;
                                                                    const desc = (t.description || '').toLowerCase();
                                                                    const catName = (categories.find(c => c.id === t.category_id)?.name || '').toLowerCase();
                                                                    return desc.includes(itemLower) || catName.includes(itemLower) || itemLower.includes(catName);
                                                                })
                                                                .reduce((acc, t) => acc + t.amount_cents, 0);
                                                        }

                                                        const remainingCents = item.allocated_cents - spentCents;
                                                        const isExceeded = remainingCents < 0;
                                                        const itemPct = item.allocated_cents > 0 ? Math.round((spentCents / item.allocated_cents) * 100) : 0;
                                                        const linkedCat = categories.find(c => c.id === item.category_id);

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3 hover:border-gray-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                                                            >
                                                                <div className="space-y-3">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                                                                                {item.icon || '🏷️'}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <h4 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{item.name}</h4>
                                                                                {linkedCat && (
                                                                                    <span className="text-[10px] text-gray-400 truncate block">
                                                                                        {linkedCat.emoji} {linkedCat.name}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setQuickExpenseBudgetItem(item);
                                                                                    setTxAmount('');
                                                                                    setTxAccountId(accounts.length > 0 ? accounts[0].id : '');
                                                                                    setTxDescription('');
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
                                                                                    setBudgetItemAmount((item.allocated_cents / 100).toString());
                                                                                    setBudgetItemIcon(item.icon || '🏷️');
                                                                                    setBudgetItemColor(item.color || '#27272a');
                                                                                    setBudgetItemCategoryId(item.category_id || '');
                                                                                    setShowBudgetItemModal(true);
                                                                                }}
                                                                                className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                                                                                title="Editar desglose"
                                                                            >
                                                                                <Pencil className="w-3 h-3" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteBudgetItem(item.id)}
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
                                                                                <span className="text-[11px] font-normal text-gray-400"> / {formatCurrency(item.allocated_cents)}</span>
                                                                            </span>
                                                                            <span className={`text-[11px] font-medium ${isExceeded ? 'text-red-500' : 'text-gray-500'}`}>
                                                                                {isExceeded ? `-${formatCurrency(Math.abs(remainingCents))}` : `${formatCurrency(remainingCents)}`}
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all duration-300 ${
                                                                                    isExceeded ? 'bg-red-500' : 'bg-gray-900 dark:bg-white'
                                                                                }`}
                                                                                style={{ width: `${Math.min(100, itemPct)}%` }}
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
                            {activeTab === 'planning' && (
                                <div className="space-y-6">
                                    {/* Planning Sub-nav */}
                                    <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl overflow-x-auto scrollbar-none">
                                        <button
                                            onClick={() => setPlanningSubTab('calendar')}
                                            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${planningSubTab === 'calendar' ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                                        >
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            Calendario de Pagos
                                        </button>
                                        <button
                                            onClick={() => setPlanningSubTab('subscriptions')}
                                            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${planningSubTab === 'subscriptions' ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                                        >
                                            <Calendar className="w-3.5 h-3.5" />
                                            Suscripciones ({recurring.length})
                                        </button>
                                        <button
                                            onClick={() => setPlanningSubTab('installments')}
                                            className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap shrink-0 ${planningSubTab === 'installments' ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                                        >
                                            <Layers className="w-3.5 h-3.5" />
                                            Cuotas ({installments.length})
                                        </button>
                                    </div>

                                    {/* Sub-tab 1: Payment Calendar */}
                                    {planningSubTab === 'calendar' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                                        <CalendarDays className="w-5 h-5 text-indigo-500" />
                                                        {calendarMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                                                    </h3>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
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
                                                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                                            className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Calendar Grid Header */}
                                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
                                                    <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
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
                                                            cells.push(<div key={`pad-${i}`} className="h-20 bg-gray-50/50 dark:bg-zinc-900/20 rounded-xl" />);
                                                        }

                                                        for (let day = 1; day <= totalDays; day++) {
                                                            const mm = String(month + 1).padStart(2, '0');
                                                            const dd = String(day).padStart(2, '0');
                                                            const dateStr = `${year}-${mm}-${dd}`;
                                                            const isToday = new Date().toISOString().split('T')[0] === dateStr;

                                                            // Subscriptions on this day
                                                            const dayRecs = recurring.filter(r => r.next_date === dateStr);
                                                            // Installments on this day
                                                            const dayInsts = installments.filter(inst => inst.status === 'ACTIVE' && inst.start_date.substring(8, 10) === dd);
                                                            const isSelected = selectedCalendarDay === dateStr;

                                                            cells.push(
                                                                <button
                                                                    key={dateStr}
                                                                    onClick={() => setSelectedCalendarDay(dateStr)}
                                                                    className={`h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                                                        isSelected 
                                                                            ? 'ring-2 ring-primary border-transparent bg-indigo-50/50 dark:bg-indigo-950/30' 
                                                                            : isToday 
                                                                            ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/10' 
                                                                            : 'border-gray-100 dark:border-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
                                                                    }`}
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${isToday ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                            {day}
                                                                        </span>
                                                                        {(dayRecs.length > 0 || dayInsts.length > 0) && (
                                                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-0.5 overflow-hidden">
                                                                        {dayRecs.map(r => (
                                                                            <div key={r.id} className="text-[10px] truncate bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-1 py-0.5 rounded font-medium">
                                                                                {r.description}
                                                                            </div>
                                                                        ))}
                                                                        {dayInsts.map(inst => (
                                                                            <div key={inst.id} className="text-[10px] truncate bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded font-medium">
                                                                                Cuota: {inst.name}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </button>
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
                                                    Detalles del día {selectedCalendarDay || 'Selecciona un día'}
                                                </h4>

                                                {selectedCalendarDay ? (
                                                    <div className="space-y-3">
                                                        {recurring.filter(r => r.next_date === selectedCalendarDay).map(r => (
                                                            <div key={r.id} className="p-3 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-semibold text-sm">{r.description}</p>
                                                                        <p className="text-xs text-gray-500">Suscripción recurrente</p>
                                                                    </div>
                                                                    <span className="font-bold text-red-500 text-sm">-{formatCurrency(r.amount_cents)}</span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 bg-gray-50 dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                                                                    <span>Estado de cobro:</span>
                                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Cobro Automático</span>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {installments.filter(inst => inst.status === 'ACTIVE' && inst.start_date.substring(8, 10) === selectedCalendarDay.substring(8, 10)).map(inst => (
                                                            <div key={inst.id} className="p-3 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-semibold text-sm">{inst.name}</p>
                                                                        <p className="text-xs text-gray-500">Cuota mensual ({inst.paid_installments + 1}/{inst.total_installments})</p>
                                                                    </div>
                                                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{formatCurrency(inst.installment_amount_cents)}</span>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                                                                    <span>Cobro automático:</span>
                                                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Día {inst.payment_day || inst.start_date.substring(8, 10)} de cada mes</span>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {recurring.filter(r => r.next_date === selectedCalendarDay).length === 0 &&
                                                         installments.filter(inst => inst.status === 'ACTIVE' && inst.start_date.substring(8, 10) === selectedCalendarDay.substring(8, 10)).length === 0 && (
                                                            <p className="text-xs text-gray-500 text-center py-8">No hay cobros ni cuotas programados para esta fecha.</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-500 text-center py-12">Haz clic en cualquier día del calendario para revisar o procesar pagos.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-tab 2: Subscriptions */}
                                    {planningSubTab === 'subscriptions' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                            <div className="lg:col-span-4">
                                                <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Añadir Suscripción / Pago</h3>
                                                <form onSubmit={handleCreateRecurring} className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4 shadow-sm">
                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1 text-gray-500">Descripción</label>
                                                        <input required type="text" value={recDesc} onChange={e => setRecDesc(e.target.value)} placeholder="Netflix, Gimnasio, Spotify..." className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-semibold mb-1 text-gray-500">Monto</label>
                                                            <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} value={recAmount} onChange={e => setRecAmount(e.target.value.replace(/-/g, ''))} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold mb-1 text-gray-500">Frecuencia</label>
                                                            <select value={recFrequency} onChange={e => setRecFrequency(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                                                <option value="monthly">Mensual</option>
                                                                <option value="yearly">Anual</option>
                                                                <option value="weekly">Semanal</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1 text-gray-500">Próximo cobro</label>
                                                        <input required type="date" value={recNextDate} onChange={e => setRecNextDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1 text-gray-500">Pagar con Cuenta / Tarjeta</label>
                                                        <select 
                                                            required
                                                            value={recAccountId} 
                                                            onChange={e => setRecAccountId(e.target.value ? Number(e.target.value) : '')} 
                                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                                                        >
                                                            <option value="">Selecciona cuenta...</option>
                                                            {accounts.map(acc => (
                                                                <option key={acc.id} value={acc.id}>
                                                                    {acc.name} ({formatCurrency(acc.balance_cents)})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">Añadir recurrente</button>
                                                </form>
                                            </div>

                                            <div className="lg:col-span-8">
                                                <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Suscripciones Registradas</h3>
                                                <div className="space-y-2.5">
                                                    {recurring.length === 0 ? (
                                                        <p className="text-gray-500 text-xs py-4">No hay suscripciones activas.</p>
                                                    ) : recurring.map(r => {
                                                        const targetAcc = accounts.find(a => a.id === r.account_id);
                                                        return (
                                                            <div key={r.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-gray-200 dark:hover:border-zinc-700 transition-all">
                                                                <div className="flex items-center gap-3.5 min-w-0">
                                                                    <div className="p-2 bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 rounded-xl">
                                                                        <Receipt className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{r.description}</p>
                                                                        <p className="text-xs text-gray-400">Próximo cobro: {r.next_date} • {r.frequency === 'monthly' ? 'Mensual' : r.frequency === 'yearly' ? 'Anual' : 'Semanal'}{targetAcc ? ` • Tarjeta: ${targetAcc.name}` : ''}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4 shrink-0">
                                                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">-{formatCurrency(r.amount_cents)}</span>
                                                                    <button 
                                                                        onClick={() => handleDeleteRecurring(r.id)} 
                                                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-tab 3: Installments (Cuotas Financiadas) */}
                                    {planningSubTab === 'installments' && (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-xl font-bold">Cuotas Financiadas</h3>
                                                    <p className="text-xs text-gray-500">Compras realizadas en cuotas mensuales y su progreso de pago</p>
                                                </div>
                                                <button
                                                    onClick={() => setShowInstallmentModal(true)}
                                                    className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:opacity-90"
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                    Nueva Compra a Cuotas
                                                </button>
                                            </div>

                                            {installments.length === 0 ? (
                                                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3">
                                                    <Layers className="w-12 h-12 text-gray-400 mx-auto opacity-70" />
                                                    <p className="font-semibold text-gray-700 dark:text-gray-300">No tienes compras a cuotas registradas</p>
                                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">Registra tus compras diferidas (ej. Electrodomésticos, viajes, tecnología) para controlar tus pagos mensuales.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                                    {installments.map(inst => {
                                                        const pct = Math.min(100, Math.round((inst.paid_installments / inst.total_installments) * 100));
                                                        const targetAcc = accounts.find(a => a.id === inst.account_id);

                                                        return (
                                                            <div key={inst.id} className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-gray-200 dark:hover:border-zinc-700 transition-all">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-bold text-base">{inst.name}</h4>
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inst.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
                                                                                {inst.status === 'COMPLETED' ? 'Completado' : 'Activo'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                                            {targetAcc ? `Tarjeta/Cuenta: ${targetAcc.name}` : 'Sin cuenta asignada'} • Día de cobro: {inst.payment_day || 15} • Inicio: {inst.start_date}
                                                                        </p>
                                                                    </div>
                                                                    <button onClick={() => handleDeleteInstallment(inst.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>

                                                                <div className="grid grid-cols-3 gap-1 p-2.5 bg-gray-50/70 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/50 rounded-xl text-center">
                                                                    <div className="min-w-0">
                                                                        <p className="text-[10px] text-gray-400 font-medium truncate">Monto Total</p>
                                                                        <p className="font-bold text-xs text-gray-950 dark:text-white truncate">{formatCurrency(inst.total_amount_cents)}</p>
                                                                    </div>
                                                                    <div className="min-w-0 border-x border-gray-100 dark:border-zinc-800">
                                                                        <p className="text-[10px] text-gray-400 font-medium truncate">Valor Cuota</p>
                                                                        <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{formatCurrency(inst.installment_amount_cents)}</p>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-[10px] text-gray-400 font-medium truncate">Cuotas</p>
                                                                        <p className="font-bold text-xs text-gray-950 dark:text-white truncate">{inst.paid_installments}/{inst.total_installments}</p>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <div className="flex justify-between text-[11px] font-semibold mb-1 text-gray-400">
                                                                        <span>Progreso ({pct}%)</span>
                                                                        <span>Restan {inst.total_installments - inst.paid_installments} meses</span>
                                                                    </div>
                                                                    <div className="h-1 bg-gray-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-zinc-800 dark:bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                </div>

                                                                {inst.status === 'ACTIVE' ? (
                                                                    <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-500 text-[11px] p-2 rounded-xl text-center flex items-center justify-center gap-1.5 font-medium">
                                                                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                                                        <span>Descuento automático el día {inst.payment_day || 15} de cada mes</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] p-2 rounded-xl text-center font-medium">
                                                                        ✅ Todas las cuotas han sido pagadas
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SAVINGS TAB */}
                            {activeTab === 'savings' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Metas de Ahorro</h2>
                                            <p className="text-xs text-gray-400">Planifica, realiza aportes y monitorea tus objetivos financieros</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Goals List */}
                                        <div className="lg:col-span-8 space-y-3.5">
                                            {savingsGoals.length === 0 ? (
                                                <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl p-10 text-center text-gray-400 text-xs">
                                                    No hay metas de ahorro activas. Crea una meta a la derecha para comenzar.
                                                </div>
                                            ) : (
                                                savingsGoals.map(goal => {
                                                    const progress = Math.min(100, Math.round((goal.current_amount_cents / goal.target_amount_cents) * 100));
                                                    return (
                                                        <div key={goal.id} className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm hover:border-gray-200 dark:hover:border-zinc-700 transition-all space-y-4">
                                                            <div className="flex justify-between items-start">
                                                                <div className="min-w-0">
                                                                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{goal.name}</h3>
                                                                    {goal.target_date && (
                                                                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                                                                            <Calendar className="w-3 h-3 text-gray-400" /> Meta para: {goal.target_date}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-4 shrink-0">
                                                                    <div className="text-right">
                                                                        <p className="font-bold text-sm text-gray-950 dark:text-white">{formatCurrency(goal.current_amount_cents)}</p>
                                                                        <p className="text-[10px] text-gray-400">de {formatCurrency(goal.target_amount_cents)}</p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleDeleteGoal(goal.id)} 
                                                                        className="text-gray-400 hover:text-red-500 p-1 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
                                                                    <span className="text-[11px] text-gray-400 font-medium">{progress}% completado</span>
                                                                    <button 
                                                                        onClick={() => setShowContributeModal(goal.id)} 
                                                                        className="text-[11px] font-semibold bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white px-3 py-1.5 rounded-lg transition-colors"
                                                                    >
                                                                        Aportar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {/* Create Goal Form */}
                                        <div className="lg:col-span-4">
                                            <form onSubmit={handleCreateSavingsGoal} className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4 shadow-sm sticky top-6">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Nueva Meta</h3>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
                                                    <input required type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Ej. Viaje a Japón" className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Monto Objetivo</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-400 text-sm">$</span></div>
                                                        <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} value={goalTargetAmount} onChange={e => setGoalTargetAmount(e.target.value.replace(/-/g, ''))} placeholder="0.00" className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha límite (Opcional)</label>
                                                    <input type="date" value={goalTargetDate} onChange={e => setGoalTargetDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Crear Meta</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SHOPPING TAB */}
                            {activeTab === 'shopping' && (
                                <div className="space-y-8">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold">Listas de Compras</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2 space-y-6">
                                            {shoppingLists.length === 0 ? (
                                                <p className="text-gray-500">No hay listas de compras.</p>
                                            ) : (
                                                shoppingLists.map(list => {
                                                    const listItems = shoppingItems.filter(i => i.list_id === list.id);
                                                    const completed = listItems.filter(i => i.is_purchased).length;
                                                    const total = listItems.length;
                                                    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
                                                    
                                                    return (
                                                        <div key={list.id} className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                                                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-zinc-800/50 pb-3">
                                                                <h3 className="font-semibold text-lg">{list.name}</h3>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm text-gray-500 font-medium">{completed} / {total}</span>
                                                                    <button onClick={() => handleDeleteShoppingList(list.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
                                                                <div className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                            
                                                            <div className="space-y-2 mb-4">
                                                                {listItems.map(item => (
                                                                    <div key={item.id} className="flex items-center gap-3">
                                                                        <button onClick={() => handleToggleShoppingItem(item)} className={`flex-shrink-0 w-5 h-5 rounded border ${item.is_purchased ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center`}>
                                                                            {item.is_purchased && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                        <span className={`text-sm ${item.is_purchased ? 'line-through text-gray-400' : ''}`}>{item.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <form onSubmit={(e) => handleAddShoppingItem(e, list.id)} className="flex gap-2">
                                                                <input type="text" value={newItemNames[list.id] || ''} onChange={e => setNewItemNames(prev => ({ ...prev, [list.id]: e.target.value }))} placeholder="Añadir artículo..." className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-lg" />
                                                                <button type="submit" className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium">Añadir</button>
                                                            </form>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                        <div>
                                            <form onSubmit={handleCreateShoppingList} className="bg-gray-50 dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4 sticky top-6">
                                                <h3 className="font-semibold text-lg mb-4">Nueva Lista</h3>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Nombre</label>
                                                    <input required type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ej. Supermercado" className="w-full px-4 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-medium hover:opacity-90">Crear Lista</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DEBTS & CARDS TAB */}
                            {activeTab === 'debts' && (
                                <div className="space-y-10">
                                    {/* Credit & Debit Cards Visual Section */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-xl font-bold flex items-center gap-2">
                                                    <CreditCard className="w-5 h-5 text-indigo-500" />
                                                    Mis Tarjetas (Crédito y Débito)
                                                </h2>
                                                <p className="text-xs text-gray-500">Gestión visual de plásticos, límites, fechas de corte y vencimientos</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setNewAccountType('credit');
                                                    setShowCreateAccountModal(true);
                                                }}
                                                className="text-xs font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-xl text-gray-900 dark:text-white transition-colors flex items-center gap-1.5"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Nueva Tarjeta
                                            </button>
                                        </div>

                                        {accounts.filter(a => a.type === 'credit' || a.type === 'debit').length === 0 ? (
                                            <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-2">
                                                <CreditCard className="w-10 h-10 text-gray-400 mx-auto" />
                                                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No tienes tarjetas registradas</p>
                                                <p className="text-xs text-gray-500">Agrega tus tarjetas de crédito o débito desde Ajustes para llevar control de deudas y fechas de pago.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {accounts.filter(a => a.type === 'credit' || a.type === 'debit').map(card => {
                                                    const isCredit = card.type === 'credit';
                                                    const limit = card.credit_limit_cents || 0;
                                                    const debtBalance = Math.abs(card.balance_cents);
                                                    const availableCents = isCredit ? limit - debtBalance : card.balance_cents;
                                                    const usedPct = isCredit && limit > 0 ? Math.min(100, Math.round((debtBalance / limit) * 100)) : 0;

                                                    return (
                                                        <div 
                                                            key={card.id} 
                                                            className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-lg transition-transform hover:-translate-y-1 ${
                                                                card.card_color === 'slate' ? 'bg-gradient-to-br from-zinc-900 via-neutral-950 to-zinc-900' :
                                                                card.card_color === 'indigo' ? 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900' :
                                                                card.card_color === 'blue' ? 'bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900' :
                                                                card.card_color === 'emerald' ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900' :
                                                                card.card_color === 'rose' ? 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900' :
                                                                card.card_color === 'amber' ? 'bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900' :
                                                                card.card_color === 'violet' ? 'bg-gradient-to-br from-violet-950 via-violet-900 to-slate-900' :
                                                                (isCredit ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900' : 'bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900')
                                                            }`}
                                                        >
                                                            {/* Physical Card Chip Graphic */}
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div>
                                                                    <span className="text-[10px] tracking-widest font-bold uppercase opacity-75">
                                                                        {isCredit ? 'Tarjeta de Crédito' : 'Tarjeta de Débito'}
                                                                    </span>
                                                                    <h3 className="text-lg font-bold tracking-tight">{card.name}</h3>
                                                                </div>
                                                                <div className="w-10 h-8 rounded-lg bg-yellow-400/80 border border-yellow-200/50 flex items-center justify-center shadow-inner">
                                                                    <div className="w-6 h-5 border border-yellow-600/60 rounded flex flex-col justify-between p-0.5">
                                                                        <div className="h-0.5 bg-yellow-700/50 w-full" />
                                                                        <div className="h-0.5 bg-yellow-700/50 w-full" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Card Number Representation */}
                                                            <div className="my-4 font-mono text-base tracking-widest opacity-90">
                                                                •••• •••• •••• {card.card_number_last4 || '4242'}
                                                            </div>

                                                            {/* Balance / Limit Details */}
                                                            {isCredit ? (
                                                                <div className="space-y-2 mt-4 pt-3 border-t border-white/10">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="opacity-75">Deuda Actual:</span>
                                                                        <span className="font-bold text-red-300">{formatCurrency(debtBalance)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="opacity-75">Disponible:</span>
                                                                        <span className="font-semibold">{formatCurrency(availableCents)}</span>
                                                                    </div>
                                                                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${usedPct}%` }} />
                                                                    </div>

                                                                    <div className="flex justify-between text-[11px] opacity-80 pt-1">
                                                                        <span>Corte: Día {card.cutoff_day || 'N/A'}</span>
                                                                        <span>Pago: Día {card.due_day || 'N/A'}</span>
                                                                    </div>

                                                                    {debtBalance > 0 && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowPayCardModal(card);
                                                                            }}
                                                                            className="w-full mt-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                                                        >
                                                                            Abonar a Tarjeta
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1 mt-4 pt-3 border-t border-white/10">
                                                                    <span className="text-xs opacity-75">Saldo Disponible:</span>
                                                                    <p className="text-2xl font-extrabold">{formatCurrency(card.balance_cents)}</p>
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
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Préstamos Personales</h2>
                                            <p className="text-xs text-gray-400">Control de dinero prestado y deudas con terceros</p>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                            <div className="lg:col-span-8 space-y-3.5">
                                                {debts.length === 0 ? (
                                                    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl p-10 text-center text-gray-400 text-xs">
                                                        No hay registro de préstamos ni deudas personales. Crea uno a la derecha.
                                                    </div>
                                                ) : (
                                                    debts.map(debt => {
                                                        const isOwed = debt.type === 'OWED';
                                                        const progress = Math.min(100, Math.round(((debt.amount_cents - debt.remaining_cents) / debt.amount_cents) * 100));
                                                        
                                                        return (
                                                            <div key={debt.id} className="bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm hover:border-gray-200 dark:hover:border-zinc-700 transition-all space-y-4">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOwed ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' : 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'}`}>
                                                                                {isOwed ? 'Me deben' : 'Debo'}
                                                                            </span>
                                                                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{debt.name}</h3>
                                                                        </div>
                                                                        {debt.due_date && (
                                                                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                                                                                <Calendar className="w-3 h-3 text-gray-400" /> Vence: {debt.due_date}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2.5 shrink-0">
                                                                        <div className="text-right mr-1.5">
                                                                            <p className="text-[10px] text-gray-400 font-medium">Restante</p>
                                                                            <p className="font-bold text-sm text-gray-950 dark:text-white">{formatCurrency(debt.remaining_cents)}</p>
                                                                        </div>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditingDebt(debt);
                                                                                setEditDebtName(debt.name);
                                                                                setEditDebtType(debt.type);
                                                                                setEditDebtAmount((debt.amount_cents / 100).toString());
                                                                                setEditDebtRemaining((debt.remaining_cents / 100).toString());
                                                                                setEditDebtDueDate(debt.due_date || '');
                                                                            }} 
                                                                            className="text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-xl transition-colors shrink-0"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => handleDeleteDebt(debt.id)} 
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
                                                                            {formatCurrency(debt.amount_cents - debt.remaining_cents)} de {formatCurrency(debt.amount_cents)} pagado ({progress}%)
                                                                        </span>
                                                                        {debt.remaining_cents > 0 && (
                                                                            <button 
                                                                                onClick={() => { setShowPayDebtModal(debt); setPayDebtAmount(''); setPayDebtAccountId(''); }} 
                                                                                className="text-[11px] font-semibold bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white px-3 py-1.5 rounded-lg transition-colors"
                                                                            >
                                                                                Abonar {isOwed ? 'Cobro' : 'Pago'}
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
                                                <form onSubmit={handleAddDebt} className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4 shadow-sm sticky top-6">
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Nuevo Préstamo</h3>
                                                    
                                                    <div className="flex gap-1.5 p-1 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setDebtType('OWE')} 
                                                            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${debtType === 'OWE' ? 'bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                                                        >
                                                            Yo debo
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setDebtType('OWED')} 
                                                            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${debtType === 'OWED' ? 'bg-white dark:bg-zinc-800 shadow-sm text-gray-950 dark:text-white' : 'text-gray-400 hover:text-gray-900'}`}
                                                        >
                                                            Me deben
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre/Persona</label>
                                                        <input required type="text" value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Monto Total</label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-400 text-sm">$</span></div>
                                                            <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} value={debtAmount} onChange={e => setDebtAmount(e.target.value.replace(/-/g, ''))} placeholder="0.00" className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha límite (Opcional)</label>
                                                        <input type="date" value={debtDueDate} onChange={e => setDebtDueDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
                                                    </div>
                                                    <button type="submit" className="w-full bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Guardar</button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STATS TAB */}
                            {activeTab === 'stats' && (() => {
                                // Calculate analytics metrics
                                const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount_cents, 0);
                                const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount_cents, 0);
                                const netSavings = totalIncome - totalExpenses;
                                const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

                                const today = new Date();
                                const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                                const currentDay = Math.max(1, today.getDate());
                                const dailyAverageExpense = Math.round(expensesThisMonth / currentDay);
                                const projectedMonthlyExpense = dailyAverageExpense * daysInMonth;

                                const creditAccounts = accounts.filter(a => a.type === 'credit');
                                const totalCreditLimit = creditAccounts.reduce((a, b) => a + (b.credit_limit_cents || 0), 0);
                                const totalCreditUsed = creditAccounts.reduce((a, b) => a + b.balance_cents, 0);
                                const creditUtilization = totalCreditLimit > 0 ? Math.min(100, Math.round((totalCreditUsed / totalCreditLimit) * 100)) : 0;

                                // Daily expenses for line chart
                                const currentMonthPrefix = today.toISOString().substring(0, 7);
                                const dailyData = Array.from({ length: currentDay }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dayStr = `${currentMonthPrefix}-${dayNum.toString().padStart(2, '0')}`;
                                    const dayTx = transactions.filter(t => t.date === dayStr);
                                    const exp = dayTx.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + (b.amount_cents / 100), 0);
                                    const inc = dayTx.filter(t => t.type === 'INCOME').reduce((a, b) => a + (b.amount_cents / 100), 0);
                                    return {
                                        day: `${dayNum}`,
                                        Gasto: exp,
                                        Ingreso: inc
                                    };
                                });

                                // 6 Months historical line chart data
                                const sixMonthsData = Array.from({ length: 6 }).map((_, i) => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() - (5 - i));
                                    const prefix = d.toISOString().substring(0, 7);
                                    const mTx = transactions.filter(t => t.date.startsWith(prefix));
                                    const inc = mTx.filter(t => t.type === 'INCOME').reduce((a, b) => a + (b.amount_cents / 100), 0);
                                    const exp = mTx.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + (b.amount_cents / 100), 0);
                                    return {
                                        month: d.toLocaleString('es-ES', { month: 'short' }),
                                        Ingresos: inc,
                                        Gastos: exp,
                                        Ahorro: inc - exp
                                    };
                                });

                                // Category breakdown with percentages
                                const catExpenseMap: Record<string, { amount: number; emoji: string }> = {};
                                transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
                                    const cat = categories.find(c => c.id === t.category_id);
                                    const catName = cat?.name || 'Sin Categoría';
                                    const catEmoji = cat?.emoji || '📦';
                                    if (!catExpenseMap[catName]) {
                                        catExpenseMap[catName] = { amount: 0, emoji: catEmoji };
                                    }
                                    catExpenseMap[catName].amount += (t.amount_cents / 100);
                                });
                                const sortedCategoryBreakdown = Object.entries(catExpenseMap)
                                    .map(([name, data]) => ({ name, ...data }))
                                    .sort((a, b) => b.amount - a.amount);
                                const totalCatExpense = sortedCategoryBreakdown.reduce((a, b) => a + b.amount, 0);

                                return (
                                    <div className="space-y-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-xl font-bold">Estadísticas y Análisis Financiero</h2>
                                                <p className="text-xs text-gray-500 mt-1">Métricas en tiempo real, tendencias de gastos y evolución de saldo</p>
                                            </div>
                                        </div>

                                        {/* KPI Metrics Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Savings Rate Card */}
                                            <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-semibold text-gray-500">Tasa de Ahorro</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${savingsRate >= 20 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : savingsRate > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'}`}>
                                                        {savingsRate >= 20 ? 'Saludable' : savingsRate > 0 ? 'Regular' : 'Atención'}
                                                    </span>
                                                </div>
                                                <div className="text-2xl font-bold tracking-tight">{savingsRate}%</div>
                                                <div className="space-y-1">
                                                    <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${savingsRate >= 20 ? 'bg-emerald-500' : savingsRate > 0 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, savingsRate)}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400">Superávit: {formatCurrency(netSavings)}</p>
                                                </div>
                                            </div>

                                            {/* Daily Average Expense Card */}
                                            <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-semibold text-gray-500">Promedio Diario (Mes)</span>
                                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                                </div>
                                                <div className="text-2xl font-bold tracking-tight">{formatCurrency(dailyAverageExpense)}</div>
                                                <p className="text-[10px] text-gray-400">Basado en {currentDay} días transcurridos este mes</p>
                                            </div>

                                            {/* Projected Monthly Expense Card */}
                                            <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-semibold text-gray-500">Proyección Fin de Mes</span>
                                                    <BarChart3 className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <div className="text-2xl font-bold tracking-tight">{formatCurrency(projectedMonthlyExpense)}</div>
                                                <p className="text-[10px] text-gray-400">Ritmo proyectado para {daysInMonth} días del mes</p>
                                            </div>

                                            {/* Credit Utilization Card */}
                                            <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-semibold text-gray-500">Uso Crédito Total</span>
                                                    <CreditCard className="w-4 h-4 text-purple-500" />
                                                </div>
                                                <div className="text-2xl font-bold tracking-tight">{creditUtilization}%</div>
                                                <div className="space-y-1">
                                                    <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${creditUtilization > 80 ? 'bg-red-500' : creditUtilization > 50 ? 'bg-amber-500' : 'bg-purple-500'}`} style={{ width: `${creditUtilization}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400">{formatCurrency(totalCreditUsed)} de {formatCurrency(totalCreditLimit)} límite</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Line Charts Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Real Daily Expense Line/Area Chart */}
                                            <div className="bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h3 className="text-base font-bold">Gasto Diario (Este Mes)</h3>
                                                        <p className="text-xs text-gray-500">Gráfica de tendencia día por día</p>
                                                    </div>
                                                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">Línea Real</span>
                                                </div>
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={dailyData}>
                                                            <defs>
                                                                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                                </linearGradient>
                                                                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11 }} />
                                                            <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                                                            <Legend />
                                                            <Area type="monotone" dataKey="Gasto" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGradient)" />
                                                            <Area type="monotone" dataKey="Ingreso" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGradient)" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* 6 Months Trend Line Chart */}
                                            <div className="bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h3 className="text-base font-bold">Evolución de Ingresos y Gastos (6 Meses)</h3>
                                                        <p className="text-xs text-gray-500">Comparativa histórica de tendencias</p>
                                                    </div>
                                                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">Tendencia</span>
                                                </div>
                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={sixMonthsData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11 }} />
                                                            <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                                                            <Legend />
                                                            <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                            <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                            <Line type="monotone" dataKey="Ahorro" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Category Breakdown & Progress Gauges */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Category Progress Bars */}
                                            <div className="bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
                                                <h3 className="text-base font-bold">Desglose de Gastos por Categoría</h3>
                                                {sortedCategoryBreakdown.length === 0 ? (
                                                    <p className="text-sm text-gray-500 text-center py-8">No hay gastos registrados para analizar.</p>
                                                ) : (
                                                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                                        {sortedCategoryBreakdown.map((cat, idx) => {
                                                            const pct = totalCatExpense > 0 ? Math.round((cat.amount / totalCatExpense) * 100) : 0;
                                                            return (
                                                                <div key={idx} className="space-y-1">
                                                                    <div className="flex justify-between items-center text-xs">
                                                                        <span className="font-semibold flex items-center gap-1.5">
                                                                            <span>{cat.emoji}</span>
                                                                            <span>{cat.name}</span>
                                                                        </span>
                                                                        <span className="font-bold">{formatCurrency(Math.round(cat.amount * 100))} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                                                                    </div>
                                                                    <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className="h-full rounded-full transition-all duration-500" 
                                                                            style={{ 
                                                                                width: `${pct}%`,
                                                                                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'][idx % 8]
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
                                            <div className="bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
                                                <h3 className="text-base font-bold text-center">Distribución Porcentual</h3>
                                                <div className="h-64">
                                                    {sortedCategoryBreakdown.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <RechartsPieChart>
                                                                <Pie
                                                                    data={sortedCategoryBreakdown.map(c => ({ name: `${c.emoji} ${c.name}`, value: c.amount }))}
                                                                    cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value"
                                                                >
                                                                    {sortedCategoryBreakdown.map((_, index) => (
                                                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'][index % 8]} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                                                                <Legend />
                                                            </RechartsPieChart>
                                                        </ResponsiveContainer>
                                                    ) : <p className="text-center text-gray-500 mt-20">No hay suficientes datos</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* CLOSING TAB */}
                            {activeTab === 'closing' && (
                                <div className="space-y-8 max-w-4xl mx-auto">
                                    <div className="text-center space-y-1">
                                        <h2 className="text-2xl font-bold">Cierre de Mes y Reportes</h2>
                                        <p className="text-xs text-gray-500">Muestra primero el mes actual y luego las tarjetas de meses anteriores</p>
                                    </div>

                                    {/* Current Month Highlight Box */}
                                    <div className="bg-gradient-to-br from-gray-900 to-zinc-900 text-white p-8 rounded-3xl shadow-xl text-center space-y-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-400">
                                            <Archive className="w-3.5 h-3.5" />
                                            Mes Actual en Curso
                                        </div>
                                        <h3 className="text-3xl font-extrabold tracking-tight">
                                            {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                                        </h3>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <p className="text-xs text-gray-400 font-medium mb-1">Ingresos</p>
                                                <p className="text-xl font-bold text-emerald-400">{formatCurrency(incomeThisMonth)}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <p className="text-xs text-gray-400 font-medium mb-1">Gastos</p>
                                                <p className="text-xl font-bold text-red-400">{formatCurrency(expensesThisMonth)}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <p className="text-xs text-gray-400 font-medium mb-1">Flujo Neto</p>
                                                <p className={`text-xl font-bold ${(incomeThisMonth - expensesThisMonth) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {(incomeThisMonth - expensesThisMonth) >= 0 ? '+' : ''}{formatCurrency(incomeThisMonth - expensesThisMonth)}
                                                </p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                                <p className="text-xs text-gray-400 font-medium mb-1">Movimientos</p>
                                                <p className="text-xl font-bold text-white">
                                                    {transactions.filter(t => t.date.startsWith(new Date().toISOString().substring(0, 7))).length}
                                                </p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={exportToCSV}
                                            className="w-full bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Exportar Todos los Movimientos (CSV)
                                        </button>
                                    </div>

                                    {/* Vertical Cards for Previous Months */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-gray-500" />
                                            Historial de Meses Anteriores
                                        </h3>

                                        {(() => {
                                            const monthsMap = new Map<string, { monthKey: string; monthName: string; income: number; expenses: number; txs: FinanceTransaction[] }>();
                                            
                                            transactions.forEach(tx => {
                                                const prefix = tx.date.substring(0, 7);
                                                if (!monthsMap.has(prefix)) {
                                                    const [y, m] = prefix.split('-');
                                                    const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
                                                    const mName = dateObj.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                                                    monthsMap.set(prefix, {
                                                        monthKey: prefix,
                                                        monthName: mName.replace(/^\w/, c => c.toUpperCase()),
                                                        income: 0,
                                                        expenses: 0,
                                                        txs: []
                                                    });
                                                }
                                                const data = monthsMap.get(prefix)!;
                                                data.txs.push(tx);
                                                if (tx.type === 'INCOME') data.income += tx.amount_cents;
                                                if (tx.type === 'EXPENSE') data.expenses += tx.amount_cents;
                                            });

                                            const historical = Array.from(monthsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

                                            if (historical.length === 0) {
                                                return <p className="text-sm text-gray-500">No hay registros de meses anteriores.</p>;
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {historical.map(item => {
                                                        const net = item.income - item.expenses;

                                                        const exportMonthCSV = () => {
                                                            const headers = ['ID', 'Fecha', 'Tipo', 'Monto ($)', 'Categoría', 'Cuenta', 'Descripción'];
                                                            const rows = item.txs.map(t => [
                                                                t.id,
                                                                t.date,
                                                                t.type,
                                                                (t.amount_cents / 100).toFixed(2),
                                                                categories.find(c => c.id === t.category_id)?.name || 'Sin categoría',
                                                                accounts.find(a => a.id === t.account_id)?.name || 'Sin cuenta',
                                                                `"${t.description || ''}"`
                                                            ]);
                                                            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                                                            const encodedUri = encodeURI(csvContent);
                                                            const link = document.createElement('a');
                                                            link.setAttribute('href', encodedUri);
                                                            link.setAttribute('download', `cierre_finanzas_${item.monthKey}.csv`);
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        };

                                                        return (
                                                            <div key={item.monthKey} className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
                                                                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-3">
                                                                    <div>
                                                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{item.monthName}</h4>
                                                                        <p className="text-xs text-gray-500">{item.txs.length} transacciones registradas</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={exportMonthCSV}
                                                                        className="text-xs font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                        Exportar CSV del Mes
                                                                    </button>
                                                                </div>

                                                                <div className="grid grid-cols-3 gap-3 text-center">
                                                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                                                                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Ingresos</p>
                                                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{formatCurrency(item.income)}</p>
                                                                    </div>
                                                                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-2xl">
                                                                        <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">Gastos</p>
                                                                        <p className="font-bold text-red-600 dark:text-red-400 text-base">{formatCurrency(item.expenses)}</p>
                                                                    </div>
                                                                    <div className="p-3 bg-gray-50 dark:bg-[#121212] rounded-2xl">
                                                                        <p className="text-[11px] font-semibold text-gray-500">Balance Neto</p>
                                                                        <p className={`font-bold text-base ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                            {net >= 0 ? '+' : ''}{formatCurrency(net)}
                                                                        </p>
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
                            )}

                            {/* SETTINGS TAB */}
                            {activeTab === 'settings' && (
                                <div className="space-y-8 max-w-4xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        
                                        {/* ACCOUNTS */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-zinc-800 pb-2">Tus Cuentas y Tarjetas</h3>
                                            <div className="space-y-2 mb-4">
                                                {accounts.map(acc => (
                                                    <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-100 dark:border-gray-800">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm text-gray-600 dark:text-gray-300">
                                                                {getAccountIcon(acc.type)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-sm">{acc.name}</p>
                                                                <p className="text-[10px] text-gray-500 uppercase font-bold">
                                                                    {acc.type === 'credit' ? `Tarjeta de Crédito ${acc.card_number_last4 ? `•••• ${acc.card_number_last4}` : ''}` : acc.type === 'wallet' ? 'Wallet digital' : acc.type}
                                                                </p>
                                                                {['bank', 'credit', 'debit'].includes(acc.type) && (acc.maintenance_fee_type !== 'none' || acc.transfer_fee_type !== 'none') && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                        {acc.maintenance_fee_type !== 'none' && (
                                                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 rounded">
                                                                                Mantenimiento: {acc.maintenance_fee_type === 'fixed' ? `$${acc.maintenance_fee_value}` : `${acc.maintenance_fee_value}%`} ({acc.maintenance_fee_freq === 'yearly' ? 'Anual' : 'Mensual'})
                                                                            </span>
                                                                        )}
                                                                        {acc.transfer_fee_type !== 'none' && (
                                                                            <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 rounded">
                                                                                Comisión Transf: {acc.transfer_fee_type === 'fixed' ? `$${acc.transfer_fee_value}` : `${acc.transfer_fee_value}%`}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{formatCurrency(acc.balance_cents)}</span>
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingAccount(acc);
                                                                        setEditAccountName(acc.name);
                                                                        setEditAccountType(acc.type);
                                                                        setEditAccountBalance((acc.balance_cents / 100).toString());
                                                                        setEditAccountCardColor(acc.card_color || 'slate');
                                                                        setEditAccountCreditLimit(((acc.credit_limit_cents || 0) / 100).toString());
                                                                        setEditAccountCutoffDay((acc.cutoff_day || '').toString());
                                                                        setEditAccountDueDay((acc.due_day || '').toString());
                                                                        setEditAccountCardNumberLast4(acc.card_number_last4 || '');
                                                                        setEditAccountMaintFeeType(acc.maintenance_fee_type || 'none');
                                                                        setEditAccountMaintFeeValue((acc.maintenance_fee_value || 0).toString());
                                                                        setEditAccountMaintFeeFreq(acc.maintenance_fee_freq || 'monthly');
                                                                        setEditAccountTransferFeeType(acc.transfer_fee_type || 'none');
                                                                        setEditAccountTransferFeeValue((acc.transfer_fee_value || 0).toString());
                                                                        setShowEditAccountExtras(
                                                                            (acc.maintenance_fee_type && acc.maintenance_fee_type !== 'none') ||
                                                                            (acc.transfer_fee_type && acc.transfer_fee_type !== 'none')
                                                                        );
                                                                    }}
                                                                    className="text-gray-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all shrink-0"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => handleDeleteAccount(acc.id)} 
                                                                    className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setShowCreateAccountModal(true)}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-[#121212] dark:hover:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-zinc-200 transition-all shadow-sm cursor-pointer"
                                            >
                                                <PlusIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                                Añadir Nueva Cuenta o Tarjeta
                                            </button>
                                        </div>

                                         {/* CATEGORIES / PRESUPUESTOS UNIFICADOS */}
                                         <div className="space-y-4">
                                             <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-2">
                                                 <div>
                                                     <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Categorías y Presupuestos</h3>
                                                     <p className="text-xs text-gray-500">Administra tus categorías de gastos (presupuestos) e ingresos</p>
                                                 </div>
                                                 <div className="flex gap-2">
                                                     <button
                                                         type="button"
                                                         onClick={() => openNewCategoryModal('EXPENSE')}
                                                         className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-semibold transition-all"
                                                     >
                                                         <PlusIcon className="w-3.5 h-3.5" />
                                                         Nueva Categoría
                                                     </button>
                                                 </div>
                                             </div>

                                             {/* Expenses / Budgets Section */}
                                             <div className="space-y-2">
                                                 <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Categorías de Gasto / Presupuesto</span>
                                                 <div className="flex flex-wrap gap-2">
                                                     {categories.filter(c => !c.type || c.type.toUpperCase() === 'EXPENSE' || c.type.toUpperCase() === 'GASTO').map(cat => (
                                                         <div key={cat.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 group">
                                                             <span>{cat.emoji || '🛒'}</span>
                                                             <span className="font-medium">{cat.name}</span>
                                                             {cat.budget_limit_cents && cat.budget_limit_cents > 0 ? (
                                                                 <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-800 rounded-md text-gray-700 dark:text-gray-300">
                                                                     ${(cat.budget_limit_cents / 100).toFixed(2)}/mes
                                                                 </span>
                                                             ) : null}
                                                             <div className="flex items-center gap-1 ml-1 pl-1 border-l border-gray-200 dark:border-zinc-700">
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => openEditCategoryModal(cat)}
                                                                     className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-0.5 rounded transition-colors"
                                                                     title="Editar"
                                                                 >
                                                                     <Pencil className="w-3 h-3" />
                                                                 </button>
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => handleDeleteCategory(cat.id)}
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
                                             <div className="space-y-2 pt-2">
                                                 <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Categorías de Ingreso</span>
                                                 <div className="flex flex-wrap gap-2">
                                                     {categories.filter(c => c.type && (c.type.toUpperCase() === 'INCOME' || c.type.toUpperCase() === 'INGRESO')).map(cat => (
                                                         <div key={cat.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-300 group">
                                                             <span>{cat.emoji || '💼'}</span>
                                                             <span className="font-medium">{cat.name}</span>
                                                             <div className="flex items-center gap-1 ml-1 pl-1 border-l border-emerald-200 dark:border-emerald-800">
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => openEditCategoryModal(cat)}
                                                                     className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white p-0.5 rounded transition-colors"
                                                                     title="Editar"
                                                                 >
                                                                     <Pencil className="w-3 h-3" />
                                                                 </button>
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => handleDeleteCategory(cat.id)}
                                                                     className="text-emerald-600 dark:text-emerald-400 hover:text-red-500 p-0.5 rounded transition-colors"
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

                                        {/* SECURITY & PIN PROTECTION */}
                                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Seguridad y PIN</h3>
                                                    <p className="text-xs text-gray-500">Control de acceso y protección de operaciones clave</p>
                                                </div>
                                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                                    securityConfig?.pin_hash 
                                                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                                                        : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400'
                                                }`}>
                                                    {securityConfig?.pin_hash ? 'Protección activa' : 'Sin PIN'}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                                            {securityConfig?.pin_hash ? 'PIN de 4 dígitos configurado' : 'Sin PIN de seguridad'}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 mt-0.5">
                                                            {securityConfig?.pin_hash 
                                                                ? 'Puedes cambiar el código actual o gestionar las confirmaciones.' 
                                                                : 'Crea un PIN numérico de 4 dígitos para proteger tu información.'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setNewPinValue('');
                                                                setConfirmPinValue('');
                                                                setSetPinError('');
                                                                setShowSetPinModal(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-medium transition-all"
                                                        >
                                                            <KeyRound className="w-3.5 h-3.5" />
                                                            {securityConfig?.pin_hash ? 'Cambiar PIN' : 'Crear PIN'}
                                                        </button>
                                                        {securityConfig?.pin_hash && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDisablePinInput('');
                                                                    setDisablePinError('');
                                                                    setShowDisablePinModal(true);
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/40 transition-all"
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
                                                                <label htmlFor="toggle-lock-on-enter" className="text-xs font-medium text-gray-900 dark:text-white cursor-pointer">
                                                                    Solicitar PIN al entrar al módulo
                                                                </label>
                                                                <p className="text-[11px] text-gray-500">
                                                                    Bloquea las vistas hasta ingresar el PIN de 4 dígitos.
                                                                </p>
                                                            </div>
                                                            <button
                                                                id="toggle-lock-on-enter"
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={securityConfig.require_on_enter}
                                                                onClick={() => handleToggleRequireOnEnter(!securityConfig.require_on_enter)}
                                                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                                                                    securityConfig.require_on_enter ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-zinc-700'
                                                                }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full transition-transform ${
                                                                    securityConfig.require_on_enter 
                                                                        ? 'translate-x-5 bg-white dark:bg-gray-900' 
                                                                        : 'translate-x-0 bg-white dark:bg-zinc-300'
                                                                }`} />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center justify-between py-1">
                                                            <div className="space-y-0.5 pr-4">
                                                                <label htmlFor="toggle-lock-on-delete" className="text-xs font-medium text-gray-900 dark:text-white cursor-pointer">
                                                                    Proteger eliminación de cuentas y tarjetas
                                                                </label>
                                                                <p className="text-[11px] text-gray-500">
                                                                    Pide confirmación con PIN antes de borrar una cuenta.
                                                                </p>
                                                            </div>
                                                            <button
                                                                id="toggle-lock-on-delete"
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={securityConfig.require_on_delete}
                                                                onClick={() => handleToggleRequireOnDelete(!securityConfig.require_on_delete)}
                                                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                                                                    securityConfig.require_on_delete ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-zinc-700'
                                                                }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full transition-transform ${
                                                                    securityConfig.require_on_delete 
                                                                        ? 'translate-x-5 bg-white dark:bg-gray-900' 
                                                                        : 'translate-x-0 bg-white dark:bg-zinc-300'
                                                                }`} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                            </motion.div>
                        </AnimatePresence>
                        </>
                    )}
                </div>
            </div>

            {/* Quick Add Modal */}
            <AnimatePresence>
                {showTxModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTxModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Registrar {txType === 'EXPENSE' ? 'Gasto' : txType === 'INCOME' ? 'Ingreso' : 'Transferencia'}</h3>
                                <button onClick={() => setShowTxModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleAddTransaction} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-lg">$</span></div>
                                        <input type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} required autoFocus value={txAmount} onChange={(e) => setTxAmount(e.target.value.replace(/-/g, ''))} className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary text-lg" placeholder="0.00" />
                                    </div>
                                </div>

                                {txType !== 'TRANSFER_OUT' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Cuenta de Origen (Obligatorio)</label>
                                            <select required value={txAccountId} onChange={(e) => setTxAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
                                                <option value="" disabled>Selecciona la cuenta</option>
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type === 'credit' ? `Disp: ${formatCurrency((acc.credit_limit_cents || 0) - Math.abs(acc.balance_cents))}` : `Saldo: ${formatCurrency(acc.balance_cents)}`})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Categoría</label>
                                            <select required value={txCategoryId} onChange={(e) => setTxCategoryId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                                <option value="" disabled>Selecciona una categoría</option>
                                                {categories
                                                    .filter(cat => !cat.type || (txType === 'EXPENSE' ? (cat.type.toUpperCase() === 'EXPENSE' || cat.type.toUpperCase() === 'GASTO') : (cat.type.toUpperCase() === 'INCOME' || cat.type.toUpperCase() === 'INGRESO')))
                                                    .map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name} {cat.budget_limit_cents && cat.budget_limit_cents > 0 ? `(Presupuesto: $${(cat.budget_limit_cents / 100).toFixed(2)})` : ''}</option>)}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium mb-1">Desde (Origen)</label>
                                                <select required value={txAccountId} onChange={(e) => setTxAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
                                                    <option value="" disabled>Origen</option>
                                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance_cents)})</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium mb-1">Hacia (Destino)</label>
                                                <select required value={txToAccountId} onChange={(e) => setTxToAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
                                                    <option value="" disabled>Destino</option>
                                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Transfer Fee option */}
                                        <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    Comisión por transferencia (Opcional)
                                                </label>
                                                <div className="flex items-center bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTxTransferFeeType('fixed')}
                                                        className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${
                                                            txTransferFeeType === 'fixed'
                                                                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        $ Fijo
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTxTransferFeeType('percent')}
                                                        className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${
                                                            txTransferFeeType === 'percent'
                                                                ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        % Porc.
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                                                    {txTransferFeeType === 'fixed' ? '$' : '%'}
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder={txTransferFeeType === 'fixed' ? "0.00 (sin comisión)" : "0.00 %"}
                                                    value={txTransferFeeValue}
                                                    onChange={e => setTxTransferFeeValue(e.target.value)}
                                                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                                                />
                                            </div>

                                            {/* Live transfer preview */}
                                            {txAmount && parseFloat(txAmount) > 0 && (
                                                <div className="text-[11px] bg-white dark:bg-[#0a0a0a] p-2.5 rounded-xl border border-gray-150 dark:border-zinc-800 space-y-1">
                                                    {(() => {
                                                        const amount = parseFloat(txAmount) || 0;
                                                        const feeVal = parseFloat(txTransferFeeValue) || 0;
                                                        const feeAmount = txTransferFeeType === 'fixed' ? feeVal : (amount * feeVal) / 100;
                                                        const totalDebited = amount + feeAmount;
                                                        return (
                                                            <>
                                                                <div className="flex justify-between text-gray-500">
                                                                    <span>Monto transferido:</span>
                                                                    <span>${amount.toFixed(2)}</span>
                                                                </div>
                                                                {feeAmount > 0 && (
                                                                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                                                                        <span>Comisión ({txTransferFeeType === 'fixed' ? `$${feeVal.toFixed(2)}` : `${feeVal}%`}):</span>
                                                                        <span>+${feeAmount.toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between font-bold text-gray-800 dark:text-gray-200 border-t border-gray-100 dark:border-zinc-800 pt-1">
                                                                    <span>Total a salir del origen:</span>
                                                                    <span className="text-red-500">${totalDebited.toFixed(2)}</span>
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

                                <div>
                                    <button type="button" onClick={() => setShowAdvancedTx(!showAdvancedTx)} className="flex items-center justify-center gap-1 w-full py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        {showAdvancedTx ? 'Menos opciones' : 'Más opciones'} {showAdvancedTx ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showAdvancedTx && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Fecha</label>
                                                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                                <input type="text" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl" placeholder="Ej. Almuerzo con cliente" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3.5 rounded-xl font-medium shadow-sm hover:opacity-90 transition-opacity">
                                        Guardar Movimiento
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddFundsModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Recargar / Recibir Fondos</h3>
                                <button onClick={() => setShowAddFundsModal(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>

                            <p className="text-xs text-gray-500">
                                Añade fondos directamente a <strong className="text-gray-900 dark:text-white">{showAddFundsModal.accountName}</strong> para poder realizar la operación.
                            </p>

                            <form onSubmit={handleQuickAddFunds} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1">Monto a depositar ($)</label>
                                    <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} autoFocus value={addFundsAmount} onChange={e => setAddFundsAmount(e.target.value.replace(/-/g, ''))} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-bold" />
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPayCardModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                                <h3 className="text-lg font-bold">Abonar a Tarjeta de Crédito</h3>
                                <button onClick={() => setShowPayCardModal(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-[#121212] rounded-2xl space-y-1 text-xs">
                                <p><span className="text-gray-500">Tarjeta:</span> <strong>{showPayCardModal.name}</strong></p>
                                <p><span className="text-gray-500">Deuda actual:</span> <strong className="text-red-500">{formatCurrency(Math.abs(showPayCardModal.balance_cents))}</strong></p>
                            </div>

                            <form onSubmit={handlePayCreditCard} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1">Monto a abonar ($)</label>
                                    <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} autoFocus value={payCardAmount} onChange={e => setPayCardAmount(e.target.value.replace(/-/g, ''))} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-bold" />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold mb-1">Pagar desde cuenta (Débito/Efectivo)</label>
                                    <select required value={payCardFromAccountId} onChange={e => setPayCardFromAccountId(Number(e.target.value))} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                        <option value="" disabled>Selecciona cuenta de origen</option>
                                        {accounts.filter(a => a.type !== 'credit').map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance_cents)})</option>
                                        ))}
                                    </select>
                                </div>

                                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInstallmentModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
                                <h3 className="text-lg font-bold">Registrar Compra a Cuotas</h3>
                                <button onClick={() => setShowInstallmentModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleCreateInstallment} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-1">Nombre / Producto</label>
                                    <input required type="text" value={instName} onChange={e => setInstName(e.target.value)} placeholder="Ej. Smart TV, Laptop, Sofá..." className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold mb-1">Monto Total ($)</label>
                                        <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} value={instTotalAmount} onChange={e => setInstTotalAmount(e.target.value.replace(/-/g, ''))} placeholder="1200.00" className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold mb-1">Cant. Cuotas</label>
                                        <input required type="number" min="1" max="72" onKeyDown={blockNegativeKeys} value={instTotalInstallments} onChange={e => setInstTotalInstallments(e.target.value.replace(/-/g, ''))} placeholder="12" className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold mb-1">Asociar Tarjeta / Cuenta</label>
                                    <select value={instAccountId} onChange={e => setInstAccountId(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
                                        <option value="">Ninguna</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type === 'credit' ? `Crédito - Cupo Disp: ${formatCurrency((a.credit_limit_cents || 0) - Math.abs(a.balance_cents))}` : `Saldo: ${formatCurrency(a.balance_cents)}`})</option>)}
                                    </select>
                                </div>

                                {instAccountId && accounts.find(a => a.id === Number(instAccountId))?.type === 'credit' && (
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                            Interés (%) <span className="text-gray-400 font-normal">(Opcional, dejar vacío si no tiene interés)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                onKeyDown={blockNegativeKeys}
                                                placeholder="0.00 %"
                                                value={instInterestPercent}
                                                onChange={e => setInstInterestPercent(e.target.value.replace(/-/g, ''))}
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
                                        <label className="block text-xs font-semibold mb-1">Fecha de Inicio</label>
                                        <input required type="date" value={instStartDate} onChange={e => {
                                            setInstStartDate(e.target.value);
                                            if (e.target.value) {
                                                const d = e.target.value.split('-')[2];
                                                if (d) setInstPaymentDay(parseInt(d).toString());
                                            }
                                        }} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold mb-1">Día de Cobro (1-31)</label>
                                        <input required type="number" min="1" max="31" onKeyDown={blockNegativeKeys} value={instPaymentDay} onChange={e => setInstPaymentDay(e.target.value.replace(/-/g, ''))} placeholder="Ej. 15" className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowContributeModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Aportar a Meta</h3>
                                <button onClick={() => setShowContributeModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleContribute} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto a aportar</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-lg">$</span></div>
                                        <input type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} required autoFocus value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value.replace(/-/g, ''))} className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary text-lg" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Descontar de la Cuenta</label>
                                    <select required value={contributeAccountId} onChange={(e) => setContributeAccountId(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium">
                                        <option value="">Selecciona cuenta de origen</option>
                                        {accounts.filter(a => a.type !== 'credit').map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (Saldo: {formatCurrency(acc.balance_cents)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-emerald-500 text-white px-4 py-3.5 rounded-xl font-medium shadow-sm hover:bg-emerald-600 transition-colors">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPayDebtModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Abonar Préstamo / Deuda</h3>
                                <button onClick={() => setShowPayDebtModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handlePayDebtConfirm} className="space-y-4">
                                <div>
                                    <div className="text-xs text-gray-500 space-y-1 bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                                        <div>Préstamo: <strong className="text-gray-900 dark:text-white">{showPayDebtModal.name}</strong></div>
                                        <div>Monto total: <strong className="text-gray-900 dark:text-white">{formatCurrency(showPayDebtModal.amount_cents)}</strong></div>
                                        <div>Monto restante: <strong className="text-red-500">{formatCurrency(showPayDebtModal.remaining_cents)}</strong></div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-500">Monto del abono</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-400 text-sm">$</span></div>
                                        <input required type="number" step="0.01" min="0.01" onKeyDown={blockNegativeKeys} value={payDebtAmount} onChange={e => setPayDebtAmount(e.target.value.replace(/-/g, ''))} className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-500">
                                        {showPayDebtModal.type === 'OWED' ? 'Cuenta donde se deposita el cobro' : 'Cuenta de donde se descuenta el pago'}
                                    </label>
                                    <select 
                                        required
                                        value={payDebtAccountId} 
                                        onChange={e => setPayDebtAccountId(e.target.value ? Number(e.target.value) : '')} 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                                    >
                                        <option value="">Selecciona cuenta...</option>
                                        {accounts.filter(a => a.type !== 'credit').map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({formatCurrency(acc.balance_cents)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingDebt(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar Préstamo / Deuda</h3>
                                <button onClick={() => setEditingDebt(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleUpdateDebt} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-500">Nombre del Préstamo / Deudor</label>
                                    <input required type="text" value={editDebtName} onChange={e => setEditDebtName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-500">Tipo</label>
                                    <select value={editDebtType} onChange={e => setEditDebtType(e.target.value as 'OWE' | 'OWED')} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                        <option value="OWE">Yo debo (Deuda)</option>
                                        <option value="OWED">Me deben (Préstamo)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-gray-500">Monto Inicial</label>
                                        <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} value={editDebtAmount} onChange={e => setEditDebtAmount(e.target.value.replace(/-/g, ''))} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1 text-gray-500">Monto Restante</label>
                                        <input required type="number" step="0.01" min="0" onKeyDown={blockNegativeKeys} value={editDebtRemaining} onChange={e => setEditDebtRemaining(e.target.value.replace(/-/g, ''))} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-500">Fecha de Vencimiento</label>
                                    <input type="date" value={editDebtDueDate} onChange={e => setEditDebtDueDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                </div>
                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditingAccount(null)}>
                        <motion.div 
                            initial={{ opacity: 0, y: 40 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()} 
                            className="bg-white dark:bg-[#0a0a0a] rounded-t-[2rem] sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-zinc-800 max-h-[88vh] overflow-y-auto space-y-4"
                        >
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-3 cursor-grab" />
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar Cuenta / Tarjeta</h3>
                                <button type="button" onClick={() => setEditingAccount(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleUpdateAccount} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Nombre de la cuenta / tarjeta</label>
                                    <input required type="text" value={editAccountName} onChange={e => setEditAccountName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Tipo de Cuenta</label>
                                    <select value={editAccountType} onChange={e => setEditAccountType(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                        <option value="bank">Cuenta Bancaria</option>
                                        <option value="cash">Efectivo</option>
                                        <option value="credit">Tarjeta de Crédito</option>
                                        <option value="debit">Tarjeta de Débito</option>
                                        <option value="wallet">Wallet Digital</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                                        {editAccountType === 'credit' ? 'Deuda Actual Cargada en Tarjeta ($)' : 'Saldo Disponible en la Cuenta ($)'}
                                    </label>
                                    <input 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        min="0"
                                        onKeyDown={blockNegativeKeys}
                                        placeholder={editAccountType === 'credit' ? "0.00 (sin deuda)" : "0.00"} 
                                        value={editAccountBalance} 
                                        onChange={e => setEditAccountBalance(e.target.value.replace(/-/g, ''))} 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" 
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {editAccountType === 'credit' 
                                            ? "Monto que debes actualmente en la tarjeta (ingresa en positivo). 0.00 si no tienes deuda."
                                            : "Dinero real disponible actualmente en esta cuenta."}
                                    </p>
                                </div>
                                
                                {editAccountType === 'credit' && (
                                    <div className="space-y-3.5 border-t border-gray-100 dark:border-zinc-800 pt-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Límite Crédito ($)</label>
                                                <input 
                                                    required 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="0"
                                                    onKeyDown={blockNegativeKeys}
                                                    placeholder="Ej. 25000.00"
                                                    value={editAccountCreditLimit} 
                                                    onChange={e => setEditAccountCreditLimit(e.target.value.replace(/-/g, ''))} 
                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Últimos 4 dígitos</label>
                                                <input maxLength={4} type="text" placeholder="1234" value={editAccountCardNumberLast4} onChange={e => setEditAccountCardNumberLast4(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Día de Corte (1-31)</label>
                                                <input required type="number" min={1} max={31} onKeyDown={blockNegativeKeys} value={editAccountCutoffDay} onChange={e => setEditAccountCutoffDay(e.target.value.replace(/-/g, ''))} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Día de Pago (1-31)</label>
                                                <input required type="number" min={1} max={31} onKeyDown={blockNegativeKeys} value={editAccountDueDay} onChange={e => setEditAccountDueDay(e.target.value.replace(/-/g, ''))} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Color Tarjeta</label>
                                            <select value={editAccountCardColor} onChange={e => setEditAccountCardColor(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
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

                                {editAccountType === 'debit' && (
                                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Últimos 4 dígitos</label>
                                                <input maxLength={4} type="text" placeholder="1234" value={editAccountCardNumberLast4} onChange={e => setEditAccountCardNumberLast4(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Color Tarjeta</label>
                                                <select value={editAccountCardColor} onChange={e => setEditAccountCardColor(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
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
                                {['bank', 'credit', 'debit'].includes(editAccountType) && (
                                    <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowEditAccountExtras(!showEditAccountExtras)}
                                            className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 dark:bg-[#121212] rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <span className="flex items-center gap-1.5">⚙️ Opciones avanzadas (Mantenimiento / Anualidad)</span>
                                            {showEditAccountExtras ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                        </button>

                                        {showEditAccountExtras && (
                                            <div className="space-y-3 pl-1 pt-1">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-xs font-semibold text-gray-500">Mantenimiento / Anualidad</label>
                                                        <div className="flex items-center bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditAccountMaintFeeType('fixed')}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                                                    editAccountMaintFeeType === 'fixed'
                                                                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                $ Fijo
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditAccountMaintFeeType('percent')}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                                                    editAccountMaintFeeType === 'percent'
                                                                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                % Porc.
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditAccountMaintFeeType('none');
                                                                    setEditAccountMaintFeeValue('');
                                                                }}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                                                    editAccountMaintFeeType === 'none'
                                                                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {editAccountMaintFeeType !== 'none' ? (
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                                                                        {editAccountMaintFeeType === 'fixed' ? '$' : '%'}
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        onKeyDown={blockNegativeKeys}
                                                                        placeholder={editAccountMaintFeeType === 'fixed' ? "0.00" : "0.00 %"}
                                                                        value={editAccountMaintFeeValue}
                                                                        onChange={e => setEditAccountMaintFeeValue(e.target.value.replace(/-/g, ''))}
                                                                        className="w-full pl-6 pr-2 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                                                    />
                                                                </div>
                                                                <select
                                                                    value={editAccountMaintFeeFreq}
                                                                    onChange={e => setEditAccountMaintFeeFreq(e.target.value as any)}
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
                                                                    onChange={e => setEditAccountMaintFeeDate(e.target.value)}
                                                                    className="w-full px-2.5 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 pl-1">Sin cuota de mantenimiento</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCreateAccountModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, y: 40 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: 40 }} 
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()} 
                            className="bg-white dark:bg-[#0a0a0a] rounded-t-[2rem] sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[88vh] overflow-y-auto"
                        >
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-3 cursor-grab" />
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <h3 className="text-lg font-bold">Añadir Nueva Cuenta / Tarjeta</h3>
                                <button type="button" onClick={() => setShowCreateAccountModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateAccount} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1">Nombre de la Cuenta / Tarjeta</label>
                                    <input required type="text" placeholder="Ej. Visa BBVA, Nomina Banamex, Efectivo..." value={newAccountName} onChange={e=>setNewAccountName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Tipo</label>
                                        <select value={newAccountType} onChange={e=>setNewAccountType(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                            <option value="bank">Cuenta Bancaria</option>
                                            <option value="cash">Efectivo</option>
                                            <option value="wallet">Wallet Digital</option>
                                            <option value="credit">Tarjeta de Crédito</option>
                                            <option value="debit">Tarjeta de Débito</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">
                                            {newAccountType === 'credit' ? 'Deuda Actual ($)' : 'Saldo Disponible ($)'}
                                        </label>
                                        <input 
                                            required 
                                            type="number" 
                                            step="0.01" 
                                            min="0"
                                            onKeyDown={blockNegativeKeys}
                                            placeholder={newAccountType === 'credit' ? "0.00 (sin deuda)" : "0.00"} 
                                            value={newAccountBalance} 
                                            onChange={e=>setNewAccountBalance(e.target.value.replace(/-/g, ''))} 
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" 
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400">
                                    {newAccountType === 'credit' 
                                        ? "Deuda actual cargada en la tarjeta (ingresa en positivo). Si la tarjeta está sin uso ingresa 0."
                                        : "Dinero total disponible en esta cuenta."}
                                </p>

                                {(newAccountType === 'credit' || newAccountType === 'debit') && (
                                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                        {newAccountType === 'credit' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1">Límite de Crédito Total ($)</label>
                                                    <input 
                                                        required 
                                                        type="number" 
                                                        step="0.01" 
                                                        min="0"
                                                        onKeyDown={blockNegativeKeys}
                                                        placeholder="Ej. 25000.00" 
                                                        value={newAccountCreditLimit} 
                                                        onChange={e=>setNewAccountCreditLimit(e.target.value.replace(/-/g, ''))} 
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" 
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1">Día de Corte (1-31)</label>
                                                        <input type="number" min="1" max="31" onKeyDown={blockNegativeKeys} placeholder="Ej. 15" value={newAccountCutoffDay} onChange={e=>setNewAccountCutoffDay(e.target.value ? Number(e.target.value.replace(/-/g, '')) : '')} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1">Día Límite de Pago (1-31)</label>
                                                        <input type="number" min="1" max="31" onKeyDown={blockNegativeKeys} placeholder="Ej. 5" value={newAccountDueDay} onChange={e=>setNewAccountDueDay(e.target.value ? Number(e.target.value.replace(/-/g, '')) : '')} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold mb-1">Últimos 4 Dígitos</label>
                                                <input type="text" maxLength={4} placeholder="4242" value={newAccountCardLast4} onChange={e=>setNewAccountCardLast4(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold mb-1">Color de Tarjeta</label>
                                                <select value={newAccountCardColor} onChange={e=>setNewAccountCardColor(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
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
                                {['bank', 'credit', 'debit'].includes(newAccountType) && (
                                    <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowNewAccountExtras(!showNewAccountExtras)}
                                            className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 dark:bg-[#121212] rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <span className="flex items-center gap-1.5">⚙️ Opciones avanzadas (Mantenimiento / Anualidad)</span>
                                            {showNewAccountExtras ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                        </button>

                                        {showNewAccountExtras && (
                                            <div className="space-y-3 pl-1 pt-1">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="block text-xs font-semibold text-gray-500">Mantenimiento / Anualidad</label>
                                                        <div className="flex items-center bg-gray-200 dark:bg-zinc-800 rounded-lg p-0.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewAccountMaintFeeType('fixed')}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                                                    newAccountMaintFeeType === 'fixed'
                                                                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                $ Fijo
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewAccountMaintFeeType('percent')}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                                                    newAccountMaintFeeType === 'percent'
                                                                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                % Porc.
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewAccountMaintFeeType('none');
                                                                    setNewAccountMaintFeeValue('');
                                                                }}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                                                                    newAccountMaintFeeType === 'none'
                                                                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                                                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                                                }`}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {newAccountMaintFeeType !== 'none' ? (
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-xs text-gray-400 font-bold">
                                                                        {newAccountMaintFeeType === 'fixed' ? '$' : '%'}
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        onKeyDown={blockNegativeKeys}
                                                                        placeholder={newAccountMaintFeeType === 'fixed' ? "0.00" : "0.00 %"}
                                                                        value={newAccountMaintFeeValue}
                                                                        onChange={e => setNewAccountMaintFeeValue(e.target.value.replace(/-/g, ''))}
                                                                        className="w-full pl-6 pr-2 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                                                    />
                                                                </div>
                                                                <select
                                                                    value={newAccountMaintFeeFreq}
                                                                    onChange={e => setNewAccountMaintFeeFreq(e.target.value as any)}
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
                                                                    onChange={e => setNewAccountMaintFeeDate(e.target.value)}
                                                                    className="w-full px-2.5 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 pl-1">Sin cuota de mantenimiento</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreditInfoModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-indigo-500" />
                                    ¿Cómo se calcula el Balance Total?
                                </h3>
                                <button type="button" onClick={() => setShowCreditInfoModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
                                <p>
                                    <strong>1. Cuentas de Débito, Efectivo y Bancarias:</strong> Suman directamente tu dinero real disponible en positivo.
                                </p>
                                <p>
                                    <strong>2. Tarjetas de Crédito:</strong> Representan una deuda cuando registras consumos. Por defecto, su deuda se resta de tu patrimonio neto.
                                </p>
                                <p>
                                    <strong>3. Opción "Incluir crédito disponible":</strong> Al activar este interruptor, el cálculo sumará la línea de crédito que tienes libre para gastar (Límite de crédito menos tu deuda actual).
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateCategoryModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[88vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        {editingCategory ? 'Editar Categoría / Presupuesto' : 'Nueva Categoría / Presupuesto'}
                                    </h3>
                                    <p className="text-xs text-gray-500">Configura el tipo, icono y límite mensual</p>
                                </div>
                                <button type="button" onClick={() => setShowCreateCategoryModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveCategory} className="space-y-4">
                                {/* Type Selector */}
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Tipo de Categoría</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-[#121212] p-1 rounded-2xl border border-gray-200 dark:border-zinc-800">
                                        <button
                                            type="button"
                                            onClick={() => setCatType('EXPENSE')}
                                            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                                catType === 'EXPENSE'
                                                    ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                            Gasto / Presupuesto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCatType('INCOME')}
                                            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                                catType === 'INCOME'
                                                    ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                            Ingreso
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Nombre de la Categoría</label>
                                    <div className="flex gap-2">
                                        <div className="w-12 h-11 flex items-center justify-center text-xl bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl">
                                            {catEmoji || '🏷️'}
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={catName}
                                            onChange={e => setCatName(e.target.value)}
                                            placeholder="Ej. Supermercado, Transporte, Salario..."
                                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Budget Limit (for Expense Categories) */}
                                {catType === 'EXPENSE' && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Presupuesto Límite Mensual ($)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-gray-400 font-bold">$</div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                onKeyDown={blockNegativeKeys}
                                                value={catBudgetAmount}
                                                onChange={e => setCatBudgetAmount(e.target.value.replace(/-/g, ''))}
                                                placeholder="Ej. 300.00 (Opcional)"
                                                className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold outline-none text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400">
                                            Asigna un monto límite mensual para monitorear tu avance en el módulo de Presupuestos.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Seleccionar Emoji</label>
                                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 p-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-2xl max-h-40 overflow-y-auto">
                                        {['🛒', '🏠', '💡', '🚗', '⛽', '🍿', '💊', '🩺', '🎓', '✈️', '👕', '📱', '💰', '💼', '💵', '📈', '🎁', '☕', '🐾', '🏋️', '🛠️', '🍕', '🍣', '🌮', '🥗', '🍔', '🚌', '🔑', '🛋️', '📺', '🎨', '🔥', '⚡', '💧', '🔒', '📜'].map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setCatEmoji(emoji)}
                                                className={`p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl transition-all text-base flex items-center justify-center ${catEmoji === emoji ? 'bg-white dark:bg-zinc-700 shadow-sm scale-110 font-bold' : ''}`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>

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
                                        {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSetPinModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        {securityConfig?.pin_hash ? 'Cambiar PIN' : 'Crear PIN de Seguridad'}
                                    </h3>
                                    <p className="text-xs text-gray-500">Introduce 4 dígitos numéricos</p>
                                </div>
                                <button type="button" onClick={() => setShowSetPinModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveSecurityPin} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Nuevo PIN (4 dígitos)</label>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        required
                                        autoFocus
                                        value={newPinValue}
                                        onChange={e => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                                        placeholder="••••"
                                        className="w-full text-center text-2xl tracking-widest font-mono py-2.5 px-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Confirmar PIN</label>
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        required
                                        value={confirmPinValue}
                                        onChange={e => setConfirmPinValue(e.target.value.replace(/\D/g, ''))}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowDeletePinModal(false); setDeleteTargetAccountId(null); }}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 text-center">
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Confirmación de Seguridad</h3>
                                <p className="text-xs text-gray-500">Ingresa tu PIN de 4 dígitos para autorizar la eliminación de esta cuenta o tarjeta.</p>
                            </div>

                            <form onSubmit={handleConfirmDeleteAccountWithPin} className="space-y-4">
                                <div className="space-y-1">
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={4}
                                        pattern="\d{4}"
                                        autoFocus
                                        required
                                        value={deletePinInput}
                                        onChange={e => setDeletePinInput(e.target.value.replace(/\D/g, ''))}
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
                                        onClick={() => { setShowDeletePinModal(false); setDeleteTargetAccountId(null); }}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDisablePinModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4 text-center">
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Desactivar PIN</h3>
                                <p className="text-xs text-gray-500">Ingresa tu PIN actual para desactivar la protección.</p>
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
                                        onChange={e => setDisablePinInput(e.target.value.replace(/\D/g, ''))}
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

            {/* Custom Budget Breakdown Item Modal */}
            <AnimatePresence>
                {showBudgetItemModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowBudgetItemModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0c0c0c] rounded-2xl p-5 w-full max-w-sm border border-gray-200 dark:border-zinc-800 space-y-4 max-h-[85vh] overflow-y-auto">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        {editingBudgetItem ? 'Editar Desglose' : 'Añadir Desglose'}
                                    </h3>
                                    <p className="text-[11px] text-gray-500">Asigna un límite a una categoría de gasto</p>
                                </div>
                                <button type="button" onClick={() => setShowBudgetItemModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveBudgetItem} className="space-y-3.5">
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Nombre del Desglose</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={budgetItemIcon}
                                            onChange={e => setBudgetItemIcon(e.target.value)}
                                            className="w-11 text-center text-base py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl outline-none"
                                        />
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={budgetItemName}
                                            onChange={e => setBudgetItemName(e.target.value)}
                                            placeholder="Ej. Supermercado, Alquiler, Salidas..."
                                            className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Presupuesto Asignado ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        onKeyDown={blockNegativeKeys}
                                        value={budgetItemAmount}
                                        onChange={e => setBudgetItemAmount(e.target.value.replace(/-/g, ''))}
                                        placeholder="0.00"
                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold outline-none text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Vincular con Categoría (Opcional)</label>
                                    <select
                                        value={budgetItemCategoryId}
                                        onChange={e => setBudgetItemCategoryId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-gray-900 dark:text-white"
                                    >
                                        <option value="">Sin vincular (por nombre o etiqueta)</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.emoji} {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Icono Rápido</label>
                                    <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl max-h-20 overflow-y-auto">
                                        {['🛒', '🏠', '💡', '🚗', '⛽', '🍿', '💊', '🩺', '🎓', '✈️', '👕', '📱', '💰', '📈', '🎁', '☕', '🐾', '🏋️', '🛠️', '💼', '🧾'].map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setBudgetItemIcon(emoji)}
                                                className={`p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg text-sm transition-all ${budgetItemIcon === emoji ? 'bg-white dark:bg-zinc-700 shadow-xs' : ''}`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
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
                                        {editingBudgetItem ? 'Guardar Cambios' : 'Crear Desglose'}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setQuickExpenseBudgetItem(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0c0c0c] rounded-2xl p-5 w-full max-w-sm border border-gray-200 dark:border-zinc-800 space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{quickExpenseBudgetItem.icon || '🏷️'}</span>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Registrar Gasto</h3>
                                        <p className="text-[11px] text-gray-500">{quickExpenseBudgetItem.name}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setQuickExpenseBudgetItem(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleQuickExpenseToBudgetItem} className="space-y-3">
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Monto del Gasto ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        autoFocus
                                        onKeyDown={blockNegativeKeys}
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value.replace(/-/g, ''))}
                                        placeholder="0.00"
                                        className="w-full text-center text-xl font-bold py-2 px-3 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Cuenta de Pago</label>
                                    <select
                                        required
                                        value={txAccountId}
                                        onChange={e => setTxAccountId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-zinc-800 rounded-xl text-xs outline-none text-gray-900 dark:text-white"
                                    >
                                        <option value="">Seleccionar cuenta...</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.type === 'credit' ? `Deuda: ${formatCurrency(acc.balance_cents)}` : `Disponible: ${formatCurrency(acc.balance_cents)}`})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Descripción (Opcional)</label>
                                    <input
                                        type="text"
                                        value={txDescription}
                                        onChange={e => setTxDescription(e.target.value)}
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
        </div>
    );
};
