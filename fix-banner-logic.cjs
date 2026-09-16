const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

// We need to replace handleOverdueBannerClick
const searchCode = `  const handleOverdueBannerClick = () => {
    if (overdueItems.length === 1) {
      const route = overdueItems[0].route;
      if (isMobile) {
        if (route.tab === "more_menu") {
          setMobileMainTab("more");
          setMobileMoreSubView(route.subTab);
        } else {
          setMobileMainTab(route.tab as any);
          if (route.tab === "planning") {
            setMobilePlanSubView(route.subTab as any);
            setPlanningSubTab(route.subTab as any);
          }
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
  };`;

const newCode = `  const handleOverdueBannerClick = () => {
    if (isMobile) {
      setMobileMainTab("more");
      setMobileMoreSubView("overdue_payments");
    } else {
      setActiveTab("overdue_payments" as any);
    }
  };`;

if (file.includes(searchCode)) {
  file = file.replace(searchCode, newCode);
  fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
  console.log("Updated handleOverdueBannerClick successfully");
} else {
  // Let's try finding the start of the function and replacing it manually
  console.log("Could not find exact string. Will use regex.");
  const rx = /const handleOverdueBannerClick = \(\) => \{[\s\S]*?\}\s*\} else if \(overdueItems\.length > 1\) \{[\s\S]*?\}\s*\};/;
  if (rx.test(file)) {
    file = file.replace(rx, newCode);
    fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
    console.log("Replaced with regex.");
  } else {
    console.log("Regex also failed.");
  }
}
