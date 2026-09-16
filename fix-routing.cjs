const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

file = file.replace(
  `if (route.tab === "planning") setMobilePlanSubView(route.subTab as any);`,
  `if (route.tab === "planning") {\n            setMobilePlanSubView(route.subTab as any);\n            setPlanningSubTab(route.subTab as any);\n          }`
);

file = file.replace(
  `if (item.route.tab === "planning") setMobilePlanSubView(item.route.subTab);`,
  `if (item.route.tab === "planning") {\n                                        setMobilePlanSubView(item.route.subTab);\n                                        setPlanningSubTab(item.route.subTab);\n                                      }`
);

// We should also make sure that when mobile Plan SubView is set through the regular UI, it also updates planningSubTab.
// Let's check where setMobilePlanSubView is called.
