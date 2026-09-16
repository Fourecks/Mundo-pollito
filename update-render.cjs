const fs = require("fs");
let file = fs.readFileSync("components/FinanceModule.tsx", "utf8");

const startStr = `{financialAlerts.length > 0 && (`;
const idxStart = file.indexOf(startStr);
const endStr = `              )}`;
const idxEnd = file.indexOf(endStr, idxStart) + endStr.length;

const redBanner = `
              {overdueItems.length > 0 && (
                <button
                  onClick={handleOverdueBannerClick}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-xs sm:text-sm py-2 px-4 shadow-sm flex items-center justify-center gap-2 transition-colors mb-6 rounded-lg"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {overdueItems.length === 1
                    ? "Tienes 1 pago atrasado"
                    : \`Tienes \${overdueItems.length} pagos atrasados\`}
                </button>
              )}
`;

if (idxStart !== -1 && file.indexOf("Avisos de Fondos y Crédito") !== -1) {
  file = file.slice(0, idxStart) + redBanner.trim() + file.slice(idxEnd);
  console.log("Replaced yellow banner with red banner.");
} else {
  console.log("Could not find yellow banner, inserting instead.");
  // we could insert it right after `{isMobile ? renderMobileTopNav() : renderTabs()}`
  const insertAfter = `{isMobile ? renderMobileTopNav() : renderTabs()}`;
  const insertIdx = file.indexOf(insertAfter);
  if(insertIdx !== -1) {
      file = file.slice(0, insertIdx + insertAfter.length) + "\n" + redBanner + "\n" + file.slice(insertIdx + insertAfter.length);
      console.log("Inserted red banner.");
  }
}

// Ensure financialAlerts is removed completely if it still exists
file = file.replace(/financialAlerts\.length/g, '0');

fs.writeFileSync("components/FinanceModule.tsx", file, "utf8");
