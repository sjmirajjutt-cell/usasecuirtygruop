export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: Partial<ProfileInsert>; Relationships: [] }
      work_locations: { Row: WorkLocation; Insert: WorkLocationInsert; Update: Partial<WorkLocationInsert>; Relationships: [] }
      worksheets: { Row: Worksheet; Insert: WorksheetInsert; Update: Partial<WorksheetInsert>; Relationships: [] }
      invoices: { Row: Invoice; Insert: InvoiceInsert; Update: Partial<InvoiceInsert>; Relationships: [] }
      clients: { Row: Client; Insert: ClientInsert; Update: Partial<ClientInsert>; Relationships: [] }
      attendance: { Row: Attendance; Insert: AttendanceInsert; Update: Partial<AttendanceInsert>; Relationships: [] }
      password_reset_requests: { Row: PasswordResetRequest; Insert: PasswordResetRequestInsert; Update: Partial<PasswordResetRequestInsert>; Relationships: [] }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { profile_role: 'admin' | 'officer'; invoice_status: 'pending' | 'paid'; password_reset_status: 'pending' | 'approved' | 'rejected' }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Profile = { id: string; full_name: string; role: 'admin' | 'officer'; pin_code: string | null; employee_id: string | null; phone: string | null; address: string | null; hourly_rate: number; is_active: boolean; assigned_location_id: string | null; created_at: string }
export type ProfileInsert = Omit<Profile, 'created_at'> & { created_at?: string }
export type WorkLocation = { id: string; location_name: string; address: string; client_name: string; latitude: number | null; longitude: number | null; allowed_radius_meters: number; created_at: string }
export type WorkLocationInsert = Omit<WorkLocation, 'id' | 'created_at'> & { id?: string; created_at?: string }
export type Worksheet = { id: string; officer_id: string; location_id: string; date: string; shift_hours: string; total_hours: number; hourly_rate: number; total_amount: number; created_at: string }
export type WorksheetInsert = Omit<Worksheet, 'id' | 'total_amount' | 'created_at'> & { id?: string; created_at?: string }
export type Invoice = { id: string; client_name: string; amount_due: number; status: 'pending' | 'paid'; bank_details: string; created_at: string }
export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at'> & { id?: string; created_at?: string }
export type Client = { id: string; name: string; address_line_1: string; address_line_2: string | null; phone: string | null; email: string | null; created_at: string }
export type ClientInsert = Omit<Client, 'id' | 'created_at'> & { id?: string; created_at?: string }
export type Attendance = { id: string; employee_id: string; check_in: string; check_out: string | null; total_hours: number | null; assigned_location_id: string | null; check_in_latitude: number | null; check_in_longitude: number | null; check_in_accuracy_meters: number | null; distance_from_location_meters: number | null; location_status: 'matched' | 'outside_radius' | 'not_verified'; notes: string | null; created_at: string }
export type AttendanceInsert = Omit<Attendance, 'id' | 'total_hours' | 'created_at'> & { id?: string; created_at?: string }
export type PasswordResetRequest = { id: string; employee_id: string; requested_by_name: string; email: string; reason: string | null; status: 'pending' | 'approved' | 'rejected'; note: string | null; reviewer_id: string | null; reviewed_at: string | null; created_at: string }
export type PasswordResetRequestInsert = Omit<PasswordResetRequest, 'id' | 'created_at' | 'reviewed_at'> & { id?: string; created_at?: string; reviewed_at?: string | null }

export type WorksheetWithRelations = Worksheet & {
  officer: Pick<Profile, 'full_name'> | null
  location: Pick<WorkLocation, 'location_name' | 'client_name'> | null
}
