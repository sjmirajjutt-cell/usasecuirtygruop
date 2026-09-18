import { redirect } from 'next/navigation'

export default async function OfficersPage() {
  redirect('/dashboard/employees')
}
