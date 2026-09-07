import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { Db } from "mongodb";

export interface ZohoMailboxAccount {
  key: "principal" | "info" | "account";
  email: string;
  name: string;
}

export const ZOHO_MAILBOXES: ZohoMailboxAccount[] = [
  { key: "principal", email: "principal@juniordpsdarbhanga.com", name: "Principal Office" },
  { key: "info", email: "info@juniordpsdarbhanga.com", name: "General Inquiries" },
  { key: "account", email: "account@juniordpsdarbhanga.com", name: "Accounts & Fees" },
];

let isSyncing = false;
let lastSyncTimestamp: string | null = null;
let lastSyncStats = {
  syncedTotal: 0,
  lastChecked: null as string | null,
  errorCount: 0,
  mailboxStatus: {} as Record<string, { status: string; lastChecked?: string; newEmails?: number; error?: string }>,
};

let cachedDbCredentials: Record<string, string> = {};

export function setCachedCredentials(creds: Record<string, string>) {
  cachedDbCredentials = { ...cachedDbCredentials, ...creds };
}

export async function loadDbCredentials(getDb: () => Promise<Db | null>) {
  try {
    const db = await getDb();
    if (!db) return;
    const doc = await db.collection("admin_settings").findOne({ _id: "mailbox_credentials" as any });
    if (doc && doc.credentials) {
      cachedDbCredentials = { ...cachedDbCredentials, ...doc.credentials };
    }
  } catch (err) {
    console.error("[Zoho IMAP] Error loading db credentials:", err);
  }
}

