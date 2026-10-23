import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "../globals.css";

/* The public site's chrome. Same markup the root layout used to render. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
