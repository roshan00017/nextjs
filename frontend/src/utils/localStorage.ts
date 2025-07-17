const USERNAME_KEY = "guessmates_username";

export const saveUsername = (username: string) => {
  localStorage.setItem(USERNAME_KEY, username);
  window.dispatchEvent(new Event("usernameSet"));
};

export const getUsername = (): string | null => {
  if (typeof window !== "undefined") {
    // Check if window is defined (client-side)
    return localStorage.getItem(USERNAME_KEY);
  }
  return null;
};

export const removeUsername = () => {
  if (typeof window !== "undefined") {
    // Check if window is defined (client-side)
    localStorage.removeItem(USERNAME_KEY);
  }
};
