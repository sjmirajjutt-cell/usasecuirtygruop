import { EmployeePortalShell } from '@/components/employee-portal-shell'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <EmployeePortalShell>{children}</EmployeePortalShell>
}