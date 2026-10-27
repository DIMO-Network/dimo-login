import { message, type Message } from '../i18n';

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
}: ValidateEmailProps): Message | undefined => {
  if (!email || !isValidEmail(email)) {
    return message('email.invalid');
  }
  if (forceEmail && !emailPermissionGranted) {
    return message('email.sharing_required');
  }
};