export async function saveDbCredentials(
  getDb: () => Promise<Db | null>,
  credentials: Record<string, string>
) {
  cachedDbCredentials = { ...cachedDbCredentials, ...credentials };
  const db = await getDb();
  if (db) {
    await db.collection("admin_settings").updateOne(
      { _id: "mailbox_credentials" as any },
      {
        $set: {
          credentials: cachedDbCredentials,
          updated_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }
}

export function getCredentialsConfigStatus() {
  return {
    principal: !!getZohoPassword("principal"),
    info: !!getZohoPassword("info"),
    account: !!getZohoPassword("account"),
    hasAny: !!(getZohoPassword("principal") || getZohoPassword("info") || getZohoPassword("account")),
  };
}

export function getSyncStatus() {
  return {
    isSyncing,
    lastSyncTimestamp,
    stats: lastSyncStats,
    credentials: getCredentialsConfigStatus(),
  };
}

function getZohoPassword(key: "principal" | "info" | "account"): string | null {
  let pass: string | undefined;
  if (key === "principal") {
    pass =
      cachedDbCredentials.principal ||
      process.env.ZOHO_SMTP_PASS_PRINCIPAL ||
      process.env.ZOHO_IMAP_PASS_PRINCIPAL ||
      process.env.ZOHO_SMTP_PASS;
  } else if (key === "info") {
    pass =
      cachedDbCredentials.info ||
      process.env.ZOHO_SMTP_PASS_INFO ||
      process.env.ZOHO_IMAP_PASS_INFO ||
      process.env.ZOHO_SMTP_PASS;
  } else if (key === "account") {
    pass =
      cachedDbCredentials.account ||
      process.env.ZOHO_SMTP_PASS_ACCOUNT ||
      process.env.ZOHO_IMAP_PASS_ACCOUNT ||
      process.env.ZOHO_SMTP_PASS;
  }
  if (!pass) return null;
  return pass.replace(/[\s-]+/g, "").trim();
}

function getZohoImapHost(): string {
  if (process.env.ZOHO_IMAP_HOST) return process.env.ZOHO_IMAP_HOST;
  if (process.env.ZOHO_SMTP_HOST) {
    return process.env.ZOHO_SMTP_HOST.replace(/^smtp\./i, "imap.");
  }
  return "imap.zoho.com";
}

function getZohoImapPort(): number {
  if (process.env.ZOHO_IMAP_PORT) {
    return parseInt(process.env.ZOHO_IMAP_PORT, 10) || 993;
  }
  return 993;
}

function formatZohoError(err: any): string {
  const msg = err?.message || String(err);
  if (/AUTHENTICATIONFAILED/i.test(msg) || /invalid credentials/i.test(msg)) {
    return "Zoho rejected credentials. If you are on the Zoho Free plan, Zoho disables IMAP access. Check App Password or use Zoho Webmail (mail.zoho.com).";
  }
  if (/disabled/i.test(msg) && /imap/i.test(msg)) {
    return "IMAP access is disabled in your Zoho account settings (common on Zoho Free tier).";
  }
  if (/ETIMEDOUT|timeout/i.test(msg)) {
    return "Connection to Zoho IMAP server timed out.";
  }
  return msg;
}

export async function testZohoAccountConnection(
  mailboxKey: "principal" | "info" | "account"
): Promise<{
  configured: boolean;
  email: string;
  host: string;
  port: number;
  success: boolean;
  message: string;
}> {
  const mb = ZOHO_MAILBOXES.find((m) => m.key === mailboxKey) || ZOHO_MAILBOXES[0];
  const password = getZohoPassword(mailboxKey);
  const host = getZohoImapHost();
  const port = getZohoImapPort();

  if (!password) {
    return {
      configured: false,
      email: mb.email,
      host,
      port,
      success: false,
      message: `No app password configured for ${mb.email}. Please set it in Settings or environment secrets.`,
    };
  }

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user: mb.email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
  });

  try {
    await client.connect();
    const status = await client.status("INBOX", { messages: true, unseen: true });
    await client.logout();
    return {
      configured: true,
      email: mb.email,
      host,
      port,
      success: true,
      message: `Connected successfully! Inbox has ${status.messages || 0} total messages (${status.unseen || 0} unread).`,
    };
  } catch (err: any) {
    try {
      await client.logout();
    } catch {}
    return {
      configured: true,
      email: mb.email,
      host,
      port,
      success: false,
      message: formatZohoError(err),
    };
  }
}

export async function syncSingleMailbox(
  mailbox: ZohoMailboxAccount,
  getDb: () => Promise<Db | null>,
  liveMessages: any[]
): Promise<{ success: boolean; newCount: number; error?: string }> {
  const password = getZohoPassword(mailbox.key);
  if (!password) {
    return {
      success: false,
      newCount: 0,
      error: `No app password configured for ${mailbox.email}`,
    };
  }

  const candidateHosts = Array.from(new Set([getZohoImapHost(), "imappro.zoho.com", "imap.zoho.in"]));
  const port = getZohoImapPort();

  let lastErr: any = null;
  let client: ImapFlow | null = null;

  for (const host of candidateHosts) {
    try {
      client = new ImapFlow({
        host,
        port,
        secure: port === 993,
        auth: {
          user: mailbox.email,
          pass: password,
        },
        logger: false,
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
      });

      await client.connect();
      // If connected successfully, break out of candidate loop
      break;
    } catch (err: any) {
      lastErr = err;
      if (client) {
        try {
          await client.logout();
        } catch {}
      }
      client = null;
      // If auth failed, other hosts will also fail with same auth, break early
      if (/AUTHENTICATIONFAILED|invalid credentials|disabled/i.test(err?.message || "")) {
        break;
      }
    }
  }

  if (!client) {
    return {
      success: false,
      newCount: 0,
      error: formatZohoError(lastErr),
    };
  }

  let newCount = 0;

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true });
      const totalMessages = status.messages || 0;

      if (totalMessages > 0) {
        // Fetch up to the last 35 messages to find recent incoming mail and replies
        const startSeq = Math.max(1, totalMessages - 35);
        const range = `${startSeq}:*`;

        const messages = client.fetch(range, {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
        });

        const db = await getDb();

        for await (const msg of messages) {
          try {
            const rawSource = msg.source;
            if (!rawSource) continue;

            const parsed = await simpleParser(rawSource);
            const messageId = parsed.messageId || `${mailbox.key}-${msg.uid}`;

            // Check if already exists in DB or live array
            let alreadyExists = false;
            if (db) {
              const existing = await db.collection("incoming_emails").findOne({
                $or: [{ message_id: messageId }, { id: `zoho-${msg.uid}-${mailbox.key}` }],
              });
              if (existing) alreadyExists = true;
            }

            if (!alreadyExists) {
              const inLive = liveMessages.find(
                (m) => m.message_id === messageId || m.id === `zoho-${msg.uid}-${mailbox.key}`
              );
              if (inLive) alreadyExists = true;
            }

            if (!alreadyExists) {
              const fromVal = parsed.from?.value?.[0];
              const fromAddress = fromVal?.address || "sender@external.com";
              const fromName = fromVal?.name || fromAddress.split("@")[0] || "External Sender";

              // Don't import emails that were sent by the school itself to itself as incoming inbox spam
              const isSelf = fromAddress.toLowerCase().trim() === mailbox.email.toLowerCase().trim();

              const toArr = Array.isArray(parsed.to)
                ? parsed.to.flatMap((t: any) => t.value.map((v: any) => v.address))
                : parsed.to?.value?.map((v: any) => v.address) || [mailbox.email];

              const newMsg = {
                id: `zoho-${msg.uid}-${mailbox.key}`,
                message_id: messageId,
                mailbox: mailbox.key,
                direction: isSelf ? "outbound" : "inbound",
                from: fromAddress,
                from_name: fromName,
                to: toArr,
                reply_to: parsed.replyTo?.value?.[0]?.address || fromAddress,
                subject: parsed.subject || "(No Subject)",
                body: parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, " ").trim() : "(No text body)"),
                html: parsed.html || undefined,
                status: msg.flags?.has("\\Seen") ? "read" : "unread",
                starred: msg.flags?.has("\\Flagged") || false,
                tags: ["Zoho Mail", mailbox.key, isSelf ? "Sent" : "Inbox"],
                created_at: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
                delivery_info: {
                  source: "zoho_imap",
                  uid: msg.uid,
                  received_at: new Date().toISOString(),
                },
              };

              liveMessages.unshift(newMsg);
              if (db) {
                await db.collection("incoming_emails").insertOne({
                  ...newMsg,
                  _id: newMsg.id as any,
                });
              }

              newCount++;
            }
          } catch (itemErr) {
            console.error(`[Zoho IMAP] Error parsing single message UID ${msg.uid}:`, itemErr);
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return { success: true, newCount };
  } catch (err: any) {
    try {
      await client.logout();
    } catch {}
    return { success: false, newCount, error: err?.message || String(err) };
  }
}

