import Passage from '@passageidentity/passage-node';

// Define the type for the Passage instance to prevent TypeScript errors
type PassageInstance = {
  appId: string;
  apiKey?: string;
  authTokens: {
    isValid: (token: string) => Promise<string | false>;
  };
  user: {
    get: (userId: string) => Promise<{
      id: string;
      email: string;
      phone: string;
      created_at: string;
      updated_at: string;
      last_login_at: string;
      status: string;
    }>;
  };
};

export const getPassageInstance = (): PassageInstance => {
  const passageAppId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || 'boyEzeiNczYXppbj5F87neMd';
  const passageApiKey = process.env.PASSAGE_API_KEY || '';

  // @ts-ignore - We're using a custom type to handle the Passage instance
  return new Passage({
    appId: passageAppId,
    apiKey: passageApiKey,
  });
};

// Utility to get Passage auth status and user info from requests
export const getPassageUser = async (req: Request) => {
  try {
    const passage = getPassageInstance();
    
    // Get auth token from request cookie
    const authToken = req.headers.get('cookie')?.split('; ')
      .find(row => row.startsWith('psg_auth_token='))
      ?.split('=')[1];
    
    if (!authToken) {
      return { isAuthorized: false, userID: null };
    }
    
    try {
      // Validate the token using the authTokens.isValid method
      const userID = await passage.authTokens.isValid(authToken);
      
      if (userID) {
        // Get the user details from Passage
        const user = await passage.user.get(userID);
        return { 
          isAuthorized: true, 
          userID,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };
      }
    } catch (authError) {
      console.error('Token validation error:', authError);
    }
    
    return { isAuthorized: false, userID: null };
  } catch (error) {
    console.error('Passage auth error:', error);
    return { isAuthorized: false, userID: null };
  }
}; 