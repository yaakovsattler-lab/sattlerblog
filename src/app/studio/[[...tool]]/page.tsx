/*
 * The embedded Sanity Studio. Static shell; everything inside loads in the
 * browser after the editor signs in.
 */
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";
import StudioDirection from "./StudioDirection";

export const dynamic = "force-static";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return (
    <>
      <StudioDirection />
      <NextStudio config={config} />
    </>
  );
}