export async function syncAllZohoMailboxes(
  getDb: () => Promise<Db | null>,
  liveMessages: any[]
): Promise<{ totalNew: number; results: Record<string, any> }> {
  if (isSyncing) {
    return { totalNew: 0, results: { note: "Sync already in progress" } };
  }

  isSyncing = true;
  let totalNew = 0;
  const results: Record<string, any> = {};

  try {
    for (const mb of ZOHO_MAILBOXES) {
      const res = await syncSingleMailbox(mb, getDb, liveMessages);
      results[mb.key] = res;
      if (res.success) {
        totalNew += res.newCount;
        lastSyncStats.mailboxStatus[mb.key] = {
          status: "healthy",
          lastChecked: new Date().toISOString(),
          newEmails: res.newCount,
        };
      } else {
        lastSyncStats.errorCount++;
        lastSyncStats.mailboxStatus[mb.key] = {
          status: "error",
          lastChecked: new Date().toISOString(),
          error: res.error,
        };
      }
    }

    lastSyncTimestamp = new Date().toISOString();
    lastSyncStats.syncedTotal += totalNew;
    lastSyncStats.lastChecked = lastSyncTimestamp;
    if (totalNew > 0) {
      console.log(`[Zoho IMAP] Successfully synced ${totalNew} new message(s) across mailboxes.`);
    }
  } catch (err) {
    console.error("[Zoho IMAP] Global sync failure:", err);
  } finally {
    isSyncing = false;
  }

  return { totalNew, results };
}
