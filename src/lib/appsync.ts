/**
 * AppSync GraphQL helper for Next.js API routes.
 *
 * Amplify Hosting SSR does NOT provide IAM credentials to Next.js,
 * so we use the AppSync API with API key auth instead of raw DynamoDB SDK.
 * This matches the pattern used in Carmen AI (dishroll.com/p/[shortCode]).
 */

const APPSYNC_URL =
  process.env.APPSYNC_URL ||
  "https://eulil66r6rg6fny2nsfr4hfhsm.appsync-api.us-east-2.amazonaws.com/graphql";

const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY || "";

interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function appsyncQuery<T = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphQLResponse<T>> {
  const response = await fetch(APPSYNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": APPSYNC_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AppSync request failed: ${response.status}`);
  }

  return response.json();
}

// ── Deliverable queries ─────────────────────────────────────────────────────

export interface DeliverableRecord {
  gigId: string;
  deliverableId: string;
  type: string;
  title: string;
  s3Key: string | null;
  publicUrl: string | null;
  shortCode: string | null;
  createdAt: string;
}

export async function getDeliverableByShortCode(
  shortCode: string,
): Promise<DeliverableRecord | null> {
  const query = `
    query GetDeliverableByShortCode($shortCode: String!) {
      getDeliverableByShortCode(shortCode: $shortCode) {
        items {
          gigId
          deliverableId
          type
          title
          s3Key
          publicUrl
          shortCode
          createdAt
        }
      }
    }
  `;

  const result = await appsyncQuery<{
    getDeliverableByShortCode: { items: DeliverableRecord[] };
  }>(query, { shortCode });

  const items = result.data?.getDeliverableByShortCode?.items;
  return items?.[0] || null;
}

// ── DeliverableAccess queries ───────────────────────────────────────────────

export async function getDeliverableAccess(
  shortCode: string,
  phone: string,
): Promise<{ code: string; expiresAt: number; verified: boolean } | null> {
  const query = `
    query GetDeliverableAccess($shortCode: String!, $phone: String!) {
      getDeliverableAccess(shortCode: $shortCode, phone: $phone) {
        shortCode
        phone
        code
        expiresAt
        verified
      }
    }
  `;

  const result = await appsyncQuery<{
    getDeliverableAccess: { code: string; expiresAt: number; verified: boolean } | null;
  }>(query, { shortCode, phone });

  return result.data?.getDeliverableAccess || null;
}

export async function putDeliverableAccess(
  shortCode: string,
  phone: string,
  code: string,
  expiresAt: number,
): Promise<void> {
  const mutation = `
    mutation UpdateDeliverableAccess($input: UpdateDeliverableAccessInput!) {
      updateDeliverableAccess(input: $input) {
        shortCode
        phone
      }
    }
  `;

  const result = await appsyncQuery(mutation, {
    input: { shortCode, phone, code, expiresAt, verified: false },
  });

  if (result.errors?.length) {
    const createMutation = `
      mutation CreateDeliverableAccess($input: CreateDeliverableAccessInput!) {
        createDeliverableAccess(input: $input) {
          shortCode
          phone
        }
      }
    `;
    await appsyncQuery(createMutation, {
      input: { shortCode, phone, code, expiresAt, verified: false },
    });
  }
}

// ── GigParticipant queries ──────────────────────────────────────────────────

export async function getGigParticipant(
  gigId: string,
  phone: string,
): Promise<{ gigId: string; phone: string; role: string } | null> {
  const query = `
    query GetGigParticipant($gigId: ID!, $phone: String!) {
      getGigParticipant(gigId: $gigId, phone: $phone) {
        gigId
        phone
        role
      }
    }
  `;

  const result = await appsyncQuery<{
    getGigParticipant: { gigId: string; phone: string; role: string } | null;
  }>(query, { gigId, phone });

  return result.data?.getGigParticipant || null;
}

// ── User queries ────────────────────────────────────────────────────────────

export async function getUserByPhone(
  phone: string,
): Promise<{ id: string; phone: string }[]> {
  const query = `
    query GetUserByPhone($phone: String!) {
      getUserByPhone(phone: $phone) {
        items {
          id
          phone
        }
      }
    }
  `;

  const result = await appsyncQuery<{
    getUserByPhone: { items: { id: string; phone: string }[] };
  }>(query, { phone });

  return result.data?.getUserByPhone?.items || [];
}

export async function listGigsByOwner(
  ownerId: string,
): Promise<{ id: string; ownerId: string }[]> {
  const query = `
    query ListGigsByOwner($ownerId: ID!) {
      listGigsByOwner(ownerId: $ownerId) {
        items {
          id
          ownerId
        }
      }
    }
  `;

  const result = await appsyncQuery<{
    listGigsByOwner: { items: { id: string; ownerId: string }[] };
  }>(query, { ownerId });

  return result.data?.listGigsByOwner?.items || [];
}

// ── Gig queries ─────────────────────────────────────────────────────────────

