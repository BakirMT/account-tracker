import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure this route is always evaluated at request time so build-time page data
// collection does not attempt to construct the Supabase client.
export const dynamic = 'force-dynamic';

let supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  return supabaseClient;
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { studentNumber, name, email, classLevel, section, enrolledDate } = body;

    const className = classLevel === 'Staff' ? 'Staff' : `Class ${classLevel}-${section}`;
    
    // Supabase Auth enforces a minimum password length (often 6).
    // For short student numbers, derive a deterministic password so account creation succeeds.
    if (studentNumber.length < 3) {
      return NextResponse.json(
        { error: 'Student number must be at least 3 characters to be used as login password.' },
        { status: 400 }
      );
    }
    const generatedPassword = studentNumber.length >= 6
      ? studentNumber
      : `${studentNumber}${'0'.repeat(6 - studentNumber.length)}`;

    // 1. Create the Auth User for the student
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: generatedPassword,
      options: {
        data: {
          name,
          role: 'user', // Default student role
          student_id: studentNumber
        }
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;

    // 2. Insert into the students table
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        id: studentNumber,
        student_number: studentNumber,
        name,
        class_name: className,
        grade: classLevel,
        enrolled_date: enrolledDate,
        email: email
      })
      .select()
      .single();

    if (studentError) {
      console.error('Db Error:', studentError);
      return NextResponse.json({ error: studentError.message }, { status: 400 });
    }

    // 3. Insert into the profiles table
    if (userId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: name,
          role: 'user',
          student_id: studentNumber
        });
      
      if (profileError) {
        console.error('Profile Insert Error:', profileError);
      }
    }

    return NextResponse.json({ success: true, student: studentData, generatedPassword });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
