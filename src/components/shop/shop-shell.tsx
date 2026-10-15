"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession, type AuthSession } from "@/lib/auth";
import { listCategories } from "@/lib/buyer/catalog-repo";
import type { PublicCategory } from "@/lib/buyer/types";
import { SHOP } from "./shop-links";

const LOGO = "/shop/images/logo/1650083902k3PCiT6eGl.png";

/** The page frame of every Buyer Web screen: the category slide-over (mobile),
 * the top bar, the My Egoola side menu, the bottom bar (mobile) and the footer.
 * The markup and class names follow the legacy `master.blade.php`; Bootstrap's
 * dropdown and collapse scripts are replaced by React state. */
export function ShopShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"menu" | "category">("menu");
  const [grands, setGrands] = useState<PublicCategory[]>([]);
  const [activeGrand, setActiveGrand] = useState<number | null>(null);
  const [children2, setChildren2] = useState<PublicCategory[]>([]);

  useEffect(() => {
    // localStorage is only there on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getSession("buyer"));
    void listCategories({ type: "service", page_size: 100 }).then((page) => setGrands(page.results));
  }, []);

  useEffect(() => {
    if (activeGrand == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChildren2([]);
      return;
    }
    void listCategories({ parent_id: activeGrand, page_size: 100 }).then((page) => setChildren2(page.results));
  }, [activeGrand]);

  const closeAll = () => {
    setCatOpen(false);
    setSideOpen(false);
  };

  return (
    <>
      <div className="ful" style={{ display: catOpen ? "block" : "none" }}>
        <div className="container-fluid" id="accordionExample">
          <div className="row">
            <div className="col-3 cat-menu" id="cat-menu-div">
              {grands.map((grand) => (
                <div
                  key={grand.id}
                  className={`row menu-row py-3 bg-mn mb-1 ${activeGrand === grand.id ? "active" : ""}`}
                  onClick={() => setActiveGrand(grand.id)}
                >
                  <div className="col">
                    <div className="m-menu text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={grand.image_url ?? ""} title={grand.name} width={30} alt="" />
                      <h6 className="pt-2 mb-0">{grand.name}</h6>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="col-9 par-menu">
              <div className="row">
                <div className="col menu-l">
                  <ul id="ulMenu">
                    {children2.map((child) => (
                      <li key={child.id} className="py-2">
                        <Link href={SHOP.category(child.id)} onClick={closeAll}>
                          {child.name} {child.name_bn && `(${child.name_bn})`}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid nav-menu border-bottom sticky-top bg-white">
        <div className="row">
          <nav className="navbar navbar-expand-lg navbar-light py-0" style={{ width: "100%" }}>
            <Link className="navbar-brand" href={SHOP.home}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} width={200} alt="egoola" />
            </Link>

            <SearchForm className="form-inline search-menu" label="Short by" idSuffix="" />

            <div className="d-flex">
              <div className="notif-icon">
                <Link className="notif-icon" href={SHOP.notifications}>
                  <i className="fas fa-bell" />
                </Link>
              </div>
            </div>

            <div className="collapse navbar-collapse" id="nav-parent">
              <SearchForm className="form-inline text-center search-dropdown" label="services" idSuffix="-d" />

              <div className="row text-center nav-btn">
                <a href="#" className="col-6 pt-3 px-4" onClick={(e) => { e.preventDefault(); setMobilePane("menu"); }}>
                  Menu
                </a>
                <a href="#" className="col-6 pt-3 px-4" onClick={(e) => { e.preventDefault(); setMobilePane("category"); }}>
                  Category
                </a>
              </div>
              <hr />

              <ul
                className={`navbar-nav ml-auto top-menu collaps_menu collapse ${mobilePane === "menu" ? "show" : ""} text-center`}
                id="top-nav"
              >
                <li className="nav-item">
                  <div className="dropdown">
                    <Link className="nav-link menu-icon" href={session ? SHOP.messages : SHOP.login}>
                      <i className="far fa-comment-dots" /> Messages
                    </Link>
                  </div>
                </li>
                <li className="nav-item">
                  <Link className="nav-link menu-icon" href={SHOP.favourites}>
                    <i className="fas fa-heart" /> Favorite
                  </Link>
                </li>
                <li className="nav-item">
                  <div className="dropdown notification">
                    <Link className="nav-link menu-icon" href={session ? SHOP.notifications : SHOP.login}>
                      <i className="fas fa-bell" /> Notification
                    </Link>
                  </div>
                </li>
                <li className="nav-item">
                  <Link className="nav-link menu-icon" href={session ? SHOP.orders : SHOP.login}>
                    <i className="fas fa-hand-holding-usd" /> Orders
                  </Link>
                </li>
                {session ? (
                  <li className="nav-item">
                    <Link className="nav-link menu-icon" href={SHOP.profile}>
                      <i className="fas fa-user-tie" /> {session.name}
                    </Link>
                  </li>
                ) : (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link menu-icon" href={SHOP.login}>
                        <i className="fas fa-user-lock" /> SignUp
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link menu-icon" href={SHOP.login}>
                        <i className="fas fa-unlock-alt" /> SignIn
                      </Link>
                    </li>
                  </>
                )}
              </ul>
              <div className="categoey-nav collaps_menu">
                <ul id="categoey-nav" className={`collapse px-3 ${mobilePane === "category" ? "show" : ""}`}>
                  {grands.map((grand) => (
                    <li key={grand.id}>
                      <Link href={SHOP.category(grand.id)}>{grand.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>
        </div>
      </div>

      <div className="myEgoolaSidebar" id="mySidenav" style={{ width: sideOpen ? 310 : 0 }}>
        <a href="#" className="closebtn" onClick={(e) => { e.preventDefault(); setSideOpen(false); }}>
          &times;
        </a>
        <div className="px-3 pt-4 user d-flex font-weight-bold">
          <div className="rounded-circle icon">
            <i className="fas fa-user" />
          </div>
          <p className="ml-3">{session ? session.name : "Guest User"}</p>
        </div>
        <SideCard title="Account" onNavigate={closeAll} options={[
          { href: SHOP.projects, icon: "fas fa-user", label: "Switch To Projects" },
          ...(session
            ? [{ href: SHOP.profile, icon: "fas fa-user-tie", label: "My Profile" }]
            : [
                { href: SHOP.login, icon: "fas fa-unlock-alt", label: "Sign in" },
                { href: SHOP.login, icon: "fas fa-user-lock", label: "Sign up" },
              ]),
          { href: SHOP.favourites, icon: "fas fa-heart", label: "Favourite" },
        ]} />
        <SideCard title="Tutorial" onNavigate={closeAll} options={[
          { href: "/buyer/create-account", icon: "fas fa-user-plus", label: "How To Create Account" },
          { href: "/buyer/get-service", icon: "fab fa-get-pocket", label: "How To Get Service" },
          { href: "/buyer/sell-service", icon: "fab fa-sellcast", label: "How To Sell Service" },
        ]} />
        <SideCard title="Help & Support" onNavigate={closeAll} options={[
          { href: "/buyer/help", icon: "fas fa-info-circle", label: "Help" },
          { href: "/buyer/about-us", icon: "fas fa-users", label: "About Us" },
          { href: "/buyer/terms", icon: "fas fa-file-alt", label: "Terms & Conditions" },
        ]} last />
      </div>
      {sideOpen && <div className="myEgoola-overlay" onClick={() => setSideOpen(false)} />}

      <div className="navbarFixed">
        <ul className="d-flex justify-content-between mt-3 mb-1 mx-2 text-center">
          <li className="flex-fill">
            <Link href={SHOP.home} onClick={closeAll}>
              <span className="nav-active" />
              <div><i className="fas fa-home" style={{ color: "#0a6440" }} /></div>
              <div><span>Home</span></div>
            </Link>
          </li>
          <li className="flex-fill">
            <Link href={session ? SHOP.messages : SHOP.login} onClick={closeAll}>
              <div className="msg-icon"><i className="far fa-comment-dots" /></div>
              <div><span>Message</span></div>
            </Link>
          </li>
          <li className="flex-fill">
            <a id="menuBt" onClick={() => { setSideOpen(false); setCatOpen((open) => !open); }}>
              <div><i className="fas fa-th-large" /></div>
              <div><span>Category</span></div>
            </a>
          </li>
          <li className="flex-fill">
            <Link href={SHOP.projects} onClick={closeAll}>
              <div><i className="fas fa-plus-square" /></div>
              <div><span>Post</span></div>
            </Link>
          </li>
          <li className="flex-fill">
            <a onClick={() => { setCatOpen(false); setSideOpen(true); }}>
              <div><i className="fas fa-user" /></div>
              <div><span>My egoola</span></div>
            </a>
          </li>
        </ul>
      </div>

      {children}

      <ShopFooter />
    </>
  );
}

function SearchForm({ className, label, idSuffix }: { className: string; label: string; idSuffix: string }) {
  const [open, setOpen] = useState(false);
  return (
    <form className={className} method="GET" action={SHOP.services}>
      <div className="search shadow">
        <div className="dropdown bg-white">
          <button
            className="btn dropdown-toggle pr-4"
            type="button"
            id={`product-drop${idSuffix}`}
            style={{ borderRadius: 0 }}
            onClick={() => setOpen((value) => !value)}
          >
            {label}
          </button>
          <div className={`dropdown-menu ${open ? "show" : ""}`}>
            <Link className="dropdown-item" href={SHOP.services} onClick={() => setOpen(false)}>
              Services
            </Link>
            <Link className="dropdown-item" href={SHOP.products} onClick={() => setOpen(false)}>
              Products
            </Link>
          </div>
        </div>
        <input
          id={`searchIn${idSuffix}`}
          className="form-control mr-sm-2 px-sm-0"
          name="search"
          placeholder="What are you looking for..."
          aria-label="Search"
        />
        <button className="btn search-submit text-light d-flex" type="submit">
          <i className="fas fa-search pr-1 pt-1" /> Search
        </button>
      </div>
    </form>
  );
}

function SideCard({
  title,
  options,
  onNavigate,
  last = false,
}: {
  title: string;
  options: { href: string; icon: string; label: string }[];
  onNavigate: () => void;
  last?: boolean;
}) {
  return (
    <div className={last ? "px-3 my-3" : "px-3 mt-3"}>
      <div className="card rounded">
        <div className="card-body pb-3">
          <h6 className="card-subtitle mb-2 text-muted">{title}</h6>
          {options.map((option, index) => (
            <div key={option.label}>
              <div className="option">
                <Link href={option.href} onClick={onNavigate}>
                  <i className={option.icon} />
                  <span className="ml-2">{option.label}</span>
                </Link>
              </div>
              {(title !== "Tutorial" && title !== "Help & Support") || index < options.length - 1 ? <hr className="my-2" /> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShopFooter() {
  return (
    <footer>
      <div className="container-fluid footer" style={{ background: "#414141" }}>
        <div className="row pt-5 text-white">
          <div className="col-12 col-sm-6 col-md-3 text-center">
            <div className="footer-f">
              <h2 className="font-weight-bold">
                EGOOLA <span className="text-success">LIMITED</span>
              </h2>
              <h6 className="pt-1 fn-16">
                EASY <span className="text-success">I</span> HELPFUL <span className="text-success">I</span> BEING
              </h6>
              <p className="my-3">Egoola.com is the part of EGOOLA LIMITED.</p>
            </div>
            <a href="https://www.facebook.com/egoolaofficial" className="mx-1" target="_blank" rel="noreferrer"><i className="footer-i fab fa-facebook-f" /></a>
            <a href="https://www.instagram.com/egoola.official/" className="mx-1" target="_blank" rel="noreferrer"><i className="footer-i fab fa-instagram" /></a>
            <a href="https://www.youtube.com/channel/UC8sJiN4r5G2vubAHJqYImWQ" className="mx-1" target="_blank" rel="noreferrer"><i className="footer-i fab fa-youtube" /></a>
            <a href="https://www.linkedin.com/company/egoolaofficial/" className="mx-1" target="_blank" rel="noreferrer"><i className="footer-i fab fa-linkedin-in" /></a>
            <a href="https://twitter.com/egoolaofficial" className="mx-1" target="_blank" rel="noreferrer"><i className="footer-i fab fa-twitter" /></a>
          </div>

          <div className="col-6 col-sm-6 col-md-3 oser">
            <h3 className="text-uppercase">Our Services</h3>
            <ul className="ml-3" style={{ listStyle: "disc" }}>
              <li><Link href="/buyer/services">All Service category</Link></li>
              <li><Link href="/buyer/products/brand-wall">Brand Wall</Link></li>
              <li><Link href="/buyer/products/retail-shop">Retail Shop</Link></li>
              <li><Link href="/buyer/products/wholesale-shop">Wholesale Shop</Link></li>
              <li><Link href="/buyer/products/used-mall">Used Mall</Link></li>
              <li><Link href="/buyer/products/village-product">Village Products</Link></li>
            </ul>
          </div>

          <div className="col-6 col-sm-6 col-md-3 oqlink p-0">
            <h3 className="text-uppercase">Our Quick Link</h3>
            <div className="row">
              <div className="col-12 col-md-6">
                <ul className="ml-3 mb-0" style={{ listStyle: "disc" }}>
                  <li><Link href="/buyer/about-us">About Us</Link></li>
                  <li><Link href="/buyer/help">Help &amp; Support</Link></li>
                  <li><Link href="/buyer/privacy-policy">Privacy Policy</Link></li>
                  <li><Link href="/buyer/terms">Terms &amp; Conditions</Link></li>
                  <li><Link href="/buyer/refund-policy">Refund Policy</Link></li>
                </ul>
              </div>
              <div className="col-12 col-md-6">
                <ul className="ml-3" style={{ listStyle: "disc" }}>
                  <li><Link href="/buyer/create-account">How to create account</Link></li>
                  <li><Link href="/buyer/sell-service">How to sell Service</Link></li>
                  <li><Link href="/buyer/get-service">How to get Service</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-3 oqlink text-center">
            <h3 className="text-uppercase">Download App</h3>
            <div className="row">
              <div className="col-6 col-md-12 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shop/images/google.png" alt="Google Play" />
              </div>
              <div className="col-6 col-md-12 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shop/images/apple.png" alt="App Store" />
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: "relative" }} className="row text-white pt-4 pb-3 copyright-place">
          <span className="m-auto footer-text">
            Copyright <span className="text-success">&copy; All Copy Rights To Reserved</span>{" "}
            <span className="text-success">Egoola Limited</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
