import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      is_expert: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    is_expert: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    is_expert: boolean;
  }
}
