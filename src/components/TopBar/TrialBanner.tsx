/**
 * TrialBanner.tsx — DataFlow Suite Phase 6
 * Shown in the TopBar when the user is on an active or expired trial.
 * Disappears once the user has a paid license.
 */

import { useLicense } from "../../lib/useLicense";
import { useLicenseStore } from "../../store/licenseStore";
import { useNavigate } from "react-router-dom";

export default function TrialBanner() {
  const { isTrial, isTrialActive, isTrialExpired, daysLeft } = useLicense();
  const dismissTrialExpired = useLicenseStore((s) => s.dismissTrialExpired);
  const trialExpiredDismissed = useLicenseStore((s) => s.trialExpiredDismissed);
  const navigate = useNavigate();

  if (!isTrial) return null;
  if (isTrialExpired && trialExpiredDismissed) return null;

  const urgent = isTrialActive && daysLeft !== null && daysLeft <= 3;
  const bg = isTrialExpired
    ? "#FEE9E9"
    : urgent
    ? "#FFF3CD"
    : "#EEEDFE";
  const textColor = isTrialExpired ? "#E24B4A" : urgent ? "#BA7517" : "#534AB7";
  const borderColor = isTrialExpired ? "#F9C9C9" : urgent ? "#FCDCA0" : "#AFA9EC";

  return (
    <div style={{
      background: bg,
      border: `0.5px solid ${borderColor}`,
      borderRadius: 6,
      padding: "4px 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 11,
      fontWeight: 500,
      color: textColor,
      flexShrink: 0,
    }}>
      {isTrialExpired ? (
        <>
          <span>⚠️ Your 14-day Pro trial has ended.</span>
          <button
            className="btn btn-primary"
            style={{ fontSize: 10, padding: "3px 10px" }}
            onClick={() => navigate("/settings?tab=billing")}
          >
            Upgrade Now
          </button>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: textColor, fontSize: 14, lineHeight: 1 }}
            onClick={dismissTrialExpired}
            title="Dismiss"
          >
            ×
          </button>
        </>
      ) : (
        <>
          <span>
            ✨ Pro Trial —{" "}
            {daysLeft === 1 ? "last day!" : `${daysLeft} days left`}
          </span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 10, padding: "3px 8px", color: textColor }}
            onClick={() => navigate("/settings?tab=billing")}
          >
            Upgrade →
          </button>
        </>
      )}
    </div>
  );
}
