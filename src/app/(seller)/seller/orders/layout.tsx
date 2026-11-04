import { OperateGate } from "../jobs/operate-gate";

export default function OrdersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <OperateGate name="Orders">{children}</OperateGate>;
}
