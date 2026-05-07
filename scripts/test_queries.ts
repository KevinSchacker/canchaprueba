import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function test() {
  const { data: reviews, error: error1 } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      bookings ( courts ( name, venues ( name ) ) )
    `)
    .eq('reviewee_type', 'player')
    .limit(2)

  console.log('REVIEWS:', JSON.stringify(reviews, null, 2))
  console.log('REVIEWS ERROR:', error1)

  const { data: bookings, error: error2 } = await supabase
    .from('bookings')
    .select(`
      id, player_id,
      profiles ( full_name, phone )
    `)
    .limit(2)

  console.log('BOOKINGS:', JSON.stringify(bookings, null, 2))
  console.log('BOOKINGS ERROR:', error2)
}

test()
