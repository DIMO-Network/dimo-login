import { resolveEmailRequest, type EmailRequest } from '../utils/emailRequest';

// What the app asks for the email, from `emailRequest` and the older
// `forceEmail`. Kept apart so either can arrive first.
let emailRequest: EmailRequest | undefined;
let forceEmail = false;

export const setEmailRequest = (value: EmailRequest | undefined) => {
  emailRequest = value;
};

export const setForceEmail = (value: boolean) => {
  forceEmail = value;
};

export const getEmailRequest = (): EmailRequest =>
  resolveEmailRequest(emailRequest, forceEmail);
