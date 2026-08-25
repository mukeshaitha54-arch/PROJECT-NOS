export const v4 = () =>
  "mocked-uuid-" + Math.random().toString(36).substring(7);
export const v1 = () => "mocked-uuid-v1";
export const v3 = () => "mocked-uuid-v3";
export const v5 = () => "mocked-uuid-v5";
export const NIL = "00000000-0000-0000-0000-000000000000";
export const validate = () => true;
export const version = () => 4;
export const stringify = () => "mocked-uuid";
export const parse = () => new Uint8Array(16);
