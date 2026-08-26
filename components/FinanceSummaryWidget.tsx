import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/formatCurrency';
import { Wallet, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

interface FinanceSummaryWidgetProps {
  onClick: () => void;
}

const FinanceSummaryWidget: React.FC<FinanceSummaryWidgetProps> = ({ onClick }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [monthlyExpense, setMonthlyExpense] = useState<number | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);

  useEffect(() => {
    const fetchFinanceData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [accountsRes, txRes] = await Promise.all([
        supabase.from('finance_accounts').select('balance_cents').eq('is_archived', false),
        supabase.from('finance_transactions').select('amount_cents, type').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      ]);

      if (accountsRes.data) {
        setBalance(accountsRes.data.reduce((acc, curr) => acc + curr.balance_cents, 0));
      }

      if (txRes.data) {
        let expense = 0;
        let income = 0;
        txRes.data.forEach(tx => {
          if (tx.type === 'EXPENSE') expense += tx.amount_cents;
          if (tx.type === 'INCOME') income += tx.amount_cents;
        });
        setMonthlyExpense(expense);
        setMonthlyIncome(income);
      }
    };
    fetchFinanceData();
  }, []);

  if (balance === null) return null;

  return (
    <div 
      onClick={onClick}
      className="p-3 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg border border-white/20 dark:border-gray-700/30 cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Finanzas</span>
        </div>
        <span className="font-bold text-sm text-gray-900 dark:text-white">
          {formatCurrency(balance)}
        </span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg p-2 flex items-center gap-1.5">
          <TrendingDown className="w-3 h-3 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Ingresos</span>
            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(monthlyIncome || 0)}</span>
          </div>
        </div>
        <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg p-2 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-red-500" />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Gastos</span>
            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(monthlyExpense || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceSummaryWidget;
