const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

const startMarker = `{/* OVERDUE PAYMENTS HIDDEN SECTION */}`;
const endMarker = `{effectiveTab === "overview" && (`;

if (file.includes(startMarker) && file.includes(endMarker)) {
  const startIndex = file.indexOf(startMarker);
  const endIndex = file.indexOf(endMarker);
  
  const newSection = `
                  {/* OVERDUE PAYMENTS HIDDEN SECTION */}
                  {effectiveTab === "overdue_payments" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-zinc-800">
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          Pagos Atrasados
                        </h3>
                      </div>
                      
                      <div className="space-y-6">
                        {overdueItems.length === 0 ? (
                          <div className="text-center py-8 text-sm text-gray-500">
                            No hay pagos atrasados.
                          </div>
                        ) : (
                          ["Tarjeta", "Préstamo", "Suscripción", "Cuota"].map((groupType) => {
                            const itemsInGroup = overdueItems.filter((i) => i.type === groupType);
                            if (itemsInGroup.length === 0) return null;
                            
                            return (
                              <div key={groupType} className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pl-1">
                                  {groupType}s
                                </h4>
                                <div className="grid gap-3">
                                  {itemsInGroup.map((item, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        if (isMobile) {
                                          if (item.route.tab === "more_menu") {
                                            setMobileMainTab("more");
                                            setMobileMoreSubView(item.route.subTab);
                                          } else {
                                            setMobileMainTab(item.route.tab as any);
                                            if (item.route.tab === "planning") setMobilePlanSubView(item.route.subTab as any);
                                          }
                                        } else {
                                          if (item.route.tab === "more_menu") {
                                            setActiveTab("debts");
                                          } else {
                                            setActiveTab(item.route.tab as any);
                                            if (item.route.tab === "planning") setPlanningSubTab(item.route.subTab as any);
                                          }
                                        }
                                      }}
                                      className="flex items-center justify-between p-4 bg-white dark:bg-[#0a0a0a] border border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800 rounded-xl shadow-xs transition-colors text-left group"
                                    >
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                                          {item.title}
                                        </div>
                                        {item.cuotas && item.cuotas > 0 ? (
                                          <div className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
                                            {item.cuotas} {item.cuotas === 1 ? "cuota atrasada" : "cuotas atrasadas"}
                                          </div>
                                        ) : (
                                          <div className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
                                            Pago pendiente
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                          {formatCurrency(item.amount)}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                                          <ArrowRight className="w-4 h-4" />
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  `;
  file = file.slice(0, startIndex) + newSection.trim() + "\n                  " + file.slice(endIndex);
  fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
  console.log("Replaced with grouped items.");
} else {
  console.log("Markers not found");
}
