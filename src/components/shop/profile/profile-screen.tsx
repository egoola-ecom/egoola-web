"use client";

import { useEffect, useState } from "react";
import { getProfile, type BuyerProfile } from "@/lib/buyer/buyer-profile-api";
import { AvatarSection } from "./avatar-section";
import { PasswordSection } from "./password-section";
import { ProfileForm } from "./profile-form";
import { useFailure } from "./use-failure";

export function ProfileScreen() {
  const fail = useFailure();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((me) => {
        if (!cancelled) setProfile(me);
      })
      .catch((err) => {
        if (cancelled) return;
        const problem = fail(err);
        if (problem) setError("We couldn't load your profile. Please try again.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-fluid p-587 my-3">
      <h4 className="mb-3">My profile</h4>
      {error && (
        <p className="alert alert-danger" role="alert" data-testid="profile-load-error">
          {error}
        </p>
      )}
      {!profile && !error && <p className="text-muted py-5 text-center">Loading…</p>}
      {profile && (
        <div className="row">
          <div className="col-lg-4 mb-3">
            <AvatarSection profile={profile} onChange={setProfile} />
            <PasswordSection />
          </div>
          <div className="col-lg-8 mb-3">
            <ProfileForm profile={profile} onSaved={setProfile} />
          </div>
        </div>
      )}
    </div>
  );
}
