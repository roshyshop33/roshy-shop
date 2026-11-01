// Handles a verified Stripe event: emails the agent (shipping details) and the owner (summary).
import { sendEmail, splitEmails } from "./email.js";
import { normalizeOrder, agentEmail, ownerEmail } from "./orders.js";

export async function handleEvent(event, env, send = sendEmail) {
  const type = event?.type;
  if (type !== "checkout.session.completed" && type !== "checkout.session.async_payment_succeeded") {
    return { skipped: type };
  }
  const session = event.data.object;
  // Bank-transfer style methods finish later and send async_payment_succeeded instead.
  if (session.payment_status !== "paid") return { skipped: "not paid yet" };

  const order = normalizeOrder(session);
  const agents = splitEmails(env.AGENT_EMAIL);
  const owner = splitEmails(env.OWNER_EMAIL);
  const sent = [];

  // Addresses are part of the idempotency keys: Resend rejects a reused key
  // whose email changed, e.g. when OWNER_EMAIL is corrected and Stripe retries.
  if (agents.length) {
    const m = agentEmail(order);
    await send(env, { to: agents, ...m, replyTo: owner[0], idempotencyKey: `${event.id}-agent-${agents.join(",")}-${owner[0] || ""}` });
    sent.push("agent");
  }
  if (owner.length) {
    const m = ownerEmail(order);
    await send(env, { to: owner, ...m, replyTo: order.email, idempotencyKey: `${event.id}-owner-${owner.join(",")}` });
    sent.push("owner");
  }
  return { sent, ref: order.ref };
}
