
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Email is required and must be a string.' }, { status: 400 });
    }

    console.log(`Simulating: Login confirmation email would be sent to: ${email}`);

    return NextResponse.json({ success: true, message: 'Email sending process simulated successfully.' });
  } catch (error) {
    console.error('Error in send-login-email API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: `Server error: ${errorMessage}` }, { status: 500 });
  }
}
