"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCategories, listCities, listGigs, listThanas } from "@/lib/buyer/catalog-repo";
import type { GeoRow } from "@/lib/buyer/fixtures/geography";
import type { GigRow, PublicCategory } from "@/lib/buyer/types";
import { GigCard } from "./gig-card";
import { OwlCarousel } from "./owl-carousel";
import { PRODUCT_TYPES, SHOP } from "./shop-links";
import { taka } from "./money";

/** The legacy home page breaks a category name over two lines: the first word,
 * then the second (or "A & B" then the third). */
function TwoLine({ name }: { name: string }) {
  const words = name.split(" ").slice(0, 3);
  if (words.length < 2) return <>{name}</>;
  if (words[1] === "&" && words.length === 3) return <>{words[0]} {words[1]}<br />{words[2]}</>;
  return <>{words[0]}<br />{words[1]}</>;
}

const BANNERS = ["/shop/images/banner/1708268387Jz24NpRjwA.jpg", "/shop/images/banner/1708268419HRe2ONLY08.jpg"];

/** The buyer home (services side), laid out like the legacy home page. */
export function HomeScreen() {
  const [grands, setGrands] = useState<PublicCategory[]>([]);
  const [parents, setParents] = useState<Record<number, PublicCategory[]>>({});
  const [cities, setCities] = useState<GeoRow[]>([]);
  const [thanas, setThanas] = useState<GeoRow[]>([]);
  const [city, setCity] = useState("");
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [total, setTotal] = useState(0);
  const [seeAll, setSeeAll] = useState(false);

  useEffect(() => {
    void (async () => {
      const top = await listCategories({ type: "service", page_size: 100 });
      setGrands(top.results);
      const entries = await Promise.all(
        top.results.map(async (g) => [g.id, (await listCategories({ parent_id: g.id, page_size: 100 })).results] as const),
      );
      setParents(Object.fromEntries(entries));
      setCities(await listCities({ country: 126 }));
      const feed = await listGigs({ page_size: 12 });
      setGigs(feed.results);
      setTotal(feed.count);
    })();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!city) { setThanas([]); return; }
    void listThanas(Number(city)).then(setThanas);
  }, [city]);

  const topSeller = gigs.slice(0, 4);
  const topBuyer = gigs.slice(4, 6);
  const mobileGrands = seeAll ? grands : grands.slice(0, 12);

  return (
    <>
      <div className="container-fluid p-587">
        <div className="row border-top border-bottom">
          <div className="category-area">
            <div className="categoey">
              <Link href={SHOP.services} className="pl-md-1 pl-lg-2">
                <i className="fas fa-list-ul mr-1" />All Category <i className="fas fa-caret-down ml-1" />
              </Link>
            </div>
          </div>
          <div className="services-mane">
            <ul style={{ marginBottom: -7 }} />
          </div>
        </div>
      </div>

      <div className="container-fluid p-587 hero-sec">
        <div className="row position-relative">
          <div className="col-lg-3" style={{ paddingRight: 0 }}>
            <ul id="categoris" className="m-0 pb-3 bg-ddd">
              {grands.map((grand) => (
                <li key={grand.id}>
                  <Link href={SHOP.category(grand.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img width={20} src={grand.image_url ?? ""} alt={grand.name} /> {grand.name}
                    <i className="fas fa-angle-right" />
                  </Link>
                  <div className="subCategory">
                    <div className="row bg-white p-4 d-flex align-items-baseline" style={{ minHeight: "0%" }}>
                      {(parents[grand.id] ?? []).map((parent) => (
                        <div key={parent.id} className="col-md-3 py-1">
                          <Link href={SHOP.category(parent.id)}>
                            <h6>{parent.name_bn ? `${parent.name} (${parent.name_bn})` : parent.name}</h6>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-lg-9">
            <div className="banner_top">
              <form action={SHOP.services} method="GET">
                <div className="row depandency mx-2 my-2">
                  <div className="col-lg-3 m-0 px-0 switch-user">
                    <div className="float-left">
                      <Link href={SHOP.services}>
                        <div className="float-left py-2 pr-2 text-success txt-switch"><b>Services</b></div>
                      </Link>
                      <Link href={SHOP.projects} className="switch inline float-left m-0">
                        <div className="inner-switch" />
                      </Link>
                      <Link href={SHOP.projects} className="float-right pl-2">
                        <div className="py-2 pr-2 txt-switch"><b>Projects</b></div>
                      </Link>
                    </div>
                  </div>
                  <div className="col-lg-3 m-0 rs-cn">
                    <select disabled className="form-control shadow">
                      <option>Bangladesh</option>
                    </select>
                  </div>
                  <div className="col-6 col-lg-3 m-0 shd">
                    <select id="selCity" className="selMenu form-control shadow" value={city} onChange={(e) => setCity(e.target.value)}>
                      <option value="" disabled>Select Current District</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-lg-3 m-0 pr-0">
                    <select id="selThana" className="selMenu form-control shadow" defaultValue="">
                      <option value="" disabled>Select Current Thana</option>
                      {thanas.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="rounded banner-area p-2">
              <OwlCarousel id="banner" autoplayMs={5000}>
                {BANNERS.map((src) => (
                  <div key={src} className="banner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Banner" />
                  </div>
                ))}
              </OwlCarousel>
              <div className="d-flex banner-area-btm justify-content-between pt-2">
                {PRODUCT_TYPES.map((type) => (
                  <div key={type.slug} className="text-center px-1">
                    <Link href={`${SHOP.products}/${type.slug}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={type.image} className="rounded" height={35} width={35} alt="" /><br />
                      <p className="mb-0 pt-1">{type.label}</p>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
            <div className="mx-0 bg-white rs-link d-flex justify-content-between text-center px-3 py-4">
              {PRODUCT_TYPES.map((type) => (
                <Link key={type.slug} href={`${SHOP.products}/${type.slug}`} className="btn btn-success feature-btn-link font-weight-bold px-4 py-2">
                  <span>{type.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid my-3 bg-white resp">
        <div className="row pt-1">
          <div className="col-12">
            <div className="search-icon mt-2">
              <form className="d-flex justify-content-between" method="GET" action={SHOP.services}>
                <input id="searchInM" className="form-control mr-sm-2" name="search" placeholder="What are you looking for ..." />
                <button className="btn search-submit text-light" id="searchBtnM" type="submit">
                  <i className="fas fa-search pr-1 pt-1" />
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="row text-center py-2" id="seeMenuParent">
          <div className="menuArrow" style={{ display: seeAll ? undefined : "none" }} onClick={() => setSeeAll(false)}>
            <i className="fas fa-chevron-up" />
          </div>
          {mobileGrands.map((grand) => (
            <div key={grand.id} className="col-3 p-1 seeMenu">
              <Link href={SHOP.category(grand.id)}>
                <div className="py-3 bgdk">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={grand.image_url ?? ""} className="pb-2" width={30} alt="" /><br />
                  <p className="mb-0"><TwoLine name={grand.name} /></p>
                </div>
              </Link>
            </div>
          ))}
          {!seeAll && (
            <div className="seeMore" onClick={() => setSeeAll(true)}>
              <i className="fas fa-chevron-down" />
            </div>
          )}
        </div>
      </div>

      <div className="container-fluid p-587">
        <div className="row py-2 px-2">
          <div className="col-12 col-md-6 arrival bg-ddd bg-sh py-3">
            <h4 className="mb-3">
              <span className="text-white text-center circle"><i className="fa fa-bolt" /></span> Top <strong className="text-success">Seller</strong>
            </h4>
            <div className="row">
              {topSeller.map((gig, i) => (
                <div key={gig.id} className={`col-6 col-lg-3 text-center p-2 ${i > 1 ? "m-hideP" : ""}`}>
                  <Link href={SHOP.gig(gig.id, gig.slug)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img width="100%" height="72%" className="pb-3" src={gig.image_url ?? ""} alt={gig.title} />
                    <h6>
                      BDT {taka(gig.discounted_price)}
                      <div className="text-truncate">{gig.title}</div>
                    </h6>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div className="col-12 col-md-6 global bg-ddd bg-sh py-3">
            <h4 className="mb-3">
              <span className="text-white text-center circle"><i className="fas fa-ribbon" /></span> Top <strong className="text-success">Buyer</strong>
            </h4>
            <div className="row">
              {topBuyer.map((gig) => (
                <div key={gig.id} className="col-6 col-lg-3 text-center p-2">
                  <Link href={SHOP.gig(gig.id, gig.slug)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img width="100%" height="72%" className="pb-3" src={gig.image_url ?? ""} alt={gig.title} />
                    <h6>
                      BDT {taka(gig.discounted_price)}
                      <div className="text-truncate">{gig.title}</div>
                    </h6>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid product_wrap p-58">
        <div>
          <div className="row py-2 heading">
            <div className="col-6">
              <h4><strong id="serCount">{total}</strong> Services <strong className="text-success">Available</strong></h4>
            </div>
            <div className="col-6 text-right">
              Short By{" "}
              <div className="dropdown" style={{ display: "inline", position: "unset" }}>
                <button className="btn dropdown-toggle shortBy" type="button" style={{ position: "relative" }}>Select Short</button>
              </div>
            </div>
          </div>
          <div className="row justify-content-start">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
