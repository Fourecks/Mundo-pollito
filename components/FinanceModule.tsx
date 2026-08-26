import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { FinanceAccount, FinanceTransaction, FinanceCategory, FinanceBudget, FinanceRecurringTransaction, FinanceSavingsGoal, FinanceShoppingList, FinanceShoppingItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    PlusIcon, XIcon, ArrowRightLeft, TrendingUp, TrendingDown, EyeIcon, EyeOffIcon, 
    LayoutDashboard, ListOrdered, PieChart, CalendarDays, Settings, Trash2, Wallet, 
    CreditCard, Landmark, CheckCircle2, ChevronDown, ChevronUp, Calendar, Banknote, ShoppingCart, BarChart3, Archive
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

    // --- Filters (Transactions) ---
    const [txFilterSearch, setTxFilterSearch] = useState('');
    const [txFilterType, setTxFilterType] = useState<TransactionType | 'ALL'>('ALL');
    const [txFilterAccount, setTxFilterAccount] = useState<number | 'ALL'>('ALL');

    // --- Modal States ---
    const [showTxModal, setShowTxModal] = useState(false);
    const [txType, setTxType] = useState<TransactionType>('EXPENSE');
    const [showAdvancedTx, setShowAdvancedTx] = useState(false);
    
    const [showContributeModal, setShowContributeModal] = useState<number | null>(null);
    const [contributeAmount, setContributeAmount] = useState('');

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

            try {
                const [listsRes, itemsRes, debtsRes] = await Promise.all([
                    supabase.from('finance_shopping_lists').select('*').order('created_at', { ascending: false }),
                    supabase.from('finance_shopping_items').select('*').order('created_at'),
                    supabase.from('finance_debts').select('*').order('created_at', { ascending: false })
                ]);
                if (listsRes.data) setShoppingLists(listsRes.data);
                if (itemsRes.data) setShoppingItems(itemsRes.data);
                if (debtsRes.data) setDebts(debtsRes.data);
            } catch (err) {
                console.log('Shopping lists or debts not ready yet', err);
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

        const amountCents = Math.round(parseFloat(txAmount) * 100);
        
        try {
            if (txType === 'TRANSFER_OUT') {
                if (!txAccountId || !txToAccountId) return alert("Selecciona cuenta de origen y destino");
                
                // 1. Create OUT
                const txOut = { user_id: user.id, account_id: txAccountId, type: 'TRANSFER_OUT', amount_cents: amountCents, date: txDate, description: txDescription || 'Transferencia enviada' };
                const { data: outData } = await supabase.from('finance_transactions').insert([txOut]).select();
                
                if (outData && outData.length > 0) {
                    // 2. Create IN
                    const txIn = { user_id: user.id, account_id: txToAccountId, type: 'TRANSFER_IN', amount_cents: amountCents, date: txDate, description: txDescription || 'Transferencia recibida', related_transfer_id: outData[0].id };
                    await supabase.from('finance_transactions').insert([txIn]);
                    
                    // 3. Update balances
                    await supabase.from('finance_accounts').update({ balance_cents: accounts.find(a => a.id === Number(txAccountId))!.balance_cents - amountCents }).eq('id', txAccountId);
                    await supabase.from('finance_accounts').update({ balance_cents: accounts.find(a => a.id === Number(txToAccountId))!.balance_cents + amountCents }).eq('id', txToAccountId);
                }
            } else {
                // Regular Income / Expense
                if (!txAccountId) return alert("Selecciona una cuenta");
                
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
                
                // Update balance
                const currentBalance = accounts.find(a => a.id === Number(txAccountId))?.balance_cents || 0;
                const newBalance = txType === 'EXPENSE' ? currentBalance - amountCents : currentBalance + amountCents;
                await supabase.from('finance_accounts').update({ balance_cents: newBalance }).eq('id', txAccountId);
            }

            fetchFinanceData();
            setShowTxModal(false);
            resetTxForm();
        } catch (error) {
            console.error("Error saving transaction", error);
        }
    };

    const handleDeleteTransaction = async (id: number, type: string, amount_cents: number, account_id: number) => {
        if (!confirm('¿Eliminar este movimiento? Se ajustará el saldo de la cuenta.')) return;
        
        // Reverse balance
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
        
        await supabase.from('finance_accounts').insert([{
            user_id: user.id,
            name: newAccountName,
            type: newAccountType,
            balance_cents: Math.round(parseFloat(newAccountBalance || '0') * 100)
        }]);
        setNewAccountName(''); setNewAccountBalance('');
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

    const handleContribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showContributeModal) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const amountCents = Math.round(parseFloat(contributeAmount) * 100);
        
        await supabase.from('finance_savings_contributions').insert([{
            user_id: user.id,
            goal_id: showContributeModal,
            amount_cents: amountCents,
            date: new Date().toISOString().split('T')[0]
        }]);

        const goal = savingsGoals.find(g => g.id === showContributeModal);
        if (goal) {
            await supabase.from('finance_savings_goals').update({
                current_amount_cents: goal.current_amount_cents + amountCents
            }).eq('id', goal.id);
        }

        setContributeAmount('');
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

    const handlePayDebt = async (debtId: number, currentRemaining: number) => {
        const amountStr = prompt('¿Cuánto deseas registrar como pagado/abonado?');
        if (!amountStr) return;
        const amountCents = Math.round(parseFloat(amountStr) * 100);
        if (isNaN(amountCents) || amountCents <= 0) return alert('Monto inválido');

        const newRemaining = Math.max(0, currentRemaining - amountCents);
        await supabase.from('finance_debts').update({ remaining_cents: newRemaining }).eq('id', debtId);
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
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl mb-6 overflow-x-auto hide-scrollbar">
            {[
                { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                { id: 'transactions', icon: ListOrdered, label: 'Movimientos' },
                { id: 'budgets', icon: PieChart, label: 'Presupuestos' },
                { id: 'planning', icon: CalendarDays, label: 'Planificación' },
                { id: 'savings', icon: CheckCircle2, label: 'Metas' },
                { id: 'shopping', icon: ShoppingCart, label: 'Compras' },
                { id: 'stats', icon: BarChart3, label: 'Estadísticas' },
                { id: 'closing', icon: Archive, label: 'Cierre Mensual' },
                { id: 'settings', icon: Settings, label: 'Ajustes' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-3">
                    <Wallet className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Finanzas</h1>
                    <button 
                        onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                        className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={isPrivacyMode ? "Mostrar montos" : "Ocultar montos"}
                    >
                        {isPrivacyMode ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto">
                    {renderTabs()}

                    {isLoading ? (
                        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                    ) : (
                        <>
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Balance Total</h2>
                                            <div className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                {formatCurrency(totalBalanceCents)}
                                            </div>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                            <h2 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" /> Ingresos mes
                                            </h2>
                                            <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                                                {formatCurrency(incomeThisMonth)}
                                            </div>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                            <h2 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
                                                <TrendingDown className="w-4 h-4" /> Gastos mes
                                            </h2>
                                            <div className="text-2xl font-semibold text-red-700 dark:text-red-300">
                                                {formatCurrency(expensesThisMonth)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-4">
                                        <button onClick={() => { setTxType('EXPENSE'); setShowTxModal(true); }} className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm">
                                            <TrendingDown className="w-5 h-5" /> Gasto
                                        </button>
                                        <button onClick={() => { setTxType('INCOME'); setShowTxModal(true); }} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-700">
                                            <TrendingUp className="w-5 h-5" /> Ingreso
                                        </button>
                                        <button onClick={() => { setTxType('TRANSFER_OUT'); setShowTxModal(true); }} className="flex-1 hidden sm:flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-700">
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
                                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                                    {transactions.slice(0, 5).map(tx => (
                                                        <div key={tx.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'EXPENSE' ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : tx.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'}`}>
                                                                    {tx.type === 'EXPENSE' ? <TrendingDown className="w-5 h-5" /> : tx.type === 'INCOME' ? <TrendingUp className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5"/>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium">{tx.description || categories.find(c => c.id === tx.category_id)?.name || 'Movimiento'}</div>
                                                                    <div className="text-xs text-gray-500">{accounts.find(a => a.id === tx.account_id)?.name} • {tx.date}</div>
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
                                            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                                                {currentBudget ? (
                                                    <>
                                                        <div className="flex justify-between text-sm mb-2">
                                                            <span className="text-gray-500">Gastado</span>
                                                            <span className="font-medium">{formatCurrency(expensesThisMonth)} / {formatCurrency(currentBudget.total_amount_cents)}</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                                                            <div className={`h-full rounded-full ${budgetProgress > 90 ? 'bg-red-500' : budgetProgress > 75 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${budgetProgress}%` }}></div>
                                                        </div>
                                                        <p className="text-xs text-right text-gray-500">{budgetProgress}% utilizado</p>
                                                    </>
                                                ) : (
                                                    <div className="text-center">
                                                        <p className="text-sm text-gray-500 mb-3">No has definido un presupuesto para este mes.</p>
                                                        <button onClick={() => setActiveTab('budgets')} className="text-primary text-sm font-medium hover:underline">Crear presupuesto</button>
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
                                    <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar descripción..." 
                                            value={txFilterSearch}
                                            onChange={(e) => setTxFilterSearch(e.target.value)}
                                            className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                                        />
                                        <select 
                                            value={txFilterType} 
                                            onChange={(e) => setTxFilterType(e.target.value as any)}
                                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="ALL">Todos los tipos</option>
                                            <option value="EXPENSE">Gastos</option>
                                            <option value="INCOME">Ingresos</option>
                                            <option value="TRANSFER_OUT">Transferencias</option>
                                        </select>
                                        <select 
                                            value={txFilterAccount} 
                                            onChange={(e) => setTxFilterAccount(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="ALL">Todas las cuentas</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                        {transactions
                                            .filter(tx => {
                                                if (txFilterType !== 'ALL' && tx.type !== txFilterType) return false;
                                                if (txFilterAccount !== 'ALL' && tx.account_id !== txFilterAccount) return false;
                                                if (txFilterSearch && !tx.description?.toLowerCase().includes(txFilterSearch.toLowerCase())) return false;
                                                return true;
                                            })
                                            .map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 group">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-2xl w-8 text-center">{categories.find(c => c.id === tx.category_id)?.emoji || '💸'}</div>
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

                                    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                        <form onSubmit={handleSetBudget} className="flex gap-4 items-end mb-8">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto del presupuesto</label>
                                                <input type="number" step="0.01" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder={currentBudget ? (currentBudget.total_amount_cents/100).toString() : "0.00"} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
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
                                                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
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
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Recurring Form */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Añadir Suscripción / Pago</h3>
                                            <form onSubmit={handleCreateRecurring} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                                                <div>
                                                    <label className="block text-sm mb-1">Descripción</label>
                                                    <input required type="text" value={recDesc} onChange={e => setRecDesc(e.target.value)} placeholder="Netflix, Gimnasio..." className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <label className="block text-sm mb-1">Monto</label>
                                                        <input required type="number" step="0.01" value={recAmount} onChange={e => setRecAmount(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm mb-1">Frecuencia</label>
                                                        <select value={recFrequency} onChange={e => setRecFrequency(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                            <option value="monthly">Mensual</option>
                                                            <option value="yearly">Anual</option>
                                                            <option value="weekly">Semanal</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm mb-1">Próximo cobro</label>
                                                    <input required type="date" value={recNextDate} onChange={e => setRecNextDate(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-medium">Añadir recurrente</button>
                                            </form>
                                        </div>

                                        {/* Upcoming List */}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4">Próximos Pagos</h3>
                                            <div className="space-y-3">
                                                {recurring.length === 0 ? <p className="text-gray-500">No hay pagos programados.</p> : recurring.map(r => (
                                                    <div key={r.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
                                                        <div className="flex items-center gap-3">
                                                            <Calendar className="w-5 h-5 text-gray-400" />
                                                            <div>
                                                                <p className="font-medium">{r.description}</p>
                                                                <p className="text-xs text-gray-500">Se cobra el {r.next_date}</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-semibold text-red-500">-{formatCurrency(r.amount_cents)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SAVINGS TAB */}
                            {activeTab === 'savings' && (
                                <div className="space-y-8">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-xl font-bold">Metas de Ahorro</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Goals List */}
                                        <div className="md:col-span-2 space-y-4">
                                            {savingsGoals.length === 0 ? (
                                                <p className="text-gray-500">No hay metas de ahorro activas.</p>
                                            ) : (
                                                savingsGoals.map(goal => {
                                                    const progress = Math.min(100, Math.round((goal.current_amount_cents / goal.target_amount_cents) * 100));
                                                    return (
                                                        <div key={goal.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <h3 className="font-semibold text-lg">{goal.name}</h3>
                                                                    {goal.target_date && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" /> Meta para: {goal.target_date}</p>}
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(goal.current_amount_cents)}</p>
                                                                    <p className="text-xs text-gray-500">de {formatCurrency(goal.target_amount_cents)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                                                                <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-4">
                                                                <p className="text-xs text-gray-500 font-medium">{progress}% completado</p>
                                                                <button onClick={() => setShowContributeModal(goal.id)} className="text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors">Aportar</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {/* Create Goal Form */}
                                        <div>
                                            <form onSubmit={handleCreateSavingsGoal} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 sticky top-6">
                                                <h3 className="font-semibold text-lg mb-4">Nueva Meta</h3>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Nombre</label>
                                                    <input required type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Ej. Viaje a Japón" className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Monto Objetivo</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500">$</span></div>
                                                        <input required type="number" step="0.01" value={goalTargetAmount} onChange={e => setGoalTargetAmount(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Fecha límite (Opcional)</label>
                                                    <input type="date" value={goalTargetDate} onChange={e => setGoalTargetDate(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-medium hover:opacity-90">Crear Meta</button>
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
                                                        <div key={list.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
                                                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800/50 pb-3">
                                                                <h3 className="font-semibold text-lg">{list.name}</h3>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm text-gray-500 font-medium">{completed} / {total}</span>
                                                                    <button onClick={() => handleDeleteShoppingList(list.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
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
                                                                <input type="text" value={newItemNames[list.id] || ''} onChange={e => setNewItemNames(prev => ({ ...prev, [list.id]: e.target.value }))} placeholder="Añadir artículo..." className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                                <button type="submit" className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium">Añadir</button>
                                                            </form>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                        <div>
                                            <form onSubmit={handleCreateShoppingList} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 sticky top-6">
                                                <h3 className="font-semibold text-lg mb-4">Nueva Lista</h3>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Nombre</label>
                                                    <input required type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ej. Supermercado" className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-medium hover:opacity-90">Crear Lista</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DEBTS TAB */}
                            {activeTab === 'debts' && (
                                <div className="space-y-8">
                                    <h2 className="text-xl font-bold">Préstamos y Deudas</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2 space-y-4">
                                            {debts.length === 0 ? (
                                                <p className="text-gray-500">No hay deudas registradas.</p>
                                            ) : (
                                                debts.map(debt => {
                                                    const isOwed = debt.type === 'OWED';
                                                    const progress = Math.min(100, Math.round(((debt.amount_cents - debt.remaining_cents) / debt.amount_cents) * 100));
                                                    
                                                    return (
                                                        <div key={debt.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isOwed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {isOwed ? 'Me deben' : 'Debo'}
                                                                        </span>
                                                                        <h3 className="font-semibold text-lg">{debt.name}</h3>
                                                                    </div>
                                                                    {debt.due_date && <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Vence: {debt.due_date}</p>}
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-right">
                                                                        <p className="text-xs text-gray-500">Restante</p>
                                                                        <p className={`font-bold text-lg ${isOwed ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(debt.remaining_cents)}</p>
                                                                    </div>
                                                                    <button onClick={() => handleDeleteDebt(debt.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
                                                                <span>{formatCurrency(debt.amount_cents - debt.remaining_cents)} pagado</span>
                                                                <span>Total: {formatCurrency(debt.amount_cents)}</span>
                                                            </div>
                                                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                                                                <div className={`h-full rounded-full transition-all duration-500 ${isOwed ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                            
                                                            {debt.remaining_cents > 0 && (
                                                                <button onClick={() => handlePayDebt(debt.id, debt.remaining_cents)} className="text-sm w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-lg font-medium transition-colors">
                                                                    Registrar {isOwed ? 'Cobro' : 'Pago'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div>
                                            <form onSubmit={handleAddDebt} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 sticky top-6">
                                                <h3 className="font-semibold text-lg mb-4">Nuevo Registro</h3>
                                                
                                                <div className="flex gap-2 p-1 bg-gray-200 dark:bg-gray-700/50 rounded-lg">
                                                    <button type="button" onClick={() => setDebtType('OWE')} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${debtType === 'OWE' ? 'bg-white dark:bg-gray-800 shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-900'}`}>Yo debo</button>
                                                    <button type="button" onClick={() => setDebtType('OWED')} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${debtType === 'OWED' ? 'bg-white dark:bg-gray-800 shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-900'}`}>Me deben</button>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Nombre/Persona</label>
                                                    <input required type="text" value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Monto Total</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500">$</span></div>
                                                        <input required type="number" step="0.01" value={debtAmount} onChange={e => setDebtAmount(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Fecha límite (Opcional)</label>
                                                    <input type="date" value={debtDueDate} onChange={e => setDebtDueDate(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-medium hover:opacity-90">Guardar</button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STATS TAB */}
                            {activeTab === 'stats' && (
                                <div className="space-y-8">
                                    <h2 className="text-xl font-bold">Estadísticas y Análisis</h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
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

                                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
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
                                <div className="space-y-8 max-w-3xl mx-auto">
                                    <h2 className="text-xl font-bold text-center">Cierre Mensual</h2>
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-sm text-center">
                                        <Archive className="w-12 h-12 text-primary mx-auto mb-4 opacity-80" />
                                        <h3 className="text-2xl font-semibold mb-2">
                                            {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                                        </h3>
                                        <p className="text-gray-500 mb-8">Resumen de tu desempeño financiero en el mes actual.</p>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-sm text-gray-500 font-medium mb-1">Ingresos Totales</p>
                                                <p className="text-xl font-bold text-emerald-600">{formatCurrency(incomeThisMonth)}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-sm text-gray-500 font-medium mb-1">Gastos Totales</p>
                                                <p className="text-xl font-bold text-red-600">{formatCurrency(expensesThisMonth)}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-sm text-gray-500 font-medium mb-1">Balance Actual</p>
                                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                                    {formatCurrency(totalBalanceCents)}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-sm text-gray-500 font-medium mb-1">Flujo Neto (Mes)</p>
                                                <p className={`text-xl font-bold ${(incomeThisMonth - expensesThisMonth) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {(incomeThisMonth - expensesThisMonth) >= 0 ? '+' : ''}{formatCurrency(incomeThisMonth - expensesThisMonth)}
                                                </p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={exportToCSV}
                                            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                                        >
                                            Exportar Movimientos (CSV)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SETTINGS TAB */}
                            {activeTab === 'settings' && (
                                <div className="space-y-8 max-w-4xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        
                                        {/* ACCOUNTS */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-800 pb-2">Tus Cuentas</h3>
                                            <div className="space-y-2 mb-4">
                                                {accounts.map(acc => (
                                                    <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm text-gray-600 dark:text-gray-300">
                                                                {getAccountIcon(acc.type)}
                                                            </div>
                                                            <span className="font-medium">{acc.name}</span>
                                                        </div>
                                                        <span className="font-semibold text-gray-500">{formatCurrency(acc.balance_cents)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <form onSubmit={handleCreateAccount} className="bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-3">
                                                <h4 className="text-sm font-medium mb-2">Añadir nueva cuenta</h4>
                                                <input required type="text" placeholder="Nombre (Ej. Efectivo, Banco...)" value={newAccountName} onChange={e=>setNewAccountName(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                                                <div className="flex gap-2">
                                                    <select value={newAccountType} onChange={e=>setNewAccountType(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                                                        <option value="bank">Banco</option>
                                                        <option value="cash">Efectivo</option>
                                                        <option value="wallet">Wallet</option>
                                                    </select>
                                                    <input required type="number" step="0.01" placeholder="Saldo inicial" value={newAccountBalance} onChange={e=>setNewAccountBalance(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Guardar Cuenta</button>
                                            </form>
                                        </div>

                                        {/* CATEGORIES */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-800 pb-2">Categorías</h3>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {categories.map(cat => (
                                                    <span key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium">
                                                        {cat.emoji} {cat.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <form onSubmit={handleCreateCategory} className="bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-3">
                                                <h4 className="text-sm font-medium mb-2">Añadir categoría</h4>
                                                <div className="flex gap-2">
                                                    <input required type="text" placeholder="🍔" value={newCatEmoji} onChange={e=>setNewCatEmoji(e.target.value)} className="w-16 text-center px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                                                    <input required type="text" placeholder="Nombre (Alimentación...)" value={newCatName} onChange={e=>setNewCatName(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" />
                                                </div>
                                                <button type="submit" className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Guardar Categoría</button>
                                            </form>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Quick Add Modal */}
            <AnimatePresence>
                {showTxModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTxModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
                            
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Registrar {txType === 'EXPENSE' ? 'Gasto' : txType === 'INCOME' ? 'Ingreso' : 'Transferencia'}</h3>
                                <button onClick={() => setShowTxModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleAddTransaction} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-lg">$</span></div>
                                        <input type="number" step="0.01" required autoFocus value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary text-lg" placeholder="0.00" />
                                    </div>
                                </div>

                                {txType !== 'TRANSFER_OUT' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Cuenta</label>
                                            <select required value={txAccountId} onChange={(e) => setTxAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                                <option value="" disabled>Selecciona una cuenta</option>
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance_cents)})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Categoría</label>
                                            <select required value={txCategoryId} onChange={(e) => setTxCategoryId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                                <option value="" disabled>Selecciona una categoría</option>
                                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Desde</label>
                                            <select required value={txAccountId} onChange={(e) => setTxAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">
                                                <option value="" disabled>Origen</option>
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Hacia</label>
                                            <select required value={txToAccountId} onChange={(e) => setTxToAccountId(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">
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
                                                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                                <input type="text" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl" placeholder="Ej. Almuerzo con cliente" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3.5 rounded-xl font-medium shadow-sm hover:opacity-90 transition-opacity">
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contribute Modal */}
            <AnimatePresence>
                {showContributeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowContributeModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Aportar a Meta</h3>
                                <button onClick={() => setShowContributeModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><XIcon className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleContribute} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto a aportar</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-lg">$</span></div>
                                        <input type="number" step="0.01" required autoFocus value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary text-lg" placeholder="0.00" />
                                    </div>
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
