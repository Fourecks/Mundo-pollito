const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

file = file.replace(
  `if (["accounts", "categories", "security", "settings"].includes(mobileMoreSubView)) {`,
  `if (mobileMoreSubView === "overdue_payments") return "overdue_payments";\n      if (["accounts", "categories", "security", "settings"].includes(mobileMoreSubView)) {`
);

fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
console.log("Updated effectiveTab logic.");
