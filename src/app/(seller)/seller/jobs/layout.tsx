import { OperateGate } from "./operate-gate";

export default function JobsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <OperateGate>{children}</OperateGate>;
}
