export type Food = {
  id: string
  name: string
  expiration_date: string
}


export type HouseholdWithMembers = {
  id: string
  name: string
  owner_id: string | null
  created_at: string | null
  invite_code: string | null
  household_members?: {
    user_id: string
  }[]
}
