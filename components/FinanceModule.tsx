import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FinanceAccount, FinanceTransaction, FinanceCategory, FinanceBudget, FinanceRecurringTransaction, FinanceSavingsGoal, FinanceShoppingList, FinanceShoppingItem, FinanceInstallment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    PlusIcon, XIcon, ArrowRightLeft, TrendingUp, TrendingDown, EyeIcon, EyeOffIcon, 
    LayoutDashboard, ListOrdered, PieChart, CalendarDays, Settings, Trash2, Wallet, 
    CreditCard, Landmark, CheckCircle2, ChevronDown, ChevronUp, Calendar, Banknote, ShoppingCart, BarChart3, Archive,
    ChevronLeft, ChevronRight, Download, AlertTriangle, Layers, ShieldCheck, Clock, Receipt
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface FinanceModuleProps {
    onClose?: () => void;
}

type TabType = 'overview' | 'transactions' | 'budgets' | 'planning' | 'savings' | 'shopping' | 'debts' | 'stats' | 'closing' | 'settings';
type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER_OUT' | 'TRANSFER_IN';

export const FinanceModule: React.FC<FinanceModuleProps> = ({ onClose }) => {
    // --- Global State ---
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // --- Data State ---
    const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
    const [recurring, setRecurring] = useState<FinanceRecurringTransaction[]>([]);
    const [savingsGoals, setSavingsGoals] = useState<FinanceSavingsGoal[]>([]);
    const [shoppingLists, setShoppingLists] = useState<FinanceShoppingList[]>([]);
    const [shoppingItems, setShoppingItems] = useState<FinanceShoppingItem[]>([]);
    const [debts, setDebts] = useState<any[]>([]);
    const [installments, setInstallments] = useState<FinanceInstallment[]>([]);

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

    // --- Planning Sub-tab & Calendar ---
    const [planningSubTab, setPlanningSubTab] = useState<'calendar' | 'subscriptions' | 'installments'>('calendar');
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
    const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

    // --- Form States (Transaction) ---
    const [txAmount, setTxAmount] = useState('');
    const [txCategoryId, setTxCategoryId] = useState<number | ''>('');
    const [txAccountId, setTxAccountId] = useState<number | ''>('');
    const [txToAccountId, setTxToAccountId] = useState<number | ''>(''); // For transfers
    const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
    const [txDescription, setTxDescription] = useState('');

    // --- Form States (Settings/Accounts/Categories) ---
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountType, setNewAccountType] = useState('bank');
    const [newAccountBalance, setNewAccountBalance] = useState('');
    const [newAccountCreditLimit, setNewAccountCreditLimit] = useState('');
    const [newAccountCutoffDay, setNewAccountCutoffDay] = useState<number | ''>(15);
    const [newAccountDueDay, setNewAccountDueDay] = useState<number | ''>(5);
    const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
    const [newAccountCardColor, setNewAccountCardColor] = useState('slate');
    
    const [newCatName, setNewCatName] = useState('');
    const [newCatEmoji, setNewCatEmoji] = useState('💰');

    // --- Form States (Budget) ---
    const [budgetAmount, setBudgetAmount] = useState('');

    // --- Form States (Recurring) ---
    const [recAmount, setRecAmount] = useState('');
    const [recDesc, setRecDesc] = useState('');
    const [recFrequency, setRecFrequency] = useState('monthly');
    const [recNextDate, setRecNextDate] = useState(new Date().toISOString().split('T')[0]);

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

        for (const rec of due) {
            const targetAccId = rec.account_id || accountsList[0]?.id;
            if (!targetAccId) continue;

            const txAmount = rec.amount_cents;
            
            // Insert transaction
            await supabase.from('finance_transactions').insert([{
                user_id: user.id,
                account_id: targetAccId,
                type: rec.type || 'EXPENSE',
                amount_cents: txAmount,
                date: today,
                description: `Cobro recurrente: ${rec.description || 'Suscripción'}`
            }]);

            // Update Account Balance
            const currAcc = accountsList.find(a => a.id === targetAccId);
            if (currAcc) {
                const newBalance = (rec.type === 'INCOME') 
                    ? currAcc.balance_cents + txAmount 
                    : currAcc.balance_cents - txAmount;
                await supabase.from('finance_accounts').update({ balance_cents: newBalance }).eq('id', targetAccId);
                currAcc.balance_cents = newBalance; // Update in-memory for the loop
            }

            // Update Next Date
            const currentNext = new Date(rec.next_date || today);
            if (rec.frequency === 'weekly') currentNext.setDate(currentNext.getDate() + 7);
            else if (rec.frequency === 'yearly') currentNext.setFullYear(currentNext.getFullYear() + 1);
            else currentNext.setMonth(currentNext.getMonth() + 1);

            const newNextDateStr = currentNext.toISOString().split('T')[0];
            await supabase.from('finance_recurring_transactions').update({ next_date: newNextDateStr }).eq('id', rec.id);
            dataChanged = true;
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

    const fetchFinanceData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [accRes, catRes, txRes, budRes, recRes, goalsRes] = await Promise.all([
                supabase.from('finance_accounts').select('*').order('created_at'),
                supabase.from('finance_categories').select('*').order('name'),
                supabase.from('finance_transactions').select('*').order('date', { ascending: false }).limit(200),
                supabase.from('finance_budgets').select('*'),
                supabase.from('finance_recurring_transactions').select('*').order('next_date'),
                supabase.from('finance_savings_goals').select('*').order('created_at', { ascending: false })
            ]);

            if (accRes.data) setAccounts(accRes.data);
            if (catRes.data) setCategories(catRes.data);
            if (txRes.data) setTransactions(txRes.data);
            if (budRes.data) setBudgets(budRes.data);
            if (recRes.data) setRecurring(recRes.data);
            if (goalsRes.data) setSavingsGoals(goalsRes.data);

            if (recRes.data && accRes.data) {
                autoProcessDueSubscriptions(recRes.data, accRes.data);
            }

            try {
                const [listsRes, itemsRes, debtsRes, instRes] = await Promise.all([
                    supabase.from('finance_shopping_lists').select('*').order('created_at', { ascending: false }),
                    supabase.from('finance_shopping_items').select('*').order('created_at'),
                    supabase.from('finance_debts').select('*').order('created_at', { ascending: false }),
                    supabase.from('finance_installments').select('*').order('created_at', { ascending: false })
                ]);
                if (listsRes.data) setShoppingLists(listsRes.data);
                if (itemsRes.data) setShoppingItems(itemsRes.data);
                if (debtsRes.data) setDebts(debtsRes.data);
                if (instRes.data) setInstallments(instRes.data);
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
    const totalBalanceCents = accounts.reduce((acc, account) => acc + account.balance_cents, 0);
    
    const thisMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonthPrefix));
    const incomeThisMonth = thisMonthTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount_cents, 0);
    const expensesThisMonth = thisMonthTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount_cents, 0);
    
    const currentBudget = budgets.find(b => b.month === currentMonthPrefix);
    const budgetProgress = currentBudget ? Math.min(100, Math.round((expensesThisMonth / currentBudget.total_amount_cents) * 100)) : 0;

    // --- Handlers ---
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
                
                const txOut = { user_id: user.id, account_id: txAccountId, type: 'TRANSFER_OUT', amount_cents: amountCents, date: txDate, description: txDescription || 'Transferencia enviada' };
                const { data: outData } = await supabase.from('finance_transactions').insert([txOut]).select();
                
                if (outData && outData.length > 0) {
                    const txIn = { user_id: user.id, account_id: txToAccountId, type: 'TRANSFER_IN', amount_cents: amountCents, date: txDate, description: txDescription || 'Transferencia recibida', related_transfer_id: outData[0].id };
                    await supabase.from('finance_transactions').insert([txIn]);
                    
                    const fromAcc = accounts.find(a => a.id === Number(txAccountId))!;
                    const toAcc = accounts.find(a => a.id === Number(txToAccountId))!;
                    
                    await supabase.from('finance_accounts').update({ balance_cents: fromAcc.balance_cents - amountCents }).eq('id', txAccountId);
                    await supabase.from('finance_accounts').update({ balance_cents: toAcc.balance_cents + amountCents }).eq('id', txToAccountId);
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
                    ? (selectedAcc.type === 'credit' ? currentBalance + amountCents : currentBalance - amountCents)
                    : (selectedAcc.type === 'credit' ? Math.max(0, currentBalance - amountCents) : currentBalance + amountCents);

                await supabase.from('finance_accounts').update({ balance_cents: newBalance }).eq('id', txAccountId);
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

        await supabase.from('finance_accounts').update({
            balance_cents: targetAcc.balance_cents + amountCents
        }).eq('id', targetAcc.id);

        setShowAddFundsModal(null);
        setAddFundsAmount('');
        fetchFinanceData();
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
        if (fromAcc.balance_cents < amountCents) {
            return alert(`Fondos insuficientes en ${fromAcc.name}. Disponible: $${(fromAcc.balance_cents/100).toFixed(2)}.`);
        }

        const cardAcc = showPayCardModal;

        await supabase.from('finance_transactions').insert([{
            user_id: user.id,
            account_id: fromAcc.id,
            type: 'EXPENSE',
            amount_cents: amountCents,
            date: new Date().toISOString().split('T')[0],
            description: `Abono a tarjeta de crédito: ${cardAcc.name}`
        }]);

        await supabase.from('finance_accounts').update({
            balance_cents: fromAcc.balance_cents - amountCents
        }).eq('id', fromAcc.id);

        const newCardBalance = Math.max(0, cardAcc.balance_cents - amountCents);
        await supabase.from('finance_accounts').update({
            balance_cents: newCardBalance
        }).eq('id', cardAcc.id);

        setShowPayCardModal(null);
        setPayCardAmount('');
        setPayCardFromAccountId('');
        fetchFinanceData();
    };

    const handleCreateInstallment = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !instName.trim() || !instTotalAmount) return;

        try {
            const totalCents = Math.round(parseFloat(instTotalAmount) * 100);
            const totalInst = Math.max(1, parseInt(instTotalInstallments) || 1);
            const instAmountCents = Math.round(totalCents / totalInst);
            const startDate = instStartDate || new Date().toISOString().split('T')[0];
            const startMonth = startDate.substring(0, 7);

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
                status: 'ACTIVE'
            }]);

            if (error && error.message && error.message.includes('start_month')) {
                console.log("start_month column not found, retrying insertion without start_month");
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
            : targetAcc.balance_cents - inst.installment_amount_cents;

        await supabase.from('finance_accounts').update({ balance_cents: newBal }).eq('id', targetAcc.id);
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

        await supabase.from('finance_accounts').update({ balance_cents: newBalance }).eq('id', account_id);
        await supabase.from('finance_transactions').delete().eq('id', id);
        fetchFinanceData();
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
            const { error } = await supabase.from('finance_accounts').insert([{
                user_id: user.id,
                name: newAccountName,
                type: newAccountType,
                balance_cents: Math.round(parseFloat(newAccountBalance || '0') * 100),
                credit_limit_cents: newAccountType === 'credit' && newAccountCreditLimit ? Math.round(parseFloat(newAccountCreditLimit) * 100) : null,
                cutoff_day: newAccountType === 'credit' ? (Number(newAccountCutoffDay) || 15) : null,
                due_day: newAccountType === 'credit' ? (Number(newAccountDueDay) || 5) : null,
                card_number_last4: (newAccountType === 'credit' || newAccountType === 'debit') ? newAccountCardLast4 : null,
                card_color: (newAccountType === 'credit' || newAccountType === 'debit') ? newAccountCardColor : 'slate'
            }]);

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
        if (!confirm('¿Eliminar esta cuenta? Se eliminarán también sus movimientos.')) return;
        await supabase.from('finance_accounts').delete().eq('id', id);
        fetchFinanceData();
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('finance_categories').insert([{ user_id: user.id, name: newCatName, emoji: newCatEmoji }]);
        setNewCatName(''); setNewCatEmoji('💰');
        fetchFinanceData();
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('¿Eliminar esta categoría?')) return;
        await supabase.from('finance_categories').delete().eq('id', id);
        fetchFinanceData();
    };

    const handleSetBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(budgetAmount) * 100);
        
        if (currentBudget) {
            await supabase.from('finance_budgets').update({ total_amount_cents: amountCents }).eq('id', currentBudget.id);
        } else {
            await supabase.from('finance_budgets').insert([{ user_id: user.id, month: currentMonthPrefix, total_amount_cents: amountCents }]);
        }
        setBudgetAmount('');
        fetchFinanceData();
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
            next_date: recNextDate
        }]);
        setRecAmount(''); setRecDesc('');
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
                : currAcc.balance_cents - rec.amount_cents;
            await supabase.from('finance_accounts').update({ balance_cents: newBalance }).eq('id', targetAccId);
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
            balance_cents: targetAcc.balance_cents - amountCents
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
                    ? targetAcc.balance_cents - amountCents 
                    : targetAcc.balance_cents + amountCents;

                await supabase.from('finance_transactions').insert([{
                    user_id: user.id,
                    account_id: targetAcc.id,
                    type: txType,
                    amount_cents: amountCents,
                    date: new Date().toISOString().split('T')[0],
                    description: `${isOwe ? 'Abono a deuda' : 'Cobro de préstamo'}: ${debt.name}`
                }]);

                await supabase.from('finance_accounts').update({ balance_cents: newBalance }).eq('id', targetAcc.id);
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

    const resetTxForm = () => {
        setTxAmount(''); setTxDescription(''); setTxCategoryId(''); setTxAccountId(''); setTxToAccountId(''); 
        setTxDate(new Date().toISOString().split('T')[0]); setShowAdvancedTx(false);
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
                    {renderTabs()}

                    {isLoading ? (
                        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div></div>
                    ) : (
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
                                        <div className="md:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 shadow-sm">
                                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Balance Total</h2>
                                            <div className="flex items-center gap-3">
                                                <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                    {formatCurrency(totalBalanceCents)}
                                                </div>
                                                <button 
                                                    onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                    title={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
                                                >
                                                    {isPrivacyMode ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                </button>
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

                            {/* BUDGETS TAB */}
                            {activeTab === 'budgets' && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold mb-2">Presupuesto Mensual</h2>
                                        <p className="text-gray-500">{currentMonthName}</p>
                                    </div>

                                    <div className="bg-white dark:bg-[#0a0a0a] p-8 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                        <form onSubmit={handleSetBudget} className="flex gap-4 items-end mb-8">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto del presupuesto</label>
                                                <input type="number" step="0.01" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder={currentBudget ? (currentBudget.total_amount_cents/100).toString() : "0.00"} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl" />
                                            </div>
                                            <button type="submit" className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-dark">
                                                {currentBudget ? 'Actualizar' : 'Crear'}
                                            </button>
                                        </form>

                                        {currentBudget && (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Progreso actual</p>
                                                        <p className="text-3xl font-bold">{formatCurrency(expensesThisMonth)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-500">De un total de</p>
                                                        <p className="text-xl font-medium text-gray-400">{formatCurrency(currentBudget.total_amount_cents)}</p>
                                                    </div>
                                                </div>
                                                <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${budgetProgress > 90 ? 'bg-red-500' : budgetProgress > 75 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${budgetProgress}%` }}></div>
                                                </div>
                                                <p className="text-center text-sm font-medium text-gray-500">
                                                    Quedan {formatCurrency(currentBudget.total_amount_cents - expensesThisMonth)} disponibles
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PLANNING TAB */}
                            {activeTab === 'planning' && (
                                <div className="space-y-6">
                                    {/* Planning Sub-nav */}
                                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl max-w-md">
                                        <button
                                            onClick={() => setPlanningSubTab('calendar')}
                                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${planningSubTab === 'calendar' ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                                        >
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            Calendario de Pagos
                                        </button>
                                        <button
                                            onClick={() => setPlanningSubTab('subscriptions')}
                                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${planningSubTab === 'subscriptions' ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                                        >
                                            <Calendar className="w-3.5 h-3.5" />
                                            Suscripciones ({recurring.length})
                                        </button>
                                        <button
                                            onClick={() => setPlanningSubTab('installments')}
                                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${planningSubTab === 'installments' ? 'bg-white dark:bg-[#0a0a0a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
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
                                                                <button
                                                                    onClick={() => handleProcessRecurring(r)}
                                                                    className="w-full text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-1.5 rounded-lg font-medium hover:opacity-90"
                                                                >
                                                                    Procesar Pago Ahora
                                                                </button>
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
                                                                <button
                                                                    onClick={() => handlePayInstallment(inst)}
                                                                    className="w-full text-xs bg-indigo-600 text-white py-1.5 rounded-lg font-medium hover:bg-indigo-700"
                                                                >
                                                                    Pagar Cuota
                                                                </button>
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
                                                            <input required type="number" step="0.01" value={recAmount} onChange={e => setRecAmount(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
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
                                                    <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">Añadir recurrente</button>
                                                </form>
                                            </div>

                                            <div className="lg:col-span-8">
                                                <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Suscripciones Registradas</h3>
                                                <div className="space-y-2.5">
                                                    {recurring.length === 0 ? (
                                                        <p className="text-gray-500 text-xs py-4">No hay suscripciones activas.</p>
                                                    ) : recurring.map(r => (
                                                        <div key={r.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#0a0a0a] border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:border-gray-200 dark:hover:border-zinc-700 transition-all">
                                                            <div className="flex items-center gap-3.5 min-w-0">
                                                                <div className="p-2 bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 rounded-xl">
                                                                    <Receipt className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{r.description}</p>
                                                                    <p className="text-xs text-gray-400">Próximo cobro: {r.next_date} • {r.frequency === 'monthly' ? 'Mensual' : r.frequency === 'yearly' ? 'Anual' : 'Semanal'}</p>
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
                                                    ))}
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
                                                                            {targetAcc ? `Tarjeta/Cuenta: ${targetAcc.name}` : 'Sin cuenta asignada'} • Inicio: {inst.start_date}
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

                                                                {inst.status === 'ACTIVE' && (
                                                                    <button
                                                                        onClick={() => handlePayInstallment(inst)}
                                                                        className="w-full bg-gray-950 hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-zinc-100 text-white py-2 rounded-xl font-semibold text-xs transition-colors"
                                                                    >
                                                                        Pagar Cuota ({formatCurrency(inst.installment_amount_cents)})
                                                                    </button>
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
                                                        <input required type="number" step="0.01" value={goalTargetAmount} onChange={e => setGoalTargetAmount(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
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
                                                    setActiveTab('settings');
                                                    setNewAccountType('credit');
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
                                                                    <div className="flex items-center gap-4 shrink-0">
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] text-gray-400 font-medium">Restante</p>
                                                                            <p className="font-bold text-sm text-gray-950 dark:text-white">{formatCurrency(debt.remaining_cents)}</p>
                                                                        </div>
                                                                        <button 
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
                                                                                onClick={() => setShowPayDebtModal(debt.id)} 
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
                                                            <input required type="number" step="0.01" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white" />
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
                            {activeTab === 'stats' && (
                                <div className="space-y-8">
                                    <h2 className="text-xl font-bold">Estadísticas y Análisis</h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                            <h3 className="text-lg font-semibold mb-6 text-center">Gastos por Categoría</h3>
                                            <div className="h-64">
                                                {transactions.filter(t => t.type === 'EXPENSE').length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RechartsPieChart>
                                                            <Pie
                                                                data={Object.entries(
                                                                    transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => {
                                                                        const cat = categories.find(c => c.id === t.category_id)?.name || 'Otros';
                                                                        acc[cat] = (acc[cat] || 0) + (t.amount_cents / 100);
                                                                        return acc;
                                                                    }, {} as Record<string, number>)
                                                                ).map(([name, value]) => ({ name, value }))}
                                                                cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value"
                                                            >
                                                                {Object.keys(transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => {
                                                                        const cat = categories.find(c => c.id === t.category_id)?.name || 'Otros';
                                                                        acc[cat] = (acc[cat] || 0) + (t.amount_cents / 100);
                                                                        return acc;
                                                                    }, {} as Record<string, number>)).map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                                                            <Legend />
                                                        </RechartsPieChart>
                                                    </ResponsiveContainer>
                                                ) : <p className="text-center text-gray-500 mt-20">No hay suficientes datos</p>}
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-[#0a0a0a] p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                            <h3 className="text-lg font-semibold mb-6 text-center">Flujo de Caja (Últimos meses)</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={Array.from({length: 4}).map((_, i) => {
                                                            const d = new Date();
                                                            d.setMonth(d.getMonth() - (3 - i));
                                                            const prefix = d.toISOString().substring(0, 7);
                                                            const mTx = transactions.filter(t => t.date.startsWith(prefix));
                                                            return {
                                                                name: d.toLocaleString('es-ES', { month: 'short' }),
                                                                Ingresos: mTx.filter(t => t.type === 'INCOME').reduce((a, b) => a + (b.amount_cents/100), 0),
                                                                Gastos: mTx.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + (b.amount_cents/100), 0)
                                                            }
                                                        })}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                                        <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                                                        <Legend />
                                                        <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                                                <p className="text-[10px] text-gray-500 uppercase font-bold">{acc.type}</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{formatCurrency(acc.balance_cents)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <form onSubmit={handleCreateAccount} className="bg-gray-50 dark:bg-[#121212] p-5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 space-y-4">
                                                <h4 className="text-sm font-bold">Añadir Nueva Cuenta / Tarjeta</h4>
                                                <div>
                                                    <label className="block text-xs font-semibold mb-1">Nombre</label>
                                                    <input required type="text" placeholder="Ej. Visa Santander, Banco Principal..." value={newAccountName} onChange={e=>setNewAccountName(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-semibold mb-1">Tipo</label>
                                                        <select value={newAccountType} onChange={e=>setNewAccountType(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                                            <option value="bank">Cuenta Bancaria</option>
                                                            <option value="cash">Efectivo</option>
                                                            <option value="wallet">Wallet Digital</option>
                                                            <option value="credit">Tarjeta de Crédito</option>
                                                            <option value="debit">Tarjeta de Débito</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-semibold mb-1">Saldo / Deuda Inicial</label>
                                                        <input required type="number" step="0.01" placeholder="0.00" value={newAccountBalance} onChange={e=>setNewAccountBalance(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                    </div>
                                                </div>

                                                {/* Card Specific Fields (Credit & Debit) */}
                                                {(newAccountType === 'credit' || newAccountType === 'debit') && (
                                                    <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-zinc-800">
                                                        {newAccountType === 'credit' && (
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="block text-xs font-semibold mb-1">Límite de Crédito ($)</label>
                                                                    <input required type="number" step="0.01" placeholder="Ej. 2000.00" value={newAccountCreditLimit} onChange={e=>setNewAccountCreditLimit(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <label className="block text-xs font-semibold mb-1">Día de Corte (1-31)</label>
                                                                        <input type="number" min="1" max="31" placeholder="Ej. 15" value={newAccountCutoffDay} onChange={e=>setNewAccountCutoffDay(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="block text-xs font-semibold mb-1">Día Límite de Pago (1-31)</label>
                                                                        <input type="number" min="1" max="31" placeholder="Ej. 5" value={newAccountDueDay} onChange={e=>setNewAccountDueDay(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-semibold mb-1">Últimos 4 Dígitos</label>
                                                                <input type="text" maxLength={4} placeholder="4242" value={newAccountCardLast4} onChange={e=>setNewAccountCardLast4(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-semibold mb-1">Color de la Tarjeta</label>
                                                                <select value={newAccountCardColor} onChange={e=>setNewAccountCardColor(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
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

                                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">Guardar Cuenta</button>
                                            </form>
                                        </div>

                                        {/* CATEGORIES */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-zinc-800 pb-2">Categorías</h3>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {categories.map(cat => (
                                                    <span key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full text-sm font-medium">
                                                        {cat.emoji} {cat.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <form onSubmit={handleCreateCategory} className="bg-gray-50 dark:bg-[#121212] p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-3">
                                                <h4 className="text-sm font-medium mb-2">Añadir categoría</h4>
                                                <div className="flex gap-2">
                                                    <input required type="text" placeholder="🍔" value={newCatEmoji} onChange={e=>setNewCatEmoji(e.target.value)} className="w-16 text-center px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg text-sm" />
                                                    <input required type="text" placeholder="Nombre (Alimentación...)" value={newCatName} onChange={e=>setNewCatName(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-zinc-800 rounded-lg text-sm" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Guardar Categoría</button>
                                            </form>
                                        </div>

                                    </div>
                                </div>
                            )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Quick Add Modal */}
            <AnimatePresence>
                {showTxModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTxModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800">
                            
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Registrar {txType === 'EXPENSE' ? 'Gasto' : txType === 'INCOME' ? 'Ingreso' : 'Transferencia'}</h3>
                                <button onClick={() => setShowTxModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleAddTransaction} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-lg">$</span></div>
                                        <input type="number" step="0.01" required autoFocus value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary text-lg" placeholder="0.00" />
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
                                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Desde</label>
                                            <select required value={txAccountId} onChange={(e) => setTxAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                                <option value="" disabled>Origen</option>
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Hacia</label>
                                            <select required value={txToAccountId} onChange={(e) => setTxToAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                                <option value="" disabled>Destino</option>
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                            </select>
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
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
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
                                    <input required type="number" step="0.01" autoFocus value={addFundsAmount} onChange={e => setAddFundsAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-bold" />
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
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
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
                                    <input required type="number" step="0.01" autoFocus value={payCardAmount} onChange={e => setPayCardAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-bold" />
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
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
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
                                        <input required type="number" step="0.01" value={instTotalAmount} onChange={e => setInstTotalAmount(e.target.value)} placeholder="1200.00" className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold mb-1">Cant. Cuotas</label>
                                        <input required type="number" min="1" max="72" value={instTotalInstallments} onChange={e => setInstTotalInstallments(e.target.value)} placeholder="12" className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold mb-1">Asociar Tarjeta / Cuenta</label>
                                        <select value={instAccountId} onChange={e => setInstAccountId(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm">
                                            <option value="">Ninguna</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold mb-1">Fecha de Inicio</label>
                                        <input required type="date" value={instStartDate} onChange={e => setInstStartDate(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl text-sm" />
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
                                        <input type="number" step="0.01" required autoFocus value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary text-lg" placeholder="0.00" />
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
        </div>
    );
};
