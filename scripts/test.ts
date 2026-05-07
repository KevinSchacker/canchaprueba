import { createAdminClient } from '@/lib/supabase/admin'

async function check() {
  const db = createAdminClient()
  const { data: revs } = await db.from('reviews').select(`
    id, rating, comment, booking_id,
    bookings ( id, courts ( name, venues ( name ) ) )
  `).limit(5)
  console.log('REVS:', JSON.stringify(revs, null, 2))
}

check()
