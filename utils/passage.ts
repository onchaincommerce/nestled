import Passage from '@passageidentity/passage-node';

// TypeScript interface for the Passage instance to handle type checking
interface PassageInstanceType {
  appId: string;
  apiKey?: string;
  authenticateRequest: (req: any) => Promise<string | false>;
  user: {
    get: (userId: string) => Promise<any>;
  };
}

// Default app ID for builds (from the hardcoded value in components/login.tsx)
const defaultAppId = 'boyEzeiNczYXppbj5F87neMd';
const defaultApiKey = 'passage-api-ejJ3h8dzU0m0cw5YdwW0'; // Sample API key for development/builds

// Initialize Passage with your app ID and API key
const passage = new Passage({
  appId: process.env.NEXT_PUBLIC_PASSAGE_APP_ID || defaultAppId,
  apiKey: process.env.PASSAGE_API_KEY || defaultApiKey,
}) as unknown as PassageInstanceType;

// Function to extract the authentication token from different types of requests
const getAuthToken = (req: any): string | undefined => {
  // Try to get the token from cookies
  if (req.cookies?.psg_auth_token) {
    return req.cookies.psg_auth_token;
  }
  
  // If using the App Router, cookies are in the headers
  if (req.headers?.get) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split('; ');
      const tokenCookie = cookies.find((c: string) => c.startsWith('psg_auth_token='));
      if (tokenCookie) {
        return tokenCookie.split('=')[1];
      }
    }
  }
  
  // Try to get the token from the authorization header
  const authHeader = 
    (req.headers?.authorization) || 
    (req.headers?.get && req.headers.get('authorization'));
    
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return undefined;
};

export const getAuthenticatedUser = async (req: any) => {
  try {
    const authToken = getAuthToken(req);
    
    if (!authToken) {
      return { isAuthorized: false, userID: null };
    }
    
    // App Router doesn't provide the same request object as Pages Router
    // We need to create a compatible request object
    const compatReq = {
      headers: {
        authorization: `Bearer ${authToken}`
      },
      cookies: {
        psg_auth_token: authToken
      }
    };
    
    try {
      const userID = await passage.authenticateRequest(compatReq);
      
      if (userID) {
        const user = await passage.user.get(userID);
        return { 
          isAuthorized: true, 
          userID,
          email: user.email
        };
      }
    } catch (authError) {
      console.error('Token validation error:', authError);
    }
    
    return { isAuthorized: false, userID: null };
  } catch (error) {
    console.error('Authentication error:', error);
    return { isAuthorized: false, userID: null };
  }
};

export const getAuthenticatedUserFromSession = async (req: any, res: any) => {
  try {
    const userID = await passage.authenticateRequest(req);
    if (userID) {
      return { isAuthorized: true, userID: userID };
    }
  } catch (error) {
    // authentication failed
    console.error('Authentication error:', error);
    return { isAuthorized: false, userID: '' };
  }
  
  return { isAuthorized: false, userID: '' };
}; 