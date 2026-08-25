// Import Supabase directly inside the module ecosystem to prevent global crashes
import { createClient } from 'https://jsdelivr.net';

const secureProtocol = 'https://';
const databaseCluster = 'chbfgkguxkdadnevqthk';
const networkDomain = '.supabase.co';

const SB_URL = secureProtocol + databaseCluster + networkDomain;
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoYmZna2d1eGtkYWRuZXZxdGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTcxOTUsImV4cCI6MjEwMjg5MzE5NX0.hemyiyKpJXt7CvxReNOzX4AVajM7V_LHl0SOJNAutcw';

export const sb = createClient(SB_URL, SB_KEY);
