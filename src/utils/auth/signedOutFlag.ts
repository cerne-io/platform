// A simple module to hold the signed-out state to prevent late callbacks
// from executing after the user has initiated sign-out.

let isSignedOut = false;

export const setSignedOut = (value: boolean) => {
  isSignedOut = value;
};

export const getSignedOut = () => isSignedOut;