export interface GigRecord {
  id: string;
  title: string;
  type: string | null;
  metadata: string | null;
}

export async function getGig(gigId: string): Promise<GigRecord | null> {
  const query = `
    query GetGig($id: ID!) {
      getGig(id: $id) {
        id
        title
        type
        metadata
      }
    }
  `;

  const result = await appsyncQuery<{
    getGig: GigRecord | null;
  }>(query, { id: gigId });

  return result.data?.getGig || null;
}

// ── Config ──────────────────────────────────────────────────────────────────

/** True when the AppSync API key is present so server-side writes can succeed. */
export function isAppsyncConfigured(): boolean {
  return Boolean(APPSYNC_API_KEY && APPSYNC_URL);
}

// ── User upsert (web gig creation) ──────────────────────────────────────────

export interface UserRecord {
  id: string;
  phone: string;
  name: string | null;
  plan: string | null;
}

export async function findUserByPhone(phone: string): Promise<UserRecord | null> {
  const query = `
    query GetUserByPhone($phone: String!) {
      getUserByPhone(phone: $phone) {
        items { id phone name plan }
      }
    }
  `;
  const result = await appsyncQuery<{
    getUserByPhone: { items: UserRecord[] };
  }>(query, { phone });
  return result.data?.getUserByPhone?.items?.[0] || null;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const query = `
    query GetUserByEmail($email: String!) {
      getUserByEmail(email: $email) {
        items { id phone name plan }
      }
    }
  `;
  const result = await appsyncQuery<{
    getUserByEmail: { items: UserRecord[] };
  }>(query, { email });
  return result.data?.getUserByEmail?.items?.[0] || null;
}

export async function createUserRecord(phone: string, name?: string): Promise<UserRecord> {
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const mutation = `
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        id phone name plan
      }
    }
  `;
  const result = await appsyncQuery<{ createUser: UserRecord }>(mutation, {
    input: {
      id,
      phone,
      ...(name ? { name } : {}),
      plan: "free",
      onboardingComplete: false,
    },
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  return result.data?.createUser || { id, phone, name: name ?? null, plan: "free" };
}

// ── Gig + Message creation (web gig creation) ───────────────────────────────

export interface CreateGigArgs {
  ownerId: string;
  title: string;
  description: string;
  type: string;
  shortCode: string;
  metadata: string;
}

export interface CreatedGig {
  id: string;
  shortCode: string;
}

export async function createGigRecord(args: CreateGigArgs): Promise<CreatedGig> {
  const id = `gig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const mutation = `
    mutation CreateGig($input: CreateGigInput!) {
      createGig(input: $input) { id shortCode }
    }
  `;
  const result = await appsyncQuery<{ createGig: { id: string; shortCode: string } }>(mutation, {
    input: {
      id,
      ownerId: args.ownerId,
      title: args.title,
      description: args.description,
      type: args.type,
      status: "active",
      shortCode: args.shortCode,
      metadata: args.metadata,
    },
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
  return { id: result.data?.createGig?.id || id, shortCode: args.shortCode };
}

export async function createGigParticipantRecord(
  gigId: string,
  phone: string,
  userId: string,
  name?: string,
): Promise<void> {
  const mutation = `
    mutation CreateGigParticipant($input: CreateGigParticipantInput!) {
      createGigParticipant(input: $input) { gigId phone }
    }
  `;
  await appsyncQuery(mutation, {
    input: {
      gigId,
      phone,
      userId,
      role: "owner",
      ...(name ? { name } : {}),
      isGuest: false,
      joinedAt: new Date().toISOString(),
    },
  });
}

export async function createMessageRecord(
  gigId: string,
  senderId: string,
  senderName: string,
  body: string,
): Promise<void> {
  const mutation = `
    mutation CreateMessage($input: CreateMessageInput!) {
      createMessage(input: $input) { gigId timestamp }
    }
  `;
  const result = await appsyncQuery(mutation, {
    input: {
      gigId,
      timestamp: new Date().toISOString(),
      senderId,
      senderName,
      body,
      messageType: "sms",
      direction: "inbound",
    },
  });
  if (result.errors?.length) {
    throw new Error(result.errors.map((e) => e.message).join("; "));
  }
}

// ── Media queries ──────────────────────────────────────────────────────────

export interface MediaRecord {
  gigId: string;
  mediaId: string;
  s3Key: string;
  type: string | null;
  uploadedBy: string | null;
  caption: string | null;
}

export async function listMediaByGigId(
  gigId: string,
): Promise<MediaRecord[]> {
  const query = `
    query ListMedia($gigId: ID!) {
      listMedia(filter: { gigId: { eq: $gigId } }) {
        items {
          gigId
          mediaId
          s3Key
          type
          uploadedBy
          caption
        }
      }
    }
  `;

  const result = await appsyncQuery<{
    listMedia: { items: MediaRecord[] };
  }>(query, { gigId });

  return result.data?.listMedia?.items || [];
}
