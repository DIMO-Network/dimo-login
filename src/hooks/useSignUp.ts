import { useAuthContext } from '../context/AuthContext';

/** The sign-up sequence AuthProvider runs (see useSignUpFlow). */
export const useSignUp = () => useAuthContext().signUp;
