import { BidCreateClient } from "./bid-create-client";

export const metadata = { title: "Add Bid" };

function positive(value?: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default async function BidCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; bidder?: string }>;
}) {
  const { listing, bidder } = await searchParams;
  return <BidCreateClient jobId={positive(listing)} sellerId={positive(bidder)} />;
}
