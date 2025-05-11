'use client';

import { useEffect, useState } from 'react';

const PassageLogin = () => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    require('@passageidentity/passage-elements/passage-auth');
  }, []);

  const passageAppId = process.env.NEXT_PUBLIC_PASSAGE_APP_ID || 'boyEzeiNczYXppbj5F87neMd';

  return (
    <>
      {isClient && (
        // @ts-ignore - Custom element
        <passage-auth app-id={passageAppId}></passage-auth>
      )}
    </>
  );
};

export default PassageLogin; 