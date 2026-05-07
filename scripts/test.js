const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function run() {
  const { data } = await supabase.from('reviews').select(`
    id,
    bookings ( id, courts ( name, venues ( name ) ) )
  `).limit(2)
  console.log('reviews:', JSON.stringify(data, null, 2))

  const { data: b } = await supabase.from('bookings').select(`
    id, player_id,
    profiles ( full_name, phone )
  `).limit(2)
  console.log('bookings:', JSON.stringify(b, null, 2))
}
run()
