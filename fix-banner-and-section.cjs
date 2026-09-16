const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

// Fix banner styling
file = file.replace(
  /className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-xs sm:text-sm py-2 px-4 shadow-sm flex items-center justify-center gap-2 transition-colors mb-6 rounded-lg"/,
  'className="-mx-4 sm:-mx-6 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-1.5 flex items-center justify-center gap-1.5 transition-colors mb-5"'
);

const overdueSection = `
                  {/* OVERDUE PAYMENTS HIDDEN SECTION */}
                  {effectiveTab === "overdue_payments" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-zinc-800">
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          Pagos Atrasados
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        {overdueItems.length === 0 ? (
                          <div className="text-center py-8 text-sm text-gray-500">
                            No hay pagos atrasados.
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {overdueItems.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (isMobile) {
                                    if (item.route.tab === "more_menu") {
                                      setMobileMainTab("more");
                                      setMobileMoreSubView(item.route.subTab);
                                    } else {
                                      setMobileMainTab(item.route.tab);
                                      if (item.route.tab === "planning") setMobilePlanSubView(item.route.subTab);
                                    }
                                  } else {
                                    if (item.route.tab === "more_menu") {
                                      setActiveTab("debts");
                                    } else {
                                      setActiveTab(item.route.tab);
                                      if (item.route.tab === "planning") setPlanningSubTab(item.route.subTab);
                                    }
                                  }
                                }}
                                className="flex items-center justify-between p-4 bg-white dark:bg-[#0a0a0a] border border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800 rounded-xl shadow-xs transition-colors text-left"
                              >
                                <div>
                                  <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-0.5">
                                    {item.type}
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {item.title}
                                  </div>
                                  {item.cuotas && item.cuotas > 0 ? (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {item.cuotas} {item.cuotas === 1 ? "cuota atrasada" : "cuotas atrasadas"}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(item.amount)}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
`;

const tabContentStart = `{/* 1. OVERVIEW TAB */}`;
if (file.includes(tabContentStart)) {
  file = file.replace(tabContentStart, overdueSection.trim() + "\n\n                  " + tabContentStart);
  console.log("Inserted overdue section.");
} else {
  console.log("Could not find overview tab marker.");
}

fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
