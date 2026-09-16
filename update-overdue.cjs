const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

// 1. Remove financialAlerts state
file = file.replace(
  `  const [financialAlerts, setFinancialAlerts] = useState<string[]>([]);\n`,
  ""
);

// 2. Remove financialAlerts logic inside fetchFinanceData
file = file.replace(
  /    if \(alertsAdded\.length > 0\) \{\n      setFinancialAlerts\(\(prev\) =>\n        Array\.from\(new Set\(\[\.\.\.prev, \.\.\.alertsAdded\]\)\),\n      \);\n    \}/g,
  ""
);
file = file.replace(
  /    if \(alertsAdded\.length > 0\) \{\n      setFinancialAlerts\(\(prev\) =>\n        Array\.from\(new Set\(\[\.\.\.prev, \.\.\.alertsAdded\]\)\),\n      \);\n    \}/g,
  ""
);

const overdueMemo = `
  const getOverdueCuotas = (inst: FinanceInstallment) => {
    const today = new Date();
    const start = new Date(inst.start_date);
    const payDay = inst.payment_day || start.getDate() || 15;
    let totalMonthsElapsed =
      (today.getFullYear() - start.getFullYear()) * 12 +
      (today.getMonth() - start.getMonth());
    if (today.getDate() >= payDay) {
      totalMonthsElapsed += 1;
    }
    const expectedPaid = Math.min(
      Math.max(0, totalMonthsElapsed),
      inst.total_installments,
    );
    return inst.status === "ACTIVE"
      ? Math.max(0, expectedPaid - inst.paid_installments)
      : 0;
  };

  const overdueItems = useMemo(() => {
    const items: Array<{ id: string; type: string; title: string; amount: number; cuotas?: number; route: { tab: string; subTab?: string } }> = [];
    const todayStr = getTodayStr();

    // 1. Tarjetas
    accounts.forEach((acc) => {
      if (acc.type === "credit" && acc.payment_due_date && acc.payment_due_date < todayStr && (acc.balance_cents || 0) > 0) {
        items.push({
          id: \`acc_\${acc.id}\`,
          type: "Tarjeta",
          title: acc.name,
          amount: acc.balance_cents,
          route: { tab: isMobile ? "more_menu" : "debts", subTab: "debts" }
        });
      }
    });

    // 2. Préstamos
    debts.forEach((d) => {
      if (!d.is_archived && d.type === "OWE" && d.due_date && d.due_date < todayStr && d.remaining_cents > 0) {
        items.push({
          id: \`debt_\${d.id}\`,
          type: "Préstamo",
          title: d.name,
          amount: d.remaining_cents,
          route: { tab: "planning", subTab: "loans" }
        });
      }
    });

    // 3. Suscripciones
    recurring.forEach((rec) => {
      if (rec.next_date && rec.next_date < todayStr) {
        items.push({
          id: \`sub_\${rec.id}\`,
          type: "Suscripción",
          title: rec.description || rec.name || "Suscripción",
          amount: rec.amount_cents,
          route: { tab: "planning", subTab: "subscriptions" }
        });
      }
    });

    // 4. Cuotas
    installments.forEach((inst) => {
      const cuotas = getOverdueCuotas(inst);
      if (cuotas > 0) {
        items.push({
          id: \`inst_\${inst.id}\`,
          type: "Cuota",
          title: inst.name,
          amount: inst.installment_amount_cents * cuotas,
          cuotas: cuotas,
          route: { tab: "planning", subTab: "installments" }
        });
      }
    });

    return items;
  }, [accounts, debts, recurring, installments, isMobile]);

  const handleOverdueBannerClick = () => {
    if (overdueItems.length === 1) {
      const route = overdueItems[0].route;
      if (isMobile) {
        if (route.tab === "more_menu") {
          setMobileMainTab("more");
          setMobileMoreSubView(route.subTab);
        } else {
          setMobileMainTab(route.tab as any);
          if (route.tab === "planning") setMobilePlanSubView(route.subTab as any);
        }
      } else {
        if (route.tab === "more_menu") {
          setActiveTab("debts");
        } else {
          setActiveTab(route.tab as any);
          if (route.tab === "planning") setPlanningSubTab(route.subTab as any);
        }
      }
    } else if (overdueItems.length > 1) {
      if (isMobile) {
        setMobileMainTab("more");
        setMobileMoreSubView("overdue_payments");
      } else {
        setActiveTab("overdue_payments" as any);
      }
    }
  };
`;
// Let's insert it right after `const [showCreditInfoModal, setShowCreditInfoModal] = useState(false);`
file = file.replace(
  `  const [showCreditInfoModal, setShowCreditInfoModal] = useState(false);`,
  `  const [showCreditInfoModal, setShowCreditInfoModal] = useState(false);\n${overdueMemo}`
);

// We need to add "overdue_payments" to valid Tabs and SubViews.
file = file.replace(
  `| "closing"`,
  `| "closing"\n  | "overdue_payments"`
);
// For mobileMoreSubView:
file = file.replace(
  `| "closing" | "accounts" | "categories" | "security" | "settings">(null);`,
  `| "closing" | "accounts" | "categories" | "security" | "settings" | "overdue_payments">(null);`
);
file = file.replace(
  `| "closing" | "accounts" | "categories" | "security">(null);`,
  `| "closing" | "accounts" | "categories" | "security" | "overdue_payments">(null);`
);

fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
