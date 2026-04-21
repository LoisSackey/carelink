import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface PaymentStatusBadgeProps {
  status?: string;
  method?: string;
}

export const PaymentStatusBadge = ({ status = "pending", method }: PaymentStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          color: "bg-success/15 text-success border border-success/30",
          label: "Paid",
        };
      case "failed":
        return {
          icon: AlertCircle,
          color: "bg-destructive/15 text-destructive border border-destructive/30",
          label: "Payment Failed",
        };
      case "pending":
      default:
        return {
          icon: Clock,
          color: "bg-warning/15 text-warning border border-warning/30",
          label: "Pending",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const methodLabel = method ? ` (${method.toUpperCase()})` : "";

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}{methodLabel}</span>
    </div>
  );
};

export default PaymentStatusBadge;
