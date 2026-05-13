export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export interface RefreshJwtPayload extends JwtPayload {
  family: string;
  jti: string; // unique token id — lets us look it up
}
