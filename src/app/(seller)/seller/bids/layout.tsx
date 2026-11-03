import { OperateGate } from "../jobs/operate-gate";

export default function BidsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <OperateGate>{children}</OperateGate>;
}
