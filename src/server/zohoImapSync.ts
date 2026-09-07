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

export function getSyncStatus() {
  return {
    isSyncing,
    lastSyncTimestamp,
    stats: lastSyncStats,
  };
}

function getZohoPassword(key: "principal" | "info" | "account"): string | null {
  let pass: string | undefined;
  if (key === "principal") {
    pass = process.env.ZOHO_SMTP_PASS_PRINCIPAL || process.env.ZOHO_IMAP_PASS_PRINCIPAL || process.env.ZOHO_SMTP_PASS;
  } else if (key === "info") {
    pass = process.env.ZOHO_SMTP_PASS_INFO || process.env.ZOHO_IMAP_PASS_INFO || process.env.ZOHO_SMTP_PASS;
  } else if (key === "account") {
    pass = process.env.ZOHO_SMTP_PASS_ACCOUNT || process.env.ZOHO_IMAP_PASS_ACCOUNT || process.env.ZOHO_SMTP_PASS;
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

  const host = getZohoImapHost();
  const port = getZohoImapPort();

  const client = new ImapFlow({
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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  let newCount = 0;

  try {
    await client.connect();

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
