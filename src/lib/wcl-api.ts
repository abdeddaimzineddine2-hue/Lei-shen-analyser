import { useStore } from './store';

const WCL_OAUTH_URL = 'https://www.warcraftlogs.com/oauth/token';
const WCL_API_URL = 'https://www.warcraftlogs.com/api/v2/client';

let accessToken: string | null = null;
let tokenExpiration: number = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiration) {
    return accessToken;
  }

  const state = useStore.getState();
  const { clientId, clientSecret } = state;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Warcraft Logs API Credentials');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(WCL_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with Warcraft Logs. Please check your credentials.');
  }

  const data = await response.json();
  accessToken = data.access_token;
  // Expire 5 minutes early to be safe
  tokenExpiration = Date.now() + (data.expires_in - 300) * 1000; 

  return accessToken;
}

export async function fetchGraphQL(query: string, variables: any = {}) {
  const token = await getAccessToken();

  const response = await fetch(WCL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const result = await response.json();

  if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
    throw new Error(result.errors[0]?.message || 'GraphQL Query failed');
  }

  return result.data;
}

// Extract Report ID from a WCL URL
export function extractReportId(url: string): string | null {
  const match = url.match(/(?:classic\.)?warcraftlogs\.com\/reports\/([a-zA-Z0-9]{16})/);
  return match ? match[1] : null;
}
