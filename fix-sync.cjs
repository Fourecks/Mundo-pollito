const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

file = file.replace(
  `if (isMobile && (mobilePlanSubView === "calendar" || mobilePlanSubView === "subscriptions" || mobilePlanSubView === "installments")) {`,
  `if (isMobile && (mobilePlanSubView === "calendar" || mobilePlanSubView === "subscriptions" || mobilePlanSubView === "installments" || mobilePlanSubView === "loans")) {`
);

fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
console.log("Updated sync effect");
