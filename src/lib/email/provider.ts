import { Resend } from "resend";

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult = {
  id?: string;
};

export type EmailProvider = {
  send(msg: OutboundEmail): Promise<SendResult>;
};

class MissingEmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingEmailConfigError";
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RENEWAL_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new MissingEmailConfigError(
      "Outbound email is not configured: set RESEND_API_KEY and RENEWAL_EMAIL_FROM.",
    );
  }
  const resend = new Resend(apiKey);
  return {
    async send(msg) {
      const { data, error } = await resend.emails.send({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      if (error) {
        throw new Error(typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error));
      }
      return { id: data?.id };
    },
  };
}

export function isMissingEmailConfigError(e: unknown): e is MissingEmailConfigError {
  return e instanceof MissingEmailConfigError;
}
