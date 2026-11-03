import type { Metadata } from "next";

import { ConnectedSignIn } from "@/features/auth/SignIn";

export const metadata: Metadata = { title: "Sign in · Market Ops" };

export default function SignInPage() {
  return <ConnectedSignIn />;
}
