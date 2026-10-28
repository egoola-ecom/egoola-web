import { BidsClient } from "./bids-client";

export const metadata = { title: "Bidding" };

export default async function BiddingPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; bidder?: string; status?: string }>;
}) {
  const { listing, bidder, status } = await searchParams;
  return <BidsClient listing={listing} bidder={bidder} initialStatus={status} />;
}
