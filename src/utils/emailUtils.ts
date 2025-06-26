export function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

interface ValidateEmailProps {
  email: string;
  emailPermissionGranted: boolean;
  forceEmail: boolean;
}

export const validateEmail = ({
  email,
  emailPermissionGranted,
  forceEmail,
}: ValidateEmailProps) => {
  if (!email || !isValidEmail(email)) {
    return 'Please enter a valid email';
  }
  if (forceEmail && !emailPermissionGranted) {
    return 'Email sharing is required to proceed. Please check the box.';
  }
};
