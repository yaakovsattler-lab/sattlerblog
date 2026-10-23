/*
 * THE INTEGRATION POINT FOR SENDING A CONTACT MESSAGE.
 *
 * Nothing sends anywhere. There is no mail service wired to this prototype and
 * Elyakim has not approved one, so this function exists to be replaced, not to
 * pretend. It throws, deliberately and always, and the UI shows a "not
 * connected" state rather than a success state - a form that reports success
 * on a message that went nowhere is the worst possible outcome, because the
 * person stops waiting for an answer that will never come.
 *
 * To wire it later, replace the body with the real call and delete
 * NOT_CONNECTED. Nothing else in the UI has to change: the form already has
 * sending, error and success states and they are all reachable.
 */

export type ContactMessage = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export const NOT_CONNECTED = "CONTACT_SEND_NOT_CONNECTED";

export async function sendContactMessage(_message: ContactMessage): Promise<void> {
  throw new Error(NOT_CONNECTED);
}

/*
 * The WhatsApp section's "כתבו לי..." field (170:155) sends through THIS
 * function, on purpose: one integration point, not two. When a real service is
 * wired into sendContactMessage() the community field starts working at the
 * same moment and with no second change.
 *
 * A question carries no name, email or phone - the field asks for one thing -
 * so the other fields go over as empty strings rather than being invented.
 */
export type CommunityQuestion = { question: string };

export async function sendCommunityQuestion({ question }: CommunityQuestion): Promise<void> {
  return sendContactMessage({ name: "", email: "", phone: "", message: question });
}
