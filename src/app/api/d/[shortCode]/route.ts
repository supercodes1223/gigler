import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDeliverableByShortCode, getGig, listMediaByGigId } from "@/lib/appsync";
import { verifyCookie, COOKIE_NAME } from "@/lib/deliverable-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  try {
    const deliverable = await getDeliverableByShortCode(shortCode);
    if (!deliverable) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(COOKIE_NAME)?.value;
    if (!accessCookie || !verifyCookie(accessCookie, shortCode)) {
      return NextResponse.json(
        {
          error: "Verification required",
          code: "AUTH_REQUIRED",
          title: deliverable.title,
          type: deliverable.type,
          createdAt: deliverable.createdAt,
        },
        { status: 401 },
      );
    }

    const [gig, media] = await Promise.all([
      getGig(deliverable.gigId),
      listMediaByGigId(deliverable.gigId),
    ]);
    const metadata = gig?.metadata ? JSON.parse(gig.metadata) : {};

    return NextResponse.json({
      deliverable: {
        gigId: deliverable.gigId,
        deliverableId: deliverable.deliverableId,
        type: deliverable.type,
        title: deliverable.title,
        shortCode: deliverable.shortCode,
        createdAt: deliverable.createdAt,
        s3Key: deliverable.s3Key,
      },
      gig: gig ? { title: gig.title, type: gig.type } : null,
      metadata,
      media: media.map((m) => ({
        mediaId: m.mediaId,
        s3Key: m.s3Key,
        type: m.type,
        uploadedBy: m.uploadedBy,
        caption: m.caption,
      })),
    });
  } catch (err) {
    console.error("[API/d] Failed to serve deliverable:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
