"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listOrders, orderProblem, type OrderRow } from "@/lib/buyer/buyer-orders-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { isInvalidPage } from "@/lib/buyer/public-fetch";
import type { PageResult } from "@/lib/buyer/types";
import { resolveMediaUrl } from "@/lib/env";
import { Pager } from "../browse/pager";
import { useQueryParams } from "../browse/use-query-params";
import { dateText } from "../jobs/job-status";
import { taka } from "../money";
import { SHOP } from "../shop-links";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-status";

const PAGE_SIZE = 10;

export function OrdersScreen() {
  const router = useRouter();
  const { get, update } = useQueryParams();
  const page = Math.max(1, Number(get("page")) || 1);

  const [data, setData] = useState<PageResult<OrderRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastEnd, setPastEnd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    setPastEnd(false);
    listOrders({ page, page_size: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname + window.location.search));
        else if (isInvalidPage(err)) setPastEnd(true);
        else setError(orderProblem(err).general);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="container-fluid p-587 my-3">
      <h4 className="mb-3">My orders</h4>

      {error ? (
        <p className="text-danger text-center py-5" role="alert">
          {error}
        </p>
      ) : pastEnd ? (
        <div className="text-center py-5" data-testid="past-end">
          <p className="text-muted">There are no more orders to show.</p>
          <button type="button" className="btn btn-success btn-sm" onClick={() => update({ page: undefined })}>
            Back to the first page
          </button>
        </div>
      ) : !data ? (
        <p className="text-muted text-center py-5">Loading…</p>
      ) : data.count === 0 ? (
        <div className="bg-white text-center p-5" data-testid="orders-empty">
          <h5>You haven&apos;t placed an order yet</h5>
          <p className="text-muted">Add something to your cart and check out.</p>
          <Link className="btn btn-success" href={SHOP.products}>
            Browse products
          </Link>
        </div>
      ) : (
        <>
          <p className="text-muted small">
            {data.count} {data.count === 1 ? "order" : "orders"}
          </p>
          <div data-testid="orders-list">
            {data.results.map((order) => {
              const avatar = resolveMediaUrl(order.seller?.profile_pic_url ?? null);
              return (
                <Link
                  key={order.id}
                  href={SHOP.order(order.id)}
                  className="d-block bg-white border rounded p-3 mb-2 text-dark text-decoration-none"
                  data-testid="order-row"
                  data-order-id={order.id}
                >
                  <div className="d-flex justify-content-between flex-wrap align-items-center">
                    <div className="d-flex align-items-center">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="" width={36} height={36} className="rounded-circle mr-2" style={{ objectFit: "cover" }} />
                      ) : (
                        <span
                          className="rounded-circle bg-light border d-inline-flex align-items-center justify-content-center mr-2"
                          style={{ width: 36, height: 36 }}
                          aria-hidden
                        >
                          <i className="fas fa-store" />
                        </span>
                      )}
                      <div>
                        <strong>{order.seller?.name ?? "Egoola"}</strong>
                        <div className="small text-muted">
                          Order #{order.id} · placed {dateText(order.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="mt-2 small d-flex justify-content-between flex-wrap">
                    <span>
                      To pay: <strong data-testid="order-payable">{taka(order.payable)}</strong>
                    </span>
                    <span>
                      Payment: <PaymentStatusBadge status={order.payment_status} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pager page={data.page} totalPages={data.total_pages} onPage={(n) => update({ page: String(n) })} />
        </>
      )}
    </div>
  );
}
