export interface User {
  id: number;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: any;
  name: string;
  createdAt: string;
  updatedAt: string;
  isAdmin: boolean;
  role: Role;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}
