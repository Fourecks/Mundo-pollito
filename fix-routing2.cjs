const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

// We can just add an effect that synchronizes planningSubTab whenever mobilePlanSubView changes to one of the valid sub tabs!
// Wait, an effect is easiest and guarantees sync.
const effectCode = `
  useEffect(() => {
    if (isMobile && (mobilePlanSubView === "calendar" || mobilePlanSubView === "subscriptions" || mobilePlanSubView === "installments")) {
      setPlanningSubTab(mobilePlanSubView);
    }
  }, [isMobile, mobilePlanSubView]);
`;

if (!file.includes('setPlanningSubTab(mobilePlanSubView)')) {
  file = file.replace(
    `const [planningSubTab, setPlanningSubTab] = useState<`,
    effectCode + `\n  const [planningSubTab, setPlanningSubTab] = useState<`
  );
  fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
  console.log("Added effect to sync planningSubTab");
} else {
  console.log("Effect already exists");
}
