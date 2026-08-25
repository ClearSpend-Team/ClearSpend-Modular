// Database connection variables
const SB_URL = 'https://supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoYmZna2d1eGtkYWRuZXZxdGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTcxOTUsImV4cCI6MjEwMjg5MzE5NX0.hemyiyKpJXt7CvxReNOzX4AVajM7V_LHl0SOJNAutcw';

// Initialize and export the client instance
export const sb = supabase.createClient(SB_URL, SB_KEY);
